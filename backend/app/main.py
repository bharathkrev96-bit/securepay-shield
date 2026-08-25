from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    URLCheckRequest, URLCheckResponse,
    UPICheckRequest, UPICheckResponse,
    QRCheckResponse,
)
from .risk_engine import compute_verdict
from .url_analyzer import analyze_url
from .upi_validator import validate_upi
from .qr_analyzer import decode_qr, parse_upi_uri, classify_payload
from . import store

app = FastAPI(
    title="SecurePay Shield API",
    description="AI-powered multi-channel phishing & QR payment fraud detection",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SecurePay Shield"}


@app.post("/api/analyze/url", response_model=URLCheckResponse)
def analyze_url_endpoint(req: URLCheckRequest):
    if not req.url or not req.url.strip():
        raise HTTPException(400, "url is required")

    normalized, domain, signals = analyze_url(req.url)
    verdict = compute_verdict(signals)
    store.record_incident(req.source_channel or "manual", req.url, verdict.score, verdict.level)

    return URLCheckResponse(
        url=req.url, normalized_url=normalized, domain=domain, verdict=verdict,
    )


@app.post("/api/analyze/upi", response_model=UPICheckResponse)
def analyze_upi_endpoint(req: UPICheckRequest):
    if not req.upi_id or not req.upi_id.strip():
        raise HTTPException(400, "upi_id is required")

    is_valid, handle, provider, signals = validate_upi(req.upi_id, req.payee_name)
    verdict = compute_verdict(signals)
    store.record_incident("upi", req.upi_id, verdict.score, verdict.level)

    return UPICheckResponse(
        upi_id=req.upi_id, is_valid_format=is_valid, psp_handle=handle,
        provider=provider, verdict=verdict,
    )


@app.post("/api/analyze/qr", response_model=QRCheckResponse)
async def analyze_qr_endpoint(file: UploadFile = File(...)):
    image_bytes = await file.read()
    payloads, structure_signals = decode_qr(image_bytes)

    if not payloads:
        verdict = compute_verdict(structure_signals)
        store.record_incident("qr", "undecodable", verdict.score, verdict.level)
        return QRCheckResponse(
            decoded=False, payload_type="none", raw_payload=None,
            qr_structure_flags=structure_signals, verdict=verdict,
        )

    payload = payloads[0]
    ptype = classify_payload(payload)

    url_result = None
    upi_result = None
    content_signals = []

    if ptype == "upi":
        fields = parse_upi_uri(payload)
        pa = fields.get("pa") or ""
        is_valid, handle, provider, upi_signals = validate_upi(pa, fields.get("pn"))
        content_signals = upi_signals
        upi_verdict = compute_verdict(upi_signals)
        upi_result = UPICheckResponse(
            upi_id=pa, is_valid_format=is_valid, psp_handle=handle,
            provider=provider, verdict=upi_verdict,
        )
    elif ptype == "url":
        normalized, domain, url_signals = analyze_url(payload)
        content_signals = url_signals
        url_verdict = compute_verdict(url_signals)
        url_result = URLCheckResponse(
            url=payload, normalized_url=normalized, domain=domain, verdict=url_verdict,
        )
    else:
        content_signals = []

    combined_signals = structure_signals + content_signals
    verdict = compute_verdict(combined_signals)
    store.record_incident("qr", payload, verdict.score, verdict.level)

    return QRCheckResponse(
        decoded=True, payload_type=ptype, raw_payload=payload,
        url_result=url_result, upi_result=upi_result,
        qr_structure_flags=structure_signals, verdict=verdict,
    )


@app.get("/api/dashboard/stats")
def dashboard_stats():
    return store.dashboard_stats()


@app.get("/api/dashboard/incidents")
def dashboard_incidents(limit: int = 50):
    return store.all_incidents()[:limit]
