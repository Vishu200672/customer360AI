from typing import Optional
import uuid
from sqlalchemy import Column, String, Integer, Numeric, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import GUID


class Action(Base):
    __tablename__ = "actions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    customer_id = Column(GUID(), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False, index=True)  # RETENTION, UPSELL, REENGAGEMENT, CROSS_SELL
    product = Column(String(255), nullable=True)
    offer = Column(String(255), nullable=True)
    channel = Column(String(50), nullable=False)  # WhatsApp, Email, SMS, In-App, Push
    timing = Column(String(50), nullable=False)  # immediate, within_24_hours, within_3_days
    message = Column(Text, nullable=True)
    objective = Column(String(255), nullable=False)
    score = Column(Numeric(6, 4), nullable=False)
    rank = Column(Integer, default=1, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, EXECUTED, DISMISSED
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    customer = relationship("Customer", back_populates="actions")
    outcome = relationship("ActionOutcome", back_populates="action", uselist=False, cascade="all, delete-orphan")

    @property
    def action(self) -> str:
        return self.action_type

    @property
    def recommended_offer(self) -> Optional[str]:
        return self.offer

    @property
    def preferred_channel(self) -> str:
        return self.channel

    @property
    def preferred_category(self) -> Optional[str]:
        return self.product

    @property
    def priority(self) -> str:
        if self.score is not None:
            if self.score >= 0.75:
                return "high"
            elif self.score >= 0.45:
                return "medium"
        return "low"

