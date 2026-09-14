import math
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundException, ValidationException
from app.models.customer import Customer
from app.models.customer_feature import CustomerFeature
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionCreate, SUPPORTED_PREDICTION_TYPES
from app.repositories.prediction_repository import PredictionRepository
from app.integrations.ml_client import BaseMLClient, get_ml_client


class PredictionService:
    def __init__(self, db: Session, ml_client: Optional[BaseMLClient] = None):
        self.db = db
        self.repository = PredictionRepository(db)
        self.ml_client = ml_client or get_ml_client()

    def _verify_customer(self, customer_id: UUID) -> Customer:
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ResourceNotFoundException("Customer", customer_id)
        return customer

    def save_prediction(self, data: PredictionCreate) -> Prediction:
        customer = self._verify_customer(data.customer_id)

        ptype = data.prediction_type.lower()
        if ptype not in SUPPORTED_PREDICTION_TYPES:
            raise ValidationException(
                f"Unsupported prediction type '{data.prediction_type}'. Supported: {SUPPORTED_PREDICTION_TYPES}"
            )

        prediction = Prediction(
            customer_id=data.customer_id,
            model_name=data.model_name,
            model_version=data.model_version,
            prediction_type=ptype,
            score=data.score,
            predicted_class=data.predicted_class,
            confidence=data.confidence,
            model_run_id=data.model_run_id,
            created_at=datetime.utcnow(),
        )
        saved = self.repository.create(prediction)

        if data.explanations:
            from app.models.explanation import Explanation
            exp_records = [
                Explanation(
                    prediction_id=saved.id,
                    feature_name=item.feature_name.strip(),
                    feature_value=item.feature_value,
                    contribution=item.contribution,
                    rank=item.rank,
                    direction=item.direction.lower(),
                    explanation_metadata=item.explanation_metadata,
                )
                for item in data.explanations
            ]
            self.db.add_all(exp_records)
            self.db.commit()
            self.db.refresh(saved)

        return saved

    def list_customer_predictions(
        self,
        customer_id: UUID,
        page: int = 1,
        limit: int = 20,
        prediction_type: Optional[str] = None,
    ) -> Tuple[List[Prediction], int, int]:
        self._verify_customer(customer_id)

        items, total = self.repository.list_by_customer(
            customer_id=customer_id,
            page=page,
            limit=limit,
            prediction_type=prediction_type,
        )
        total_pages = math.ceil(total / limit) if total > 0 else 1
        return items, total, total_pages

    def get_latest_predictions(
        self,
        customer_id: UUID,
        prediction_type: Optional[str] = None,
    ) -> Dict[str, Prediction]:
        self._verify_customer(customer_id)

        if prediction_type:
            ptype = prediction_type.lower()
            pred = self.repository.get_latest_by_customer(customer_id, ptype)
            return {ptype: pred} if pred else {}

        return self.repository.get_latest_predictions_by_customer(customer_id)

    def trigger_prediction(
        self,
        customer_id: UUID,
        prediction_type: str = "churn",
    ) -> Prediction:
        customer = self._verify_customer(customer_id)

        ptype = prediction_type.lower()
        if ptype not in SUPPORTED_PREDICTION_TYPES:
            raise ValidationException(
                f"Unsupported prediction type '{prediction_type}'. Supported: {SUPPORTED_PREDICTION_TYPES}"
            )

        # Extract features dictionary from customer profile and RFM features
        features = self.db.query(CustomerFeature).filter(CustomerFeature.customer_id == customer_id).first()
        extra = (features.extra_features if features and isinstance(features.extra_features, dict) else {}) if features else {}
        feature_dict: Dict[str, Any] = {
            "name": f"{customer.first_name} {customer.last_name}".strip() or "Customer",
            "days_inactive": features.days_inactive if features else 0,
            "recency_days": features.recency_days if features else 0,
            "frequency_count": features.frequency_count if features else 0,
            "frequency_purchases": features.frequency_count if features else 0,
            "monetary_value": float(features.monetary_value) if features else 0.0,
            "monetary_total_spend": float(features.monetary_value) if features else 0.0,
            "engagement_score": float(features.engagement_score) if features else 0.5,
            "cart_abandonment_count": features.cart_abandonment_count if features else 0,
            "cart_abandonments_30d": features.cart_abandonment_count if features else 0,
            "website_visits_30d": int(extra.get("website_visits_30d", 10)),
            "product_views_30d": int(extra.get("product_views_30d", 25)),
            "cart_additions_30d": int(extra.get("cart_additions_30d", 5)),
            "support_tickets_30d": int(extra.get("support_tickets_30d", 0)),
            "engagement_change_pct": float(extra.get("engagement_change_pct", 0.0)),
            "preferred_channel": extra.get("preferred_channel", customer.acquisition_channel or "Email"),
            "preferred_category": extra.get("preferred_category", "General"),
            "age": customer.age,
            "acquisition_channel": customer.acquisition_channel,
        }

        # Call configured ML client
        output = self.ml_client.predict(
            customer_id=customer_id,
            features=feature_dict,
            prediction_type=ptype,
        )

        # Parse explanations if ML service supplied them
        parsed_explanations = None
        if output.explanations:
            from app.schemas.explanation import ExplanationCreate
            parsed_explanations = [
                ExplanationCreate(**exp) if isinstance(exp, dict) else exp
                for exp in output.explanations
            ]

        # Persist prediction
        create_payload = PredictionCreate(
            customer_id=customer_id,
            model_name=output.model_name,
            model_version=output.model_version,
            prediction_type=output.prediction_type,
            score=output.score,
            predicted_class=output.predicted_class,
            confidence=output.confidence,
            explanations=parsed_explanations,
        )
        saved_prediction = self.save_prediction(create_payload)

        # If ML service supplied a Next Best Action, validate and persist it
        if output.next_best_action:
            from app.services.action_service import ActionService
            action_svc = ActionService(self.db)
            action_svc.create_action_from_nba(
                customer_id=customer_id,
                nba_data=output.next_best_action,
                prediction_id=saved_prediction.id,
            )

        return saved_prediction
