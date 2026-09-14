from uuid import uuid4
from decimal import Decimal
from unittest.mock import patch, MagicMock


def test_customer_feedback_zero_actions(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Zero",
        "last_name": "Actions",
        "email": "zero.actions@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    res = client.get(f"/api/v1/customers/{customer_id}/feedback")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["customer_id"] == customer_id
    assert data["summary"]["total_actions"] == 0
    assert data["summary"]["executed_actions"] == 0
    assert data["engagement"]["delivered"] == 0
    assert data["engagement"]["delivery_rate"] == 0.0
    assert data["conversions"]["converted"] == 0
    assert data["conversions"]["conversion_rate"] == 0.0
    assert float(data["conversions"]["total_revenue"]) == 0.0
    assert float(data["conversions"]["average_revenue_per_converted"]) == 0.0


def test_customer_feedback_pending_actions_without_outcomes(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Pending",
        "last_name": "User",
        "email": "pending.user@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # Create 2 pending actions
    client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "Retention Alert",
        "reason": "At risk of leaving",
        "channel": "Email",
    })
    client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "Survey Request",
        "reason": "Feedback collection",
        "channel": "SMS",
    })

    res = client.get(f"/api/v1/customers/{customer_id}/feedback")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["summary"]["total_actions"] == 2
    assert data["summary"]["pending_actions"] == 2
    assert data["summary"]["executed_actions"] == 0
    assert data["summary"]["outcomes_recorded"] == 0
    assert data["engagement"]["delivered"] == 0
    assert data["conversions"]["converted"] == 0


def test_customer_feedback_with_executed_outcomes_and_revenue(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Active",
        "last_name": "Buyer",
        "email": "active.buyer@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # Action 1: Delivered, Opened, Clicked, Converted, $150 revenue
    a1 = client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "VIP Discount",
        "reason": "High intent",
        "channel": "Email",
    }).json()["data"]
    client.post(f"/api/v1/actions/{a1['id']}/outcome", json={
        "delivered": True,
        "opened": True,
        "clicked": True,
        "purchased": True,
        "converted": True,
        "revenue": 150.0,
    })

    # Action 2: Delivered, Opened, Not Clicked, Converted, $250 revenue
    a2 = client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "Flash Sale",
        "reason": "Promotional",
        "channel": "Push",
    }).json()["data"]
    client.post(f"/api/v1/actions/{a2['id']}/outcome", json={
        "delivered": True,
        "opened": True,
        "clicked": False,
        "purchased": True,
        "converted": True,
        "revenue": 250.0,
    })

    # Action 3: Delivered, Not Opened, Not Converted
    a3 = client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "Newsletter",
        "reason": "General",
        "channel": "Email",
    }).json()["data"]
    client.post(f"/api/v1/actions/{a3['id']}/outcome", json={
        "delivered": True,
        "opened": False,
        "converted": False,
        "revenue": 0.0,
    })

    res = client.get(f"/api/v1/customers/{customer_id}/feedback")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["summary"]["total_actions"] == 3
    assert data["summary"]["executed_actions"] == 3
    assert data["summary"]["outcomes_recorded"] == 3

    # Engagement: 3 delivered, 2 opened, 1 clicked
    eng = data["engagement"]
    assert eng["delivered"] == 3
    assert eng["opened"] == 2
    assert eng["clicked"] == 1
    assert eng["delivery_rate"] == 1.0
    assert eng["open_rate"] == round(2 / 3, 4)
    assert eng["click_rate"] == round(1 / 3, 4)
    assert eng["click_through_rate"] == 0.5  # 1 clicked / 2 opened

    # Conversions: 2 converted, $400 total revenue, $200 average revenue
    conv = data["conversions"]
    assert conv["converted"] == 2
    assert conv["purchased"] == 2
    assert conv["conversion_rate"] == round(2 / 3, 4)  # 2 / 3 delivered
    assert float(conv["total_revenue"]) == 400.0
    assert float(conv["average_revenue_per_converted"]) == 200.0


