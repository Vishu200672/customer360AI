# Customer360 AI — Backend Architecture & Engineering Guide

**Customer Decision Intelligence Platform**  
*Decision Loop: UNDERSTAND → PREDICT → EXPLAIN → DECIDE → PERSONALIZE → ACT → LEARN*

---

## 1. Backend Purpose
Customer360 AI converts fragmented customer signals (transactions, web clicks, cart events, support feedback, inactivity) into unified customer states and explainable Next Best Actions (NBA). 

The backend acts as the central hub connecting:
$$\text{Data Ingestion} \longrightarrow \text{PostgreSQL} \longrightarrow \text{Customer 360 Profile} \longrightarrow \text{ML Inference / SHAP} \longrightarrow \text{NBA Engine} \longrightarrow \text{React Dashboard} \longrightarrow \text{Outcome Feedback Loop}$$

---

## 2. Tamanna's Responsibility (Backend Owner)
Tamanna is responsible for the complete backend engineering lifecycle:
- **FastAPI Core:** App architecture, routing, middleware, CORS, lifecycle events, dependency injection, and exception handlers.
- **Data Persistence:** PostgreSQL relational schema, SQLAlchemy 2.x declarative models, foreign key relationships, indexes, and Alembic migrations.
- **Service & Repository Layer:** Clean separation between business logic and database access.
- **Customer 360 Aggregation API:** Single-call endpoint combining profile, RFM features, predictions, SHAP drivers, active NBA, and timeline history.
- **Integration Interfaces:**
  - Stable contract for Vishvam's ML predictions and SHAP explainability.
  - Ingestion interface for Anmol's normalized data pipeline.
  - Clean, type-safe REST contracts for Omik's React dashboard.
- **Next Best Action (NBA) Framework:** Deterministic, multi-factor decision logic scoring and ranking candidate actions.
- **Feedback & Outcome Tracking:** Recording execution intents and downstream customer outcomes (opened, converted, churned).
- **Executive Analytics:** Aggregation endpoints for dashboard KPIs, segment distributions, and model performance metrics.
- **Quality Assurance & DevOps:** Pytest suite, containerization (Dockerfile, docker-compose), and environment configuration.

---

## 3. Backend Architecture
The backend follows a strict layered pattern:
```
Request (HTTP)
   │
   ▼
[API Router (v1)] ──► Validates with Pydantic v2 Schemas
   │
   ▼
[Service Layer] ──► Business logic, 360 Aggregation, NBA Scoring, Feedback Loop
   │
   ├──► [Integrations] ──► MLClient (Local / Remote) & NBA Engine
   │
   ▼
[Repository Layer] ──► Encapsulates SQLAlchemy 2.x ORM queries
   │
   ▼
[PostgreSQL Database] ──► Normalized relational persistence with indexes
```

### Key Principles:
1. **No Monolithic Routes:** Handlers only parse input, call services, and return Pydantic models.
2. **Deterministic NBA Engine:** Transparent multi-factor scoring based on risk, intent, customer value, recency, and action fit.
3. **Dual-Mode ML Client:** Works offline with local rule-based heuristics (clearly marked as synthetic demo data) or remote HTTP microservice.
4. **Resilient Error Envelopes:** Uniform JSON error responses (`{ success: false, error: { code, message } }`).

---

## 4. Repository & Folder Structure

