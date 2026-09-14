from fastapi import APIRouter, Depends, status

from app.api.deps import get_transaction_service
from app.services.transaction_service import TransactionService
from app.schemas.common import ResponseEnvelope
from app.schemas.transaction import TransactionRead, TransactionCreate

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post(
    "",
    response_model=ResponseEnvelope[TransactionRead],
    status_code=status.HTTP_201_CREATED,
    summary="Record a new transaction",
    description="Ingest a completed or pending customer transaction, updating RFM metrics."
)
def create_transaction(
    payload: TransactionCreate,
    service: TransactionService = Depends(get_transaction_service),
):
    transaction = service.create_transaction(payload)
    return ResponseEnvelope(
        success=True,
        data=TransactionRead.model_validate(transaction),
        message="Transaction recorded and RFM metrics refreshed."
    )
