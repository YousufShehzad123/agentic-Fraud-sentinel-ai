"""Serialization helpers and DB side-effect helpers shared across routers."""
import json
from datetime import datetime
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session

from database import Transaction, Alert, Case, CaseTransaction


def tx_to_dict(tx: Transaction) -> Dict[str, Any]:
    ml = {}
    if tx.mlAnalysisJson:
        try:
            ml = json.loads(tx.mlAnalysisJson)
        except Exception:
            pass
    return {
        "id": tx.id,
        "transactionId": tx.transactionId,
        "amount": tx.amount,
        "merchant": tx.merchant,
        "category": tx.category,
        "cardLast4": tx.cardLast4,
        "userId": tx.userId,
        "location": tx.location,
        "ipAddress": tx.ipAddress,
        "deviceId": tx.deviceId,
        "riskScore": tx.riskScore,
        "status": tx.status,
        "action": tx.action,
        "agentReasoning": tx.agentReasoning,
        "isolationScore": tx.isolationScore,
        "autoencoderError": tx.autoencoderError,
        "velocityScore": tx.velocityScore,
        "mahalanobisDistance": tx.mahalanobisDistance,
        "createdAt": tx.createdAt.isoformat() + "Z" if tx.createdAt else None,
        "reviewedAt": tx.reviewedAt.isoformat() + "Z" if tx.reviewedAt else None,
        "reviewNote": tx.reviewNote,
        "mlAnalysis": ml if ml else None,
    }


def alert_to_dict(a: Alert) -> Dict[str, Any]:
    return {
        "id": a.id,
        "transactionId": a.transactionId,
        "severity": a.severity,
        "type": a.type,
        "description": a.description,
        "resolved": a.resolved,
        "resolvedNote": a.resolvedNote,
        "createdAt": a.createdAt.isoformat() + "Z" if a.createdAt else None,
        "resolvedAt": a.resolvedAt.isoformat() + "Z" if a.resolvedAt else None,
    }


def case_to_dict(c: Case, include_transactions: bool = False, db: Optional[Session] = None) -> Dict[str, Any]:
    result = {
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "status": c.status,
        "priority": c.priority,
        "totalAmount": c.totalAmount,
        "transactionCount": c.transactionCount,
        "analystNotes": c.analystNotes,
        "createdAt": c.createdAt.isoformat() + "Z" if c.createdAt else None,
        "updatedAt": c.updatedAt.isoformat() + "Z" if c.updatedAt else None,
    }
    if include_transactions and db:
        links = db.query(CaseTransaction).filter(CaseTransaction.caseId == c.id).all()
        result["transactions"] = [
            tx_to_dict(db.query(Transaction).filter(Transaction.id == link.transactionId).first())
            for link in links
            if db.query(Transaction).filter(Transaction.id == link.transactionId).first()
        ]
    return result


def create_alert(db: Session, tx: Transaction, action: str, reasoning: str):
    severity_map = {
        "FREEZE_ACCOUNT": "critical",
        "HARD_BLOCK": "high",
        "SOFT_BLOCK": "medium",
        "REQUEST_OTP": "low",
        "MONITOR": "low",
    }
    db.add(Alert(
        transactionId=tx.id,
        severity=severity_map.get(action, "low"),
        type=f"ACTION_{action}",
        description=reasoning,
        resolved=False,
    ))
    db.flush()


def create_case(db: Session, tx: Transaction, reasoning: str):
    case = Case(
        title=f"AUTO: Account Freeze — {tx.merchant}",
        description=f"Automatically filed by SentinelAI. User: {tx.userId}. {reasoning}",
        status="open",
        priority="critical",
        totalAmount=tx.amount,
        transactionCount=1,
        analystNotes=f"Auto-filed on FREEZE_ACCOUNT action.\n\nAgent reasoning: {reasoning}",
    )
    db.add(case)
    db.flush()
    db.add(CaseTransaction(caseId=case.id, transactionId=tx.id))
