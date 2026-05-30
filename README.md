# SentinelAI — Multi-Agent Fraud Detection for Easypaisa / JazzCash

> Real-time, action-taking fraud detection system for Pakistani mobile wallets. 4 autonomous ML agents + Claude-powered reasoning. Built as a portfolio project demonstrating enterprise-grade AI engineering.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  Dashboard · Transactions · Alerts · Cases · Analytics  │
│                      ML Agent                           │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP /api/*
┌───────────────────▼─────────────────────────────────────┐
│                  FastAPI Backend                         │
│                                                         │
│  POST /api/score  ← Easypaisa / JazzCash webhook        │
│  POST /api/simulate  ← batch simulation (demo)          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Fraud Pipeline                     │    │
│  │                                                 │    │
│  │  ┌──────────────┐  ┌──────────────┐            │    │
│  │  │ Isolation    │  │  Autoencoder │  30% + 25% │    │
│  │  │ Forest       │  │  (NumPy NN)  │            │    │
│  │  └──────────────┘  └──────────────┘            │    │
│  │  ┌──────────────┐  ┌──────────────┐            │    │
│  │  │  Velocity    │  │  Gaussian    │  25% + 20% │    │
│  │  │  Analyzer    │  │  (Welford)   │            │    │
│  │  └──────────────┘  └──────────────┘            │    │
│  │                     │                           │    │
│  │  ┌──────────────────▼──────────────────────┐   │    │
│  │  │  Decision Engine → Action Assignment    │   │    │
│  │  │  MONITOR / REQUEST_OTP / SOFT_BLOCK /   │   │    │
│  │  │  HARD_BLOCK / FREEZE_ACCOUNT            │   │    │
│  │  └─────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Claude claude-sonnet-4-5 Agent (optional)      │    │
│  │  Pakistan-specific fraud reasoning + caching    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  SQLite Database (transactions · alerts · cases)        │
└─────────────────────────────────────────────────────────┘
```

---

## ML Models

| Model | Type | Weight | Detection Target |
|---|---|---|---|
| Isolation Forest | Ensemble / scikit-learn (200 trees) | 30% | General anomalies — short isolation path |
| Autoencoder | NumPy Neural Net (6→4→6, He init, cosine LR) | 25% | Pattern deviation — high reconstruction error |
| Velocity Analyzer | Sliding window (1m / 5m / 1hr / 24hr) | 25% | SIM swap, card testing, dormant-spike |
| Gaussian Profiler | Welford online algorithm | 20% | Per-user Mahalanobis behavioral distance |

All 4 models are **pre-trained on startup** with 350 synthetic PKR transactions — no manual retrain needed before first use.

---

## Graduated Action System

| Action | Threshold | Response |
|---|---|---|
| MONITOR | < 25% | Allow through, log only |
| REQUEST_OTP | 25–40% | OTP challenge to wallet holder |
| SOFT_BLOCK | 40–55% | 60-second hold |
| HARD_BLOCK | 55–70% | Reject + alert ops team |
| FREEZE_ACCOUNT | ≥ 70% or velocity burst | Freeze + auto-file investigation case |

---

## Real-World Integration — `POST /api/score`

When Easypaisa / JazzCash API access is available, register this endpoint as a payment webhook. Every transaction is scored in **< 5 ms**.

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
  "riskScore": 0.5734,
  "agentReasoning": "3/4 agents flagged this transaction...",
  "scores": {
    "isolationForest": 0.9675,
    "autoencoder": 0.4102,
    "velocity": 0.0333,
    "gaussian": 0.3000
  },
  "savedId": 42,
  "decidedAt": "2026-01-15T14:32:18.291Z"
}
```

Pass `"save": false` to score without writing to the database (useful for sandbox testing).

---

## Pakistan-Specific Fraud Patterns Detected

| Pattern | Description |
|---|---|
| SIM Swap | New device ID for existing user + international transfer |
| OTP Theft | Foreign IP + high-value finance transaction |
| Structuring | PKR 4,500–9,900 repeated transactions to stay under AML threshold |
| Dormant Spike | Inactive wallet suddenly sending large amounts internationally |
| Card Testing | Rapid PKR 1–50 micro-transactions on stolen card |
| Account Takeover | Unknown device (`dev_atk_*`) + high-value transfer |
| Round Trip | Large Easypaisa Transfer + quick return (mule network) |

---

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+

### Setup

```bash
# 1. Clone
git clone https://github.com/YousufShehzad123/Fraud-sentinel-ai
cd Fraud-sentinel-ai

# 2. Install Python dependencies
pip install fastapi uvicorn sqlalchemy pydantic scikit-learn numpy anthropic python-dotenv greenlet

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. (Optional) Add Anthropic API key for Claude reasoning
cp backend/.env.example backend/.env
# Edit backend/.env and set ANTHROPIC_API_KEY=sk-ant-...

# 5. Start both servers
start.bat

# Or manually:
# Terminal 1 — backend
cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open `http://localhost:5174`

---

## Tech Stack

**Frontend**: React 18 · TypeScript · Vite · Tailwind CSS v4 · Recharts · React Query · Wouter  
**Backend**: FastAPI · SQLAlchemy · SQLite · scikit-learn · NumPy · Anthropic SDK  
**AI**: Claude claude-sonnet-4-5 with prompt caching (optional) · 4 local ML models  

---

## Features

- **Dashboard** — live stats, 7-day fraud trends, agent action distribution, recent transaction feed (8s auto-refresh)
- **Transactions** — filterable table with risk score bars, status/action filters, search
- **Transaction Detail** — per-model score breakdown, agent vote panel, risk gauge, analyst override
- **Alerts** — severity-sorted, resolve workflow with notes
- **Cases** — investigation case management with analyst notes and status tracking
- **Analytics** — precision/recall/F1 metrics, ensemble weights, action distribution, 14-day trend, risk histogram
- **ML Agent** — 4 model cards with accuracy bars, graduated action legend, pipeline execution log, one-click retrain
- **`POST /api/score`** — production webhook endpoint ready for Easypaisa / JazzCash integration
- Full audit trail — every ML decision stored with per-agent scores and reasoning

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/score` | **Production webhook** — score one transaction, get action in < 5ms |
| `POST` | `/api/simulate` | Batch simulate N transactions (demo) |
| `GET` | `/api/dashboard/summary` | Aggregated stats + recent transactions |
| `GET` | `/api/transactions` | List transactions with filters |
| `GET` | `/api/transactions/{id}` | Transaction detail with ML breakdown |
| `GET` | `/api/alerts` | Active / resolved alerts |
| `PUT` | `/api/alerts/{id}/resolve` | Resolve an alert |
| `GET` | `/api/cases` | Investigation cases |
| `GET` | `/api/cases/{id}` | Case detail with linked transactions |
| `GET` | `/api/agent/status` | Pipeline status + model readiness |
| `POST` | `/api/agent/retrain` | Retrain batch models on accumulated data |
| `GET` | `/api/analytics/fraud-trends` | Day-by-day fraud counts (7–90 days) |
| `GET` | `/api/analytics/model-performance` | Precision, recall, F1, action distribution |
