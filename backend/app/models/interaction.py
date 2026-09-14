import uuid
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import GUID


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    customer_id = Column(GUID(), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)  # page_view, click, cart_add, cart_abandonment, feedback, etc.
    event_value = Column(Numeric(12, 2), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    customer = relationship("Customer", back_populates="interactions")