def test_customer_feedback_nonexistent_customer(client):
    fake_id = str(uuid4())
    res = client.get(f"/api/v1/customers/{fake_id}/feedback")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "CUSTOMER_NOT_FOUND"


def test_global_action_analytics_aggregation_and_filters(client):
    # Customer 1
    c1 = client.post("/api/v1/customers", json={
        "first_name": "Analytics",
        "last_name": "One",
        "email": "analytics.one@example.com",
    }).json()["data"]["id"]

    act1 = client.post(f"/api/v1/customers/{c1}/actions", json={
        "action": "Retention Deal",
        "action_type": "RETENTION",
        "reason": "Retention churn prevention",
        "channel": "WhatsApp",
    }).json()["data"]
    client.post(f"/api/v1/actions/{act1['id']}/outcome", json={
        "delivered": True,
        "converted": True,
        "revenue": 120.0,
    })

    # Customer 2
    c2 = client.post("/api/v1/customers", json={
        "first_name": "Analytics",
        "last_name": "Two",
        "email": "analytics.two@example.com",
    }).json()["data"]["id"]

    act2 = client.post(f"/api/v1/customers/{c2}/actions", json={
        "action": "Upsell Plus",
        "action_type": "UPSELL",
        "reason": "Upsell candidate",
        "channel": "Email",
    }).json()["data"]
    client.post(f"/api/v1/actions/{act2['id']}/outcome", json={
        "delivered": True,
        "converted": False,
        "revenue": 0.0,
    })

    # 1. Query without filters
    res = client.get("/api/v1/analytics/actions")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["summary"]["total_actions"] >= 2
    assert "by_channel" in data
    assert "by_action_type" in data

    # 2. Filter by action_type = RETENTION
    res_ret = client.get("/api/v1/analytics/actions?action_type=RETENTION")
    assert res_ret.status_code == 200
    data_ret = res_ret.json()["data"]
    assert data_ret["summary"]["total_actions"] >= 1
    assert data_ret["conversions"]["converted"] >= 1

    # 3. Filter by channel = WhatsApp
    res_wa = client.get("/api/v1/analytics/actions?channel=WhatsApp")
    assert res_wa.status_code == 200
    data_wa = res_wa.json()["data"]
    assert any(c["channel"] == "WhatsApp" for c in data_wa["by_channel"])


def test_customer_360_includes_action_feedback(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "C360",
        "last_name": "FeedbackTarget",
        "email": "c360.feedback@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # Seed an executed action with outcome
    act = client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "Re-engagement Promo",
        "reason": "Inactivity detected",
        "channel": "In-App",
    }).json()["data"]
    client.post(f"/api/v1/actions/{act['id']}/outcome", json={
        "delivered": True,
        "opened": True,
        "converted": True,
        "revenue": 75.50,
    })

    # Fetch Customer 360
    c360_res = client.get(f"/api/v1/customers/{customer_id}/360")
    assert c360_res.status_code == 200
    c360 = c360_res.json()["data"]

    # Verify existing fields intact
    assert "profile" in c360
    assert "predictions" in c360
    assert "shap_drivers" in c360
    assert "next_best_action" in c360
    assert "recent_transactions" in c360
    assert "recent_interactions" in c360
    assert "action_history" in c360
    assert len(c360["action_history"]) == 1

    # Verify new action_feedback is populated
    assert "action_feedback" in c360
    fb = c360["action_feedback"]
    assert fb is not None
    assert fb["customer_id"] == customer_id
    assert fb["summary"]["total_actions"] == 1
    assert fb["summary"]["executed_actions"] == 1
    assert fb["engagement"]["delivered"] == 1
    assert fb["conversions"]["converted"] == 1
    assert float(fb["conversions"]["total_revenue"]) == 75.50
    assert float(fb["conversions"]["average_revenue_per_converted"]) == 75.50
