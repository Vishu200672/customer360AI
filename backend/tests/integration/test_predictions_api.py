from uuid import uuid4
from decimal import Decimal
from unittest.mock import patch, MagicMock
import httpx

from app.integrations.ml_client import RemoteMLClient
from app.core.exceptions import MLIntegrationException


def test_store_valid_prediction(client):
    # 1. Create a customer
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Diana",
        "last_name": "Prince",
        "email": "diana.predictions@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # 2. Store prediction
    pred_payload = {
        "customer_id": customer_id,
        "model_name": "xgboost_churn_v2",
        "model_version": "2.1.0",
        "prediction_type": "churn",
        "score": 0.82,
        "predicted_class": "high_risk",
        "confidence": 0.91,
    }
    res = client.post("/api/v1/predictions", json=pred_payload)
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["customer_id"] == customer_id
    assert data["model_name"] == "xgboost_churn_v2"
    assert data["prediction_type"] == "churn"
    assert float(data["score"]) == 0.82
    assert "id" in data


def test_store_prediction_nonexistent_customer(client):
    fake_id = str(uuid4())
    pred_payload = {
        "customer_id": fake_id,
        "model_name": "xgboost_churn_v2",
        "model_version": "2.1.0",
        "prediction_type": "churn",
        "score": 0.50,
    }
    res = client.post("/api/v1/predictions", json=pred_payload)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "CUSTOMER_NOT_FOUND"


