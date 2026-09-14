from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class InteractionBase(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100, examples=["cart_abandonment"])
    event_value: Optional[Decimal] = Field(None, decimal_places=2, examples=[249.50])
    metadata_json: Optional[Dict[str, Any]] = Field(None, examples=[{"cart_items_count": 3, "abandoned_url": "/checkout"}])
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, examples=["2026-03-05T18:45:00Z"])


class InteractionCreate(InteractionBase):
    customer_id: UUID = Field(..., examples=["9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"])


class InteractionRead(InteractionBase):
    id: UUID
    customer_id: UUID

    model_config = ConfigDict(from_attributes=True)
