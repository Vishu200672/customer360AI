import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import GUID


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    customer_id = Column(GUID(), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    reference_id = Column(String(100), unique=True, nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    product_sku = Column(String(100), nullable=True)
    category = Column(String(100), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    transaction_time = Column(DateTime(timezone=True), nullable=False, index=True)
    channel = Column(String(50), default="Online", nullable=False)
    status = Column(String(50), default="Completed", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="transactions")
