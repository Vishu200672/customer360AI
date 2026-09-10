from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_action_service
from app.schemas.action import (
    ActionCreate,
    ActionRead,
    ActionUpdate,
    ActionOutcomeCreate,
    ActionOutcomeRead,
)
from app.schemas.common import ResponseEnvelope, PaginatedResponse
from app.services.action_service import ActionService

router = APIRouter(tags=["Actions and Outcomes"])


@router.post(
    "/customers/{customer_id}/actions",
    response_model=ResponseEnvelope[ActionRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create an action recommendation for a customer",
)
def create_customer_action(
    customer_id: UUID,
    payload: ActionCreate,
    service: ActionService = Depends(get_action_service),
):
    action = service.create_action(customer_id=customer_id, data=payload)
    return ResponseEnvelope(
        success=True,
        data=ActionRead.model_validate(action),
        message="Action recommendation created successfully."
    )


@router.get(
    "/customers/{customer_id}/actions",
    response_model=ResponseEnvelope[PaginatedResponse[ActionRead]],
    status_code=status.HTTP_200_OK,
    summary="List actions for a customer",
)
def list_customer_actions(
    customer_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by action status"),
    service: ActionService = Depends(get_action_service),
):
    items, total, total_pages = service.list_customer_actions(
        customer_id=customer_id,
        page=page,
        limit=limit,
        status=status,
    )
    return ResponseEnvelope(
        success=True,
        data=PaginatedResponse(
            items=[ActionRead.model_validate(a) for a in items],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        ),
        message="Customer actions retrieved successfully."
    )


@router.get(
    "/customers/{customer_id}/actions/latest",
    response_model=ResponseEnvelope[Optional[ActionRead]],
    status_code=status.HTTP_200_OK,
    summary="Get the latest action recommendation for a customer",
)
def get_latest_customer_action(
    customer_id: UUID,
    status: Optional[str] = Query(None, description="Optional status filter"),
    service: ActionService = Depends(get_action_service),
):
    action = service.get_latest_action(customer_id=customer_id, status=status)
    return ResponseEnvelope(
        success=True,
        data=ActionRead.model_validate(action) if action else None,
        message="Latest action retrieved successfully."
    )


@router.get(
    "/actions/{action_id}",
    response_model=ResponseEnvelope[ActionRead],
    status_code=status.HTTP_200_OK,
    summary="Get an action by ID",
)
def get_action_by_id(
    action_id: UUID,
    service: ActionService = Depends(get_action_service),
):
    action = service.get_action(action_id=action_id)
    return ResponseEnvelope(
        success=True,
        data=ActionRead.model_validate(action),
        message="Action retrieved successfully."
    )


@router.patch(
    "/actions/{action_id}",
    response_model=ResponseEnvelope[ActionRead],
    status_code=status.HTTP_200_OK,
    summary="Update an action",
)
def update_action(
    action_id: UUID,
    payload: ActionUpdate,
    service: ActionService = Depends(get_action_service),
):
    action = service.update_action(action_id=action_id, data=payload)
    return ResponseEnvelope(
        success=True,
        data=ActionRead.model_validate(action),
        message="Action updated successfully."
    )


@router.post(
    "/actions/{action_id}/outcome",
    response_model=ResponseEnvelope[ActionOutcomeRead],
    status_code=status.HTTP_201_CREATED,
    summary="Record the execution outcome of an action",
)
def record_action_outcome(
    action_id: UUID,
    payload: ActionOutcomeCreate,
    service: ActionService = Depends(get_action_service),
):
    outcome = service.record_action_outcome(action_id=action_id, data=payload)
    return ResponseEnvelope(
        success=True,
        data=ActionOutcomeRead.model_validate(outcome),
        message="Action outcome recorded successfully."
    )


@router.get(
    "/actions/{action_id}/outcomes",
    response_model=ResponseEnvelope[List[ActionOutcomeRead]],
    status_code=status.HTTP_200_OK,
    summary="Get outcomes for an action (list format)",
)
def get_action_outcomes(
    action_id: UUID,
    service: ActionService = Depends(get_action_service),
):
    outcome = service.get_action_outcome(action_id=action_id)
    return ResponseEnvelope(
        success=True,
        data=[ActionOutcomeRead.model_validate(outcome)] if outcome else [],
        message="Action outcomes retrieved successfully."
    )


@router.get(
    "/actions/{action_id}/outcome",
    response_model=ResponseEnvelope[Optional[ActionOutcomeRead]],
    status_code=status.HTTP_200_OK,
    summary="Get outcome for an action (single object format)",
)
def get_single_action_outcome(
    action_id: UUID,
    service: ActionService = Depends(get_action_service),
):
    outcome = service.get_action_outcome(action_id=action_id)
    return ResponseEnvelope(
        success=True,
        data=ActionOutcomeRead.model_validate(outcome) if outcome else None,
        message="Action outcome retrieved successfully."
    )
