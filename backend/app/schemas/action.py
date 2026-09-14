from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


VALID_ACTION_STATUSES = {"PENDING", "EXECUTED", "DISMISSED"}


class ActionOutcomeBase(BaseModel):
    delivered: bool = Field(False, description="Whether the action message was successfully delivered")
    opened: bool = Field(False, description="Whether the message or notification was opened")
    clicked: bool = Field(False, description="Whether the customer clicked the call-to-action link")
    purchased: bool = Field(False, description="Whether the customer completed a purchase")
    converted: bool = Field(False, description="Whether the target business conversion goal was met")
    churned: bool = Field(False, description="Whether the customer churned following this action")
    revenue: Decimal = Field(Decimal("0.0"), description="Direct revenue attributed to this action execution")
    executed_at: Optional[datetime] = Field(None, description="Timestamp when the action was dispatched")
    outcome_metadata: Optional[Dict[str, Any]] = Field(None, description="Detailed campaign or delivery telemetry")


class ActionOutcomeCreate(ActionOutcomeBase):
    @field_validator("revenue")
    @classmethod
    def validate_revenue(cls, v: Decimal) -> Decimal:
        if v < Decimal("0.0"):
            raise ValueError("Outcome revenue cannot be negative.")
        return v


class ActionOutcomeRead(ActionOutcomeBase):
    id: UUID
    action_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActionBase(BaseModel):
    action: Optional[str] = Field(None, description="Action title from ML recommendation (e.g., 'Conversion acceleration')")
    action_type: Optional[str] = Field(None, max_length=100, description="Category/type of action")
    reason: str = Field(..., min_length=1, description="Explainable rationale justifying why this action is recommended")
    recommended_offer: Optional[str] = Field(None, max_length=255, description="Specific recommended offer or discount")
    offer: Optional[str] = Field(None, max_length=255, description="Offer details")
    preferred_channel: Optional[str] = Field(None, max_length=50, description="Preferred delivery channel")
    channel: Optional[str] = Field(None, max_length=50, description="Delivery channel (WhatsApp, Email, SMS, In-App, Push)")
    preferred_category: Optional[str] = Field(None, max_length=255, description="Preferred product category")
    product: Optional[str] = Field(None, max_length=255, description="Recommended product name or SKU if applicable")
    priority: Optional[str] = Field(None, description="Priority level: high, medium, low")
    score: Optional[Decimal] = Field(None, description="Action priority or confidence score [0.0 - 1.0]")
    timing: Optional[str] = Field("immediate", max_length=50, description="Recommended timing")
    message: Optional[str] = Field(None, description="Personalized message copy")
    objective: Optional[str] = Field(None, max_length=255, description="Business objective")
    rank: int = Field(1, ge=1, description="Rank priority (1 = highest)")
    status: str = Field("PENDING", max_length=50, description="Action status: PENDING, EXECUTED, or DISMISSED")


class ActionCreate(ActionBase):
    prediction_id: Optional[UUID] = Field(
        None,
        description="Optional ID of the prediction that triggered or justifies this action"
    )

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Resolve action / action_type
            raw_action = data.get("action")
            raw_type = data.get("action_type")
            if not raw_action and not raw_type:
                raise ValueError("An action or action_type must be provided.")
            resolved_action = str(raw_action or raw_type).strip()
            resolved_type = str(raw_type or raw_action).strip()
            data["action"] = resolved_action
            data["action_type"] = resolved_type

            # Resolve offer / recommended_offer
            off = data.get("recommended_offer") or data.get("offer")
            if off:
                data["recommended_offer"] = str(off).strip()
                data["offer"] = str(off).strip()

            # Resolve channel / preferred_channel
            chan = data.get("preferred_channel") or data.get("channel") or "Email"
            data["preferred_channel"] = str(chan).strip()
            data["channel"] = str(chan).strip()

            # Resolve product / preferred_category
            prod = data.get("preferred_category") or data.get("product")
            if prod:
                data["preferred_category"] = str(prod).strip()
                data["product"] = str(prod).strip()

            # Resolve priority / score
            prio = data.get("priority")
            sc = data.get("score")
            if sc is not None:
                try:
                    sc_dec = Decimal(str(sc))
                    data["score"] = sc_dec
                    if not prio:
                        data["priority"] = "high" if sc_dec >= Decimal("0.75") else ("medium" if sc_dec >= Decimal("0.45") else "low")
                except Exception:
                    pass
            elif prio:
                prio_str = str(prio).lower()
                data["priority"] = prio_str
                if prio_str == "high":
                    data["score"] = Decimal("0.85")
                elif prio_str == "medium":
                    data["score"] = Decimal("0.60")
                elif prio_str == "low":
                    data["score"] = Decimal("0.35")
                else:
                    data["score"] = Decimal("0.50")
            else:
                data["priority"] = "medium"
                data["score"] = Decimal("0.60")

            # Resolve objective
            if not data.get("objective"):
                data["objective"] = data["action_type"]

            # Resolve timing
            if not data.get("timing"):
                data["timing"] = "immediate"

            # Validate status
            st = data.get("status", "PENDING")
            if st and str(st).upper() in VALID_ACTION_STATUSES:
                data["status"] = str(st).upper()
            else:
                data["status"] = "PENDING"

        return data

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        upper = v.upper()
        if upper not in VALID_ACTION_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Allowed values: {VALID_ACTION_STATUSES}")
        return upper


class ActionUpdate(BaseModel):
    status: Optional[str] = Field(None, description="Updated status: PENDING, EXECUTED, or DISMISSED")
    message: Optional[str] = None
    channel: Optional[str] = None
    timing: Optional[str] = None
    reason: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            upper = v.upper()
            if upper not in VALID_ACTION_STATUSES:
                raise ValueError(f"Invalid status '{v}'. Allowed values: {VALID_ACTION_STATUSES}")
            return upper
        return v


class ActionRead(BaseModel):
    id: UUID
    customer_id: UUID
    action: Optional[str] = None
    action_type: str
    reason: str
    recommended_offer: Optional[str] = None
    offer: Optional[str] = None
    preferred_channel: Optional[str] = None
    channel: str
    preferred_category: Optional[str] = None
    product: Optional[str] = None
    priority: Optional[str] = None
    score: Decimal
    timing: str = "immediate"
    message: Optional[str] = None
    objective: str = ""
    rank: int = 1
    status: str
    created_at: datetime
    outcome: Optional[ActionOutcomeRead] = None

    model_config = ConfigDict(from_attributes=True)