```text
customer360AI/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application factory
│   │   ├── core/                       # App settings, DB engine, logging, exceptions
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── logging.py
│   │   │   └── exceptions.py
│   │   ├── models/                     # SQLAlchemy 2.x declarative models
│   │   │   ├── base.py
│   │   │   ├── customer.py
│   │   │   ├── transaction.py
│   │   │   ├── interaction.py
│   │   │   ├── segment.py
│   │   │   ├── customer_feature.py
│   │   │   ├── model_run.py
│   │   │   ├── prediction.py
│   │   │   ├── explanation.py
│   │   │   ├── action.py
│   │   │   └── action_outcome.py
│   │   ├── schemas/                    # Pydantic v2 validation models
│   │   ├── repositories/               # Database access objects
│   │   ├── services/                   # Business logic services
│   │   ├── integrations/               # ML Client & NBA Engine abstractions
│   │   └── api/                        # FastAPI route controllers
│   │       ├── deps.py
│   │       └── v1/
│   ├── alembic/                        # Migration scripts & version history
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   ├── tests/                          # Automated unit and integration tests
│   │   ├── conftest.py
│   │   ├── unit/
│   │   └── integration/
│   ├── scripts/                        # Database seeding & dataset import tools
│   ├── requirements.txt                # Pinned dependencies
│   ├── .env.example                    # Environment variable template
│   ├── .env                            # Local configuration
│   ├── alembic.ini                     # Migration configuration
│   └── README.md                       # Backend setup documentation
│
├── .gitignore                          # Root git ignore rules
├── backend.md                          # Tamanna's backend architecture & guide
└── (other team files / frontend)
```

---

## 5. PostgreSQL & Database Design

The schema is normalized to 3NF where appropriate, using UUID primary keys, foreign key constraints with cascade deletes, and composite indexes on lookup fields:

1. **`customers`:** Master profile (`id`, `external_customer_id`, `first_name`, `last_name`, `email`, `phone`, `age`, `gender`, `acquisition_channel`, `customer_status`, timestamps).
2. **`transactions`:** Historical purchases (`id`, `customer_id`, `reference_id`, `product_name`, `category`, `amount`, `quantity`, `transaction_time`, `channel`, `status`).
3. **`interactions`:** Real-time behavioral events (`id`, `customer_id`, `event_type`, `event_value`, `metadata_json`, `timestamp`).
4. **`customer_features`:** Derived RFM & behavioral features (`id`, `customer_id`, `recency_days`, `frequency_count`, `monetary_value`, `days_inactive`, `engagement_score`, `cart_abandonment_count`, `average_order_value`, `estimated_clv`, `extra_features`).
5. **`segments` & `customer_segments`:** Segment definitions and many-to-many customer junction table.
6. **`model_runs`:** Registry of ML model training runs and metadata.
7. **`predictions`:** Stored inference outcomes (`customer_id`, `model_name`, `model_version`, `prediction_type`, `score`, `predicted_class`, `confidence`).
8. **`explanations`:** SHAP feature importance vectors (`prediction_id`, `feature_name`, `feature_value`, `contribution`, `rank`, `direction`).
9. **`actions`:** Next Best Actions (`customer_id`, `action_type`, `product`, `offer`, `channel`, `timing`, `message`, `objective`, `score`, `rank`, `reason`, `status`).
10. **`action_outcomes`:** Closed-loop feedback measurements (`action_id`, `delivered`, `opened`, `clicked`, `purchased`, `converted`, `churned`, `revenue`).

---

## 6. API Workflow
FastAPI exposes versioned REST endpoints (`/api/v1`):

- **Health:**
  - `GET /health` — Liveness check
  - `GET /api/v1/health` — Deep check verifying PostgreSQL & ML service
- **Customers & 360:**
  - `GET /api/v1/customers` — Paginated list with search, status, and segment filters
  - `POST /api/v1/customers` — Ingest new customer
  - `GET /api/v1/customers/{id}` — Basic profile
  - `GET /api/v1/customers/{id}/360` — Complete Customer 360 decision view
- **Transactions & Interactions:**
  - `GET /api/v1/customers/{id}/transactions` — Transaction history
  - `POST /api/v1/transactions` — Record transaction
  - `POST /api/v1/interactions` — Stream behavioral events
  - `GET /api/v1/customers/{id}/interactions` — Behavioral timeline
- **Predictions & Explainability:**
  - `GET /api/v1/customers/{id}/predictions/latest` — Latest churn, propensity, and CLV
  - `POST /api/v1/predictions` — Ingestion endpoint for Vishvam's models
  - `GET /api/v1/customers/{id}/explanation` — Top SHAP positive/negative drivers
