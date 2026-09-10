import pytest
from uuid import uuid4
from decimal import Decimal
from fastapi.testclient import TestClient

from app.core.config import settings


def test_cors_headers_present_for_allowed_origins(client: TestClient):
    """Verify that allowed frontend origin receives appropriate CORS headers."""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "access-control-allow-credentials" in response.headers


def test_validation_error_response_structure_is_predictable(client: TestClient):
    """Verify 422 errors return a standardized ErrorEnvelope without leaking internal exceptions."""
    response = client.post("/api/v1/customers", json={"email": "invalid_payload"})
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "message" in data["error"]
    assert "details" in data["error"]


def test_invalid_uuid_parameter_handling(client: TestClient):
    """Verify invalid UUID paths return clean 422 validation errors."""
    response = client.get("/api/v1/customers/not-a-valid-uuid")
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_nonexistent_resource_errors_are_standardized(client: TestClient):
    """Verify 404 resource errors use domain error codes."""
    fake_id = str(uuid4())
    res_c = client.get(f"/api/v1/customers/{fake_id}")
    assert res_c.status_code == 404
    assert res_c.json()["error"]["code"] == "CUSTOMER_NOT_FOUND"

    res_a = client.get(f"/api/v1/actions/{fake_id}")
    assert res_a.status_code == 404
    assert res_a.json()["error"]["code"] == "ACTION_NOT_FOUND"


def test_action_outcome_one_to_one_cardinality_and_safety(client: TestClient):
    """
    Verify that an action can have at most one outcome record (1-to-1 unique constraint),
    and updating the outcome idempotently updates rather than duplicates revenue.
    """
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Cardinality",
        "last_name": "Test",
        "email": "cardinality.test@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    act = client.post(f"/api/v1/customers/{customer_id}/actions", json={
        "action": "Card Test Promo",
        "reason": "Verify 1-to-1 outcome cardinality",
        "channel": "Email",
    }).json()["data"]
    action_id = act["id"]

    # First outcome record: $100
    res1 = client.post(f"/api/v1/actions/{action_id}/outcome", json={
        "delivered": True,
        "converted": True,
        "revenue": 100.0,
    })
    assert res1.status_code == 201

    # Second outcome record on same action updates existing row (idempotent): $150
    res2 = client.post(f"/api/v1/actions/{action_id}/outcome", json={
        "delivered": True,
        "converted": True,
        "revenue": 150.0,
    })
    assert res2.status_code == 201

    # Verify outcomes count is still exactly 1
    outcomes_res = client.get(f"/api/v1/actions/{action_id}/outcomes")
    assert outcomes_res.status_code == 200
    assert len(outcomes_res.json()["data"]) == 1

    # Verify customer feedback does not double count actions or outcomes
    fb_res = client.get(f"/api/v1/customers/{customer_id}/feedback")
    assert fb_res.status_code == 200
    fb = fb_res.json()["data"]
    assert fb["summary"]["total_actions"] == 1
    assert fb["summary"]["outcomes_recorded"] == 1
    assert fb["conversions"]["converted"] == 1
    assert float(fb["conversions"]["total_revenue"]) == 150.0


def test_frontend_customer_360_complete_contract(client: TestClient):
    """
    Verify frontend consumption contract for Customer 360:
    All 10 required blocks must exist and be properly typed.
    """
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "FrontEnd",
        "last_name": "Ready",
        "email": "frontend.ready@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    c360_res = client.get(f"/api/v1/customers/{customer_id}/360")
    assert c360_res.status_code == 200
    c360 = c360_res.json()["data"]

    # 1. Profile block
    assert "profile" in c360
    assert c360["profile"]["first_name"] == "FrontEnd"
    # 2. Features block
    assert "features" in c360
    # 3. Segments block
    assert "segments" in c360 and isinstance(c360["segments"], list)
    # 4. Predictions block
    assert "predictions" in c360 and isinstance(c360["predictions"], dict)
    # 5. SHAP drivers block
    assert "shap_drivers" in c360 and isinstance(c360["shap_drivers"], list)
    # 6. Next best action block
    assert "next_best_action" in c360
    # 7. Recent transactions block
    assert "recent_transactions" in c360 and isinstance(c360["recent_transactions"], list)
    # 8. Recent interactions block
    assert "recent_interactions" in c360 and isinstance(c360["recent_interactions"], list)
    # 9. Action history block
    assert "action_history" in c360 and isinstance(c360["action_history"], list)
    # 10. Action feedback block (None if no actions, or dict if actions present)
    assert "action_feedback" in c360
