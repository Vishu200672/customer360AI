from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.interaction import Interaction


class InteractionRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_customer(
        self,
        customer_id: UUID,
        page: int = 1,
        limit: int = 20,
        event_type: Optional[str] = None,
    ) -> Tuple[List[Interaction], int]:
        query = self.db.query(Interaction).filter(Interaction.customer_id == customer_id)

        if event_type:
            query = query.filter(Interaction.event_type == event_type)

        total = query.count()
        offset = (page - 1) * limit
        items = query.order_by(desc(Interaction.timestamp)).offset(offset).limit(limit).all()

        return items, total

    def create(self, interaction: Interaction) -> Interaction:
        self.db.add(interaction)
        self.db.commit()
        self.db.refresh(interaction)
        return interaction
