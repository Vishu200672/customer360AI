from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status

from app.api.deps import (
    get_customer_service,
    get_transaction_service,
    get_interaction_service,
)
from app.services.customer_service import CustomerService
from app.services.transaction_service import TransactionService
from app.services.interaction_service import InteractionService
from app.schemas.common import ResponseEnvelope, PaginatedResponse
from app.schemas.customer import CustomerRead, CustomerCreate, CustomerUpdate
from app.schemas.transaction import TransactionRead
from app.schemas.interaction import InteractionRead
from app.schemas.customer_360 import Customer360Read

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get(
    "",
    response_model=ResponseEnvelope[PaginatedResponse[CustomerRead]],
    summary="List customers with filters",
    description="Retrieve paginated list of customers with optional search and status filtering."
)
def list_customers(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    status: Optional[str] = Query(None, description="Filter by customer status (e.g. Active, At-Risk, Churned)"),
    search: Optional[str] = Query(None, description="Search across name, email, or external ID"),
    service: CustomerService = Depends(get_customer_service),
):
    items, total, total_pages = service.list_customers(
        page=page, limit=limit, status=status, search=search
    )
    return ResponseEnvelope(
        success=True,
        data=PaginatedResponse(
            items=[CustomerRead.model_validate(c) for c in items],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )
    )


@router.post(
    "",
    response_model=ResponseEnvelope[CustomerRead],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer",
    description="Create a new customer profile and initialize default customer feature state."
)
def create_customer(
    payload: CustomerCreate,
    service: CustomerService = Depends(get_customer_service),
):
    customer = service.create_customer(payload)
    return ResponseEnvelope(
        success=True,
        data=CustomerRead.model_validate(customer),
        message="Customer registered successfully."
    )


@router.get(
    "/{customer_id}/360",
    response_model=ResponseEnvelope[Customer360Read],
    summary="Unified Customer 360 View",
    description="Central aggregated decision intelligence view combining profile, RFM features, segments, predictions, SHAP drivers, active Next Best Action, recent transactions, and interactions."
)
def get_customer_360(
    customer_id: UUID,
    transaction_limit: int = Query(10, ge=1, le=50, description="Max recent transactions to include"),
    interaction_limit: int = Query(15, ge=1, le=50, description="Max recent interactions to include"),
    service: CustomerService = Depends(get_customer_service),
):
    data = service.get_customer_360(
        customer_id=customer_id,
        transaction_limit=transaction_limit,
        interaction_limit=interaction_limit,
    )
    return ResponseEnvelope(
        success=True,
        data=data,
    )


@router.get(
    "/{customer_id}",
    response_model=ResponseEnvelope[CustomerRead],
    summary="Get customer profile by ID",
    description="Retrieve single customer profile details."
)
def get_customer(
    customer_id: UUID,
    service: CustomerService = Depends(get_customer_service),
):
    customer = service.get_customer(customer_id)
    return ResponseEnvelope(
        success=True,
        data=CustomerRead.model_validate(customer)
    )


@router.patch(
    "/{customer_id}",
    response_model=ResponseEnvelope[CustomerRead],
    summary="Update customer profile",
    description="Partially update customer attributes."
)
def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    service: CustomerService = Depends(get_customer_service),
):
    updated = service.update_customer(customer_id, payload)
    return ResponseEnvelope(
        success=True,
        data=CustomerRead.model_validate(updated),
        message="Customer updated successfully."
    )


@router.get(
    "/{customer_id}/transactions",
    response_model=ResponseEnvelope[PaginatedResponse[TransactionRead]],
    summary="Get customer transaction history",
    description="Retrieve paginated list of transactions for a specific customer with optional category and date filtering."
)
def list_customer_transactions(
    customer_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    category: Optional[str] = Query(None, description="Filter by category"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    service: TransactionService = Depends(get_transaction_service),
):
    items, total, total_pages = service.list_customer_transactions(
        customer_id=customer_id,
        page=page,
        limit=limit,
        category=category,
        start_date=start_date,
        end_date=end_date,
    )
    return ResponseEnvelope(
        success=True,
        data=PaginatedResponse(
            items=[TransactionRead.model_validate(t) for t in items],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )
    )


@router.get(
    "/{customer_id}/interactions",
    response_model=ResponseEnvelope[PaginatedResponse[InteractionRead]],
    summary="Get customer interaction event timeline",
    description="Retrieve paginated list of behavioral interactions for a specific customer with optional event_type filtering."
)
def list_customer_interactions(
    customer_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    service: InteractionService = Depends(get_interaction_service),
):
    items, total, total_pages = service.list_customer_interactions(
        customer_id=customer_id,
        page=page,
        limit=limit,
        event_type=event_type,
    )
    return ResponseEnvelope(
        success=True,
        data=PaginatedResponse(
            items=[InteractionRead.model_validate(i) for i in items],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )
    )


from app.api.deps import get_analytics_service
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import CustomerActionFeedbackRead


@router.get(
    "/{customer_id}/feedback",
    response_model=ResponseEnvelope[CustomerActionFeedbackRead],
    summary="Get customer action feedback and performance metrics",
    description="Retrieve aggregated delivery, engagement, and conversion metrics for actions directed at a specific customer."
)
def get_customer_action_feedback(
    customer_id: UUID,
    service: AnalyticsService = Depends(get_analytics_service),
):
    feedback = service.get_customer_feedback(customer_id)
    return ResponseEnvelope(
        success=True,
        data=feedback,
        message="Customer action feedback retrieved successfully."
    )

