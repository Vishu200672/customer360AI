from typing import Optional, Dict
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_prediction_service
from app.services.prediction_service import PredictionService
from app.schemas.common import ResponseEnvelope, PaginatedResponse
from app.schemas.prediction import (
    PredictionCreate,
    PredictionRead,
    PredictionTriggerRequest,
)

router = APIRouter(tags=["Predictions & ML Integration"])


@router.post(
    "/predictions",
    response_model=ResponseEnvelope[PredictionRead],
    status_code=status.HTTP_201_CREATED,
    summary="Store a machine learning prediction",
    description="Ingest prediction output from Vishvam's ML pipeline or external scoring job."
)
def store_prediction(
    payload: PredictionCreate,
    service: PredictionService = Depends(get_prediction_service),
):
    prediction = service.save_prediction(payload)
    return ResponseEnvelope(
        success=True,
        data=PredictionRead.model_validate(prediction),
        message="Prediction persisted successfully."
    )


@router.get(
    "/customers/{customer_id}/predictions",
    response_model=ResponseEnvelope[PaginatedResponse[PredictionRead]],
    summary="List customer prediction history",
    description="Retrieve paginated historical predictions for a specific customer."
)
def list_customer_predictions(
    customer_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    prediction_type: Optional[str] = Query(None, description="Filter by type (churn, purchase_propensity, affinity, clv)"),
    service: PredictionService = Depends(get_prediction_service),
):
    items, total, total_pages = service.list_customer_predictions(
        customer_id=customer_id,
        page=page,
        limit=limit,
        prediction_type=prediction_type,
    )
    return ResponseEnvelope(
        success=True,
        data=PaginatedResponse(
            items=[PredictionRead.model_validate(p) for p in items],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )
    )


@router.get(
    "/customers/{customer_id}/predictions/latest",
    response_model=ResponseEnvelope[Dict[str, PredictionRead]],
    summary="Get latest customer predictions",
    description="Retrieve the most recent prediction for each prediction type for a customer."
)
def get_latest_predictions(
    customer_id: UUID,
    prediction_type: Optional[str] = Query(None, description="Optional type filter"),
    service: PredictionService = Depends(get_prediction_service),
):
    preds = service.get_latest_predictions(customer_id, prediction_type)
    return ResponseEnvelope(
        success=True,
        data={ptype: PredictionRead.model_validate(p) for ptype, p in preds.items()}
    )


@router.post(
    "/customers/{customer_id}/predict",
    response_model=ResponseEnvelope[PredictionRead],
    status_code=status.HTTP_201_CREATED,
    summary="Trigger on-demand prediction for customer",
    description="Generate prediction on current customer feature state via configured MLClient (local heuristic demo or remote ML service)."
)
def trigger_prediction(
    customer_id: UUID,
    payload: PredictionTriggerRequest = PredictionTriggerRequest(),
    service: PredictionService = Depends(get_prediction_service),
):
    prediction = service.trigger_prediction(
        customer_id=customer_id,
        prediction_type=payload.prediction_type,
    )
    return ResponseEnvelope(
        success=True,
        data=PredictionRead.model_validate(prediction),
        message="On-demand prediction generated and stored."
    )
