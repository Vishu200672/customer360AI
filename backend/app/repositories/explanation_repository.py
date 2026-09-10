from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.models.explanation import Explanation
from app.models.prediction import Prediction


class ExplanationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, explanation_id: UUID) -> Optional[Explanation]:
        return self.db.query(Explanation).filter(Explanation.id == explanation_id).first()

    def create(self, explanation: Explanation) -> Explanation:
        self.db.add(explanation)
        self.db.commit()
        self.db.refresh(explanation)
        return explanation

    def create_batch(self, explanations: List[Explanation]) -> List[Explanation]:
        if not explanations:
            return []
        self.db.add_all(explanations)
        self.db.commit()
        for exp in explanations:
            self.db.refresh(exp)
        return explanations

    def list_by_prediction(self, prediction_id: UUID) -> List[Explanation]:
        return (
            self.db.query(Explanation)
            .filter(Explanation.prediction_id == prediction_id)
            .order_by(asc(Explanation.rank))
            .all()
        )

    def list_by_customer(self, customer_id: UUID, limit: int = 50) -> List[Explanation]:
        """Fetch explanations belonging to any prediction for this customer."""
        return (
            self.db.query(Explanation)
            .join(Prediction, Explanation.prediction_id == Prediction.id)
            .filter(Prediction.customer_id == customer_id)
            .order_by(desc(Prediction.created_at), asc(Explanation.rank))
            .limit(limit)
            .all()
        )

    def get_top_drivers_by_prediction(self, prediction_id: UUID, limit: int = 5) -> List[Explanation]:
        return (
            self.db.query(Explanation)
            .filter(Explanation.prediction_id == prediction_id)
            .order_by(asc(Explanation.rank))
            .limit(limit)
            .all()
        )
