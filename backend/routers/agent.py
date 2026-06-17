from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db, Transaction
from pipeline import pipeline
from helpers import tx_to_dict

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.get("/status")
def agent_status():
    return pipeline.get_status()


@router.get("/execution-log")
def execution_log(db: Session = Depends(get_db)):
    txs = db.query(Transaction).order_by(desc(Transaction.createdAt)).limit(50).all()
    return [tx_to_dict(tx) for tx in txs]


@router.post("/retrain")
def retrain_models(db: Session = Depends(get_db)):
    txs = db.query(Transaction).order_by(desc(Transaction.createdAt)).limit(1000).all()
    tx_dicts = [
        {
            "amount": tx.amount,
            "userId": tx.userId,
            "location": tx.location,
            "deviceId": tx.deviceId,
            "createdAt": tx.createdAt,
        }
        for tx in txs
    ]
    return pipeline.train(tx_dicts)
