from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_analytics_service
from app.schemas.analytics import ActionAnalyticsRead
from app.schemas.common import ResponseEnvelope
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics & Feedback Intelligence"])


@router.get(
    "/actions",
    response_model=ResponseEnvelope[ActionAnalyticsRead],
    status_code=status.HTTP_200_OK,
    summary="Get global action performance analytics",
    description="Retrieve aggregate action delivery, engagement, and conversion metrics across the platform with optional filtering.",
)
def get_action_analytics(
    action_type: Optional[str] = Query(None, description="Filter by action type (e.g. RETENTION, UPSELL)"),
    channel: Optional[str] = Query(None, description="Filter by channel (e.g. Email, WhatsApp, Push)"),
    status: Optional[str] = Query(None, description="Filter by action status (PENDING, EXECUTED, DISMISSED)"),
    start_date: Optional[datetime] = Query(None, description="Start datetime for filtering actions"),
    end_date: Optional[datetime] = Query(None, description="End datetime for filtering actions"),
    service: AnalyticsService = Depends(get_analytics_service),
):
    analytics = service.get_action_analytics(
        action_type=action_type,
        channel=channel,
        status=status,
        start_date=start_date,
        end_date=end_date,
    )
    return ResponseEnvelope(
        success=True,
        data=analytics,
        message="Action performance analytics retrieved successfully."
    )
