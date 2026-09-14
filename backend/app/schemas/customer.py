from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class CustomerBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100, examples=["Sarah"])
    last_name: str = Field(..., min_length=1, max_length=100, examples=["Jenkins"])
    email: EmailStr = Field(..., examples=["sarah.jenkins@example.com"])
    phone: Optional[str] = Field(None, max_length=50, examples=["+1-555-0192"])
    age: Optional[int] = Field(None, ge=0, le=130, examples=[34])
    gender: Optional[str] = Field(None, max_length=20, examples=["Female"])
    acquisition_channel: Optional[str] = Field(None, max_length=100, examples=["Google Search"])
    customer_status: str = Field("Active", max_length=50, examples=["Active"])


class CustomerCreate(CustomerBase):
    external_customer_id: Optional[str] = Field(None, max_length=100, examples=["CUST-10492"])


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[str] = Field(None, max_length=20)
    acquisition_channel: Optional[str] = Field(None, max_length=100)
    customer_status: Optional[str] = Field(None, max_length=50)


class CustomerRead(CustomerBase):
    id: UUID
    external_customer_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
