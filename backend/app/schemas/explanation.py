from typing import Optional, List, Dict, Any, Literal
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ExplanationBase(BaseModel):
    feature_name: str = Field(..., min_length=1, max_length=100, examples=["days_inactive"])
    feature_value: Optional[Decimal] = Field(None, examples=[45.0])
    contribution: Decimal = Field(..., description="SHAP feature contribution value", examples=[0.35])
    rank: int = Field(..., ge=1, description="Feature importance rank (1 = most influential)", examples=[1])
    direction: Literal["positive", "negative"] = Field(
        ...,
        description="'positive' (increases prediction score) or 'negative' (decreases score)",
        examples=["positive"]
    )
    explanation_metadata: Optional[Dict[str, Any]] = Field(None, examples=[{"method": "tree_shap"}])


class ExplanationCreate(ExplanationBase):
    pass


class ExplanationBatchCreate(BaseModel):
    explanations: List[ExplanationCreate] = Field(..., min_length=1, description="List of SHAP feature contributions")


class ExplanationRead(ExplanationBase):
    id: UUID
    prediction_id: UUID

    model_config = ConfigDict(from_attributes=True)
