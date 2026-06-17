from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import Case, get_db
from helpers import case_to_dict

router = APIRouter(prefix="/api", tags=["cases"])


class UpdateCaseRequest(BaseModel):
    status: Optional[str] = None
    analystNotes: Optional[str] = None


@router.get("/cases")
def list_cases(status: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Case).order_by(desc(Case.createdAt))
    if status:
        q = q.filter(Case.status == status)
    return [case_to_dict(c) for c in q.all()]


@router.get("/cases/{case_id}")
def get_case(case_id: int, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    return case_to_dict(c, include_transactions=True, db=db)


@router.put("/cases/{case_id}")
def update_case(case_id: int, req: UpdateCaseRequest, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    if req.status:
        c.status = req.status
    if req.analystNotes is not None:
        c.analystNotes = req.analystNotes
    c.updatedAt = datetime.utcnow()
    db.commit()
    return case_to_dict(c, include_transactions=True, db=db)
