import uuid
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import GUID


class Explanation(Base):
    __tablename__ = "explanations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    prediction_id = Column(GUID(), ForeignKey("predictions.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_name = Column(String(100), nullable=False, index=True)
    feature_value = Column(Numeric(12, 4), nullable=True)
    contribution = Column(Numeric(10, 4), nullable=False)  # SHAP value
    rank = Column(Integer, nullable=False)  # 1 = most important
    direction = Column(String(20), nullable=False)  # "positive" or "negative"
    explanation_metadata = Column(JSON, nullable=True)

    # Relationships
    prediction = relationship("Prediction", back_populates="explanations")