def test_store_prediction_unsupported_type(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Clark",
        "last_name": "Kent",
        "email": "clark.kent@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    pred_payload = {
        "customer_id": customer_id,
        "model_name": "random_model",
        "model_version": "1.0",
        "prediction_type": "invalid_prediction_type",
        "score": 0.5,
    }
    res = client.post("/api/v1/predictions", json=pred_payload)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_list_and_get_latest_predictions(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Arthur",
        "last_name": "Curry",
        "email": "arthur.curry@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # Store 2 predictions (churn and purchase_propensity)
    client.post("/api/v1/predictions", json={
        "customer_id": customer_id,
        "model_name": "churn_model",
        "model_version": "1.0",
        "prediction_type": "churn",
        "score": 0.35,
    })
    client.post("/api/v1/predictions", json={
        "customer_id": customer_id,
        "model_name": "propensity_model",
        "model_version": "1.0",
        "prediction_type": "purchase_propensity",
        "score": 0.88,
    })

    # List all
    list_res = client.get(f"/api/v1/customers/{customer_id}/predictions")
    assert list_res.status_code == 200
    assert list_res.json()["data"]["total"] == 2

    # Get latest
    latest_res = client.get(f"/api/v1/customers/{customer_id}/predictions/latest")
    assert latest_res.status_code == 200
    latest_data = latest_res.json()["data"]
    assert "churn" in latest_data
    assert "purchase_propensity" in latest_data
    assert float(latest_data["purchase_propensity"]["score"]) == 0.88


def test_customer_360_displays_persisted_prediction(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Hal",
        "last_name": "Jordan",
        "email": "hal.jordan@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # Ingest prediction via POST /predictions
    client.post("/api/v1/predictions", json={
        "customer_id": customer_id,
        "model_name": "churn_xgboost",
        "model_version": "3.0.0",
        "prediction_type": "churn",
        "score": 0.76,
        "predicted_class": "high_risk",
    })

    # Query Customer 360
    res_360 = client.get(f"/api/v1/customers/{customer_id}/360")
    assert res_360.status_code == 200
    data_360 = res_360.json()["data"]

    # Automatically reflected in Customer 360 view
    assert "churn" in data_360["predictions"]
    assert float(data_360["predictions"]["churn"]["score"]) == 0.76
    assert data_360["predictions"]["churn"]["model_name"] == "churn_xgboost"


def test_trigger_prediction_local_demo_mode(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Barry",
        "last_name": "Allen",
        "email": "barry.mltest@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # Trigger on-demand prediction (default local demo heuristic)
    res = client.post(f"/api/v1/customers/{customer_id}/predict", json={"prediction_type": "churn"})
    assert res.status_code == 201
    data = res.json()["data"]

    # Explicitly labeled as synthetic demo
    assert data["model_name"] == "demo_heuristic_engine"
    assert data["model_version"] == "demo-synthetic-v1.0"
    assert data["prediction_type"] == "churn"
    assert 0.0 <= float(data["score"]) <= 1.0


def test_remote_ml_client_mocked_success():
    customer_id = uuid4()
    features = {"recency_days": 10, "monetary_value": 250.0}

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "model_name": "vishvam_neural_churn",
        "model_version": "prod-v1.2",
        "prediction_type": "churn",
        "score": 0.79,
        "predicted_class": "high_risk",
        "confidence": 0.94,
    }

    client = RemoteMLClient(service_url="http://mock-ml-service:8001", timeout=3.0)

    with patch("httpx.Client.post", return_value=mock_response) as mock_post:
        result = client.predict(customer_id, features, prediction_type="churn")
        assert result.model_name == "vishvam_neural_churn"
        assert result.model_version == "prod-v1.2"
        assert result.score == Decimal("0.79")
        assert result.is_synthetic is False
        mock_post.assert_called_once()


def test_remote_ml_client_timeout():
    customer_id = uuid4()
    client = RemoteMLClient(service_url="http://mock-ml-service:8001", timeout=1.0)

    with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Timeout")):
        try:
            client.predict(customer_id, {}, "churn")
            assert False, "Should have raised MLIntegrationException"
        except MLIntegrationException as exc:
            assert exc.code == "ML_SERVICE_ERROR"
            assert "timed out" in exc.message


def test_remote_ml_client_connection_error():
    customer_id = uuid4()
    client = RemoteMLClient(service_url="http://unreachable-service:8001", timeout=1.0)

    with patch("httpx.Client.post", side_effect=httpx.ConnectError("Unreachable")):
        try:
            client.predict(customer_id, {}, "churn")
            assert False, "Should have raised MLIntegrationException"
        except MLIntegrationException as exc:
            assert exc.code == "ML_SERVICE_ERROR"
            assert "unreachable" in exc.message


def test_remote_ml_client_malformed_response():
    customer_id = uuid4()
    mock_response = MagicMock()
    mock_response.status_code = 200
    # Missing required 'score' and 'model_name'
    mock_response.json.return_value = {"error": "unexpected format"}

    client = RemoteMLClient(service_url="http://mock-ml-service:8001", timeout=1.0)

    with patch("httpx.Client.post", return_value=mock_response):
        try:
            client.predict(customer_id, {}, "churn")
            assert False, "Should have raised MLIntegrationException"
        except MLIntegrationException as exc:
            assert exc.code == "ML_SERVICE_ERROR"
            assert "malformed" in exc.message


def test_prediction_does_not_mutate_customer_status(client):
    # 1. Create Active customer
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Wally",
        "last_name": "West",
        "email": "wally.west@example.com",
        "customer_status": "Active",
    })
    customer_id = cust_res.json()["data"]["id"]

    # 2. Ingest high churn prediction (score 0.95)
    pred_res = client.post("/api/v1/predictions", json={
        "customer_id": customer_id,
        "model_name": "churn_model",
        "model_version": "1.0.0",
        "prediction_type": "churn",
        "score": 0.95,
        "predicted_class": "high_risk",
    })
    assert pred_res.status_code == 201

    # 3. Verify customer status remains strictly unchanged ("Active")
    get_res = client.get(f"/api/v1/customers/{customer_id}")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["customer_status"] == "Active"


