"""
UPI ID Verification
--------------------
Implements "Identify fake merchants and suspicious UPI IDs" from the
objectives. A UPI VPA (Virtual Payment Address) looks like
`name@handle`, e.g. `merchant.store@okhdfcbank`. The handle after the
`@` identifies the PSP/bank -- fraudsters often use freshly-registered
or obscure handles, or random-looking prefixes, to dodge detection.

v2 fixes:
1. Payee-name matching now uses real similarity scoring (difflib) instead
   of a fragile substring check, and treats names shorter than
   MIN_NAME_LEN as their own red flag instead of an automatic "safe"
   (a 1-letter name used to slip through because `name[:3]` silently
   returns the whole short string and matched almost anything).
2. KNOWN_PSP_HANDLES is now a handle -> provider map covering major
   third-party UPI apps (PhonePe, Paytm, Google Pay, Amazon Pay, Cred,
   etc.), not just direct bank handles -- and the provider name is
   surfaced back to the caller so the UI can show *which* app a VPA
   belongs to, not just pass/fail.
3. A short-but-not-tiny name (e.g. 3-5 letters, like "Bar" instead of
   "Bharath") used to clear MIN_NAME_LEN and get scored purely on
   similarity, which could pass by coincidence. Now the payee name must
   cover a real majority of the VPA prefix's letters (MIN_COVERAGE_RATIO)
   to count as a full name at all -- a partial/abbreviated name is now its
   own red flag (`payee_name_incomplete`), separate from an outright
   mismatch. Only a name that is both long enough AND covers enough of the
   VPA is treated as a verified match.
"""
import re
from difflib import SequenceMatcher
from .models import SignalDetail

UPI_REGEX = re.compile(r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}$")

MIN_NAME_LEN = 6              # absolute floor -- below this it's not a "name" at all
MIN_COVERAGE_RATIO = 0.6      # payee name must cover at least 60% of the VPA prefix's letters
SIMILARITY_THRESHOLD = 0.4    # below this, name and VPA prefix are considered a mismatch

# Maps PSP handle -> the real-world app/bank it belongs to.
# Third-party UPI apps route through partner banks, so the handle itself
# often doesn't literally spell out "phonepe" or "paytm" -- this mapping
# is what makes that visible instead of only recognizing direct bank handles.
HANDLE_TO_PROVIDER = {
    # Banks (direct)
    "oksbi": "State Bank of India", "okhdfcbank": "HDFC Bank",
    "okicici": "ICICI Bank", "okaxis": "Axis Bank",
    "okbizaxis": "Axis Bank (Business)",
    "sbi": "State Bank of India", "hdfcbank": "HDFC Bank",
    "icici": "ICICI Bank", "axisbank": "Axis Bank",
    "kotak": "Kotak Mahindra Bank", "yesbank": "Yes Bank",
    "idfcfirst": "IDFC First Bank", "cnrb": "Canara Bank",
    "pnb": "Punjab National Bank", "unionbank": "Union Bank",
    "fbl": "Federal Bank",

    # Third-party apps (via their partner banks)
    "ybl": "PhonePe", "phonepe": "PhonePe", "yapl": "PhonePe",
    "ibl": "PhonePe / ICICI-partnered apps",
    "axl": "Google Pay", "okaxisbank": "Google Pay",
    "paytm": "Paytm", "pty": "Paytm", "ptaxis": "Paytm",
    "ptyes": "Paytm", "ptsbi": "Paytm", "pthdfc": "Paytm", "ptybl": "Paytm",
    "apl": "Amazon Pay", "amazonpay": "Amazon Pay",
    "fbpe": "Freecharge",
    "jupiteraxis": "Jupiter", "fam": "Fi Money",
    "waaxis": "WhatsApp Pay", "wabank": "WhatsApp Pay", "waicici": "WhatsApp Pay",
    "cred": "Cred", "slc": "Slice",
    "airtel": "Airtel Payments Bank", "jio": "Jio Payments Bank",
    "upi": "Generic UPI handle",
}

KNOWN_PSP_HANDLES = set(HANDLE_TO_PROVIDER.keys())

