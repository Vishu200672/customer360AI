from typing import Optional, List, Tuple, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.prediction import Prediction


class PredictionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, prediction_id: UUID) -> Optional[Prediction]:
        return self.db.query(Prediction).filter(Prediction.id == prediction_id).first()

    def list_by_customer(
        self,
        customer_id: UUID,
        page: int = 1,
        limit: int = 20,
        prediction_type: Optional[str] = None,
    ) -> Tuple[List[Prediction], int]:
        query = self.db.query(Prediction).filter(Prediction.customer_id == customer_id)

        if prediction_type:
            query = query.filter(Prediction.prediction_type == prediction_type.lower())

        total = query.count()
        offset = (page - 1) * limit
        items = query.order_by(desc(Prediction.created_at)).offset(offset).limit(limit).all()

        return items, total

    def get_latest_by_customer(
        self,
        customer_id: UUID,
        prediction_type: Optional[str] = None,
    ) -> Optional[Prediction]:
        query = self.db.query(Prediction).filter(Prediction.customer_id == customer_id)
        if prediction_type:
            query = query.filter(Prediction.prediction_type == prediction_type.lower())
        return query.order_by(desc(Prediction.created_at)).first()

    def get_latest_predictions_by_customer(self, customer_id: UUID) -> Dict[str, Prediction]:
        """Returns the most recent prediction for each prediction_type for a customer."""
        all_preds = (
            self.db.query(Prediction)
            .filter(Prediction.customer_id == customer_id)
            .order_by(desc(Prediction.created_at))
            .all()
        )
        latest: Dict[str, Prediction] = {}
        for p in all_preds:
            if p.prediction_type not in latest:
                latest[p.prediction_type] = p
        return latest

    def create(self, prediction: Prediction) -> Prediction:
        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)
        return prediction
