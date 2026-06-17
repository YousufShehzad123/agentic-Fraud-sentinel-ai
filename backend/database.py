from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

DATABASE_URL = "sqlite:///./sentinel.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transactionId = Column(String, unique=True, index=True)
    amount = Column(Float)
    merchant = Column(String)
    category = Column(String)
    cardLast4 = Column(String)
    userId = Column(String, index=True)
    location = Column(String)
    ipAddress = Column(String)
    deviceId = Column(String)
    riskScore = Column(Float, default=0.0)
    status = Column(String, default="normal")  # normal | suspicious | fraudulent
    action = Column(String, default="MONITOR")  # MONITOR | REQUEST_OTP | SOFT_BLOCK | HARD_BLOCK | FREEZE_ACCOUNT
    agentReasoning = Column(Text, nullable=True)
    isolationScore = Column(Float, default=0.0)
    autoencoderError = Column(Float, default=0.0)
    velocityScore = Column(Float, default=0.0)
    mahalanobisDistance = Column(Float, default=0.0)
    mlAnalysisJson = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    reviewedAt = Column(DateTime, nullable=True)
    reviewNote = Column(Text, nullable=True)

    alerts = relationship("Alert", back_populates="transaction_rel", foreign_keys="Alert.transactionId")
    case_links = relationship("CaseTransaction", back_populates="transaction")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    transactionId = Column(Integer, ForeignKey("transactions.id"))
    severity = Column(String)  # critical | high | medium | low
    type = Column(String)
    description = Column(Text)
    resolved = Column(Boolean, default=False)
    resolvedNote = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    resolvedAt = Column(DateTime, nullable=True)

    transaction_rel = relationship("Transaction", back_populates="alerts", foreign_keys=[transactionId])


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    status = Column(String, default="open")  # open | investigating | resolved | closed
    priority = Column(String, default="medium")  # critical | high | medium | low
    totalAmount = Column(Float, default=0.0)
    transactionCount = Column(Integer, default=0)
    analystNotes = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow)

    case_transactions = relationship("CaseTransaction", back_populates="case")


class CaseTransaction(Base):
    __tablename__ = "case_transactions"

    id = Column(Integer, primary_key=True, index=True)
    caseId = Column(Integer, ForeignKey("cases.id"))
    transactionId = Column(Integer, ForeignKey("transactions.id"))

    case = relationship("Case", back_populates="case_transactions")
    transaction = relationship("Transaction", back_populates="case_links")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
