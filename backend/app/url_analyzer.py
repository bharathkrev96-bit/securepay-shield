"""
URL + Domain Intelligence Analyzer
-----------------------------------
Implements Step 2 (Preprocessing: URL normalization, domain extraction)
and part of Step 3 (AI Analysis: phishing URL detection, brand
impersonation detection) from the problem statement, using explainable
heuristic signals. Each signal has a weight; the risk_engine turns the
combined weights into the 0-100 score.

Swap-in point for real ML: replace/extend `analyze_url()` with a call to
an XGBoost / Random Forest model trained on lexical + domain features --
the feature extraction helpers below (`extract_features`) already produce
a clean numeric feature vector you can feed a trained model.
"""
import re
import ipaddress
from urllib.parse import urlparse
import tldextract
import Levenshtein

from .models import SignalDetail

# Brands most impersonated in Indian UPI / banking phishing (extend freely)
TRUSTED_BRANDS = {
    "sbi": "onlinesbi.sbi",
    "hdfc": "hdfcbank.com",
    "icici": "icicibank.com",
    "axis": "axisbank.com",
    "paytm": "paytm.com",
    "phonepe": "phonepe.com",
    "googlepay": "pay.google.com",
    "upi": "npci.org.in",
    "kotak": "kotak.com",
    "yesbank": "yesbank.in",
    "amazon": "amazon.in",
    "flipkart": "flipkart.com",
}

URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
    "cutt.ly", "rebrand.ly", "buff.ly", "shorturl.at", "rb.gy",
}

SUSPICIOUS_KEYWORDS = [
    "verify", "secure", "update", "confirm", "login", "signin",
    "account-locked", "kyc", "reward", "refund", "cashback",
    "block", "suspend", "urgent", "prize", "winner", "lucky-draw",
]

SUSPICIOUS_TLDS = {
    "xyz", "top", "gq", "cf", "tk", "ml", "buzz", "info", "click",
    "work", "support", "loan", "win", "icu",
}


def normalize_url(raw: str) -> str:
    raw = raw.strip()
    if not re.match(r"^[a-zA-Z]+://", raw):
        raw = "http://" + raw
    return raw


def _is_ip_host(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def _closest_brand(domain: str):
    """Return (brand, official_domain, distance) for the nearest brand
    name by Levenshtein distance on the registered domain string."""
    best = None
    for brand, official in TRUSTED_BRANDS.items():
        dist = Levenshtein.distance(domain, official.split(".")[0])
        if best is None or dist < best[2]:
            best = (brand, official, dist)
    return best


def extract_features(raw_url: str) -> dict:
    """Numeric feature vector -- handy if the team wires in a real
    scikit-learn / XGBoost phishing-URL model during the hackathon."""
    url = normalize_url(raw_url)
    parsed = urlparse(url)
    ext = tldextract.extract(url)
    host = parsed.hostname or ""
    return {
        "url_length": len(url),
        "num_dots": host.count("."),
        "num_hyphens": host.count("-"),
        "num_subdomains": len(ext.subdomain.split(".")) if ext.subdomain else 0,
        "has_https": parsed.scheme == "https",
        "is_ip_host": _is_ip_host(host),
        "has_at_symbol": "@" in url,
        "path_length": len(parsed.path or ""),
        "domain": f"{ext.domain}.{ext.suffix}" if ext.suffix else ext.domain,
        "tld": ext.suffix.split(".")[-1] if ext.suffix else "",
        "registered_domain": ext.domain,
    }


def analyze_url(raw_url: str) -> tuple[str, str, list[SignalDetail]]:
    """Returns (normalized_url, domain, signals[])."""
    feats = extract_features(raw_url)
    url = normalize_url(raw_url)
    domain = feats["domain"]
    reg = feats["registered_domain"].lower()
    lowered = url.lower()

    signals: list[SignalDetail] = []

    signals.append(SignalDetail(
        name="ip_as_host", triggered=feats["is_ip_host"], weight=25,
        detail="URL uses a raw IP address instead of a domain name."
    ))

    signals.append(SignalDetail(
        name="no_https", triggered=not feats["has_https"], weight=10,
        detail="Connection is not encrypted (no HTTPS)."
    ))

    signals.append(SignalDetail(
        name="at_symbol_redirect", triggered=feats["has_at_symbol"], weight=20,
        detail="URL contains '@', a common browser-redirect obfuscation trick."
    ))

    shortener_hit = domain in URL_SHORTENERS
    signals.append(SignalDetail(
        name="url_shortener", triggered=shortener_hit, weight=12,
        detail=f"Domain '{domain}' is a known link-shortening service that hides the real destination."
    ))

    excess_subdomains = feats["num_subdomains"] >= 3
    signals.append(SignalDetail(
        name="excessive_subdomains", triggered=excess_subdomains, weight=10,
        detail=f"{feats['num_subdomains']} subdomain levels detected, often used to bury a fake brand name."
    ))

    many_hyphens = feats["num_hyphens"] >= 3
    signals.append(SignalDetail(
        name="excessive_hyphens", triggered=many_hyphens, weight=8,
        detail="Host contains an unusually high number of hyphens."
    ))

    suspicious_tld = feats["tld"] in SUSPICIOUS_TLDS
    signals.append(SignalDetail(
        name="suspicious_tld", triggered=suspicious_tld, weight=12,
        detail=f"TLD '.{feats['tld']}' is disproportionately used for phishing/spam sites."
    ))

    kw_hit = next((kw for kw in SUSPICIOUS_KEYWORDS if kw in lowered), None)
    signals.append(SignalDetail(
        name="suspicious_keyword", triggered=kw_hit is not None, weight=10,
        detail=f"URL contains urgency/credential-harvesting keyword '{kw_hit}'." if kw_hit
               else "No suspicious keywords found."
    ))

    # Brand impersonation: mentions a brand name but domain isn't the real one
    mentioned_brand = next((b for b in TRUSTED_BRANDS if b in lowered), None)
    impersonation = False
    detail = "No known brand referenced."
    if mentioned_brand:
        official = TRUSTED_BRANDS[mentioned_brand]
        if not domain.endswith(official) and official.split(".")[0] not in reg:
            impersonation = True
            detail = f"Mentions '{mentioned_brand}' but domain is '{domain}', not the official '{official}'."
        else:
            detail = f"Domain matches the official '{mentioned_brand}' domain."
    signals.append(SignalDetail(
        name="brand_impersonation", triggered=impersonation, weight=30, detail=detail
    ))

    # Typosquatting: registered domain is *very* close (but not equal) to a real brand
    brand, official, dist = _closest_brand(reg)
    typosquat = 0 < dist <= 2 and reg != brand
    signals.append(SignalDetail(
        name="typosquatting", triggered=typosquat, weight=25,
        detail=(f"Domain '{reg}' is only {dist} character(s) away from trusted brand '{brand}' "
                f"({official}) -- classic typosquat pattern.") if typosquat
               else "No close typosquat match against known brand list."
    ))

    long_url = feats["url_length"] > 90
    signals.append(SignalDetail(
        name="unusually_long_url", triggered=long_url, weight=6,
        detail="URL is unusually long, often used to hide the real path/domain."
    ))

    return url, domain, signals
