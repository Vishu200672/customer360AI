import uuid
from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import GUID


class CustomerFeature(Base):
    __tablename__ = "customer_features"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    customer_id = Column(GUID(), ForeignKey("customers.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # RFM Metrics
    recency_days = Column(Integer, default=0, nullable=False)
    frequency_count = Column(Integer, default=0, nullable=False)
    monetary_value = Column(Numeric(12, 2), default=0.0, nullable=False)

    # Behavioral Features
    days_inactive = Column(Integer, default=0, nullable=False)
    engagement_score = Column(Numeric(5, 4), default=0.0, nullable=False)
    cart_abandonment_count = Column(Integer, default=0, nullable=False)
    purchase_frequency = Column(Numeric(8, 4), default=0.0, nullable=False)
    average_order_value = Column(Numeric(12, 2), default=0.0, nullable=False)
    estimated_clv = Column(Numeric(12, 2), default=0.0, nullable=False)

    # Extensible feature bucket
    extra_features = Column(JSON, nullable=True)

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="features")
