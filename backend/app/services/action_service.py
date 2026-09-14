from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundException, ValidationException
from app.models.customer import Customer
from app.models.action import Action
from app.models.action_outcome import ActionOutcome
from app.models.prediction import Prediction
from app.schemas.action import (
    ActionCreate,
    ActionUpdate,
    ActionOutcomeCreate,
)
from app.repositories.action_repository import ActionRepository


class ActionService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = ActionRepository(db)

    def _verify_customer(self, customer_id: UUID) -> Customer:
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ResourceNotFoundException("Customer", customer_id)
        return customer

    def _verify_action(self, action_id: UUID) -> Action:
        action = self.repository.get_by_id(action_id)
        if not action:
            raise ResourceNotFoundException("Action", action_id)
        return action

    def _verify_prediction_linkage(self, customer_id: UUID, prediction_id: UUID) -> Prediction:
        prediction = self.db.query(Prediction).filter(Prediction.id == prediction_id).first()
        if not prediction:
            raise ResourceNotFoundException("Prediction", prediction_id)
        if str(prediction.customer_id) != str(customer_id):
            raise ValidationException(
                f"Prediction '{prediction_id}' does not belong to customer '{customer_id}'."
            )
        return prediction

    def create_action(self, customer_id: UUID, data: ActionCreate) -> Action:
        self._verify_customer(customer_id)

        if data.prediction_id:
            self._verify_prediction_linkage(customer_id, data.prediction_id)

        action = Action(
            customer_id=customer_id,
            action_type=data.action_type,
            product=data.product,
            offer=data.offer,
            channel=data.channel,
            timing=data.timing or "immediate",
            message=data.message,
            objective=data.objective or data.action_type,
            score=data.score if data.score is not None else Decimal("0.60"),
            rank=data.rank,
            reason=data.reason,
            status=data.status or "PENDING",
            created_at=datetime.utcnow(),
        )
        return self.repository.create(action)

    def create_action_from_nba(
        self,
        customer_id: UUID,
        nba_data: Dict[str, Any],
        prediction_id: Optional[UUID] = None,
    ) -> Optional[Action]:
        """
        Validate and persist the actual Next Best Action returned by Vishvam's ML Service.
        """
        if not nba_data or not isinstance(nba_data, dict):
            return None

        payload = dict(nba_data)
        if prediction_id:
            payload["prediction_id"] = prediction_id

        action_in = ActionCreate.model_validate(payload)
        return self.create_action(customer_id, action_in)

    def get_action(self, action_id: UUID) -> Action:
        return self._verify_action(action_id)

    def list_customer_actions(
        self,
        customer_id: UUID,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
        action_type: Optional[str] = None,
    ) -> Tuple[List[Action], int, int]:
        self._verify_customer(customer_id)
        return self.repository.list_by_customer(
            customer_id=customer_id,
            page=page,
            limit=limit,
            status=status,
            action_type=action_type,
        )

    def get_latest_action(
        self,
        customer_id: UUID,
        status: Optional[str] = None,
    ) -> Optional[Action]:
        self._verify_customer(customer_id)
        return self.repository.get_latest_by_customer(customer_id=customer_id, status=status)

    def update_action(self, action_id: UUID, data: ActionUpdate) -> Action:
        action = self._verify_action(action_id)
        update_dict = data.model_dump(exclude_unset=True)
        return self.repository.update(action, update_dict)

    def record_action_outcome(
        self,
        action_id: UUID,
        data: ActionOutcomeCreate,
    ) -> ActionOutcome:
        action = self._verify_action(action_id)

        existing_outcome = self.repository.get_outcome_by_action_id(action_id)
        if existing_outcome:
            update_dict = data.model_dump(exclude_unset=True)
            outcome = self.repository.update_outcome(existing_outcome, update_dict)
        else:
            outcome = ActionOutcome(
                action_id=action_id,
                executed_at=data.executed_at or datetime.utcnow(),
                delivered=data.delivered,
                opened=data.opened,
                clicked=data.clicked,
                purchased=data.purchased,
                converted=data.converted,
                churned=data.churned,
                revenue=data.revenue,
                outcome_metadata=data.outcome_metadata,
            )
            outcome = self.repository.create_outcome(outcome)

        # Mark action status as EXECUTED if it was pending and outcome indicates execution
        if action.status == "PENDING" and (data.delivered or data.opened or data.clicked or data.purchased or data.converted):
            self.repository.update(action, {"status": "EXECUTED"})

        return outcome

    def get_action_outcome(self, action_id: UUID) -> ActionOutcome:
        self._verify_action(action_id)
        outcome = self.repository.get_outcome_by_action_id(action_id)
        if not outcome:
            raise ResourceNotFoundException("ActionOutcome", action_id)
        return outcome
