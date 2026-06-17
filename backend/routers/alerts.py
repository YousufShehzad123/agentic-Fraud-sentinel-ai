from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db, Alert
from helpers import alert_to_dict

router = APIRouter(prefix="/api", tags=["alerts"])


class ResolveAlertRequest(BaseModel):
    resolvedNote: str = "Resolved by analyst"


@router.get("/alerts")
def list_alerts(resolved: Optional[bool] = None, db: Session = Depends(get_db)):
    q = db.query(Alert).order_by(desc(Alert.createdAt))
    if resolved is not None:
        q = q.filter(Alert.resolved == resolved)
    return [alert_to_dict(a) for a in q.all()]


@router.put("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, req: ResolveAlertRequest, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    alert.resolvedNote = req.resolvedNote
    alert.resolvedAt = datetime.utcnow()
    db.commit()
    return alert_to_dict(alert)
