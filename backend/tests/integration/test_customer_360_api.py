from uuid import uuid4
from decimal import Decimal
from datetime import datetime
from app.models import Prediction, Explanation, Action, ActionOutcome


def test_customer_360_not_found(client):
    fake_id = str(uuid4())
    response = client.get(f"/api/v1/customers/{fake_id}/360")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CUSTOMER_NOT_FOUND"


def test_customer_360_empty_optional_data(client):
    # 1. Create a customer with no activity
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Oliver",
        "last_name": "Queen",
        "email": "oliver.queen@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # 2. Fetch Customer 360 view
    response = client.get(f"/api/v1/customers/{customer_id}/360")
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["success"] is True
    data = res_data["data"]

    # Profile & Features should be initialized
    assert data["profile"]["id"] == customer_id
    assert data["profile"]["first_name"] == "Oliver"
    assert data["features"]["frequency_count"] == 0
    assert float(data["features"]["monetary_value"]) == 0.0

    # Optional arrays/dictionaries should be cleanly empty, NOT fabricated
    assert data["segments"] == []
    assert data["predictions"] == {}
    assert data["shap_drivers"] == []
    assert data["next_best_action"] is None
    assert data["recent_transactions"] == []
    assert data["recent_interactions"] == []
    assert data["action_history"] == []


def test_customer_360_with_transactions_and_interactions(client):
    # 1. Create customer
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Barry",
        "last_name": "Allen",
        "email": "barry.allen@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # 2. Add 2 transactions
    client.post("/api/v1/transactions", json={
        "customer_id": customer_id,
        "product_name": "Running Shoes Velocity",
        "category": "Footwear",
        "amount": 160.00,
        "quantity": 1,
    })
    client.post("/api/v1/transactions", json={
        "customer_id": customer_id,
        "product_name": "Hydration Pack",
        "category": "Accessories",
        "amount": 40.00,
        "quantity": 1,
    })

    # 3. Add 2 interactions
    client.post("/api/v1/interactions", json={
        "customer_id": customer_id,
        "event_type": "cart_abandonment",
        "event_value": 85.00,
    })
    client.post("/api/v1/interactions", json={
        "customer_id": customer_id,
        "event_type": "page_view",
    })

    # 4. Fetch Customer 360
    response = client.get(f"/api/v1/customers/{customer_id}/360")
    assert response.status_code == 200
    data = response.json()["data"]

    # Features check
    assert data["features"]["frequency_count"] == 2
    assert float(data["features"]["monetary_value"]) == 200.00
    assert float(data["features"]["average_order_value"]) == 100.00
    assert data["features"]["cart_abandonment_count"] == 1

    # Transactions & Interactions lists
    assert len(data["recent_transactions"]) == 2
    assert len(data["recent_interactions"]) == 2
    # Verify ordering (newest first)
    assert data["recent_transactions"][0]["product_name"] == "Hydration Pack"
    assert data["recent_interactions"][0]["event_type"] == "page_view"


def test_customer_360_with_predictions_and_nba(client, db):
    # 1. Create customer
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Bruce",
        "last_name": "Wayne",
        "email": "bruce.wayne@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # 2. Seed a prediction with SHAP explanations directly into DB
    pred_id = uuid4()
    prediction = Prediction(
        id=pred_id,
        customer_id=customer_id,
        model_name="churn_xgboost",
        model_version="1.0.0",
        prediction_type="churn",
        score=Decimal("0.7800"),
        predicted_class="high_risk",
        confidence=Decimal("0.8900"),
        created_at=datetime.utcnow(),
    )
    db.add(prediction)

    exp1 = Explanation(
        prediction_id=pred_id,
        feature_name="days_inactive",
        feature_value=Decimal("45.0"),
        contribution=Decimal("0.3500"),
        rank=1,
        direction="positive",
    )
    exp2 = Explanation(
        prediction_id=pred_id,
        feature_name="cart_abandonment_count",
        feature_value=Decimal("3.0"),
        contribution=Decimal("0.2200"),
        rank=2,
        direction="positive",
    )
    db.add_all([exp1, exp2])

    # 3. Seed an action (Pending Next Best Action)
    action = Action(
        customer_id=customer_id,
        action_type="RETENTION",
        product="Executive Loyalty Shield",
        offer="25% Renewal Discount",
        channel="WhatsApp",
        timing="within_24_hours",
        objective="Retain High Value Customer",
        score=Decimal("0.9100"),
        rank=1,
        reason="High churn probability with high lifetime value",
        status="PENDING",
    )
    db.add(action)
    db.commit()

    # 4. Fetch Customer 360
    response = client.get(f"/api/v1/customers/{customer_id}/360")
    assert response.status_code == 200
    data = response.json()["data"]

    # Prediction populated
    assert "churn" in data["predictions"]
    assert float(data["predictions"]["churn"]["score"]) == 0.78
    assert data["predictions"]["churn"]["predicted_class"] == "high_risk"

    # SHAP drivers populated
    assert len(data["shap_drivers"]) == 2
    assert data["shap_drivers"][0]["feature_name"] == "days_inactive"
    assert float(data["shap_drivers"][0]["contribution"]) == 0.35
    assert data["shap_drivers"][0]["direction"] == "positive"

    # Next Best Action populated
    assert data["next_best_action"] is not None
    assert data["next_best_action"]["action_type"] == "RETENTION"
    assert data["next_best_action"]["channel"] == "WhatsApp"
    assert float(data["next_best_action"]["score"]) == 0.91
