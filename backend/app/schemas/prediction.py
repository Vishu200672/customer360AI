from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.explanation import ExplanationCreate, ExplanationRead

# Supported Prediction Types in Customer360 AI
SUPPORTED_PREDICTION_TYPES = ("churn", "purchase_propensity", "affinity", "clv")


class PredictionBase(BaseModel):
    model_name: str = Field(..., min_length=1, max_length=100, examples=["xgboost_churn"])
    model_version: str = Field(..., min_length=1, max_length=50, examples=["2.1.0"])
    prediction_type: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Type of prediction: churn, purchase_propensity, affinity, clv",
        examples=["churn"]
    )
    score: Decimal = Field(..., description="Continuous score, probability, or CLV dollar amount", examples=[0.84])
    predicted_class: Optional[str] = Field(None, max_length=50, examples=["high_risk"])
    confidence: Optional[Decimal] = Field(None, ge=0, le=1, examples=[0.92])


class PredictionCreate(PredictionBase):
    customer_id: UUID = Field(..., examples=["9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"])
    model_run_id: Optional[UUID] = None
    explanations: Optional[List[ExplanationCreate]] = Field(
        default=None,
        description="Optional list of SHAP feature contributions"
    )


class PredictionRead(PredictionBase):
    id: UUID
    customer_id: UUID
    model_run_id: Optional[UUID] = None
    created_at: datetime
    explanations: List[ExplanationRead] = Field(
        default_factory=list,
        description="Persisted SHAP explanations for this prediction"
    )

    model_config = ConfigDict(from_attributes=True)


class PredictionTriggerRequest(BaseModel):
    prediction_type: str = Field(
        default="churn",
        description="Prediction type to compute: churn, purchase_propensity, affinity, clv, or all",
        examples=["churn"]
    )
