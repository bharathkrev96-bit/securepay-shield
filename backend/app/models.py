from pydantic import BaseModel
from typing import Optional, List


class URLCheckRequest(BaseModel):
    url: str
    source_channel: Optional[str] = "unknown"  # sms | email | whatsapp | telegram | qr | manual


class UPICheckRequest(BaseModel):
    upi_id: str
    payee_name: Optional[str] = None
    amount: Optional[float] = None


class SignalDetail(BaseModel):
    name: str
    triggered: bool
    weight: int
    detail: str


class RiskVerdict(BaseModel):
    score: int  # 0-100, higher = more dangerous
    level: str  # SAFE | SUSPICIOUS | HIGH_RISK | BLOCK
    action: str  # "Safe to Proceed" | "Warning" | "Block Payment"
    signals: List[SignalDetail]


class URLCheckResponse(BaseModel):
    url: str
    normalized_url: str
    domain: str
    verdict: RiskVerdict


class UPICheckResponse(BaseModel):
    upi_id: str
    is_valid_format: bool
    psp_handle: str
    provider: Optional[str] = None
    verdict: RiskVerdict


class QRCheckResponse(BaseModel):
    decoded: bool
    payload_type: str  # "upi" | "url" | "unknown" | "none"
    raw_payload: Optional[str] = None
    url_result: Optional[URLCheckResponse] = None
    upi_result: Optional[UPICheckResponse] = None
    qr_structure_flags: List[SignalDetail] = []
    verdict: RiskVerdict


class IncidentRecord(BaseModel):
    id: str
    timestamp: str
    channel: str
    target: str
    risk_score: int
    risk_level: str