- **Next Best Action & Feedback:**
  - `GET /api/v1/customers/{id}/actions/latest` — Current recommended NBA card
  - `POST /api/v1/customers/{id}/actions/generate` — Trigger NBA engine calculation
  - `POST /api/v1/actions/{id}/execute` — Log execution intent
  - `POST /api/v1/actions/{id}/outcome` — Record closed-loop feedback
- **Executive Analytics:**
  - `GET /api/v1/analytics/overview` — Dashboard summary cards
  - `GET /api/v1/analytics/segments` — Segment distributions
  - `GET /api/v1/analytics/actions` — Action channel effectiveness & conversion rates

---

## 7. Customer 360 Workflow
Instead of having the React frontend make 8 separate HTTP calls, `GET /api/v1/customers/{id}/360` aggregates the full customer decision state:

```json
{
  "success": true,
  "data": {
    "profile": { "id": "...", "name": "...", "status": "At-Risk", ... },
    "features": { "recency_days": 42, "monetary_value": 1420.50, "engagement_score": 0.35, ... },
    "segments": ["High Value", "At Risk of Churn"],
    "predictions": {
      "churn": { "score": 0.78, "level": "High", "confidence": 0.89 },
      "purchase_propensity": { "score": 0.24, "level": "Low", "confidence": 0.82 },
      "clv": { "score": 2850.00, "level": "High", "confidence": 0.90 }
    },
    "shap_drivers": [
      { "feature": "days_inactive", "value": 42, "contribution": 0.34, "direction": "positive" },
      { "feature": "cart_abandonment_count", "value": 3, "contribution": 0.21, "direction": "positive" },
      { "feature": "monetary_value", "value": 1420.5, "contribution": -0.15, "direction": "negative" }
    ],
    "next_best_action": {
      "action_type": "RETENTION",
      "product": "Premium VIP Concierge Pass",
      "offer": "20% Re-engagement Discount",
      "channel": "WhatsApp",
      "timing": "Within 24 Hours",
      "objective": "Retain High-Value Customer",
      "score": 0.92,
      "reason": "High churn probability (78%) paired with high CLV ($2,850) and 42 days of inactivity."
    },
    "recent_transactions": [ ... ],
    "recent_interactions": [ ... ],
    "action_history": [ ... ]
  }
}
```

---

## 8. ML Integration Contract (with Vishvam)

Tamanna provides an abstraction layer `MLClient` so the backend does not depend on whether Vishvam's models are local or hosted:

1. **Configuration:** Controlled by `ML_MODE` in `.env`:
   - `ML_MODE=local`: Uses local deterministic heuristic models. All outputs are explicitly marked with `model_version: "demo-heuristic-v1"` to avoid misrepresenting mock metrics as real ML results.
   - `ML_MODE=remote`: Issues asynchronous HTTP calls to Vishvam's `ML_SERVICE_URL`.
2. **Direct Prediction Ingestion (`POST /api/v1/predictions`):**
   Vishvam can post predictions with SHAP feature contribution vectors directly:
   ```json
   {
     "customer_id": "uuid",
     "model_name": "xgboost_churn",
     "model_version": "1.0.0",
     "prediction_type": "churn",
     "score": 0.84,
     "confidence": 0.91,
     "explanations": [
       { "feature_name": "days_inactive", "feature_value": 45, "contribution": 0.38, "direction": "positive", "rank": 1 }
     ]
   }
   ```

### 8.1 SHAP Explanation Flow

$$\text{ML Service (Vishvam)} \longrightarrow \text{FastAPI Validation} \longrightarrow \text{PostgreSQL} \longrightarrow \text{Customer360} \longrightarrow \text{Frontend (Omik)}$$

