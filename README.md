# SentinelAI — Multi-Agent Fraud Detection for Easypaisa / JazzCash

> Real-time, action-taking fraud detection for Pakistani mobile wallets.
> 4 autonomous ML agents score every transaction and take a graduated action — from OTP challenge to account freeze — in under 5 ms.

[![CI](https://github.com/YousufShehzad123/agentic-Fraud-sentinel-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/YousufShehzad123/agentic-Fraud-sentinel-ai/actions/workflows/ci.yml)

---

## Why this architecture beats a single model

A single XGBoost model learns *population-level* fraud patterns. It has no idea what's normal **for account #1028 specifically**.

| Agent | What it catches that others miss |
|---|---|
| **XGBoost** | Known population-level fraud patterns (SIM swap, international transfer, off-hours + unknown device) |
| **Velocity Analyzer** | Burst attacks — 5 transactions in 60 seconds looks fine individually, catastrophic together |
| **Gaussian Profiler (Welford)** | "This PKR 80k transfer is fine for most users, but account #1028 always sends PKR 500" |
| **Autoencoder** | Distribution shift — new fraud patterns the XGBoost hasn't seen before |

This is the same three-signal architecture used by Visa Advanced Authorization and Mastercard Decision Intelligence.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    React Frontend                         │
│  Dashboard · Transactions · Alerts · Cases · Analytics   │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP /api/*
┌──────────────────────▼───────────────────────────────────┐
│                  FastAPI Backend                          │
│                                                          │
│  POST /api/score  ← Easypaisa / JazzCash webhook         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  Fraud Pipeline                    │  │
│  │                                                    │  │
│  │  ┌─────────────┐  ┌─────────────┐                 │  │
│  │  │  XGBoost    │  │  Velocity   │  40% · 30%      │  │
│  │  │  (primary)  │  │  Analyzer   │                 │  │
│  │  └─────────────┘  └─────────────┘                 │  │
│  │  ┌─────────────┐  ┌─────────────┐                 │  │
│  │  │  Gaussian   │  │ Autoencoder │  20% · 10%      │  │
│  │  │  (Welford)  │  │  (NumPy NN) │                 │  │
│  │  └─────────────┘  └─────────────┘                 │  │
│  │                        │                          │  │
│  │  ┌─────────────────────▼────────────────────┐     │  │
│  │  │  Decision Engine → Graduated Action      │     │  │
│  │  │  MONITOR / OTP / SOFT_BLOCK /            │     │  │
│  │  │  HARD_BLOCK / FREEZE_ACCOUNT             │     │  │
│  │  └──────────────────────────────────────────┘     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Claude Sonnet (optional) — Pakistan-specific reasoning  │
│  SQLite — transactions · alerts · cases                  │
└──────────────────────────────────────────────────────────┘
```

---

## ML Models

| Model | Type | Weight | Why this weight |
|---|---|---|---|
| **XGBoost** | Supervised gradient-boosted trees | **40%** | Trained on labeled fraud/normal data — highest precision |
| **Velocity Analyzer** | Sliding-window counters (1m/5m/1h/24h) | **30%** | Burst detection is fast and near-zero false-positive |
| **Gaussian Profiler** | Welford online algorithm (per-user) | **20%** | Catches behavioral anomalies XGBoost can't see |
| **Autoencoder** | NumPy neural net (6→4→6) | **10%** | Unsupervised safety net for novel fraud patterns |

All 4 models are **pre-trained at startup** on 350 synthetic PKR transactions — no manual setup required.

**Why Welford's algorithm for the Gaussian Profiler?**
Tracking a running mean and variance for millions of accounts requires O(1) memory per user — just 3 numbers (count, mean, M2). No stored history, no batch recomputation. This is how real bank fraud systems maintain per-account behavioral profiles.

---

## Graduated Action System

| Action | Composite score | Response |
|---|---|---|
| `MONITOR` | < 25% | Allow through, log only |
| `REQUEST_OTP` | 25–40% | OTP challenge to wallet holder |
| `SOFT_BLOCK` | 40–55% | 60-second hold |
| `HARD_BLOCK` | 55–70% | Reject + alert ops team |
| `FREEZE_ACCOUNT` | ≥ 70% **or** velocity burst | Freeze + auto-file investigation case |

---

## Pakistan-Specific Fraud Patterns

| Pattern | Detection method |
|---|---|
| SIM Swap | New device ID + international location → Velocity + XGBoost |
| OTP Theft | Foreign IP + high-value finance transaction → XGBoost |
| Structuring | PKR 4,500–9,900 repeated transactions → Velocity |
| Dormant Spike | Inactive wallet → large international transfer → Gaussian z-score |
| Card Testing | Rapid PKR 1–50 micro-transactions → Velocity burst |
| Account Takeover | `dev_atk_*` device + high-value → XGBoost + Velocity |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YousufShehzad123/agentic-Fraud-sentinel-ai
cd agentic-Fraud-sentinel-ai

# 2. Backend
cd backend
pip install --prefer-binary -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# 3. Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`

### Docker (alternative)
```bash
docker-compose up
```

### Optional — Claude reasoning
```bash
cp backend/.env.example backend/.env
# Set ANTHROPIC_API_KEY=sk-ant-... in backend/.env
```

---

## Production Webhook — `POST /api/score`

Register this endpoint in the Easypaisa / JazzCash developer portal as a payment webhook. Every transaction is scored in **< 5 ms**.

```bash
curl -X POST http://localhost:8000/api/score \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "EP1748291042ABC",
    "amount": 150000,
    "merchant": "Overseas FX Transfer",
    "userId": "user_007",
    "location": "Dubai, UAE",
    "deviceId": "dev_unknown_9921"
  }'
```

```json
{
  "transactionId": "EP1748291042ABC",
  "action": "HARD_BLOCK",
  "status": "fraudulent",
  "riskScore": 0.6341,
  "agentReasoning": "3/4 agents flagged. XGBoost fraud probability 81.2% — high-risk transaction profile. Account frozen.",
  "scores": {
    "xgboost":     0.8120,
    "velocity":    0.0333,
    "gaussian":    0.3000,
    "autoencoder": 0.4102
  },
  "savedId": 42,
  "decidedAt": "2026-06-17T14:32:18.291Z"
}
```

Read the `action` field and enforce it:
- `MONITOR` → let payment through
- `REQUEST_OTP` → trigger OTP challenge on the wallet app
- `SOFT_BLOCK` → hold 60 seconds, notify user
- `HARD_BLOCK` → decline, raise ops alert
- `FREEZE_ACCOUNT` → suspend account, open investigation case

---

## Project Structure

```
agentic-Fraud-sentinel-ai/
├── backend/
│   ├── models/                   # One file per ML model
│   │   ├── xgboost_scorer.py     # Supervised primary classifier
│   │   ├── velocity.py           # Sliding-window burst detection
│   │   ├── gaussian.py           # Welford per-user behavioral baseline
│   │   └── autoencoder.py        # Unsupervised NumPy neural net
│   ├── routers/                  # One file per API domain
│   │   ├── transactions.py       # /api/score, /api/simulate, /api/transactions
│   │   ├── alerts.py             # /api/alerts
│   │   ├── cases.py              # /api/cases
│   │   ├── analytics.py          # /api/dashboard, /api/analytics/*
│   │   └── agent.py              # /api/agent/status, retrain
│   ├── pipeline.py               # FraudPipeline orchestrator
│   ├── agents.py                 # Claude Sonnet integration (optional)
│   ├── simulator.py              # Synthetic PKR transaction generator
│   ├── database.py               # SQLAlchemy models
│   ├── helpers.py                # Shared serialization helpers
│   ├── main.py                   # FastAPI app + router registration
│   └── tests/                    # 38 tests — velocity, gaussian, xgboost, pipeline
├── frontend/                     # React 18 + TypeScript dashboard
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml      # Lint + test on Python 3.11 and 3.12
```

---

## Tech Stack

**Backend**: FastAPI · SQLAlchemy · SQLite · XGBoost · scikit-learn · NumPy  
**Frontend**: React 18 · TypeScript · Vite · Tailwind CSS · Recharts  
**AI**: Claude Sonnet 4.6 with prompt caching (optional enhancement)  
**Testing**: pytest · 38 tests · ruff lint  
**Deploy**: Docker · GitHub Actions CI

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/score` | **Production webhook** — score one transaction in < 5ms |
| `POST` | `/api/simulate` | Batch simulate N transactions (demo) |
| `GET` | `/api/dashboard/summary` | Aggregated stats + recent transactions |
| `GET` | `/api/transactions` | List transactions with filters |
| `GET` | `/api/transactions/{id}` | Transaction detail with per-agent breakdown |
| `GET` | `/api/alerts` | Active / resolved alerts |
| `PUT` | `/api/alerts/{id}/resolve` | Resolve an alert |
| `GET` | `/api/cases` | Investigation cases |
| `GET` | `/api/cases/{id}` | Case detail with linked transactions |
| `GET` | `/api/agent/status` | Pipeline status + model readiness |
| `POST` | `/api/agent/retrain` | Retrain Autoencoder on accumulated data |
| `GET` | `/api/analytics/fraud-trends` | Day-by-day fraud counts (7–90 days) |
| `GET` | `/api/analytics/model-performance` | Precision, recall, F1, weight distribution |
