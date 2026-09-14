from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class TransactionBase(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=255, examples=["Wireless Noise-Canceling Headphones"])
    product_sku: Optional[str] = Field(None, max_length=100, examples=["SKU-AUDIO-99"])
    category: str = Field(..., min_length=1, max_length=100, examples=["Electronics"])
    amount: Decimal = Field(..., gt=0, decimal_places=2, examples=[199.99])
    quantity: int = Field(1, ge=1, examples=[1])
    transaction_time: Optional[datetime] = Field(default_factory=datetime.utcnow, examples=["2026-03-01T14:30:00Z"])
    channel: str = Field("Online", max_length=50, examples=["Online"])
    status: str = Field("Completed", max_length=50, examples=["Completed"])


class TransactionCreate(TransactionBase):
    customer_id: UUID = Field(..., examples=["9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"])
    reference_id: Optional[str] = Field(None, max_length=100, examples=["TXN-2026-08129"])


class TransactionRead(TransactionBase):
    id: UUID
    customer_id: UUID
    reference_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
