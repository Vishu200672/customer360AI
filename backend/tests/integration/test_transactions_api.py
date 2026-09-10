from uuid import uuid4


def test_create_and_list_transactions(client):
    # 1. Create a customer
    cust_res = client.post("/api/v1/customers", json={
        "first_name": "Evan",
        "last_name": "Wright",
        "email": "evan.wright@example.com",
    })
    customer_id = cust_res.json()["data"]["id"]

    # 2. Record 2 transactions
    txn1 = {
        "customer_id": customer_id,
        "product_name": "Ultra Smartwatch Pro",
        "product_sku": "SKU-WATCH-01",
        "category": "Wearables",
        "amount": 299.99,
        "quantity": 1,
        "channel": "Online",
    }
    res1 = client.post("/api/v1/transactions", json=txn1)
    assert res1.status_code == 201
    data1 = res1.json()["data"]
    assert data1["product_name"] == "Ultra Smartwatch Pro"
    assert data1["reference_id"].startswith("TXN-")

    txn2 = {
        "customer_id": customer_id,
        "product_name": "Magnetic Charging Dock",
        "product_sku": "SKU-ACC-05",
        "category": "Accessories",
        "amount": 49.50,
        "quantity": 2,
        "channel": "Online",
    }
    res2 = client.post("/api/v1/transactions", json=txn2)
    assert res2.status_code == 201

    # 3. Retrieve transactions for this customer
    list_res = client.get(f"/api/v1/customers/{customer_id}/transactions")
    assert list_res.status_code == 200
    list_data = list_res.json()["data"]
    assert list_data["total"] == 2
    assert len(list_data["items"]) == 2

    # 4. Filter by category
    cat_res = client.get(f"/api/v1/customers/{customer_id}/transactions?category=Wearables")
    assert cat_res.status_code == 200
    assert cat_res.json()["data"]["total"] == 1


def test_create_transaction_nonexistent_customer(client):
    fake_id = str(uuid4())
    txn = {
        "customer_id": fake_id,
        "product_name": "Ghost Product",
        "category": "Electronics",
        "amount": 100.0,
    }
    response = client.post("/api/v1/transactions", json=txn)
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CUSTOMER_NOT_FOUND"
