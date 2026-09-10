import math
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc

from app.models.action import Action
from app.models.action_outcome import ActionOutcome


class ActionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, action: Action) -> Action:
        try:
            self.db.add(action)
            self.db.commit()
            self.db.refresh(action)
            return action
        except Exception:
            self.db.rollback()
            raise

    def get_by_id(self, action_id: UUID, load_outcome: bool = True) -> Optional[Action]:
        query = self.db.query(Action)
        if load_outcome:
            query = query.options(joinedload(Action.outcome))
        return query.filter(Action.id == action_id).first()

    def list_by_customer(
        self,
        customer_id: UUID,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
        action_type: Optional[str] = None,
    ) -> Tuple[List[Action], int, int]:
        query = (
            self.db.query(Action)
            .options(joinedload(Action.outcome))
            .filter(Action.customer_id == customer_id)
        )

        if status:
            query = query.filter(Action.status == status.upper())
        if action_type:
            query = query.filter(Action.action_type == action_type)

        total = query.count()
        total_pages = math.ceil(total / limit) if total > 0 else 1
        offset = (page - 1) * limit

        items = (
            query.order_by(desc(Action.created_at), asc(Action.rank))
            .offset(offset)
            .limit(limit)
            .all()
        )

        return items, total, total_pages

    def get_latest_by_customer(
        self,
        customer_id: UUID,
        status: Optional[str] = None,
    ) -> Optional[Action]:
        query = (
            self.db.query(Action)
            .options(joinedload(Action.outcome))
            .filter(Action.customer_id == customer_id)
        )

        if status:
            query = query.filter(Action.status == status.upper())
            # For pending actions, rank 1 and highest score comes first
            if status.upper() == "PENDING":
                return query.order_by(asc(Action.rank), desc(Action.score), desc(Action.created_at)).first()

        return query.order_by(desc(Action.created_at)).first()

    def update(self, action: Action, update_data: Dict[str, Any]) -> Action:
        try:
            for key, value in update_data.items():
                if hasattr(action, key) and value is not None:
                    setattr(action, key, value)
            self.db.commit()
            self.db.refresh(action)
            return action
        except Exception:
            self.db.rollback()
            raise

    def create_outcome(self, outcome: ActionOutcome) -> ActionOutcome:
        try:
            self.db.add(outcome)
            self.db.commit()
            self.db.refresh(outcome)
            return outcome
        except Exception:
            self.db.rollback()
            raise

    def get_outcome_by_action_id(self, action_id: UUID) -> Optional[ActionOutcome]:
        return self.db.query(ActionOutcome).filter(ActionOutcome.action_id == action_id).first()

    def update_outcome(self, outcome: ActionOutcome, update_data: Dict[str, Any]) -> ActionOutcome:
        try:
            for key, value in update_data.items():
                if hasattr(outcome, key) and value is not None:
                    setattr(outcome, key, value)
            self.db.commit()
            self.db.refresh(outcome)
            return outcome
        except Exception:
            self.db.rollback()
            raise
