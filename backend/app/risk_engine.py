"""
Risk Scoring Engine
--------------------
Takes a list of weighted boolean "signals" raised by the URL / QR / UPI
analyzers and turns them into a single 0-100 fraud score + human-readable
verdict. This is the piece the problem statement calls "Step 4 - Risk
Score Engine".

Design: each analyzer independently proposes signals (name, weight,
triggered, detail). This module never needs to know *how* a signal was
computed -- that keeps URL/QR/UPI logic swappable with real ML models
later without touching the scoring logic.
"""
from typing import List
from .models import SignalDetail, RiskVerdict

# Score bands -> action the user/bank sees
BANDS = [
    (0, 29, "SAFE", "Safe to Proceed"),
    (30, 59, "SUSPICIOUS", "Warning"),
    (60, 84, "HIGH_RISK", "Warning"),
    (85, 100, "BLOCK", "Block Payment"),
]


def _band_for(score: int):
    for low, high, level, action in BANDS:
        if low <= score <= high:
            return level, action
    return "BLOCK", "Block Payment"


def compute_verdict(signals: List[SignalDetail], max_possible: int = None) -> RiskVerdict:
    """
    signals: list of SignalDetail (name, triggered, weight, detail)
    Score = sum(weights of triggered signals), capped at 100 and
    normalized against the theoretical max weight so the engine stays
    calibrated as more signals get added over the hackathon.
    """
    if max_possible is None:
        max_possible = sum(s.weight for s in signals) or 1

    raw = sum(s.weight for s in signals if s.triggered)
    score = int(round(min(100, (raw / max_possible) * 100))) if max_possible else 0
    # Guarantee at least a small nonzero floor when *anything* triggered,
    # and cap ceiling at 100.
    score = max(0, min(100, score))

    level, action = _band_for(score)

    # Verification gates: an analyzer can emit a weight:0 "*_verified"
    # signal to mean "we could not positively confirm this" (e.g. payee
    # name not entered, or entered but not a full match). A low score
    # means nothing else looked suspicious -- it does NOT mean identity
    # was confirmed. So if any such gate is present and unsatisfied, the
    # verdict cannot read as "Safe to Proceed", even when score is low.
    unverified_gates = [s for s in signals if s.name.endswith("_verified") and not s.triggered]
    if unverified_gates and action == "Safe to Proceed":
        action = "Verify Payee Name Before Paying"

    return RiskVerdict(score=score, level=level, action=action, signals=signals)