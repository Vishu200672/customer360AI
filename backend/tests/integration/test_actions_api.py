from uuid import uuid4
from decimal import Decimal
from unittest.mock import patch, MagicMock
import httpx

from app.integrations.ml_client import RemoteMLClient


def test_create_action_direct_success(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Oliver",
        "last_name": "Queen",
        "email": "oliver.queen@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    payload = {
        "action": "Retention Special Discount",
        "action_type": "RETENTION",
        "product": "Annual Subscription",
        "offer": "20% OFF",
        "channel": "Email",
        "timing": "within_24_hours",
        "objective": "Prevent churn",
        "score": 0.85,
        "rank": 1,
        "reason": "High probability of churn detected.",
    }
    res = client.post(f"/api/v1/customers/{customer_id}/actions", json=payload)
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["action"] == "RETENTION"
    assert data["action_type"] == "RETENTION"
    assert data["offer"] == "20% OFF"
    assert data["recommended_offer"] == "20% OFF"
    assert data["channel"] == "Email"
    assert data["preferred_channel"] == "Email"
    assert data["priority"] == "high"
    assert data["status"] == "PENDING"
    assert "id" in data


def test_create_action_nba_style_fields(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Felicity",
        "last_name": "Smoak",
        "email": "felicity.smoak@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    payload = {
        "action": "Conversion acceleration",
        "reason": "Customer demonstrates high purchase intent.",
        "recommended_offer": "10% First Order Discount",
        "preferred_channel": "WhatsApp",
        "preferred_category": "Apparel",
        "priority": "medium",
    }
    res = client.post(f"/api/v1/customers/{customer_id}/actions", json=payload)
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["customer_id"] == customer_id
    assert data["action"] == "Conversion acceleration"
    assert data["action_type"] == "Conversion acceleration"
    assert data["offer"] == "10% First Order Discount"
    assert data["recommended_offer"] == "10% First Order Discount"
    assert data["channel"] == "WhatsApp"
    assert data["preferred_channel"] == "WhatsApp"
    assert data["product"] == "Apparel"
    assert data["preferred_category"] == "Apparel"
    assert data["priority"] == "medium"
    assert float(data["score"]) == 0.60
    assert data["status"] == "PENDING"


def test_create_action_nonexistent_customer(client):
    fake_id = str(uuid4())
    payload = {
        "action": "Test Action",
        "reason": "Testing 404",
        "channel": "Email",
    }
    res = client.post(f"/api/v1/customers/{fake_id}/actions", json=payload)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "CUSTOMER_NOT_FOUND"


def test_get_action_by_id_and_list_and_latest(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Barry",
        "last_name": "Allen",
        "email": "barry.allen@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # Create two actions
    a1 = client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "Welcome Onboarding",
        "reason": "New user welcome",
        "channel": "Email",
        "priority": "low",
    }).json()["data"]

    a2 = client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "Flash Sale Alert",
        "reason": "Weekend promo",
        "channel": "Push",
        "priority": "high",
    }).json()["data"]

    # 1. Get action by id
    res = client.get(f"/api/v1/actions/{a1['id']}")
    assert res.status_code == 200
    assert res.json()["data"]["id"] == a1["id"]

    # 2. List customer actions
    res = client.get(f"/api/v1/customers/{customer_id}/actions")
    assert res.status_code == 200
    assert res.json()["data"]["total"] == 2
    assert len(res.json()["data"]["items"]) == 2

    # 3. Get latest action
    res = client.get(f"/api/v1/customers/{customer_id}/actions/latest")
    assert res.status_code == 200
    assert res.json()["data"]["id"] == a2["id"]


def test_update_action_status_and_fields(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Iris",
        "last_name": "West",
        "email": "iris.west@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    act = client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "Survey Request",
        "reason": "Collect NPS",
        "channel": "Email",
    }).json()["data"]

    # Update status to EXECUTED
    res = client.patch(f"/api/v1/actions/{act['id']}", json={
        "status": "EXECUTED",
        "timing": "completed",
    })
    assert res.status_code == 200
    updated = res.json()["data"]
    assert updated["status"] == "EXECUTED"
    assert updated["timing"] == "completed"


