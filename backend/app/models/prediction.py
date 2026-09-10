import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import GUID


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    customer_id = Column(GUID(), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    model_run_id = Column(GUID(), ForeignKey("model_runs.id", ondelete="SET NULL"), nullable=True)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    prediction_type = Column(String(50), nullable=False, index=True)  # churn, purchase_propensity, affinity, clv
    score = Column(Numeric(10, 4), nullable=False)
    predicted_class = Column(String(50), nullable=True)  # e.g., "high_risk", "likely_buyer"
    confidence = Column(Numeric(5, 4), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    customer = relationship("Customer", back_populates="predictions")
    model_run = relationship("ModelRun", back_populates="predictions")
    explanations = relationship(
        "Explanation",
        back_populates="prediction",
        cascade="all, delete-orphan",
        order_by="asc(Explanation.rank)"
    )