- **Vishvam's ML Service:** Calculates actual SHAP feature contributions and directional signs.
- **FastAPI Backend:** Validates feature names, rank order, directional values, and prediction linkages; persists explanations in PostgreSQL (`explanations` table).
- **No Backend SHAP Calculation:** The backend does NOT calculate SHAP values, train models, or invent fake explanations.
- **Customer360 Read Layer:** Aggregates and returns persisted explanations under `shap_drivers`. If no explanations have been generated by ML models yet, it returns an empty array (`"shap_drivers": []`).
- **Explanation Endpoints:**
  - `GET /api/v1/predictions/{prediction_id}/explanations` — Fetches feature contributions for a specific prediction.
  - `POST /api/v1/predictions/{prediction_id}/explanations` — Attaches SHAP feature contributions to an existing prediction.
  - `GET /api/v1/customers/{customer_id}/explanations` — Fetches historical feature contributions across customer's predictions.

### 8.2 Vishvam Deployed ML Service Integration (Phase 7A)

The backend connects directly to Vishvam's deployed Customer360 AI ML service on Hugging Face Spaces:

- **Hugging Face Space:** `https://huggingface.co/spaces/Vishu2006/customer`
- **Base Service URL:** `https://vishu2006-customer.hf.space`
- **Health Check:** `GET https://vishu2006-customer.hf.space/health`
  - Response: `{"status": "ok", "service": "Customer360 AI", "models_loaded": true, "inference_mode": "CPU", "zerogpu": true, "shap_enabled": false, "api_key_configured": false}`
- **Inference Endpoint:** `POST https://vishu2006-customer.hf.space/demo-predict`
- **Authentication:** Optional `X-Api-Key` header (supported via `ML_API_KEY` setting; currently unauthenticated in demo mode).
- **Request Format (`CustomerRequest`):**
  ```json
  {
    "customer_id": "string",
    "name": "string",
    "recency_days": 15,
    "frequency_purchases": 6,
    "monetary_total_spend": 28500.0,
    "website_visits_30d": 12,
    "product_views_30d": 35,
    "cart_additions_30d": 4,
    "cart_abandonments_30d": 1,
    "support_tickets_30d": 0,
    "engagement_change_pct": 5.0,
    "preferred_channel": "Email",
    "preferred_category": "Electronics"
  }
  ```
- **Response Format:**
  ```json
  {
    "customer_id": "string",
    "segment": "Dormant",
    "churn_probability": 0.0024,
    "churn_risk_pct": 0.2,
    "purchase_propensity": 0.9957,
    "purchase_intent_pct": 99.6,
    "estimated_clv": 500.0,
    "shap_explanations": [
      { "feature": "...", "impact": "...", "direction": "...", "reason": "...", "shap_value": null }
    ],
    "explanation_type": "rule_based",
    "next_best_action": { "action": "...", "reason": "...", "recommended_offer": "...", "preferred_channel": "...", "preferred_category": "...", "priority": "..." },
    "inference_mode": "trained_artifacts"
  }
  ```
- **SHAP Handling & Integrity:**
  - The live service reports `shap_enabled: false` and returns `shap_value: null` with `explanation_type: rule_based`.
  - In adherence to architectural integrity, the backend strictly ignores `null` SHAP entries and does **not** fabricate fake explanations. The Customer 360 endpoint returns `"shap_drivers": []` until genuine numeric SHAP contributions are provided.
- **Environment Configuration:**
  - `ML_MODE`: `"local"` (rule-based local demo heuristics) or `"remote"` (live Hugging Face Space).
  - `ML_SERVICE_URL`: `"https://vishu2006-customer.hf.space"`
  - `ML_REQUEST_TIMEOUT_SECONDS`: `15.0`
  - `ML_API_KEY`: Optional secret key.

---

---

## 9. NBA Integration Framework & Persistence (Phase 7B)

