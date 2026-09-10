from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ActionPerformanceSummary(BaseModel):
    total_actions: int = Field(0, description="Total recommended actions created")
    pending_actions: int = Field(0, description="Actions waiting to be executed")
    executed_actions: int = Field(0, description="Actions executed or delivered")
    dismissed_actions: int = Field(0, description="Actions dismissed or cancelled")
    outcomes_recorded: int = Field(0, description="Total action outcome records logged")

    model_config = ConfigDict(from_attributes=True)


class ActionEngagementMetrics(BaseModel):
    delivered: int = Field(0, description="Number of actions delivered to recipient")
    opened: int = Field(0, description="Number of actions opened by recipient")
    clicked: int = Field(0, description="Number of actions clicked by recipient")
    delivery_rate: float = Field(0.0, description="Ratio of delivered to total actions [0.0 - 1.0]")
    open_rate: float = Field(0.0, description="Ratio of opened to delivered actions [0.0 - 1.0]")
    click_rate: float = Field(0.0, description="Ratio of clicked to delivered actions [0.0 - 1.0]")
    click_through_rate: float = Field(0.0, description="Ratio of clicked to opened actions [0.0 - 1.0]")

    model_config = ConfigDict(from_attributes=True)


class ActionConversionMetrics(BaseModel):
    purchased: int = Field(0, description="Number of actions leading to a purchase")
    converted: int = Field(0, description="Number of actions achieving business conversion objective")
    churned: int = Field(0, description="Number of customers churned despite the action")
    conversion_rate: float = Field(0.0, description="Ratio of converted to delivered actions [0.0 - 1.0]")
    total_revenue: Decimal = Field(Decimal("0.0"), description="Total revenue attributed to action outcomes")
    average_revenue_per_converted: Decimal = Field(
        Decimal("0.0"),
        description="Average revenue per converted action"
    )

    model_config = ConfigDict(from_attributes=True)


class ChannelPerformanceMetrics(BaseModel):
    channel: str = Field(..., description="Communication channel name (e.g. Email, WhatsApp, Push)")
    total_actions: int = Field(0, description="Actions sent via this channel")
    delivered: int = Field(0, description="Delivered count")
    converted: int = Field(0, description="Converted count")
    conversion_rate: float = Field(0.0, description="Channel conversion rate")
    total_revenue: Decimal = Field(Decimal("0.0"), description="Channel attributed revenue")

    model_config = ConfigDict(from_attributes=True)


class ActionTypePerformanceMetrics(BaseModel):
    action_type: str = Field(..., description="Action category/type (e.g. RETENTION, UPSELL, REENGAGEMENT)")
    total_actions: int = Field(0, description="Total actions of this type")
    converted: int = Field(0, description="Converted actions")
    conversion_rate: float = Field(0.0, description="Action type conversion rate")
    total_revenue: Decimal = Field(Decimal("0.0"), description="Total attributed revenue")

    model_config = ConfigDict(from_attributes=True)


class ActionAnalyticsRead(BaseModel):
    summary: ActionPerformanceSummary = Field(..., description="Overall action volume counts")
    engagement: ActionEngagementMetrics = Field(..., description="Delivery and open/click engagement rates")
    conversions: ActionConversionMetrics = Field(..., description="Conversion and financial outcome metrics")
    by_channel: List[ChannelPerformanceMetrics] = Field(
        default_factory=list,
        description="Performance grouped by communication channel"
    )
    by_action_type: List[ActionTypePerformanceMetrics] = Field(
        default_factory=list,
        description="Performance grouped by action type / recommendation category"
    )

    model_config = ConfigDict(from_attributes=True)


class CustomerActionFeedbackRead(BaseModel):
    customer_id: UUID = Field(..., description="Unique customer identifier")
    summary: ActionPerformanceSummary = Field(..., description="Summary counts of actions for this customer")
    engagement: ActionEngagementMetrics = Field(..., description="Engagement counts and rates")
    conversions: ActionConversionMetrics = Field(..., description="Conversion counts and attributed revenue")

    model_config = ConfigDict(from_attributes=True)