def test_remote_ml_client_vishvam_hf_contract():
    """Verify exact request payload format and response parsing for Vishvam's HF Space."""
    customer_id = uuid4()
    features = {
        "name": "Jane Foster",
        "recency_days": 12,
        "frequency_count": 8,
        "monetary_value": 45000.0,
        "cart_abandonment_count": 2,
        "engagement_score": 0.85,
        "acquisition_channel": "WhatsApp",
    }

    mock_hf_response = MagicMock()
    mock_hf_response.status_code = 200
    mock_hf_response.json.return_value = {
        "customer_id": str(customer_id),
        "segment": "Loyal Customers",
        "churn_probability": 0.0825,
        "churn_risk_pct": 8.3,
        "purchase_propensity": 0.8950,
        "purchase_intent_pct": 89.5,
        "estimated_clv": 78000.0,
        "shap_explanations": [
            {
                "feature": "monetary_total_spend",
                "impact": "high",
                "direction": "positive",
                "reason": "Customer has high lifetime spend.",
                "shap_value": None,
            }
        ],
        "explanation_type": "rule_based",
        "next_best_action": {
            "action": "Loyalty appreciation",
            "reason": "High lifetime spend.",
            "recommended_offer": "Exclusive VIP tier access",
            "preferred_channel": "WhatsApp",
            "preferred_category": "General",
            "priority": "high",
        },
        "inference_mode": "trained_artifacts",
    }

    client = RemoteMLClient(
        service_url="https://vishu2006-customer.hf.space",
        timeout=15.0,
        api_key="secret-test-key",
    )

    with patch("httpx.Client.post", return_value=mock_hf_response) as mock_post:
        # Test Churn prediction type
        churn_out = client.predict(customer_id, features, prediction_type="churn")
        assert churn_out.score == Decimal("0.0825")
        assert churn_out.predicted_class == "low_risk"
        assert churn_out.is_synthetic is False
        # Confirms NO fake SHAP explanations are parsed when shap_value is None
        assert churn_out.explanations is None

        # Verify request payload and endpoint structure
        call_args = mock_post.call_args
        assert call_args[0][0] == "https://vishu2006-customer.hf.space/demo-predict"
        sent_body = call_args[1]["json"]
        assert sent_body["customer_id"] == str(customer_id)
        assert sent_body["name"] == "Jane Foster"
        assert sent_body["recency_days"] == 12
        assert sent_body["frequency_purchases"] == 8
        assert sent_body["monetary_total_spend"] == 45000.0
        assert sent_body["cart_abandonments_30d"] == 2
        assert sent_body["preferred_channel"] == "WhatsApp"
        assert call_args[1]["headers"]["X-Api-Key"] == "secret-test-key"

        # Test Purchase Propensity prediction type
        prop_out = client.predict(customer_id, features, prediction_type="purchase_propensity")
        assert prop_out.score == Decimal("0.8950")
        assert prop_out.predicted_class == "high"

        # Test CLV prediction type
        clv_out = client.predict(customer_id, features, prediction_type="clv")
        assert clv_out.score == Decimal("78000.0")


def test_trigger_prediction_with_live_hf_contract_persists(client):
    """Verify end-to-end trigger, persistence, and C360 integration using Vishvam's response contract."""
    # 1. Register customer
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Tony",
        "last_name": "Stark",
        "email": "tony.stark.hf@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    mock_hf_response = MagicMock()
    mock_hf_response.status_code = 200
    mock_hf_response.json.return_value = {
        "customer_id": customer_id,
        "segment": "High Value",
        "churn_probability": 0.0512,
        "churn_risk_pct": 5.1,
        "purchase_propensity": 0.9420,
        "purchase_intent_pct": 94.2,
        "estimated_clv": 150000.0,
        "shap_explanations": [
            {
                "feature": "monetary_total_spend",
                "impact": "high",
                "direction": "positive",
                "reason": "Top tier spender",
                "shap_value": None,
            }
        ],
        "explanation_type": "rule_based",
        "next_best_action": {
            "action": "VIP Concierge Onboarding",
            "reason": "High CLV customer.",
            "recommended_offer": "Dedicated Account Manager",
            "preferred_channel": "Email",
            "preferred_category": "Electronics",
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
            pred_data = res.json()["data"]
            assert float(pred_data["score"]) == 0.0512
            assert pred_data["predicted_class"] == "low_risk"

            # Verify persisted in predictions API
            list_res = client.get(f"/api/v1/customers/{customer_id}/predictions")
            assert list_res.status_code == 200
            items = list_res.json()["data"]["items"]
            assert len(items) == 1
            assert items[0]["prediction_type"] == "churn"

            # Verify Customer 360 view
            c360_res = client.get(f"/api/v1/customers/{customer_id}/360")
            assert c360_res.status_code == 200
            c360 = c360_res.json()["data"]
            assert "churn" in c360["predictions"]
            assert float(c360["predictions"]["churn"]["score"]) == 0.0512
            # Zero fake SHAP values
            assert c360["shap_drivers"] == []