def test_record_and_get_action_outcome(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Cisco",
        "last_name": "Ramon",
        "email": "cisco.ramon@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    act = client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "Tech Discount",
        "reason": "High gadget affinity",
        "channel": "Email",
        "offer": "15% off gadgets",
    }).json()["data"]

    # Record outcome
    outcome_payload = {
        "delivered": True,
        "opened": True,
        "clicked": True,
        "purchased": True,
        "converted": True,
        "churned": False,
        "revenue": 249.99,
        "outcome_metadata": {"campaign": "gadget_frenzy", "discount_code": "GADGET15"},
    }
    res = client.post(f"/api/v1/actions/{act['id']}/outcome", json=outcome_payload)
    assert res.status_code == 201
    out_data = res.json()["data"]
    assert out_data["action_id"] == act["id"]
    assert out_data["delivered"] is True
    assert out_data["opened"] is True
    assert out_data["clicked"] is True
    assert out_data["purchased"] is True
    assert out_data["converted"] is True
    assert float(out_data["revenue"]) == 249.99
    assert out_data["outcome_metadata"]["campaign"] == "gadget_frenzy"

    # Action status should be updated to EXECUTED automatically
    act_res = client.get(f"/api/v1/actions/{act['id']}")
    assert act_res.json()["data"]["status"] == "EXECUTED"

    # Fetch outcomes (both plural and singular routes)
    res_list = client.get(f"/api/v1/actions/{act['id']}/outcomes")
    assert res_list.status_code == 200
    assert len(res_list.json()["data"]) == 1

    res_single = client.get(f"/api/v1/actions/{act['id']}/outcome")
    assert res_single.status_code == 200
    assert res_single.json()["data"]["action_id"] == act["id"]


def test_outcome_nonexistent_action(client):
    fake_id = str(uuid4())
    res = client.post(f"/api/v1/actions/{fake_id}/outcome", json={"delivered": True})
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "ACTION_NOT_FOUND"


def test_remote_ml_prediction_triggers_nba_persistence_and_c360(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Kara",
        "last_name": "Danvers",
        "email": "kara.danvers@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    mock_hf_response = MagicMock()
    mock_hf_response.status_code = 200
    mock_hf_response.json.return_value = {
        "customer_id": customer_id,
        "segment": "Loyal Enthusiast",
        "churn_probability": 0.12,
        "purchase_propensity": 0.88,
        "estimated_clv": 120000.0,
        "shap_explanations": [
            {
                "feature": "engagement_score",
                "impact": "high",
                "direction": "positive",
                "reason": "Active user",
                "shap_value": None,
            }
        ],
        "next_best_action": {
            "action": "VIP Loyalty Offer",
            "reason": "Customer has high purchase intent and high engagement.",
            "recommended_offer": "Free Annual Shipping",
            "preferred_channel": "Push",
            "preferred_category": "Apparel",
            "priority": "high",
        },
        "inference_mode": "trained_artifacts",
    }

    mock_client_instance = MagicMock()
    mock_client_instance.__enter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_hf_response

    with patch("app.integrations.ml_client.httpx.Client", return_value=mock_client_instance):
        with patch("app.integrations.ml_client.settings.ML_MODE", "remote"):
            # Trigger prediction
            res = client.post(f"/api/v1/customers/{customer_id}/predict", json={"prediction_type": "churn"})
            assert res.status_code == 201

            # Verify action was persisted
            actions_res = client.get(f"/api/v1/customers/{customer_id}/actions")
            assert actions_res.status_code == 200
            actions = actions_res.json()["data"]["items"]
            assert len(actions) == 1
            nba_saved = actions[0]
            assert nba_saved["action"] == "VIP Loyalty Offer"
            assert nba_saved["recommended_offer"] == "Free Annual Shipping"
            assert nba_saved["preferred_channel"] == "Push"
            assert nba_saved["preferred_category"] == "Apparel"
            assert nba_saved["priority"] == "high"
            assert nba_saved["status"] == "PENDING"

            # Verify Customer 360 view contains next_best_action
            c360_res = client.get(f"/api/v1/customers/{customer_id}/360")
            assert c360_res.status_code == 200
            c360 = c360_res.json()["data"]
            assert c360["next_best_action"] is not None
            assert c360["next_best_action"]["action"] == "VIP Loyalty Offer"
            assert c360["next_best_action"]["recommended_offer"] == "Free Annual Shipping"
            assert c360["next_best_action"]["preferred_channel"] == "Push"
            assert c360["next_best_action"]["preferred_category"] == "Apparel"
            assert c360["next_best_action"]["priority"] == "high"
            # History does not duplicate the active next_best_action
            assert c360["action_history"] == []
