from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import agent, alerts, analytics, cases, transactions

app = FastAPI(
    title="SentinelAI Fraud Detection API",
    description=(
        "Real-time fraud detection pipeline for Pakistani mobile wallets "
        "(Easypaisa / JazzCash). "
        "4-agent ensemble: XGBoost 40% · Velocity 30% · Welford/Gaussian 20% · Autoencoder 10%."
    ),
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


app.include_router(transactions.router)
app.include_router(alerts.router)
app.include_router(cases.router)
app.include_router(analytics.router)
app.include_router(agent.router)
