from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, desc

from app.models.action import Action
from app.models.action_outcome import ActionOutcome


class AnalyticsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_customer_action_feedback(self, customer_id: UUID) -> Dict[str, Any]:
        """
        Executes a single optimized SQL query to aggregate action and outcome metrics
        for a specific customer, avoiding loading individual row collections into Python.
        """
        query = (
            self.db.query(
                func.count(Action.id).label("total_actions"),
                func.count(case((Action.status == "PENDING", Action.id))).label("pending_actions"),
                func.count(case((Action.status == "EXECUTED", Action.id))).label("executed_actions"),
                func.count(case((Action.status == "DISMISSED", Action.id))).label("dismissed_actions"),
                func.count(ActionOutcome.id).label("outcomes_recorded"),
                func.count(case((ActionOutcome.delivered == True, ActionOutcome.id))).label("delivered_count"),
                func.count(case((ActionOutcome.opened == True, ActionOutcome.id))).label("opened_count"),
                func.count(case((ActionOutcome.clicked == True, ActionOutcome.id))).label("clicked_count"),
                func.count(case((ActionOutcome.purchased == True, ActionOutcome.id))).label("purchased_count"),
                func.count(case((ActionOutcome.converted == True, ActionOutcome.id))).label("converted_count"),
                func.count(case((ActionOutcome.churned == True, ActionOutcome.id))).label("churned_count"),
                func.coalesce(func.sum(ActionOutcome.revenue), 0.0).label("total_revenue"),
            )
            .outerjoin(ActionOutcome, Action.id == ActionOutcome.action_id)
            .filter(Action.customer_id == customer_id)
        )

        row = query.first()
        if not row or row.total_actions == 0:
            return {
                "total_actions": 0,
                "pending_actions": 0,
                "executed_actions": 0,
                "dismissed_actions": 0,
                "outcomes_recorded": 0,
                "delivered": 0,
                "opened": 0,
                "clicked": 0,
                "purchased": 0,
                "converted": 0,
                "churned": 0,
                "total_revenue": Decimal("0.0"),
            }

        return {
            "total_actions": row.total_actions or 0,
            "pending_actions": row.pending_actions or 0,
            "executed_actions": row.executed_actions or 0,
            "dismissed_actions": row.dismissed_actions or 0,
            "outcomes_recorded": row.outcomes_recorded or 0,
            "delivered": row.delivered_count or 0,
            "opened": row.opened_count or 0,
            "clicked": row.clicked_count or 0,
            "purchased": row.purchased_count or 0,
            "converted": row.converted_count or 0,
            "churned": row.churned_count or 0,
            "total_revenue": Decimal(str(row.total_revenue or 0.0)),
        }

    def get_global_action_analytics(
        self,
        action_type: Optional[str] = None,
        channel: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Calculates aggregate action metrics and breakdowns across the entire platform
        using native PostgreSQL GROUP BY and conditional counts.
        """
        # 1. Base filters
        filters = []
        if action_type:
            filters.append(Action.action_type == action_type)
        if channel:
            filters.append(Action.channel == channel)
        if status:
            filters.append(Action.status == status.upper())
        if start_date:
            filters.append(Action.created_at >= start_date)
        if end_date:
            filters.append(Action.created_at <= end_date)

        # 2. Macro aggregate metrics query
        macro_query = (
            self.db.query(
                func.count(Action.id).label("total_actions"),
                func.count(case((Action.status == "PENDING", Action.id))).label("pending_actions"),
                func.count(case((Action.status == "EXECUTED", Action.id))).label("executed_actions"),
                func.count(case((Action.status == "DISMISSED", Action.id))).label("dismissed_actions"),
                func.count(ActionOutcome.id).label("outcomes_recorded"),
                func.count(case((ActionOutcome.delivered == True, ActionOutcome.id))).label("delivered_count"),
                func.count(case((ActionOutcome.opened == True, ActionOutcome.id))).label("opened_count"),
                func.count(case((ActionOutcome.clicked == True, ActionOutcome.id))).label("clicked_count"),
                func.count(case((ActionOutcome.purchased == True, ActionOutcome.id))).label("purchased_count"),
                func.count(case((ActionOutcome.converted == True, ActionOutcome.id))).label("converted_count"),
                func.count(case((ActionOutcome.churned == True, ActionOutcome.id))).label("churned_count"),
                func.coalesce(func.sum(ActionOutcome.revenue), 0.0).label("total_revenue"),
            )
            .outerjoin(ActionOutcome, Action.id == ActionOutcome.action_id)
        )
        if filters:
            macro_query = macro_query.filter(and_(*filters))

        row = macro_query.first()

        # 3. Channel breakdown query
        channel_query = (
            self.db.query(
                Action.channel.label("channel"),
                func.count(Action.id).label("total_actions"),
                func.count(case((ActionOutcome.delivered == True, ActionOutcome.id))).label("delivered_count"),
                func.count(case((ActionOutcome.converted == True, ActionOutcome.id))).label("converted_count"),
                func.coalesce(func.sum(ActionOutcome.revenue), 0.0).label("total_revenue"),
            )
            .outerjoin(ActionOutcome, Action.id == ActionOutcome.action_id)
        )
        if filters:
            channel_query = channel_query.filter(and_(*filters))
        channel_rows = channel_query.group_by(Action.channel).all()

        # 4. Action type breakdown query
        type_query = (
            self.db.query(
                Action.action_type.label("action_type"),
                func.count(Action.id).label("total_actions"),
                func.count(case((ActionOutcome.converted == True, ActionOutcome.id))).label("converted_count"),
                func.coalesce(func.sum(ActionOutcome.revenue), 0.0).label("total_revenue"),
            )
            .outerjoin(ActionOutcome, Action.id == ActionOutcome.action_id)
        )
        if filters:
            type_query = type_query.filter(and_(*filters))
        type_rows = type_query.group_by(Action.action_type).all()

        return {
            "summary": {
                "total_actions": row.total_actions if row else 0,
                "pending_actions": row.pending_actions if row else 0,
                "executed_actions": row.executed_actions if row else 0,
                "dismissed_actions": row.dismissed_actions if row else 0,
                "outcomes_recorded": row.outcomes_recorded if row else 0,
            },
            "delivered": row.delivered_count if row else 0,
            "opened": row.opened_count if row else 0,
            "clicked": row.clicked_count if row else 0,
            "purchased": row.purchased_count if row else 0,
            "converted": row.converted_count if row else 0,
            "churned": row.churned_count if row else 0,
            "total_revenue": Decimal(str(row.total_revenue or 0.0)) if row else Decimal("0.0"),
            "by_channel": [
                {
                    "channel": r.channel or "Unknown",
                    "total_actions": r.total_actions or 0,
                    "delivered": r.delivered_count or 0,
                    "converted": r.converted_count or 0,
                    "total_revenue": Decimal(str(r.total_revenue or 0.0)),
                }
                for r in channel_rows
            ],
            "by_action_type": [
                {
                    "action_type": r.action_type or "Unknown",
                    "total_actions": r.total_actions or 0,
                    "converted": r.converted_count or 0,
                    "total_revenue": Decimal(str(r.total_revenue or 0.0)),
                }
                for r in type_rows
            ],
        }
