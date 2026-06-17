import json
from datetime import datetime
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from agents import get_agent_reasoning
from database import Transaction, get_db
from helpers import create_alert, create_case, tx_to_dict
from pipeline import pipeline
from simulator import generate_batch

router = APIRouter(prefix="/api", tags=["transactions"])


class SimulateRequest(BaseModel):
    count: int = 25
    fraudRatio: float = 0.18


class UpdateTransactionRequest(BaseModel):
    status: str
    reviewNote: Optional[str] = None


class ScoreRequest(BaseModel):
    transactionId: str
    amount: float
    merchant: str
    userId: str
    location: str
    deviceId: str
    category: Optional[str] = "unknown"
    cardLast4: Optional[str] = "0000"
    ipAddress: Optional[str] = "0.0.0.0"
    save: bool = True


class ScoreResponse(BaseModel):
    transactionId: str
    action: str
    status: str
    riskScore: float
    agentReasoning: str
    scores: Dict[str, float]
    savedId: Optional[int]
    decidedAt: str


def _persist_transaction(db: Session, raw: dict, ml: dict) -> Transaction:
    tx = Transaction(
        transactionId=raw["transactionId"],
        amount=raw["amount"],
        merchant=raw["merchant"],
        category=raw.get("category", "unknown"),
        cardLast4=raw.get("cardLast4", "0000"),
        userId=raw["userId"],
        location=raw["location"],
        ipAddress=raw.get("ipAddress", "0.0.0.0"),
        deviceId=raw["deviceId"],
        riskScore=ml["riskScore"],
        status=ml["status"],
        action=ml["action"],
        agentReasoning=ml["agentReasoning"],
        isolationScore=ml["isolationScore"],
        autoencoderError=ml["autoencoderError"],
        velocityScore=ml["velocityScore"],
        mahalanobisDistance=ml["mahalanobisDistance"],
        mlAnalysisJson=json.dumps(ml["mlAnalysis"]),
    )
    db.add(tx)
    db.flush()
    return tx


@router.post("/simulate")
async def simulate_transactions(req: SimulateRequest, db: Session = Depends(get_db)):
    raw_txs = generate_batch(req.count, req.fraudRatio)
    results = []

    for raw in raw_txs:
        raw["createdAt"] = datetime.utcnow()
        ml = pipeline.score_transaction(raw)
        tx = _persist_transaction(db, raw, ml)

        if ml["action"] != "MONITOR":
            create_alert(db, tx, ml["action"], ml["agentReasoning"])
        if ml["action"] == "FREEZE_ACCOUNT":
            create_case(db, tx, ml["agentReasoning"])

        results.append(tx_to_dict(tx))

    db.commit()

    high_risk = [r for r in results if r.get("riskScore", 0) > 0.55]
    if high_risk and len(high_risk) <= 3:
        for r in high_risk:
            try:
                enhanced = await get_agent_reasoning(r, r)
                if enhanced and enhanced != r.get("agentReasoning"):
                    db_tx = db.query(Transaction).filter(Transaction.id == r["id"]).first()
                    if db_tx:
                        db_tx.agentReasoning = enhanced
                        r["agentReasoning"] = enhanced
            except Exception:
                pass
        db.commit()

    return results


@router.get("/transactions")
def list_transactions(
    status: Optional[str] = None,
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).order_by(desc(Transaction.createdAt))
    if status:
        q = q.filter(Transaction.status == status)
    return [tx_to_dict(tx) for tx in q.limit(limit).all()]


@router.get("/transactions/{tx_id}")
def get_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx_to_dict(tx)


@router.put("/transactions/{tx_id}")
def update_transaction(tx_id: int, req: UpdateTransactionRequest, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx.status = req.status
    if req.reviewNote:
        tx.reviewNote = req.reviewNote
    tx.reviewedAt = datetime.utcnow()
    db.commit()
    return tx_to_dict(tx)


@router.post("/score", response_model=ScoreResponse)
def score_transaction(req: ScoreRequest, db: Session = Depends(get_db)):
    """
    Score a single transaction through the full 4-agent pipeline and return
    an action decision in < 5 ms.

    Wire this into an Easypaisa / JazzCash payment webhook:
      MONITOR        → allow payment through
      REQUEST_OTP    → trigger OTP challenge on wallet app
      SOFT_BLOCK     → hold 60 seconds, notify user
      HARD_BLOCK     → decline, raise ops alert
      FREEZE_ACCOUNT → suspend account, open investigation case
    """
    tx_raw = {
        "transactionId": req.transactionId,
        "amount": req.amount,
        "merchant": req.merchant,
        "category": req.category,
        "cardLast4": req.cardLast4,
        "userId": req.userId,
        "location": req.location,
        "ipAddress": req.ipAddress,
        "deviceId": req.deviceId,
        "createdAt": datetime.utcnow(),
    }

    ml = pipeline.score_transaction(tx_raw)
    saved_id = None

    if req.save:
        tx = _persist_transaction(db, tx_raw, ml)
        if ml["action"] != "MONITOR":
            create_alert(db, tx, ml["action"], ml["agentReasoning"])
        if ml["action"] == "FREEZE_ACCOUNT":
            create_case(db, tx, ml["agentReasoning"])
        db.commit()
        saved_id = tx.id

    return ScoreResponse(
        transactionId=req.transactionId,
        action=ml["action"],
        status=ml["status"],
        riskScore=round(ml["riskScore"], 4),
        agentReasoning=ml["agentReasoning"],
        scores={
            "xgboost":  round(ml["isolationScore"], 4),
            "velocity": round(ml["velocityScore"], 4),
            "gaussian": round(ml["mahalanobisDistance"], 4),
            "autoencoder": round(ml["autoencoderError"], 4),
        },
        savedId=saved_id,
        decidedAt=datetime.utcnow().isoformat() + "Z",
    )
