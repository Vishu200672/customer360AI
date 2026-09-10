import uuid
from sqlalchemy import Column, Boolean, Numeric, DateTime, ForeignKey, func
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import GUID


class ActionOutcome(Base):
    __tablename__ = "action_outcomes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    action_id = Column(GUID(), ForeignKey("actions.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    delivered = Column(Boolean, default=False, nullable=False)
    opened = Column(Boolean, default=False, nullable=False)
    clicked = Column(Boolean, default=False, nullable=False)
    purchased = Column(Boolean, default=False, nullable=False)
    converted = Column(Boolean, default=False, nullable=False)
    churned = Column(Boolean, default=False, nullable=False)
    revenue = Column(Numeric(12, 2), default=0.0, nullable=False)
    outcome_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    action = relationship("Action", back_populates="outcome")
