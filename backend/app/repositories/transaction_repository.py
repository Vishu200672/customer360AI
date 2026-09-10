from typing import Optional, List, Tuple
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.transaction import Transaction


class TransactionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, transaction_id: UUID) -> Optional[Transaction]:
        return self.db.query(Transaction).filter(Transaction.id == transaction_id).first()

    def get_by_reference_id(self, reference_id: str) -> Optional[Transaction]:
        return self.db.query(Transaction).filter(Transaction.reference_id == reference_id).first()

    def list_by_customer(
        self,
        customer_id: UUID,
        page: int = 1,
        limit: int = 20,
        category: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[List[Transaction], int]:
        query = self.db.query(Transaction).filter(Transaction.customer_id == customer_id)

        if category:
            query = query.filter(Transaction.category == category)
        if start_date:
            query = query.filter(Transaction.transaction_time >= start_date)
        if end_date:
            query = query.filter(Transaction.transaction_time <= end_date)

        total = query.count()
        offset = (page - 1) * limit
        items = query.order_by(desc(Transaction.transaction_time)).offset(offset).limit(limit).all()

        return items, total

    def create(self, transaction: Transaction) -> Transaction:
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction
