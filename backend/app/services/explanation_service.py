from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundException, ValidationException
from app.models.customer import Customer
from app.models.prediction import Prediction
from app.models.explanation import Explanation
from app.schemas.explanation import ExplanationCreate
from app.repositories.explanation_repository import ExplanationRepository


class ExplanationService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = ExplanationRepository(db)

    def _verify_prediction(self, prediction_id: UUID) -> Prediction:
        prediction = self.db.query(Prediction).filter(Prediction.id == prediction_id).first()
        if not prediction:
            raise ResourceNotFoundException("Prediction", prediction_id)
        return prediction

    def _verify_customer(self, customer_id: UUID) -> Customer:
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ResourceNotFoundException("Customer", customer_id)
        return customer

    def add_explanations_to_prediction(
        self,
        prediction_id: UUID,
        explanations_data: List[ExplanationCreate],
        expected_customer_id: Optional[UUID] = None,
    ) -> List[Explanation]:
        prediction = self._verify_prediction(prediction_id)

        # Ensure prediction belongs to expected customer if provided
        if expected_customer_id and str(prediction.customer_id) != str(expected_customer_id):
            raise ValidationException(
                f"Prediction '{prediction_id}' does not belong to customer '{expected_customer_id}'."
            )

        new_records: List[Explanation] = []
        for item in explanations_data:
            dir_val = item.direction.lower()
            if dir_val not in ("positive", "negative"):
                raise ValidationException(
                    f"Invalid explanation direction: '{item.direction}'. Must be 'positive' or 'negative'."
                )
            if item.rank < 1:
                raise ValidationException(
                    f"Invalid explanation rank: {item.rank}. Rank must be greater than or equal to 1."
                )

            record = Explanation(
                prediction_id=prediction_id,
                feature_name=item.feature_name.strip(),
                feature_value=item.feature_value,
                contribution=item.contribution,
                rank=item.rank,
                direction=dir_val,
                explanation_metadata=item.explanation_metadata,
            )
            new_records.append(record)

        return self.repository.create_batch(new_records)

    def get_explanations_for_prediction(
        self,
        prediction_id: UUID,
    ) -> List[Explanation]:
        self._verify_prediction(prediction_id)
        return self.repository.list_by_prediction(prediction_id)

    def get_explanations_for_customer(
        self,
        customer_id: UUID,
        limit: int = 50,
    ) -> List[Explanation]:
        self._verify_customer(customer_id)
        return self.repository.list_by_customer(customer_id, limit=limit)
