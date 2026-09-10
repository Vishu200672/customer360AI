from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.customer_service import CustomerService
from app.services.transaction_service import TransactionService
from app.services.interaction_service import InteractionService
from app.services.prediction_service import PredictionService
from app.services.explanation_service import ExplanationService
from app.services.action_service import ActionService
from app.services.analytics_service import AnalyticsService


def get_customer_service(db: Session = Depends(get_db)) -> CustomerService:
    return CustomerService(db)


def get_transaction_service(db: Session = Depends(get_db)) -> TransactionService:
    return TransactionService(db)


def get_interaction_service(db: Session = Depends(get_db)) -> InteractionService:
    return InteractionService(db)


def get_prediction_service(db: Session = Depends(get_db)) -> PredictionService:
    return PredictionService(db)


def get_explanation_service(db: Session = Depends(get_db)) -> ExplanationService:
    return ExplanationService(db)


def get_action_service(db: Session = Depends(get_db)) -> ActionService:
    return ActionService(db)


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)

