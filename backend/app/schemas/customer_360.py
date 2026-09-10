from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.customer import CustomerRead
from app.schemas.transaction import TransactionRead
from app.schemas.interaction import InteractionRead


class CustomerFeatureRead(BaseModel):
    recency_days: int = Field(0, description="Days since last purchase")
    frequency_count: int = Field(0, description="Total completed transaction count")
    monetary_value: Decimal = Field(Decimal("0.0"), description="Total customer spending")
    days_inactive: int = Field(0, description="Days since last customer activity")
    engagement_score: Decimal = Field(Decimal("0.0"), description="Computed engagement score [0.0 - 1.0]")
    cart_abandonment_count: int = Field(0, description="Number of abandoned cart events")
    purchase_frequency: Decimal = Field(Decimal("0.0"), description="Purchases per month or frequency metric")
    average_order_value: Decimal = Field(Decimal("0.0"), description="Average spend per transaction")
    estimated_clv: Decimal = Field(Decimal("0.0"), description="Estimated Customer Lifetime Value")
    extra_features: Optional[Dict[str, Any]] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SegmentRead(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PredictionSummaryRead(BaseModel):
    id: UUID
    model_name: str
    model_version: str
    prediction_type: str = Field(..., description="churn, purchase_propensity, affinity, or clv")
    score: Decimal = Field(..., description="Score value or probability")
    predicted_class: Optional[str] = None
    confidence: Optional[Decimal] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ShapDriverRead(BaseModel):
    feature_name: str
    feature_value: Optional[Decimal] = None
    contribution: Decimal = Field(..., description="SHAP value (positive or negative contribution)")
    rank: int = Field(..., description="Importance rank order")
    direction: str = Field(..., description="'positive' (increases prediction) or 'negative' (decreases)")

    model_config = ConfigDict(from_attributes=True)


class ActionOutcomeRead(BaseModel):
    id: UUID
    delivered: bool = False
    opened: bool = False
    clicked: bool = False
    purchased: bool = False
    converted: bool = False
    churned: bool = False
    revenue: Decimal = Decimal("0.0")
    executed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ActionSummaryRead(BaseModel):
    id: UUID
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
    timing: Optional[str] = "immediate"
    message: Optional[str] = None
    objective: Optional[str] = ""
    rank: int = 1
    status: str
    created_at: datetime
    outcome: Optional[ActionOutcomeRead] = None

    model_config = ConfigDict(from_attributes=True)


class Customer360Read(BaseModel):
    profile: CustomerRead = Field(..., description="Unified customer demographic and contact profile")
    features: Optional[CustomerFeatureRead] = Field(None, description="Derived RFM and behavioral features")
    segments: List[SegmentRead] = Field(default_factory=list, description="Customer segments assigned")
    predictions: Dict[str, PredictionSummaryRead] = Field(
        default_factory=dict,
        description="Latest model predictions indexed by prediction_type (e.g. churn, purchase_propensity, clv)"
    )
    shap_drivers: List[ShapDriverRead] = Field(
        default_factory=list,
        description="Top SHAP feature drivers explaining the primary prediction"
    )
    next_best_action: Optional[ActionSummaryRead] = Field(
        None,
        description="Active top-ranked Next Best Action recommendation"
    )
    recent_transactions: List[TransactionRead] = Field(
        default_factory=list,
        description="Recent transaction history (up to 10 most recent)"
    )
    recent_interactions: List[InteractionRead] = Field(
        default_factory=list,
        description="Recent customer behavioral interactions timeline (up to 15 most recent)"
    )
    action_history: List[ActionSummaryRead] = Field(
        default_factory=list,
        description="Past executed or dismissed actions with outcome tracking"
    )
    action_feedback: Optional["CustomerActionFeedbackRead"] = Field(
        None,
        description="Aggregated historical action performance and feedback intelligence metrics"
    )

    model_config = ConfigDict(from_attributes=True)


from app.schemas.analytics import CustomerActionFeedbackRead
Customer360Read.model_rebuild()

