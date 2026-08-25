"""
QR Payment Analyzer
--------------------
Implements "Verify QR codes before payment" + "Dynamic QR Tampering
Detection" from the objectives.

v4 fix -- history worth knowing if you're extending this file:

  v2 dropped `pyzbar` entirely in favor of OpenCV's built-in
  `cv2.QRCodeDetector`, to avoid the external `zbar` system library
  causing "zbar library not installed" errors on teammates' machines.

  That traded away real accuracy. Testing confirmed OpenCV's detector
  (both `QRCodeDetector` and the newer `QRCodeDetectorAruco`) reliably
  FAILS to decode a QR code rotated by as little as ~12 degrees, even
  after upscaling, sharpening, adaptive thresholding, and a rotation-
  correction sweep. `zbar`'s scanning algorithm is fundamentally more
  tolerant of rotation, skew, and compression artifacts -- this is a
  well-known, documented difference between the two, not a config issue.

  v4 fix: prefer `pyzbar` when it's installed (best real-world accuracy,
  including rotated/skewed photos of QR codes), but make it a *soft*
  dependency -- wrapped in try/except ImportError -- so the app never
  crashes or refuses to start if a teammate hasn't installed the system
  `zbar` library yet. Falls back to the OpenCV multi-strategy pipeline
  (still genuinely useful for blurry/low-res/logo-covered QR codes) when
  pyzbar isn't available.

  Install zbar for full accuracy (strongly recommended, especially since
  this app is meant to catch tampered/photographed QR codes):
    macOS:         brew install zbar
    Ubuntu/Debian: sudo apt-get install libzbar0
    Windows:       pip install pyzbar (bundles the DLL, usually just works)
  Then: pip install pyzbar
"""
import numpy as np
import cv2
try:
    import zxingcpp
    _HAS_ZXING = True
except ImportError:
    _HAS_ZXING = False
from urllib.parse import urlparse, parse_qs

from .models import SignalDetail

_detector = cv2.QRCodeDetector()

try:
    from pyzbar.pyzbar import decode as _zbar_decode
    _HAS_PYZBAR = True
except Exception:
    # Catches ImportError (package missing) AND FileNotFoundError/OSError
    # (package installed but the system zbar DLL is missing/broken on this machine)
    _HAS_PYZBAR = False


def _load_image(image_bytes: bytes):
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img

def _try_zxing(gray: np.ndarray):
    if not _HAS_ZXING:
        return []
    try:
        results = zxingcpp.read_barcodes(gray)
    except Exception:
        return []
    return [r.text for r in results if r.text]


def _try_pyzbar(gray: np.ndarray):
    if not _HAS_PYZBAR:
        return []
    try:
        results = _zbar_decode(gray)
    except Exception:
        return []
    return [r.data.decode("utf-8", errors="ignore") for r in results]


def _try_cv2_multi(gray: np.ndarray):
    try:
        found, decoded_texts, points, _ = _detector.detectAndDecodeMulti(gray)
    except cv2.error:
        return []
    return [t for t in decoded_texts if t] if found else []


def _upscale_and_sharpen(gray: np.ndarray) -> np.ndarray:
    h, w = gray.shape[:2]
    scale = 2 if max(h, w) < 700 else 1
    resized = cv2.resize(gray, (w * scale, h * scale), interpolation=cv2.INTER_CUBIC) if scale > 1 else gray
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    return cv2.filter2D(resized, -1, kernel)


def _adaptive_threshold(gray: np.ndarray) -> np.ndarray:
    return cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 5
    )


def decode_qr(image_bytes: bytes):
    """Returns (list_of_decoded_payloads, structure_signals)."""
    img = _load_image(image_bytes)
    structure_signals: list[SignalDetail] = []

    if img is None:
        return [], [SignalDetail(
            name="unreadable_image", triggered=True, weight=20,
            detail="Could not decode the uploaded file as an image."
        )]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Prefer zxing-cpp (most robust, no external DLL dependency),
    #    then pyzbar if available, before falling back to OpenCV.
    payloads = _try_zxing(gray)
    if not payloads:
        payloads = _try_pyzbar(gray)

    # 2. No pyzbar, or it found nothing -> try plain OpenCV.
    if not payloads:
        payloads = _try_cv2_multi(gray)

    # 3. Still nothing -> try enhanced variants (helps blur/low-res/logo cases,
    #    NOT rotation -- rotation genuinely needs pyzbar, see module docstring).
    used_enhancement = False
    if not payloads:
        payloads = _try_cv2_multi(_upscale_and_sharpen(gray))
        used_enhancement = bool(payloads)

    if not payloads:
        payloads = _try_cv2_multi(_adaptive_threshold(gray))
        used_enhancement = bool(payloads)

    if used_enhancement:
        structure_signals.append(SignalDetail(
            name="required_enhanced_decode", triggered=True, weight=5,
            detail="QR only decoded after image enhancement -- low-quality or unusual QR, worth a manual look."
        ))

    if not payloads and not _HAS_PYZBAR:
        structure_signals.append(SignalDetail(
            name="zbar_not_installed", triggered=True, weight=0,
            detail="pyzbar/zbar is not installed -- if this QR is rotated, skewed, or photographed at an "
                   "angle, install it for much higher decode accuracy: pip install pyzbar "
                   "(plus 'brew install zbar' on macOS or 'apt-get install libzbar0' on Linux)."
        ))

    multi_qr = len(payloads) > 1
    structure_signals.append(SignalDetail(
        name="multiple_qr_codes", triggered=multi_qr, weight=35,
        detail=(f"{len(payloads)} distinct QR codes found in one image -- a common trick is "
                f"pasting a fraudulent QR sticker over/near a legitimate one.") if multi_qr
               else "Exactly one QR code detected."
    ))

    no_qr = len(payloads) == 0
    structure_signals.append(SignalDetail(
        name="no_qr_detected", triggered=no_qr, weight=15,
        detail=("No scannable QR pattern found even after enhancement. The image may be too blurry, "
                "cropped, rotated, or damaged.") if no_qr
               else "QR code decoded successfully."
    ))

    if payloads:
        edges = cv2.Canny(gray, 100, 200)
        edge_density = float(np.count_nonzero(edges)) / edges.size
        high_noise = edge_density > 0.18
        structure_signals.append(SignalDetail(
            name="high_visual_noise", triggered=high_noise, weight=10,
            detail=f"Unusually high edge/noise density ({edge_density:.2f}) around the QR, "
                   f"consistent with a printed sticker overlaid on another surface." if high_noise
                   else "Normal visual noise level around the QR code."
        ))

    return payloads, structure_signals


def parse_upi_uri(payload: str):
    """Parse upi://pay?pa=...&pn=...&am=... into fields."""
    parsed = urlparse(payload)
    qs = parse_qs(parsed.query)
    return {
        "pa": qs.get("pa", [None])[0],  # payee address (VPA)
        "pn": qs.get("pn", [None])[0],  # payee name
        "am": qs.get("am", [None])[0],  # amount
        "cu": qs.get("cu", [None])[0],  # currency
        "tn": qs.get("tn", [None])[0],  # note
    }


def classify_payload(payload: str) -> str:
    if payload.lower().startswith("upi://"):
        return "upi"
    if payload.lower().startswith(("http://", "https://", "www.")):
        return "url"
    return "unknown"
