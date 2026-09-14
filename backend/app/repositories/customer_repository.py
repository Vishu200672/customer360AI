from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_, desc
from app.models.customer import Customer
from app.models.transaction import Transaction
from app.models.interaction import Interaction
from app.models.prediction import Prediction
from app.models.action import Action


class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, customer_id: UUID) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.id == customer_id).first()

    def get_by_external_id(self, external_id: str) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.external_customer_id == external_id).first()

    def get_by_email(self, email: str) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.email == email).first()

    def list_customers(
        self,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Customer], int]:
        query = self.db.query(Customer)

        if status:
            query = query.filter(Customer.customer_status == status)

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Customer.first_name.ilike(search_pattern),
                    Customer.last_name.ilike(search_pattern),
                    Customer.email.ilike(search_pattern),
                    Customer.external_customer_id.ilike(search_pattern),
                )
            )

        total = query.count()
        offset = (page - 1) * limit
        items = query.order_by(desc(Customer.created_at)).offset(offset).limit(limit).all()

        return items, total

    def create(self, customer: Customer) -> Customer:
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def update(self, customer: Customer, update_data: dict) -> Customer:
        for key, value in update_data.items():
            if hasattr(customer, key):
                setattr(customer, key, value)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def delete(self, customer: Customer) -> None:
        self.db.delete(customer)
        self.db.commit()

    def get_customer_360_data(
        self,
        customer_id: UUID,
        transaction_limit: int = 10,
        interaction_limit: int = 15,
    ) -> Optional[Dict[str, Any]]:
        # 1. Fetch customer with features and segments eagerly loaded
        customer = (
            self.db.query(Customer)
            .options(
                joinedload(Customer.features),
                selectinload(Customer.segments),
            )
            .filter(Customer.id == customer_id)
            .first()
        )
        if not customer:
            return None

        # 2. Fetch capped recent transactions
        recent_transactions = (
            self.db.query(Transaction)
            .filter(Transaction.customer_id == customer_id)
            .order_by(desc(Transaction.transaction_time))
            .limit(transaction_limit)
            .all()
        )

        # 3. Fetch capped recent interactions
        recent_interactions = (
            self.db.query(Interaction)
            .filter(Interaction.customer_id == customer_id)
            .order_by(desc(Interaction.timestamp))
            .limit(interaction_limit)
            .all()
        )

        # 4. Fetch predictions with SHAP explanations
        all_predictions = (
            self.db.query(Prediction)
            .options(selectinload(Prediction.explanations))
            .filter(Prediction.customer_id == customer_id)
            .order_by(desc(Prediction.created_at))
            .limit(20)
            .all()
        )

        # Group latest prediction per prediction_type
        latest_predictions = {}
        for pred in all_predictions:
            if pred.prediction_type not in latest_predictions:
                latest_predictions[pred.prediction_type] = pred

        # Extract SHAP drivers from the primary prediction (churn priority, else first available)
        shap_drivers = []
        target_pred = latest_predictions.get("churn") or (all_predictions[0] if all_predictions else None)
        if target_pred and target_pred.explanations:
            shap_drivers = sorted(target_pred.explanations, key=lambda x: x.rank)

        # 5. Fetch actions with outcomes
        all_actions = (
            self.db.query(Action)
            .options(joinedload(Action.outcome))
            .filter(Action.customer_id == customer_id)
            .order_by(desc(Action.created_at))
            .limit(15)
            .all()
        )

        next_best_action = None
        for act in all_actions:
            if act.status == "PENDING":
                next_best_action = act
                break

        action_history = [act for act in all_actions if act != next_best_action]

        return {
            "profile": customer,
            "features": customer.features,
            "segments": customer.segments or [],
            "predictions": latest_predictions,
            "shap_drivers": shap_drivers,
            "next_best_action": next_best_action,
            "recent_transactions": recent_transactions,
            "recent_interactions": recent_interactions,
            "action_history": action_history,
        }
