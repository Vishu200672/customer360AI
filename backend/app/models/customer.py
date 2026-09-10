import uuid
from sqlalchemy import Column, String, Integer, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import GUID, TimestampMixin


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    external_customer_id = Column(String(100), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    acquisition_channel = Column(String(100), nullable=True)
    customer_status = Column(String(50), nullable=False, default="Active", index=True)

    # Relationships
    transactions = relationship("Transaction", back_populates="customer", cascade="all, delete-orphan", order_by="desc(Transaction.transaction_time)")
    interactions = relationship("Interaction", back_populates="customer", cascade="all, delete-orphan", order_by="desc(Interaction.timestamp)")
    features = relationship("CustomerFeature", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    segments = relationship("Segment", secondary="customer_segments", back_populates="customers")
    predictions = relationship("Prediction", back_populates="customer", cascade="all, delete-orphan", order_by="desc(Prediction.created_at)")
    actions = relationship("Action", back_populates="customer", cascade="all, delete-orphan", order_by="desc(Action.created_at)")
