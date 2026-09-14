from fastapi import APIRouter, Depends, status

from app.api.deps import get_interaction_service
from app.services.interaction_service import InteractionService
from app.schemas.common import ResponseEnvelope
from app.schemas.interaction import InteractionRead, InteractionCreate

router = APIRouter(prefix="/interactions", tags=["Interactions & Events"])


@router.post(
    "",
    response_model=ResponseEnvelope[InteractionRead],
    status_code=status.HTTP_201_CREATED,
    summary="Ingest customer behavioral interaction event",
    description="Ingest real-time customer signal (e.g. cart_abandonment, page_view, feedback, inactivity)."
)
def record_interaction(
    payload: InteractionCreate,
    service: InteractionService = Depends(get_interaction_service),
):
    interaction = service.record_interaction(payload)
    return ResponseEnvelope(
        success=True,
        data=InteractionRead.model_validate(interaction),
        message="Interaction event ingested successfully."
    )
