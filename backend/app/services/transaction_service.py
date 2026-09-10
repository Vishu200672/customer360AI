import uuid
import math
from datetime import datetime
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundException, ResourceAlreadyExistsException
from app.models.customer import Customer
from app.models.customer_feature import CustomerFeature
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate
from app.repositories.transaction_repository import TransactionRepository


class TransactionService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = TransactionRepository(db)

    def list_customer_transactions(
        self,
        customer_id: UUID,
        page: int = 1,
        limit: int = 20,
        category: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[List[Transaction], int, int]:
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ResourceNotFoundException("Customer", customer_id)

        items, total = self.repository.list_by_customer(
            customer_id=customer_id,
            page=page,
            limit=limit,
            category=category,
            start_date=start_date,
            end_date=end_date,
        )
        total_pages = math.ceil(total / limit) if total > 0 else 1
        return items, total, total_pages

    def create_transaction(self, data: TransactionCreate) -> Transaction:
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not customer:
            raise ResourceNotFoundException("Customer", data.customer_id)

        # Generate or check reference_id
        ref_id = data.reference_id
        if not ref_id:
            ref_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"
        else:
            if self.repository.get_by_reference_id(ref_id):
                raise ResourceAlreadyExistsException("Transaction", "reference_id", ref_id)

        txn_time = data.transaction_time or datetime.utcnow()

        transaction = Transaction(
            customer_id=data.customer_id,
            reference_id=ref_id,
            product_name=data.product_name,
            product_sku=data.product_sku,
            category=data.category,
            amount=data.amount,
            quantity=data.quantity,
            transaction_time=txn_time,
            channel=data.channel,
            status=data.status,
        )
        self.repository.create(transaction)

        # Update customer features (RFM & derived metrics)
        features = self.db.query(CustomerFeature).filter(CustomerFeature.customer_id == data.customer_id).first()
        if features:
            features.frequency_count += 1
            features.monetary_value = float(features.monetary_value) + float(data.amount)
            features.average_order_value = float(features.monetary_value) / features.frequency_count
            
            # Recency in days
            now = datetime.utcnow()
            tz_naive_txn = txn_time.replace(tzinfo=None) if txn_time.tzinfo else txn_time
            delta_days = max(0, (now - tz_naive_txn).days)
            features.recency_days = delta_days
            features.days_inactive = delta_days
            self.db.commit()

        return transaction
