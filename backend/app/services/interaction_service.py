import math
from datetime import datetime
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundException
from app.models.customer import Customer
from app.models.customer_feature import CustomerFeature
from app.models.interaction import Interaction
from app.schemas.interaction import InteractionCreate
from app.repositories.interaction_repository import InteractionRepository


class InteractionService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = InteractionRepository(db)

    def list_customer_interactions(
        self,
        customer_id: UUID,
        page: int = 1,
        limit: int = 20,
        event_type: Optional[str] = None,
    ) -> Tuple[List[Interaction], int, int]:
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ResourceNotFoundException("Customer", customer_id)

        items, total = self.repository.list_by_customer(
            customer_id=customer_id,
            page=page,
            limit=limit,
            event_type=event_type,
        )
        total_pages = math.ceil(total / limit) if total > 0 else 1
        return items, total, total_pages

    def record_interaction(self, data: InteractionCreate) -> Interaction:
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not customer:
            raise ResourceNotFoundException("Customer", data.customer_id)

        event_time = data.timestamp or datetime.utcnow()

        interaction = Interaction(
            customer_id=data.customer_id,
            event_type=data.event_type.lower(),
            event_value=data.event_value,
            metadata_json=data.metadata_json,
            timestamp=event_time,
        )
        self.repository.create(interaction)

        # Update customer features based on event signals
        features = self.db.query(CustomerFeature).filter(CustomerFeature.customer_id == data.customer_id).first()
        if features:
            event_type = data.event_type.lower()
            if event_type == "cart_abandonment":
                features.cart_abandonment_count += 1
            elif event_type in ("login", "page_view", "click", "feedback"):
                features.days_inactive = 0
                # Incremental engagement score boost up to 1.0
                current_eng = float(features.engagement_score or 0.5)
                features.engagement_score = min(1.0, current_eng + 0.02)
            self.db.commit()

        return interaction