RANDOM_PREFIX_RE = re.compile(r"^[a-z0-9]{10,}$")  # long random alnum blob, no separators
INDIAN_PHONE_RE = re.compile(r"^[6-9]\d{9}$")   # valid 10-digit Indian mobile number


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def validate_upi(upi_id: str, payee_name: str | None = None):
    """Returns (is_valid_format, handle, provider, signals)."""
    upi_id = upi_id.strip()
    is_valid_format = bool(UPI_REGEX.match(upi_id))
    signals: list[SignalDetail] = []
    handle = ""
    provider = None

    if not is_valid_format:
        signals.append(SignalDetail(
            name="invalid_format", triggered=True, weight=40,
            detail="Does not match the standard UPI VPA format (name@bankhandle)."
        ))
        return is_valid_format, handle, provider, signals

    prefix, handle = upi_id.split("@")
    handle_lower = handle.lower()

    provider = HANDLE_TO_PROVIDER.get(handle_lower)
    known_handle = provider is not None
    signals.append(SignalDetail(
        name="unknown_psp_handle", triggered=not known_handle, weight=25,
        detail=f"Recognized handle -- belongs to {provider}." if known_handle
               else f"'@{handle}' is not a recognized bank/PSP handle (could be new, regional, or fraudulent)."
    ))

    is_phone_number = bool(INDIAN_PHONE_RE.match(prefix))

    # A clean "letters-block + trailing digits" shape (e.g. "kirubalani2007",
    # a name + birth year, or "rahul9876", a name + last-4-of-phone) is an
    # extremely common REAL pattern -- not machine-generated randomness.
    # True random IDs interleave letters and digits throughout
    # (e.g. "a8x92kd031"), they don't cleanly separate into one letter
    # block followed by one digit block.
    name_plus_suffix = bool(re.match(r"^[a-z]{4,}\d{1,6}$", prefix, re.IGNORECASE))

    looks_random = (
        len(prefix) >= 10 and prefix.isalnum()
        and sum(c.isdigit() for c in prefix) >= 4
        and not is_phone_number
        and not name_plus_suffix
    
    )
    signals.append(SignalDetail(
        name="random_looking_id", triggered=looks_random, weight=15,
        detail="Payee ID prefix looks machine-generated/random rather than a real name or merchant code." if looks_random
               else "Payee ID prefix looks like a plausible name/merchant code."
    ))

    numeric_only = prefix.replace(".", "").replace("-", "").isdigit() and not is_phone_number
    signals.append(SignalDetail(
        name="numeric_only_id", triggered=numeric_only, weight=8,
        detail="Payee ID is purely numeric, common in throwaway fraud VPAs." if numeric_only else "Not purely numeric."
    ))
    signals.append(SignalDetail(
        name="phone_number_style_id", triggered=is_phone_number, weight=0,
        detail=f"'{prefix}' matches a valid Indian mobile number pattern -- common and normal for Paytm/PhonePe/GPay VPAs." if is_phone_number
               else "Payee ID does not match a phone-number pattern."
    ))

    # --- Payee name cross-check (fixed: requires a FULL name, not a
    # partial one, to count as verified) --------------------------------
    name_incomplete = False
    name_mismatch = False
    name_detail = "No payee name provided to cross-check."

    if payee_name:
        pname = re.sub(r"[^a-z]", "", payee_name.lower())
        pprefix = re.sub(r"[^a-z]", "", prefix.lower())

        if len(pname) < MIN_NAME_LEN:
            # Too short to be a real name at all (e.g. initials).
            name_incomplete = True
            name_detail = (
                f"'{payee_name}' is too short to count as a verifiable payee name "
                f"(need at least {MIN_NAME_LEN} letters) -- enter the full payee name."
            )
        elif not pprefix:
            # VPA prefix has no letters at all (e.g. purely numeric like
            # '7339595268') -- there's nothing to compare the name against,
            # but that's a property of the VPA, not of the name provided.
            name_detail = f"VPA prefix has no letters to compare '{payee_name}' against (numeric-only ID)."
        else:
            contains_match = pname in pprefix or pprefix in pname
            coverage = len(pname) / len(pprefix)
            similarity = _similarity(pname, pprefix)

            if not contains_match and coverage < MIN_COVERAGE_RATIO:
                # e.g. "Bar" against "bharathkumar" -- technically similar
                # letters, but nowhere near the FULL name, so it does not
                # get to count as a verified match.
                name_incomplete = True
                name_detail = (
                    f"'{payee_name}' looks like a partial name (~{int(coverage * 100)}% of the "
                    f"VPA's length) -- enter the full payee name to verify identity."
                )
            else:
                name_mismatch = not contains_match and similarity < SIMILARITY_THRESHOLD
                name_detail = (
                    f"Payee name doesn't resemble the VPA (similarity {similarity:.2f})."
                    if name_mismatch else
                    f"Full payee name matches the VPA (similarity {similarity:.2f})."
                )

    signals.append(SignalDetail(
        name="payee_name_incomplete", triggered=name_incomplete, weight=20,
        detail=name_detail if name_incomplete else "Payee name is complete enough to verify (or was not provided)."
    ))
    signals.append(SignalDetail(
        name="payee_name_mismatch", triggered=name_mismatch, weight=12,
        detail=name_detail if (name_mismatch or not name_incomplete) else "Skipped -- name too partial to compare."
    ))

    name_fully_verified = bool(payee_name) and not name_incomplete and not name_mismatch and bool(
        re.sub(r"[^a-z]", "", prefix.lower())
    )
    signals.append(SignalDetail(
        name="payee_name_verified", triggered=name_fully_verified, weight=0,
        detail="Payee name fully matches the VPA -- identity confirmed." if name_fully_verified
               else "Enter the full payee name shown on the payment screen to confirm this VPA's identity before paying."
    ))

    return is_valid_format, handle, provider, signals
