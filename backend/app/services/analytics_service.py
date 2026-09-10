from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundException
from app.models.customer import Customer
from app.repositories.analytics_repository import AnalyticsRepository
from app.schemas.analytics import (
    ActionPerformanceSummary,
    ActionEngagementMetrics,
    ActionConversionMetrics,
    ChannelPerformanceMetrics,
    ActionTypePerformanceMetrics,
    ActionAnalyticsRead,
    CustomerActionFeedbackRead,
)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = AnalyticsRepository(db)

    def _verify_customer(self, customer_id: UUID) -> Customer:
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ResourceNotFoundException("Customer", customer_id)
        return customer

    @staticmethod
    def _safe_rate(numerator: int, denominator: int) -> float:
        if denominator <= 0:
            return 0.0
        return round(float(numerator) / float(denominator), 4)

    def get_customer_feedback(self, customer_id: UUID) -> CustomerActionFeedbackRead:
        self._verify_customer(customer_id)
        raw = self.repository.get_customer_action_feedback(customer_id)

        total_actions = raw["total_actions"]
        delivered = raw["delivered"]
        opened = raw["opened"]
        clicked = raw["clicked"]
        converted = raw["converted"]
        total_revenue = raw["total_revenue"]

        # Safe rate calculations
        delivery_rate = self._safe_rate(delivered, total_actions)
        open_rate = self._safe_rate(opened, delivered)
        click_rate = self._safe_rate(clicked, delivered)
        ctr = self._safe_rate(clicked, opened)
        conversion_rate = self._safe_rate(converted, delivered)
        avg_revenue = (
            round(total_revenue / Decimal(str(converted)), 2)
            if converted > 0
            else Decimal("0.0")
        )

        return CustomerActionFeedbackRead(
            customer_id=customer_id,
            summary=ActionPerformanceSummary(
                total_actions=total_actions,
                pending_actions=raw["pending_actions"],
                executed_actions=raw["executed_actions"],
                dismissed_actions=raw["dismissed_actions"],
                outcomes_recorded=raw["outcomes_recorded"],
            ),
            engagement=ActionEngagementMetrics(
                delivered=delivered,
                opened=opened,
                clicked=clicked,
                delivery_rate=delivery_rate,
                open_rate=open_rate,
                click_rate=click_rate,
                click_through_rate=ctr,
            ),
            conversions=ActionConversionMetrics(
                purchased=raw["purchased"],
                converted=converted,
                churned=raw["churned"],
                conversion_rate=conversion_rate,
                total_revenue=total_revenue,
                average_revenue_per_converted=avg_revenue,
            ),
        )

    def get_action_analytics(
        self,
        action_type: Optional[str] = None,
        channel: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> ActionAnalyticsRead:
        raw = self.repository.get_global_action_analytics(
            action_type=action_type,
            channel=channel,
            status=status,
            start_date=start_date,
            end_date=end_date,
        )

        total_actions = raw["summary"]["total_actions"]
        delivered = raw["delivered"]
        opened = raw["opened"]
        clicked = raw["clicked"]
        converted = raw["converted"]
        total_revenue = raw["total_revenue"]

        delivery_rate = self._safe_rate(delivered, total_actions)
        open_rate = self._safe_rate(opened, delivered)
        click_rate = self._safe_rate(clicked, delivered)
        ctr = self._safe_rate(clicked, opened)
        conversion_rate = self._safe_rate(converted, delivered)
        avg_revenue = (
            round(total_revenue / Decimal(str(converted)), 2)
            if converted > 0
            else Decimal("0.0")
        )

        # Process channel breakdowns
        by_channel = []
        for ch in raw.get("by_channel", []):
            ch_delivered = ch["delivered"]
            ch_converted = ch["converted"]
            by_channel.append(
                ChannelPerformanceMetrics(
                    channel=ch["channel"],
                    total_actions=ch["total_actions"],
                    delivered=ch_delivered,
                    converted=ch_converted,
                    conversion_rate=self._safe_rate(ch_converted, ch_delivered),
                    total_revenue=ch["total_revenue"],
                )
            )

        # Process action type breakdowns
        by_action_type = []
        for act in raw.get("by_action_type", []):
            act_total = act["total_actions"]
            act_converted = act["converted"]
            by_action_type.append(
                ActionTypePerformanceMetrics(
                    action_type=act["action_type"],
                    total_actions=act_total,
                    converted=act_converted,
                    conversion_rate=self._safe_rate(act_converted, act_total),
                    total_revenue=act["total_revenue"],
                )
            )

        return ActionAnalyticsRead(
            summary=ActionPerformanceSummary(**raw["summary"]),
            engagement=ActionEngagementMetrics(
                delivered=delivered,
                opened=opened,
                clicked=clicked,
                delivery_rate=delivery_rate,
                open_rate=open_rate,
                click_rate=click_rate,
                click_through_rate=ctr,
            ),
            conversions=ActionConversionMetrics(
                purchased=raw["purchased"],
                converted=converted,
                churned=raw["churned"],
                conversion_rate=conversion_rate,
                total_revenue=total_revenue,
                average_revenue_per_converted=avg_revenue,
            ),
            by_channel=by_channel,
            by_action_type=by_action_type,
        )