$$\text{Vishvam's ML Service (NBA Output)} \longrightarrow \text{FastAPI Validation} \longrightarrow \text{PostgreSQL (actions \& outcomes)} \longrightarrow \text{Customer360 Aggregation} \longrightarrow \text{Frontend (Omik)}$$

The backend consumes, validates, persists, and serves Next Best Action recommendations and outcome tracking produced by Vishvam's decision intelligence models:

### 9.1 Core Principles & Ownership
- **Zero Backend NBA Rule Fabrication:** Tamanna's backend does NOT independently calculate scores, generate fake recommendations, or invent business rules. It strictly consumes recommendations returned by Vishvam's models (e.g. `POST /demo-predict` returning `next_best_action`) or provided via the Action API.
- **Unified Dual-Field Representation:** Database tables `actions` and `action_outcomes` support both relational taxonomy (`action_type`, `offer`, `channel`, `product`, `score`) and Vishvam's direct NBA payload format (`action`, `recommended_offer`, `preferred_channel`, `preferred_category`, `priority`) through SQLAlchemy property accessors and Pydantic field normalization.
- **Full Outcome Tracking:** Tracks downstream execution and business impact (`delivered`, `opened`, `clicked`, `purchased`, `converted`, `revenue`). When an outcome is recorded with interaction signals, the action status automatically transitions from `PENDING` to `EXECUTED`.
- **Customer 360 Aggregation:** Active pending actions surface as `next_best_action`. Previous and executed actions surface in `action_history` with their execution outcomes.

### 9.2 NBA & Action REST Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/customers/{customer_id}/actions` | Ingest/create an action recommendation for a customer |
| `GET` | `/api/v1/customers/{customer_id}/actions` | List paginated actions with status filtering |
| `GET` | `/api/v1/customers/{customer_id}/actions/latest` | Retrieve the latest active recommendation |
| `GET` | `/api/v1/actions/{action_id}` | Retrieve an action by ID with joined outcome |
| `PATCH` | `/api/v1/actions/{action_id}` | Update action status (`PENDING`, `EXECUTED`, `DISMISSED`) |
| `POST` | `/api/v1/actions/{action_id}/outcome` | Record action execution outcome (`delivered`, `converted`, `revenue`) |
| `GET` | `/api/v1/actions/{action_id}/outcomes` | Retrieve outcome records for an action |
| `GET` | `/api/v1/actions/{action_id}/outcome` | Retrieve singular outcome for an action |

---

## 10. Action Outcome Analytics & Feedback Intelligence (Phase 8)

$$\text{Action (NBA)} \longrightarrow \text{Outcome Logged} \longrightarrow \text{SQL Aggregation} \longrightarrow \text{Feedback Metrics} \longrightarrow \text{Customer 360 \& Analytics API}$$

Phase 8 introduces measurement and feedback intelligence over action execution and customer response without altering the machine learning boundary.

### 10.1 Core Architectural Principles
- **No Machine Learning Invention:** Tamanna's backend computes measurable feedback metrics directly from real, persisted execution outcomes (`actions` and `action_outcomes`). It does NOT implement Reinforcement Learning (RL), online bandits, automatic model weight updates, reward engineering, or model retraining.
- **Zero Database Migrations:** All macro and customer-level metrics are computed dynamically using optimized SQL aggregation functions (`COUNT`, conditional counts via `CASE/FILTER`, `SUM`, `COALESCE`, and `GROUP BY`).
- **Zero-Denominator Safety:** Whenever denominators (e.g. actions delivered or total actions) are zero, computed rates return safe float defaults (`0.0`), preventing division-by-zero crashes.
- **Customer 360 Non-Breaking Enrichment:** `Customer360Read` includes an optional `action_feedback` block summarizing customer-specific action execution and financial conversion impact, while preserving all existing profile, feature, prediction, SHAP driver, and action history contracts.

### 10.2 Analytics & Feedback REST Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/customers/{customer_id}/feedback` | Customer-level action volume, delivery, engagement, and conversion metrics |
| `GET` | `/api/v1/analytics/actions` | Global platform action performance analytics with optional filtering |

#### Global Analytics Query Filters
- `action_type`: Filter by recommendation category (e.g., `RETENTION`, `UPSELL`, `REENGAGEMENT`)
- `channel`: Filter by communication channel (e.g., `Email`, `WhatsApp`, `Push`, `SMS`, `In-App`)
- `status`: Filter by action lifecycle state (`PENDING`, `EXECUTED`, `DISMISSED`)
- `start_date` / `end_date`: Filter by action creation timestamps

### 10.3 Metric Definitions
- **Action Counts:** Total actions created, pending, executed, dismissed, and outcomes recorded.
- **Engagement Rates:**
  - $\text{Delivery Rate} = \frac{\text{Delivered Actions}}{\text{Total Actions}}$
  - $\text{Open Rate} = \frac{\text{Opened Actions}}{\text{Delivered Actions}}$
  - $\text{Click Rate} = \frac{\text{Clicked Actions}}{\text{Delivered Actions}}$
  - $\text{Click-Through Rate (CTR)} = \frac{\text{Clicked Actions}}{\text{Opened Actions}}$
- **Conversion & Financial Impact:**
  - $\text{Conversion Rate} = \frac{\text{Converted Actions}}{\text{Delivered Actions}}$
  - $\text{Total Attributed Revenue} = \sum \text{Revenue from Action Outcomes}$
  - $\text{Avg Revenue per Converted Action} = \frac{\text{Total Attributed Revenue}}{\text{Converted Actions}}$

---

## 11. Production Readiness & Frontend Integration (Phase 9)

Phase 9 solidifies the FastAPI backend for seamless consumption by Omik's React frontend dashboard and production deployment.

### 11.1 Frontend Consumption Contracts
The React frontend interacts with 6 core resource domains, all wrapped in a standardized `ResponseEnvelope[T]` or `ErrorEnvelope`:

| Domain | Key Endpoints | Purpose in React UI |
|---|---|---|
| **Health & Readiness** | `GET /api/v1/health`<br>`GET /api/v1/ready` | Liveness & database readiness indicators |
| **Customer Directory** | `GET /api/v1/customers`<br>`POST /api/v1/customers`<br>`GET /api/v1/customers/{id}` | Customer listing, search, filtering, and profile views |
| **Customer 360 View** | `GET /api/v1/customers/{id}/360` | Complete 10-block dashboard view combining profile, RFM, segments, predictions, SHAP drivers, NBA, transactions, interactions, action history, and feedback |
| **Predictions & ML** | `POST /api/v1/customers/{id}/predict`<br>`GET /api/v1/customers/{id}/predictions` | Live model scoring triggers and prediction audit logs |
| **Next Best Action** | `GET /api/v1/customers/{id}/actions/latest`<br>`POST /api/v1/actions/{id}/outcome` | Recommendation card rendering and action execution/outcome logging |
| **Analytics & Feedback**| `GET /api/v1/customers/{id}/feedback`<br>`GET /api/v1/analytics/actions` | Performance charts, conversion tracking, and channel effectiveness |

### 11.2 Customer 360 Full 10-Block Contract
The unified endpoint `GET /api/v1/customers/{customer_id}/360` delivers 10 cleanly decoupled blocks:
1. `profile`: Customer identity, contact info, status, acquisition channel.
2. `features`: Recency, frequency, monetary value, inactivity, engagement score, CLV.
3. `segments`: Segment assignments (e.g. VIP, At-Risk, Dormant).
4. `predictions`: Active model predictions (churn probability, purchase propensity, CLV).
5. `shap_drivers`: Top SHAP feature drivers (`[]` when `shap_value` is `null` to ensure zero fake data).
6. `next_best_action`: Active pending NBA recommendation (or `null` if none pending).
7. `recent_transactions`: Capped 10 most recent transactions.
8. `recent_interactions`: Capped 15 most recent touchpoint interactions.
9. `action_history`: Past executed/dismissed actions with nested outcomes.
10. `action_feedback`: Aggregate delivery, conversion rate, and attributed revenue summary.

### 11.3 Action Outcome Cardinality & Aggregation Safety
- **1-to-1 Relationship:** `Action` and `ActionOutcome` are bound by a unique constraint on `action_outcomes.action_id`.
- **Idempotency:** Calling `POST /api/v1/actions/{action_id}/outcome` repeatedly updates the existing outcome record rather than creating duplicates, eliminating double-counting risks in revenue or conversion rates.

### 11.4 Security, CORS & Environment Configuration
- **CORS:** Environment-configured `CORS_ORIGINS` supporting React dev servers (`http://localhost:3000`, `http://localhost:5173`) with credential and header support.
- **Secrets:** All connection URLs and API keys are strictly driven by environment variables (`DATABASE_URL`, `ML_SERVICE_URL`, `ML_API_KEY`). Zero secrets are hardcoded in application logic.
- **Standardized Error Handling:** All 4xx and 5xx errors return structured `ErrorEnvelope` payloads with domain error codes (`VALIDATION_ERROR`, `CUSTOMER_NOT_FOUND`, `ACTION_NOT_FOUND`), preventing raw stack trace exposure.

---

## 12. Team Responsibility Boundaries

| Team Member | Domain | Boundary |
|---|---|---|
| **Tamanna** | **Backend & Database** | FastAPI, PostgreSQL, SQLAlchemy 2.x, Alembic, 360 Aggregation, Action persistence, Analytics APIs |
| **Vishvam** | **Machine Learning** | Model training, churn/propensity algorithms, SHAP calculation, AI decision engine service |
| **Anmol** | **Data Pipeline & QA** | Raw data extraction, ETL cleaning, dataset normalization, test verification |
| **Omik** | **React Frontend** | React UI/UX, Customer 360 cards, charts, action execution buttons |

---

## 13. Local Development Workflow

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Activate Python environment (Python 3.10.11):
   ```bash
   pip install -r requirements.txt
   ```
3. Ensure PostgreSQL is running on `localhost:5432` with database `customer360_db`.
4. Apply migrations:
   ```bash
   alembic upgrade head
   ```
5. Launch FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

## 14. Testing Workflow

The backend uses `pytest` with `pytest-asyncio`:
```bash
cd backend
pytest tests/ -v
```
Tests run against an isolated SQLite test database or dedicated PostgreSQL test database without touching production or demo data.

---

## 15. Git Branch Workflow
- **Branch Rule:** All backend development is carried out strictly on the dedicated `backend` branch.
- **Merge Rule:** Commits and merges to `main` occur only after end-of-phase verification and team sync.
- **Safety:** Secrets (`.env`) and local build artifacts are excluded via `.gitignore`.

---

## 16. Frontend Handoff Package & API Contract (For Omik)

> **STATUS: The backend is complete, verified, and 100% ready for React frontend integration.**

This section serves as the definitive consumption guide for Omik (React Frontend Engineer).

### 1. Base API URL & Configuration
- **Development Base URL:** `http://localhost:8000/api/v1`
- **Root Health / Liveness:** `http://localhost:8000/health`
- **Database Readiness Probe:** `http://localhost:8000/api/v1/ready`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Environment Setup:** Configure in React `.env`:
  ```env
  VITE_API_BASE_URL="http://localhost:8000/api/v1"
  ```
- **CORS Allowed Origins:** `http://localhost:3000`, `http://localhost:5173`, `http://127.0.0.1:3000`, `http://127.0.0.1:5173`.

### 2. Standard Response & Error Envelope
All API endpoints return standard envelopes:
```typescript
// Success Response
interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Error Response (HTTP 400, 404, 409, 422, 500, 502)
interface ApiError {
  success: false;
  error: {
    code: string;       // e.g., "CUSTOMER_NOT_FOUND", "VALIDATION_ERROR"
    message: string;    // Human-readable error explanation
    details?: any;      // Optional validation field issues
  };
}
```

### 3. Core API Endpoints for Frontend

| Area | Method | Endpoint | Description |
|---|---|---|---|
| **Health** | `GET` | `/health` | Fast app liveness check |
| **Readiness** | `GET` | `/api/v1/ready` | Verifies PostgreSQL connectivity (`SELECT 1`) |
| **Customers** | `GET` | `/api/v1/customers` | Paginated customer list with search & status filters |
| **Customers** | `POST` | `/api/v1/customers` | Register customer profile |
| **Customers** | `GET` | `/api/v1/customers/{id}` | Customer demographic profile |
| **Customers** | `PATCH` | `/api/v1/customers/{id}` | Update customer profile |
| **Customer 360** | `GET` | `/api/v1/customers/{id}/360` | **Primary Unified 10-Block Aggregation Endpoint** |
| **Transactions** | `GET` | `/api/v1/customers/{id}/transactions` | Paginated transaction history |
| **Transactions** | `POST` | `/api/v1/transactions` | Ingest transaction event |
| **Interactions** | `GET` | `/api/v1/customers/{id}/interactions` | Paginated behavioral timeline |
| **Interactions** | `POST` | `/api/v1/interactions` | Ingest behavioral signal |
| **Predictions** | `GET` | `/api/v1/customers/{id}/predictions` | Prediction history |
| **Predictions** | `GET` | `/api/v1/customers/{id}/predictions/latest` | Latest prediction per type (`churn`, `propensity`, `clv`) |
| **Predictions** | `POST` | `/api/v1/customers/{id}/predict` | On-demand inference trigger (calls Vishvam ML service) |
| **Actions** | `GET` | `/api/v1/customers/{id}/actions` | Action history for customer |
| **Actions** | `GET` | `/api/v1/customers/{id}/actions/latest` | Latest active action recommendation |
| **Actions** | `PATCH` | `/api/v1/actions/{id}` | Update action status (`PENDING`, `EXECUTED`, `DISMISSED`) |
| **Outcomes** | `POST` | `/api/v1/actions/{id}/outcome` | Record action execution outcome with revenue |
| **Feedback** | `GET` | `/api/v1/customers/{id}/feedback` | Customer-level action feedback & conversion analytics |
| **Analytics** | `GET` | `/api/v1/analytics/actions` | Global action analytics with channel & action breakdowns |

### 4. Complete Customer 360 Contract (10 Blocks)
Endpoint: `GET /api/v1/customers/{customer_id}/360`  
Returns `data: Customer360Read` containing:
1. `profile`: Customer details (`first_name`, `last_name`, `email`, `customer_status`, `acquisition_channel`).
2. `features`: RFM features (`recency_days`, `frequency_count`, `monetary_value`, `engagement_score`, `cart_abandonment_count`, `estimated_clv`). `null` if not computed yet.
3. `segments`: Array of segment tags (`id`, `name`, `description`). Defaults to `[]`.
4. `predictions`: Map of latest predictions (`churn`, `purchase_propensity`, `clv`) with `score`, `predicted_class`, `confidence`, and `created_at`. Defaults to `{}`.
5. `shap_drivers`: Array of top SHAP drivers (`feature_name`, `contribution`, `rank`, `direction`, `feature_value`). **Empty `[]` when no numeric explanations are present. Never fake values.**
6. `next_best_action`: Active top-ranked action recommendation (`action`, `reason`, `recommended_offer`, `preferred_channel`, `preferred_category`, `priority`, `status="PENDING"`). `null` if no active action is pending.
7. `recent_transactions`: Last 10 purchase transactions. Defaults to `[]`.
8. `recent_interactions`: Last 15 behavioral events. Defaults to `[]`.
9. `action_history`: Past actions (`status="EXECUTED" | "DISMISSED"`) with their embedded `outcome`. Defaults to `[]`.
10. `action_feedback`: Aggregated outcome metrics (`total_actions`, `delivered`, `opened`, `clicked`, `converted`, `conversion_rate`, `total_revenue`, `average_revenue_per_converted`). `null` if 0 actions recorded.

### 5. Frontend Presentation Guidelines (Omik)
- **Do Not Calculate ML / Decisions in React:** The frontend is strictly a presentation and interaction layer. Do not duplicate churn rules, SHAP values, or action recommendations.
- **Empty States:** Render clean placeholder UI when blocks are empty (e.g. "No explanation data available yet" when `shap_drivers.length === 0`).
- **Action Outcomes:** When an action card is marked executed, call `POST /api/v1/actions/{action_id}/outcome` with `{ delivered: true, converted: true, revenue: 150.0 }`. The backend automatically marks the action as `EXECUTED` and updates all analytics.



