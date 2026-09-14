-- Customer360 AI Database Initialization Schema

CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    external_customer_id VARCHAR(64) UNIQUE NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    email VARCHAR(256) UNIQUE NOT NULL,
    phone VARCHAR(64),
    age INT,
    gender VARCHAR(32),
    acquisition_channel VARCHAR(128),
    customer_status VARCHAR(64) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_features (
    customer_id VARCHAR(64) PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
    recency_days INT DEFAULT 0,
    frequency_count INT DEFAULT 0,
    monetary_value NUMERIC(12, 2) DEFAULT 0.00,
    days_inactive INT DEFAULT 0,
    engagement_score NUMERIC(5, 4) DEFAULT 0.5000,
    cart_abandonment_count INT DEFAULT 0,
    average_order_value NUMERIC(12, 2) DEFAULT 0.00,
    estimated_clv NUMERIC(12, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE CASCADE,
    reference_id VARCHAR(64),
    product_name VARCHAR(256),
    category VARCHAR(128),
    amount NUMERIC(12, 2),
    quantity INT DEFAULT 1,
    transaction_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    channel VARCHAR(64),
    status VARCHAR(32) DEFAULT 'COMPLETED'
);

CREATE TABLE IF NOT EXISTS interactions (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE CASCADE,
    event_type VARCHAR(64),
    event_value TEXT,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predictions (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE CASCADE,
    model_name VARCHAR(128),
    model_version VARCHAR(32),
    prediction_type VARCHAR(64),
    score NUMERIC(5, 4),
    predicted_class VARCHAR(64),
    confidence NUMERIC(5, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS next_best_actions (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE CASCADE,
    action VARCHAR(256) NOT NULL,
    action_type VARCHAR(64),
    reason TEXT,
    recommended_offer VARCHAR(256),
    preferred_channel VARCHAR(64),
    preferred_category VARCHAR(128),
    priority VARCHAR(32) DEFAULT 'medium',
    score NUMERIC(5, 4) DEFAULT 0.80,
    timing VARCHAR(64),
    objective VARCHAR(256),
    status VARCHAR(32) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial seed data
INSERT INTO customers (id, external_customer_id, first_name, last_name, email, phone, age, gender, acquisition_channel, customer_status)
VALUES 
('c101', 'CUST-1001', 'Elena', 'Rostova', 'elena.rostova@enterprise.com', '+1 (555) 234-8901', 38, 'Female', 'Paid Search', 'At-Risk'),
('c102', 'CUST-1002', 'Marcus', 'Vance', 'marcus.vance@techcorp.io', '+1 (555) 876-5432', 44, 'Male', 'Direct organic', 'VIP / Active'),
('c103', 'CUST-1003', 'Aarav', 'Sharma', 'aarav.sharma@nexus.in', '+91 98765 43210', 31, 'Male', 'Partner Referral', 'Dormant')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_features (customer_id, recency_days, frequency_count, monetary_value, days_inactive, engagement_score, cart_abandonment_count, average_order_value, estimated_clv)
VALUES
('c101', 42, 14, 42500.00, 42, 0.3500, 3, 3035.71, 68500.00),
('c102', 3, 38, 124000.00, 3, 0.9400, 0, 3263.15, 185000.00),
('c103', 95, 2, 4500.00, 95, 0.1200, 1, 2250.00, 12000.00)
ON CONFLICT (customer_id) DO NOTHING;
