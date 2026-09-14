from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_explanation_service
from app.services.explanation_service import ExplanationService
from app.schemas.common import ResponseEnvelope
from app.schemas.explanation import (
    ExplanationRead,
    ExplanationBatchCreate,
)

router = APIRouter(tags=["Explainability & SHAP Drivers"])


@router.get(
    "/predictions/{prediction_id}/explanations",
    response_model=ResponseEnvelope[List[ExplanationRead]],
    summary="Get SHAP explanations for a prediction",
    description="Retrieve all feature contribution explanations for a specific prediction, ordered by importance rank."
)
def get_prediction_explanations(
    prediction_id: UUID,
    service: ExplanationService = Depends(get_explanation_service),
):
    explanations = service.get_explanations_for_prediction(prediction_id)
    return ResponseEnvelope(
        success=True,
        data=[ExplanationRead.model_validate(e) for e in explanations]
    )


@router.post(
    "/predictions/{prediction_id}/explanations",
    response_model=ResponseEnvelope[List[ExplanationRead]],
    status_code=status.HTTP_201_CREATED,
    summary="Attach SHAP explanations to a prediction",
    description="Batch ingest SHAP feature contributions for an existing prediction."
)
def add_prediction_explanations(
    prediction_id: UUID,
    payload: ExplanationBatchCreate,
    service: ExplanationService = Depends(get_explanation_service),
):
    records = service.add_explanations_to_prediction(
        prediction_id=prediction_id,
        explanations_data=payload.explanations,
    )
    return ResponseEnvelope(
        success=True,
        data=[ExplanationRead.model_validate(e) for e in records],
        message="Explanations persisted successfully."
    )


@router.get(
    "/customers/{customer_id}/explanations",
    response_model=ResponseEnvelope[List[ExplanationRead]],
    summary="Get SHAP explanations for a customer",
    description="Retrieve historical feature contributions across customer's predictions."
)
def get_customer_explanations(
    customer_id: UUID,
    limit: int = Query(50, ge=1, le=100, description="Max explanation records to return"),
    service: ExplanationService = Depends(get_explanation_service),
):
    explanations = service.get_explanations_for_customer(customer_id, limit=limit)
    return ResponseEnvelope(
        success=True,
        data=[ExplanationRead.model_validate(e) for e in explanations]
    )
