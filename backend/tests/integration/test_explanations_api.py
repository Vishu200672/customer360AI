from uuid import uuid4
from decimal import Decimal
from unittest.mock import patch, MagicMock

from app.integrations.ml_client import RemoteMLClient


def test_store_single_and_multiple_explanations(client):
    # 1. Create a customer
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Tony",
        "last_name": "Stark",
        "email": "tony.stark@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # 2. Store prediction
    pred_res = client.post("/api/v1/predictions", json={
        "customer_id": customer_id,
        "model_name": "churn_model_v1",
        "model_version": "1.0",
        "prediction_type": "churn",
        "score": 0.81,
    })
    prediction_id = pred_res.json()["data"]["id"]

    # 3. Store multiple explanations for this prediction
    exp_payload = {
        "explanations": [
            {
                "feature_name": "days_inactive",
                "feature_value": 42.0,
                "contribution": 0.32,
                "rank": 1,
                "direction": "positive",
                "explanation_metadata": {"method": "shap_tree"},
            },
            {
                "feature_name": "cart_abandonment_count",
                "feature_value": 3.0,
                "contribution": 0.18,
                "rank": 2,
                "direction": "positive",
            },
            {
                "feature_name": "monetary_value",
                "feature_value": 850.0,
                "contribution": -0.12,
                "rank": 3,
                "direction": "negative",
            },
        ]
    }
    exp_res = client.post(f"/api/v1/predictions/{prediction_id}/explanations", json=exp_payload)
    assert exp_res.status_code == 201
    records = exp_res.json()["data"]
    assert len(records) == 3
    assert records[0]["feature_name"] == "days_inactive"
    assert records[0]["rank"] == 1
    assert float(records[0]["contribution"]) == 0.32
    assert records[2]["direction"] == "negative"


def test_store_explanation_nonexistent_prediction(client):
    fake_pred_id = str(uuid4())
    payload = {
        "explanations": [
            {
                "feature_name": "days_inactive",
                "contribution": 0.25,
                "rank": 1,
                "direction": "positive",
            }
        ]
    }
    res = client.post(f"/api/v1/predictions/{fake_pred_id}/explanations", json=payload)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "PREDICTION_NOT_FOUND"


def test_reject_customer_prediction_mismatch(client, db):
    from app.services.explanation_service import ExplanationService
    from app.core.exceptions import ValidationException
    from app.schemas.explanation import ExplanationCreate
    import uuid

    # Create Customer A
    cust_a = client.post("/api/v1/customers", json={
        "first_name": "CustA",
        "last_name": "User",
        "email": "cust.a@example.com",
    }).json()["data"]["id"]

    # Create Customer B
    cust_b = client.post("/api/v1/customers", json={
        "first_name": "CustB",
        "last_name": "User",
        "email": "cust.b@example.com",
    }).json()["data"]["id"]

    # Prediction belongs to Customer A
    pred_a = client.post("/api/v1/predictions", json={
        "customer_id": cust_a,
        "model_name": "m",
        "model_version": "1",
        "prediction_type": "churn",
        "score": 0.5,
    }).json()["data"]["id"]

    # Explanation service called with expected_customer_id = cust_b -> must reject
    service = ExplanationService(db)
    try:
        service.add_explanations_to_prediction(
            prediction_id=uuid.UUID(pred_a),
            explanations_data=[
                ExplanationCreate(
                    feature_name="days_inactive",
                    contribution=Decimal("0.2"),
                    rank=1,
                    direction="positive",
                )
            ],
            expected_customer_id=uuid.UUID(cust_b),
        )
        assert False, "Should have raised ValidationException for mismatch"
    except ValidationException as e:
        assert "does not belong to customer" in str(e)


def test_retrieve_explanations_by_prediction(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Steve",
        "last_name": "Rogers",
        "email": "steve.rogers@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    pred_res = client.post("/api/v1/predictions", json={
        "customer_id": customer_id,
        "model_name": "propensity_model",
        "model_version": "2.0",
        "prediction_type": "purchase_propensity",
        "score": 0.77,
        "explanations": [
            {
                "feature_name": "recency_days",
                "contribution": 0.40,
                "rank": 1,
                "direction": "positive",
            },
            {
                "feature_name": "engagement_score",
                "contribution": 0.25,
                "rank": 2,
                "direction": "positive",
            }
        ]
    })
    pred_id = pred_res.json()["data"]["id"]

    # Query GET /predictions/{prediction_id}/explanations
    res = client.get(f"/api/v1/predictions/{pred_id}/explanations")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 2
    assert data[0]["feature_name"] == "recency_days"
    assert data[1]["feature_name"] == "engagement_score"


