import uuid
import math
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundException, ResourceAlreadyExistsException
from app.models.customer import Customer
from app.models.customer_feature import CustomerFeature
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerRead
from app.schemas.transaction import TransactionRead
from app.schemas.interaction import InteractionRead
from app.schemas.customer_360 import (
    Customer360Read,
    CustomerFeatureRead,
    SegmentRead,
    PredictionSummaryRead,
    ShapDriverRead,
    ActionSummaryRead,
)
from app.repositories.customer_repository import CustomerRepository


class CustomerService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = CustomerRepository(db)

    def get_customer(self, customer_id: UUID) -> Customer:
        customer = self.repository.get_by_id(customer_id)
        if not customer:
            raise ResourceNotFoundException("Customer", customer_id)
        return customer

    def list_customers(
        self,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Customer], int, int]:
        items, total = self.repository.list_customers(
            page=page, limit=limit, status=status, search=search
        )
        total_pages = math.ceil(total / limit) if total > 0 else 1
        return items, total, total_pages

    def create_customer(self, data: CustomerCreate) -> Customer:
        # Check email uniqueness
        if self.repository.get_by_email(data.email):
            raise ResourceAlreadyExistsException("Customer", "email", data.email)

        # Generate external_customer_id if absent
        external_id = data.external_customer_id
        if not external_id:
            external_id = f"CUST-{uuid.uuid4().hex[:8].upper()}"
        else:
            if self.repository.get_by_external_id(external_id):
                raise ResourceAlreadyExistsException("Customer", "external_customer_id", external_id)

        customer = Customer(
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email,
            phone=data.phone,
            age=data.age,
            gender=data.gender,
            acquisition_channel=data.acquisition_channel,
            customer_status=data.customer_status,
            external_customer_id=external_id,
        )
        self.repository.create(customer)

        # Initialize default features row for customer
        initial_features = CustomerFeature(
            customer_id=customer.id,
            recency_days=0,
            frequency_count=0,
            monetary_value=0.0,
            days_inactive=0,
            engagement_score=0.5,
            cart_abandonment_count=0,
            purchase_frequency=0.0,
            average_order_value=0.0,
            estimated_clv=0.0,
        )
        self.db.add(initial_features)
        self.db.commit()
        self.db.refresh(customer)

        return customer

    def update_customer(self, customer_id: UUID, data: CustomerUpdate) -> Customer:
        customer = self.get_customer(customer_id)

        update_dict = data.model_dump(exclude_unset=True)

        if "email" in update_dict and update_dict["email"] != customer.email:
            existing = self.repository.get_by_email(update_dict["email"])
            if existing and existing.id != customer.id:
                raise ResourceAlreadyExistsException("Customer", "email", update_dict["email"])

        return self.repository.update(customer, update_dict)

    def get_customer_360(
        self,
        customer_id: UUID,
        transaction_limit: int = 10,
        interaction_limit: int = 15,
    ) -> Customer360Read:
        data = self.repository.get_customer_360_data(
            customer_id=customer_id,
            transaction_limit=transaction_limit,
            interaction_limit=interaction_limit,
        )
        if not data:
            raise ResourceNotFoundException("Customer", customer_id)

        features = (
            CustomerFeatureRead.model_validate(data["features"])
            if data["features"]
            else None
        )

        segments = [
            SegmentRead.model_validate(s)
            for s in data["segments"]
        ]

        predictions = {
            ptype: PredictionSummaryRead.model_validate(pred)
            for ptype, pred in data["predictions"].items()
        }

        shap_drivers = [
            ShapDriverRead.model_validate(exp)
            for exp in data["shap_drivers"]
        ]

        next_best_action = (
            ActionSummaryRead.model_validate(data["next_best_action"])
            if data["next_best_action"]
            else None
        )

        recent_transactions = [
            TransactionRead.model_validate(t)
            for t in data["recent_transactions"]
        ]

        recent_interactions = [
            InteractionRead.model_validate(i)
            for i in data["recent_interactions"]
        ]

        action_history = [
            ActionSummaryRead.model_validate(a)
            for a in data["action_history"]
        ]

        # Compute feedback intelligence if any actions exist
        action_feedback = None
        if all_actions := data.get("action_history", []) + ([data["next_best_action"]] if data.get("next_best_action") else []):
            from app.services.analytics_service import AnalyticsService
            analytics_svc = AnalyticsService(self.db)
            action_feedback = analytics_svc.get_customer_feedback(customer_id)

        return Customer360Read(
            profile=CustomerRead.model_validate(data["profile"]),
            features=features,
            segments=segments,
            predictions=predictions,
            shap_drivers=shap_drivers,
            next_best_action=next_best_action,
            recent_transactions=recent_transactions,
            recent_interactions=recent_interactions,
            action_history=action_history,
            action_feedback=action_feedback,
        )
