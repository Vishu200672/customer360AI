from uuid import uuid4


def test_record_and_list_interactions(client):
    # 1. Create a customer
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Fiona",
        "last_name": "Gallagher",
        "email": "fiona.g@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # 2. Ingest 2 interactions (cart_abandonment and page_view)
    event1 = {
        "customer_id": customer_id,
        "event_type": "cart_abandonment",
        "event_value": 350.0,
        "metadata_json": {"items": ["Item A", "Item B"], "abandon_step": "payment"},
    }
    res1 = client.post("/api/v1/interactions", json=event1)
    assert res1.status_code == 201
    assert res1.json()["data"]["event_type"] == "cart_abandonment"

    event2 = {
        "customer_id": customer_id,
        "event_type": "page_view",
        "metadata_json": {"path": "/pricing"},
    }
    res2 = client.post("/api/v1/interactions", json=event2)
    assert res2.status_code == 201

    # 3. Retrieve interactions timeline for customer
    list_res = client.get(f"/api/v1/customers/{customer_id}/interactions")
    assert list_res.status_code == 200
    list_data = list_res.json()["data"]
    assert list_data["total"] == 2
    assert len(list_data["items"]) == 2

    # 4. Filter by event_type
    filtered_res = client.get(f"/api/v1/customers/{customer_id}/interactions?event_type=cart_abandonment")
    assert filtered_res.status_code == 200
    assert filtered_res.json()["data"]["total"] == 1


def test_record_interaction_nonexistent_customer(client):
    fake_id = str(uuid4())
    event = {
        "customer_id": fake_id,
        "event_type": "click",
    }
    response = client.post("/api/v1/interactions", json=event)
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CUSTOMER_NOT_FOUND"