def test_retrieve_explanations_by_customer(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Natasha",
        "last_name": "Romanoff",
        "email": "natasha.r@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    client.post("/api/v1/predictions", json={
        "customer_id": customer_id,
        "model_name": "m1",
        "model_version": "1.0",
        "prediction_type": "churn",
        "score": 0.65,
        "explanations": [
            {"feature_name": "days_inactive", "contribution": 0.3, "rank": 1, "direction": "positive"}
        ]
    })

    # Query GET /customers/{customer_id}/explanations
    res = client.get(f"/api/v1/customers/{customer_id}/explanations")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) >= 1
    assert data[0]["feature_name"] == "days_inactive"


def test_customer_360_displays_persisted_explanations(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Thor",
        "last_name": "Odinson",
        "email": "thor@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    client.post("/api/v1/predictions", json={
        "customer_id": customer_id,
        "model_name": "churn_model",
        "model_version": "1.0",
        "prediction_type": "churn",
        "score": 0.79,
        "explanations": [
            {
                "feature_name": "inactivity",
                "feature_value": 35.0,
                "contribution": 0.45,
                "rank": 1,
                "direction": "positive",
            }
        ]
    })

    res_360 = client.get(f"/api/v1/customers/{customer_id}/360")
    assert res_360.status_code == 200
    data_360 = res_360.json()["data"]

    assert len(data_360["shap_drivers"]) == 1
    driver = data_360["shap_drivers"][0]
    assert driver["feature_name"] == "inactivity"
    assert float(driver["contribution"]) == 0.45
    assert driver["direction"] == "positive"


def test_customer_360_empty_shap_drivers_when_no_explanation(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Peter",
        "last_name": "Parker",
        "email": "peter.parker@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # Store prediction with NO explanations
    client.post("/api/v1/predictions", json={
        "customer_id": customer_id,
        "model_name": "churn_model",
        "model_version": "1.0",
        "prediction_type": "churn",
        "score": 0.40,
    })

    res_360 = client.get(f"/api/v1/customers/{customer_id}/360")
    assert res_360.status_code == 200
    data_360 = res_360.json()["data"]
    # Strictly empty array, zero fabrication
    assert data_360["shap_drivers"] == []


def test_prediction_trigger_without_explanation_does_not_create_fake_explanations(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Carol",
        "last_name": "Danvers",
        "email": "carol.danvers@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # Trigger prediction via local demo client (which does NOT provide SHAP)
    trigger_res = client.post(f"/api/v1/customers/{customer_id}/predict", json={"prediction_type": "churn"})
    assert trigger_res.status_code == 201
    pred_id = trigger_res.json()["data"]["id"]

    # Verify no explanations were created
    exp_res = client.get(f"/api/v1/predictions/{pred_id}/explanations")
    assert exp_res.status_code == 200
    assert exp_res.json()["data"] == []


def test_prediction_trigger_with_mocked_remote_explanations(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Wanda",
        "last_name": "Maximoff",
        "email": "wanda.m@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "model_name": "remote_xgboost_churn",
        "model_version": "v2.0",
        "prediction_type": "churn",
        "score": 0.88,
        "predicted_class": "high_risk",
        "confidence": 0.95,
        "explanations": [
            {
                "feature_name": "days_inactive",
                "feature_value": 60.0,
                "contribution": 0.50,
                "rank": 1,
                "direction": "positive",
            },
            {
                "feature_name": "engagement_score",
                "feature_value": 0.15,
                "contribution": 0.30,
                "rank": 2,
                "direction": "positive",
            }
        ]
    }

    mock_client_instance = MagicMock()
    mock_client_instance.__enter__.return_value = mock_client_instance
    mock_client_instance.post.return_value = mock_response

    with patch("app.integrations.ml_client.httpx.Client", return_value=mock_client_instance):
        with patch("app.integrations.ml_client.settings.ML_MODE", "remote"):
            # Trigger prediction using mocked remote client
            trigger_res = client.post(f"/api/v1/customers/{customer_id}/predict", json={"prediction_type": "churn"})
            assert trigger_res.status_code == 201
            pred_id = trigger_res.json()["data"]["id"]

            # Verify explanations were persisted from the remote response
            exp_res = client.get(f"/api/v1/predictions/{pred_id}/explanations")
            assert exp_res.status_code == 200
            exps = exp_res.json()["data"]
            assert len(exps) == 2
            assert exps[0]["feature_name"] == "days_inactive"
            assert float(exps[0]["contribution"]) == 0.50


def test_malformed_explanation_rejected(client):
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Stephen",
        "last_name": "Strange",
        "email": "stephen.strange@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    pred_res = client.post("/api/v1/predictions", json={
        "customer_id": customer_id,
        "model_name": "m",
        "model_version": "1",
        "prediction_type": "churn",
        "score": 0.5,
    })
    pred_id = pred_res.json()["data"]["id"]

    # Invalid direction (neither 'positive' nor 'negative')
    payload = {
        "explanations": [
            {
                "feature_name": "test_feat",
                "contribution": 0.1,
                "rank": 1,
                "direction": "sideways",
            }
        ]
    }
    res = client.post(f"/api/v1/predictions/{pred_id}/explanations", json=payload)
    assert res.status_code == 422
