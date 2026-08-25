"""
In-memory incident store.

For the hackathon MVP this avoids a MongoDB dependency so the whole app
runs with zero external services. The interface is intentionally
Mongo-shaped (`insert`, `all`, `recent`) so swapping in `motor`
(async MongoDB driver) later is a small, contained change -- see the
commented block at the bottom for the real integration.
"""
import uuid
from datetime import datetime, timezone
from collections import Counter
from typing import List
from .models import IncidentRecord

_INCIDENTS: List[IncidentRecord] = []


def record_incident(channel: str, target: str, risk_score: int, risk_level: str) -> IncidentRecord:
    rec = IncidentRecord(
        id=str(uuid.uuid4())[:8],
        timestamp=datetime.now(timezone.utc).isoformat(),
        channel=channel,
        target=target[:120],
        risk_score=risk_score,
        risk_level=risk_level,
    )
    _INCIDENTS.append(rec)
    # keep the demo dataset bounded
    if len(_INCIDENTS) > 500:
        del _INCIDENTS[0]
    return rec


def all_incidents() -> List[IncidentRecord]:
    return list(reversed(_INCIDENTS))


def dashboard_stats() -> dict:
    total = len(_INCIDENTS)
    level_counts = Counter(i.risk_level for i in _INCIDENTS)
    channel_counts = Counter(i.channel for i in _INCIDENTS)
    avg_score = round(sum(i.risk_score for i in _INCIDENTS) / total, 1) if total else 0
    blocked = level_counts.get("BLOCK", 0) + level_counts.get("HIGH_RISK", 0)
    return {
        "total_scanned": total,
        "avg_risk_score": avg_score,
        "blocked_or_high_risk": blocked,
        "by_level": dict(level_counts),
        "by_channel": dict(channel_counts),
    }


# --- Real MongoDB swap-in (optional, for post-hackathon hardening) -------
# from motor.motor_asyncio import AsyncIOMotorClient
# client = AsyncIOMotorClient(MONGO_URI)
# db = client["securepay_shield"]
# async def record_incident(...): await db.incidents.insert_one({...})
# async def all_incidents(): return await db.incidents.find().to_list(500)
# ---------------------------------------------------------------------------
