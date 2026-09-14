from uuid import uuid4


def test_create_customer_success(client):
    payload = {
        "first_name": "Alice",
        "last_name": "Smith",
        "email": "alice.smith@example.com",
        "phone": "+1-555-1234",
        "age": 29,
        "gender": "Female",
        "acquisition_channel": "Organic Search",
        "customer_status": "Active",
    }
    response = client.post("/api/v1/customers", json=payload)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["success"] is True
    assert res_data["data"]["email"] == "alice.smith@example.com"
    assert res_data["data"]["external_customer_id"].startswith("CUST-")
    assert "id" in res_data["data"]


def test_create_customer_duplicate_email(client):
    payload = {
        "first_name": "Bob",
        "last_name": "Jones",
        "email": "bob.jones@example.com",
    }
    res1 = client.post("/api/v1/customers", json=payload)
    assert res1.status_code == 201

    # Attempt duplicate
    res2 = client.post("/api/v1/customers", json=payload)
    assert res2.status_code == 409
    error_data = res2.json()
    assert error_data["success"] is False
    assert error_data["error"]["code"] == "CUSTOMER_ALREADY_EXISTS"


def test_create_customer_validation_error(client):
    # Missing required email and last_name
    payload = {
        "first_name": "Incomplete"
    }
    response = client.post("/api/v1/customers", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"


def test_get_customer_by_id(client):
    # Register customer first
    payload = {
        "first_name": "Charlie",
        "last_name": "Brown",
        "email": "charlie.brown@example.com",
    }
    create_res = client.post("/api/v1/customers", json=payload)
    cust_id = create_res.json()["data"]["id"]

    # Get by ID
    get_res = client.get(f"/api/v1/customers/{cust_id}")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["first_name"] == "Charlie"


def test_get_customer_not_found(client):
    fake_id = str(uuid4())
    response = client.get(f"/api/v1/customers/{fake_id}")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CUSTOMER_NOT_FOUND"


def test_update_customer(client):
    payload = {
        "first_name": "Diana",
        "last_name": "Prince",
        "email": "diana.prince@example.com",
        "customer_status": "Active",
    }
    create_res = client.post("/api/v1/customers", json=payload)
    cust_id = create_res.json()["data"]["id"]

    # Update status to At-Risk
    update_res = client.patch(
        f"/api/v1/customers/{cust_id}",
        json={"customer_status": "At-Risk", "age": 32}
    )
    assert update_res.status_code == 200
    data = update_res.json()["data"]
    assert data["customer_status"] == "At-Risk"
    assert data["age"] == 32
    assert data["first_name"] == "Diana"


def test_list_customers_with_pagination_and_search(client):
    # Seed 3 customers
    for i in range(3):
        client.post("/api/v1/customers", json={
            "first_name": f"User{i}",
            "last_name": "Test",
            "email": f"user{i}@test.com",
            "customer_status": "Active" if i < 2 else "Churned",
        })

    # Test all
    res = client.get("/api/v1/customers?page=1&limit=10")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total"] == 3
    assert len(data["items"]) == 3

    # Test filter by status
    churn_res = client.get("/api/v1/customers?status=Churned")
    assert churn_res.status_code == 200
    assert churn_res.json()["data"]["total"] == 1

    # Test search
    search_res = client.get("/api/v1/customers?search=user1")
    assert search_res.status_code == 200
    assert search_res.json()["data"]["total"] == 1
