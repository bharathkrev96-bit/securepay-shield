# SecurePay Shield

AI-powered multi-channel phishing & QR payment fraud detection — hackathon MVP.

This scaffold implements the full workflow from the problem statement end-to-end with
**real, working logic** (no mocked data on the backend):

1. **Link Scanner** — phishing URL detection (typosquatting, brand impersonation,
   IP-as-host, shorteners, suspicious TLDs/keywords, HTTPS check).
2. **QR Scanner** — decodes uploaded QR images (OpenCV + pyzbar), classifies the payload
   as a UPI deep link or URL, and runs it through the same fraud checks, plus QR-specific
   structural checks (multiple QR codes stitched into one image, visual tamper noise).
3. **UPI Check** — validates VPA format, known PSP handles, random-looking payee IDs,
   payee-name/VPA mismatch.
4. **Risk Engine** — every check above returns weighted, explainable signals; a shared
   engine turns them into a single 0–100 score and a Safe / Suspicious / High-Risk / Block
   verdict.
5. **Dashboard** — live stats, charts, and a recent-incidents feed for banks/investigators.

## Stack

- **Backend:** FastAPI (Python) — `backend/`
- **Frontend:** React + TypeScript + Tailwind + Chart.js — `frontend/`
- **Storage:** in-memory for the MVP (swap-in point for MongoDB documented in
  `backend/app/store.py`)

## Quickstart (local, no Docker — fastest for a hackathon)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

```bash
uvicorn app.main:app --reload --port 8000
```

For much better QR decode accuracy (rotated/skewed/photographed QR codes),
also install `zbar` — the app runs and falls back automatically without it,
but accuracy is noticeably lower on anything but clean, straight screenshots:
- **macOS:** `brew install zbar`
- **Ubuntu/Debian:** `sudo apt-get install libzbar0`
- **Windows:** usually works out of the box (the pyzbar wheel bundles the DLL)

Visit `http://localhost:8000/docs` for interactive Swagger docs of every endpoint.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. Vite is already configured to proxy `/api/*` to
`http://localhost:8000`, so no `.env` needed for local dev.

### 3. (Optional) Docker Compose — run both at once

```bash
docker compose up --build
```

## Project layout

```
securepay-shield/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI routes
│   │   ├── url_analyzer.py    # phishing / typosquat / brand-impersonation signals
│   │   ├── qr_analyzer.py     # QR decode + structural tamper checks
│   │   ├── upi_validator.py   # UPI VPA validation
│   │   ├── risk_engine.py     # weighted signals -> 0-100 score + verdict
│   │   ├── store.py           # in-memory incident store (dashboard data)
│   │   └── models.py          # Pydantic request/response schemas
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/              # Home, URLChecker, QRChecker, UPIChecker, Dashboard
        ├── components/         # RiskGauge (signature gauge), SignalList, Navbar, StatCard
        └── api/client.ts       # typed fetch wrapper for the backend
```

## Where to split work across your team

- **Person A — ML/AI:** replace the heuristic scoring in `url_analyzer.py` with a trained
  XGBoost/Random Forest model. `extract_features()` already returns a clean numeric
  feature vector to train on — grab a public phishing-URL dataset (e.g. PhishTank/Kaggle)
  and swap in `model.predict_proba()`.
- **Person B — Backend/Integrations:** wire in real threat intel — Google Safe Browsing
  API, VirusTotal API, WHOIS domain-age lookups — as additional signals feeding the same
  `risk_engine.compute_verdict()`. Swap `store.py` for MongoDB using the commented block
  at the bottom of that file if you want persistence.
- **Person C — Frontend/Design:** extend the Dashboard (live threat map, time-series
  charts), add auth for the bank/investigator view, polish mobile responsiveness.
- **Person D — Pitch/Demo:** prepare 3-4 realistic demo cases (one safe, one typosquat,
  one tampered QR, one random UPI ID) — the app already logs every scan to the dashboard
  automatically, so running through the checkers live *is* the demo.

## Demo script for judges

1. Open **Dashboard** — show it's empty/live.
2. Open **Link Scanner**, paste `hdfc-secure-kyc-verify.top/login` — show the typosquat +
   brand-impersonation signals firing and the gauge swinging to Block.
3. Open **UPI Check**, try `9482017364829@paytm` vs `cafe.mocha@okhdfcbank` — show the
   random-ID heuristic vs. a clean verified VPA.
4. Open **QR Scanner**, upload a QR image — show the decode + verdict.
5. Return to **Dashboard** — the 3 scans above now appear live in the charts and incident
   table, closing the "cross-channel correlation" story from the problem statement.

## Honest limitations (say this proactively to judges — it builds credibility)

- Scoring is currently rule-based/heuristic, not a trained ML model — the codebase is
  structured so a real model is a drop-in replacement (`extract_features()` in
  `url_analyzer.py`).
- No live threat-intel API calls yet (VirusTotal/Google Safe Browsing) — those need API
  keys; hooks are ready.
- QR tamper detection uses image-noise heuristics as a proxy; a production version would
  need a labeled dataset of tampered vs. genuine QR photos.
