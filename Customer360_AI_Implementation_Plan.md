# Customer360 AI — Production Implementation Plan
### Frontend + Backend + Database + APIs + Auth + DevOps, built around your existing model (unchanged)

This plan is built from your **actual deployed model service**, not the pitch deck — I fetched and read `app.py`, `ml/inference/unified_inference.py`, and `README.md` from your Hugging Face Space (`Vishu2006/customer`) to get the real request/response contract. Nothing in this plan touches, retrains, or wraps internal logic of the model — it is treated as a black-box HTTP service behind a locked contract, exactly as it exists today.

---

## 1. What your model actually is (verified, not assumed)

| Fact | Detail |
|---|---|
| Hosting | Hugging Face Space, FastAPI mounted under Gradio, `https://vishu2006-customer.hf.space` |
| Health check | `GET /health` → `{status, service, models_loaded, inference_mode, zerogpu, shap_enabled, api_key_configured}` |
| Prediction endpoint | `POST /demo-predict` |
| Auth | Header `X-API-Key: <key>` — **currently exposed publicly in the Space's README; rotate before production use** |
| Model state (as of last check) | `models_loaded: true`, `shap_enabled: false` — trained XGBoost/K-Means artifacts are loaded, but **live SHAP is disabled**; the service returns **rule-based explanations** (`explanation_type: "rule_based"` or `"rule_based_fallback"`), not live SHAP values. `shap_value` in the response is currently always `null`. Design the "why" UI around `reason` text + `impact`/`direction`, not a SHAP bar chart, unless you re-enable SHAP inside the model service later. |
| Fallback behavior | If trained artifacts fail to load, the service self-degrades to a deterministic rule-based fallback and still returns the **same response shape** — your backend never needs to know which mode produced a given response. |
| Hosting risk | HF Spaces can cold-start/sleep. Treat every model call as **not guaranteed low-latency**; design timeouts + retries + a loading state into the UI. |

---

## 2. Locked model service contract (do not change; wrap around it)

### Request — `POST https://vishu2006-customer.hf.space/demo-predict`
Header: `X-API-Key: <rotated key>`

```json
{
  "customer_id": "string",
  "name": "string",
  "recency_days": 30,
  "frequency_purchases": 5,
  "monetary_total_spend": 25000.0,
  "website_visits_30d": 20,
  "product_views_30d": 30,
  "cart_additions_30d": 4,
  "cart_abandonments_30d": 2,
  "support_tickets_30d": 1,
  "engagement_change_pct": -20.0,
  "preferred_channel": "email | sms | whatsapp | push | web",
  "preferred_category": "electronics | fashion | home | beauty | sports"
}
```
These 13 fields are the **entire** required payload — the model service internally derives everything else (`avg_order_value`, `email_opens_30d`, etc.) with safe defaults. Your backend must send exactly these fields, correctly typed; extra fields are ignored, missing fields fall back to internal defaults (which will silently distort predictions — validate before sending).

### Response — 200 OK
```json
{
  "customer_id": "CUST001",
  "segment": "High Value | Loyal Customers | At Risk | Potential High Value | Emerging Customer | Unknown",
  "churn_probability": 0.4123,
  "churn_risk_pct": 41.2,
  "purchase_propensity": 0.62,
  "purchase_intent_pct": 62.0,
  "estimated_clv": 62500.0,
  "shap_explanations": [
    {
      "feature": "recency_days",
      "impact": "high | medium",
      "direction": "positive | negative",
      "reason": "Customer has not purchased for 74 days.",
      "shap_value": null
    }
  ],
  "explanation_type": "rule_based | rule_based_fallback",
  "next_best_action": {
    "action": "Customer retention intervention",
    "reason": "Customer has high churn risk and requires immediate retention.",
    "recommended_offer": "Personalized retention offer",
    "preferred_channel": "whatsapp",
    "preferred_category": "electronics",
    "priority": "high | medium | low"
  },
  "inference_mode": "trained_artifacts | fallback",
  "inference_error": "optional — present only if a fallback was triggered by an internal error",
  "inference_error_type": "optional"
}
```
Error case (input validation failure inside the service) returns `{"error": "<message>"}` with HTTP 200, not a 4xx — your backend must check for an `error` key in the body, not just the status code.

### Your system's internal contract (frontend ⇄ your backend — you control this one)

This is the contract your generated frontend/backend actually build against. It wraps the model contract with the things the model doesn't own: identity, persistence, history, auth.

```
POST /api/v1/customers/{customer_id}/analyze
Auth: Bearer <your app JWT>
→ 200 {
    customer: { id, name, ...profile fields from DB },
    prediction: { ...exact model response above, unmodified },
    analyzed_at: ISO8601,
    cached: boolean
  }
→ 502 { error: "model_unavailable", detail: "..." }   (model service down/timeout)
→ 422 { error: "validation_error", fields: [...] }     (bad input before it ever reaches the model)

GET /api/v1/customers/{customer_id}/history
→ 200 { customer_id, predictions: [ {...snapshot, analyzed_at} ] }   # from your own predictions table, not re-calling the model

GET /api/v1/customers?segment=&risk_min=&page=
→ 200 { items: [...], total, page }
```

---

## 3. Architecture

```
[React Frontend]
   │  Bearer JWT
   ▼
[Your FastAPI Backend]  ← owns auth, validation, persistence, orchestration
   │
   ├──► [PostgreSQL]  customers, events, predictions, users, audit_log
   │
   └──► [Model Adapter Layer]  (thin HTTP client — the ONLY place that knows the model exists)
              │  X-API-Key, timeout, retry, circuit breaker
              ▼
        [Existing Model Service — untouched]
        POST /demo-predict  (Hugging Face Space)
```

**Critical design rule:** the model adapter is the single choke point. Nothing else in your codebase — not the frontend, not other backend modules — talks to the model URL directly. If the model is ever redeployed elsewhere (own server, different host), only the adapter's config changes.

**Dependency direction:** Frontend depends on your backend's contract (Section 2, internal), never on the model's contract directly. Backend depends on the model's contract (Section 2, locked) only inside the adapter. DB schema is independent of both and can be built/seeded in parallel from hour 1.

---

## 4. Database design (PostgreSQL)

```sql
-- Identity
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'analyst',   -- 'admin' | 'analyst' | 'viewer'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer master data (the profile fields the model needs, owned by you)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_ref TEXT UNIQUE NOT NULL,       -- external customer_id sent to the model
  name TEXT NOT NULL,
  preferred_channel TEXT NOT NULL DEFAULT 'email',
  preferred_category TEXT NOT NULL DEFAULT 'electronics',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Raw behavioral signals (source for the 13-field model payload)
CREATE TABLE customer_signals (
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  recency_days INT NOT NULL,
  frequency_purchases INT NOT NULL,
  monetary_total_spend NUMERIC(14,2) NOT NULL,
  website_visits_30d INT NOT NULL DEFAULT 0,
  product_views_30d INT NOT NULL DEFAULT 0,
  cart_additions_30d INT NOT NULL DEFAULT 0,
  cart_abandonments_30d INT NOT NULL DEFAULT 0,
  support_tickets_30d INT NOT NULL DEFAULT 0,
  engagement_change_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (customer_id, snapshot_at)
);

-- Cached model outputs (history + avoids re-calling the model every page view)
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  segment TEXT,
  churn_probability NUMERIC(5,4),
  purchase_propensity NUMERIC(5,4),
  estimated_clv NUMERIC(14,2),
  next_best_action JSONB NOT NULL,
  shap_explanations JSONB NOT NULL,
  explanation_type TEXT,
  inference_mode TEXT,
  raw_response JSONB NOT NULL,        -- full untouched model response, for auditability
  analyzed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_predictions_customer ON predictions(customer_id, analyzed_at DESC);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Migrations: Alembic, versioned in Git. Seed script populates 8–10 realistic customers spanning every `segment`/`priority` combination, including your flagship demo customer (82% churn, 74 days inactive, 2 abandoned carts, high value) so the numbers on screen always match your rehearsed narrative.

---

## 5. Backend design (FastAPI)

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, router mounting, CORS, startup health check
│   ├── core/
│   │   ├── config.py           # env-driven settings (pydantic-settings)
│   │   └── security.py         # JWT issue/verify, password hashing
│   ├── db/
│   │   ├── models.py           # SQLAlchemy models mirroring Section 4
│   │   ├── session.py
│   │   └── migrations/         # Alembic
│   ├── adapters/
│   │   └── model_client.py     # THE ONLY module that calls the HF model service
│   ├── services/
│   │   ├── customer_service.py # DB CRUD, signal aggregation into the 13-field payload
│   │   └── prediction_service.py # orchestrates: validate → call adapter → persist → return
│   ├── api/v1/
│   │   ├── auth.py              # /auth/login, /auth/register
│   │   ├── customers.py         # /customers, /customers/{id}, /customers/{id}/history
│   │   └── predictions.py       # /customers/{id}/analyze
│   └── schemas/                 # Pydantic request/response models (Section 2 internal contract)
├── tests/
└── requirements.txt
```

**`adapters/model_client.py` — required behaviors:**
- Builds the exact 13-field payload from `customer_signals` + `customers` — never passes through arbitrary frontend input unvalidated.
- Timeout (e.g. 12s — HF Spaces can be slow on cold start), 2 retries with backoff, and a circuit breaker so one slow model call doesn't cascade into a stuck app.
- Treats a 200 response containing `{"error": ...}` as a failure, not a success (see Section 2).
- Returns a typed result: `Ok(prediction)` or `ModelUnavailable(reason)` — callers never touch raw HTTP.
- API key read only from server-side environment (`MODEL_API_KEY`), never shipped to the frontend, never logged.

**`services/prediction_service.py` flow:**
1. Load customer + latest signals from DB.
2. Validate signal completeness (reject with `422` if core RFM fields are missing — don't silently let the model apply its own defaults for data you're supposed to own).
3. Call `model_client.predict(...)`.
4. On success: persist to `predictions`, return to frontend.
5. On `ModelUnavailable`: return `502` with a clear error the frontend can render as "Model temporarily unavailable — showing last known result" (fallback to latest cached row in `predictions` if one exists).

---

## 6. Frontend design (React)

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts            # typed fetch wrapper, attaches Bearer JWT, base URL from env
│   ├── features/
│   │   ├── auth/                # login page, auth context, protected routes
│   │   ├── customers/
│   │   │   ├── CustomerList.tsx     # table/grid, segment + risk filters
│   │   │   ├── CustomerProfile.tsx  # risk badges: churn %, inactivity days, cart abandons
│   │   │   ├── NBACard.tsx          # action, offer, channel, timing, priority badge
│   │   │   └── WhyPanel.tsx         # renders shap_explanations as reason + impact chips
│   │   └── dashboard/               # segment distribution, at-risk count, quick stats
│   ├── mocks/
│   │   └── predictionFixtures.ts    # matches Section 2 internal contract exactly — build against this until backend is live
│   └── App.tsx
```

- Build entirely against `mocks/predictionFixtures.ts` first (matching your own backend contract, not the model's) — swap the API client's base URL to point at the real backend with zero component changes.
- `WhyPanel` renders `reason` text grouped by `impact` (high/medium) and `direction` (positive/negative) — do **not** build a SHAP magnitude bar chart against `shap_value`, since it's currently always `null`. If SHAP is enabled later inside the model service, the panel can upgrade to numeric bars without a contract change (the field already exists).
- Loading/empty/error states are mandatory, not optional: model calls can be slow (cold start) or fail (Section 1 risk) — every screen needs a visible "analyzing…" state and a friendly fallback message, not a blank screen or crash.
- Responsive: risk badges and NBA card must reflow cleanly on mobile — assume judges may view on a phone.

---

## 7. Authentication & security

- Your app's own auth is independent of the model's `X-API-Key` — business users log into **your** system (JWT, bcrypt/argon2 password hashing), never see or touch the model API key.
- Model API key lives only in backend environment config, referenced by the adapter — confirm it's rotated per Section "Security issue" above before going further.
- RBAC: `admin` (manage users, view all), `analyst` (run analysis, view all), `viewer` (read-only) — enforced in FastAPI dependencies on every route, never only hidden in the UI.
- Rate-limit `/customers/{id}/analyze` per user to protect the model service from accidental hammering during demo rehearsal.

---

## 8. End-to-end data flow

```
1. User opens a customer profile (Frontend)
2. Frontend → Backend: GET /api/v1/customers/{id}  → profile + latest cached prediction (if any), renders immediately
3. User clicks "Run Analysis" → Frontend → Backend: POST /api/v1/customers/{id}/analyze
4. Backend: loads signals from DB → validates → model_client builds 13-field payload
5. Backend → Model: POST https://vishu2006-customer.hf.space/demo-predict  (X-API-Key)
6. Model → Backend: prediction JSON (Section 2 response)
7. Backend: persists to `predictions` table (full raw_response kept for audit)
8. Backend → Frontend: internal contract response (Section 2 internal)
9. Frontend: updates risk badges, NBA card, Why panel — no page reload
```

---

## 9. DevOps / deployment

```yaml
# docker-compose.yml (local + demo environment)
services:
  db:
    image: postgres:16
    environment: [POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD]
    volumes: [pgdata:/var/lib/postgresql/data]
  backend:
    build: ./backend
    environment:
      - DATABASE_URL
      - JWT_SECRET
      - MODEL_API_BASE_URL=https://vishu2006-customer.hf.space
      - MODEL_API_KEY               # rotated key, never committed
      - MODEL_TIMEOUT_SECONDS=12
    depends_on: [db]
    ports: ["8000:8000"]
  frontend:
    build: ./frontend
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    ports: ["5173:5173"]
volumes:
  pgdata:
```

- `.env.example` for every service, real `.env` gitignored.
- `GET /api/v1/health` on your backend aggregates: DB connectivity + a live ping to the model's `/health` — so your own health check tells you immediately if the model service is the thing that's down.
- CI: install → lint → run backend tests (mock the model adapter, never hit the real HF Space in CI) → build.
- Deploy backend/frontend anywhere standard (Render/Railway/Fly/VM) — the model stays exactly where it is on Hugging Face; nothing about its deployment changes.

---

## 10. Risk register (specific to this integration)

| Risk | Mitigation |
|---|---|
| HF Space cold-start delay during live demo | Adapter timeout + retry; frontend "analyzing…" state; pre-warm with a health check ping a few minutes before presenting |
| Model service briefly down | Serve last cached `predictions` row with a visible "last known result" label instead of a broken screen |
| Exposed API key (confirmed) | Rotate immediately in HF secrets; confirm `api_key_configured: true` and old key rejected before demo |
| `shap_value` always null | UI built around `reason`/`impact`, not numeric SHAP bars, so no rework needed if SHAP is enabled later |
| Field mismatch (typo in payload key) | Backend Pydantic schema mirrors Section 2 request exactly; contract test hits the real `/demo-predict` in a manual pre-demo check (not in CI) |

---

## 11. Build sequence (recommended order)

1. DB schema + seed data (Section 4) — unblocks everyone.
2. Internal API contract (Section 2, internal) written down and agreed — unblocks frontend + backend in parallel.
3. Frontend builds fully against mocks (Section 6).
4. Backend builds auth + customer CRUD + DB persistence, model adapter built and tested against the **real** `/health` and `/demo-predict` endpoints directly (Section 2, locked) — the model is already live, so there's no need to mock it once the adapter exists; that's a real advantage over a typical hackathon.
5. Wire frontend to real backend — swap mock base URL only.
6. Deploy (Section 9), run the risk checks (Section 10), rehearse the full flow twice.

---

## 12. Ready-to-use build prompts (revised)

**What changed from the first draft, and why:**

| Fix | Reason |
|---|---|
| Every `[paste Section X]` placeholder replaced with the actual content, inline | The original prompts were not copy-paste ready — a code tool given a literal `[paste Section 4 SQL]` string has nothing to build from |
| DB schema moved *inside* the backend prompt (Prompt A now generates SQLAlchemy models + Alembic migration + seed, in that order) instead of a standalone DDL prompt | Generating raw SQL DDL separately from the ORM models risked the two drifting out of sync (hand-written SQL vs. auto-generated model classes). Models are now the single source of truth; the migration is generated *from* them |
| Added explicit CORS requirement to the backend prompt | Missing from the first draft — without it the frontend can't call the backend from a different port/origin during local dev |
| Added cookie-based JWT storage instead of leaving it unspecified | Storing JWTs in `localStorage` is readable by any injected script (XSS risk); an httpOnly, Secure, SameSite cookie set by the backend is safer and now specified explicitly |
| Added `Literal`/enum constraints for `preferred_channel` / `preferred_category` | Only 5 values each were ever observed working in the model's Gradio UI (`email/sms/whatsapp/push/web`, `electronics/fashion/home/beauty/sports`) — the backend should reject anything else rather than silently forwarding an unverified value to the model |
| Added a verification checklist after each prompt | Catches a broken or drifted output immediately, before the next prompt builds on top of it — same "Definition of Done before moving on" principle as the hackathon playbook |

**Run these in order — B depends on A's models existing, C can run in parallel with B (it's mock-first), D needs A+B+C's folder structure to exist.**

---

### Prompt A — Backend foundation: DB models, migration, seed
```
Build the foundation of a FastAPI backend project called "customer360-backend" using
Python 3.11, SQLAlchemy 2.x (async, asyncpg driver), Alembic, and pydantic-settings.

Create SQLAlchemy ORM models in app/db/models.py for exactly these five tables —
use these as the literal source of truth, do not add or rename columns:

users: id (UUID pk), email (text, unique, not null), password_hash (text, not null),
  role (text, not null, default 'analyst'), created_at (timestamptz, default now())

customers: id (UUID pk), customer_ref (text, unique, not null), name (text, not null),
  preferred_channel (text, not null, default 'email'),
  preferred_category (text, not null, default 'electronics'),
  created_at (timestamptz, default now()), updated_at (timestamptz, default now())

customer_signals: customer_id (UUID, FK -> customers.id, on delete cascade),
  recency_days (int, not null), frequency_purchases (int, not null),
  monetary_total_spend (numeric(14,2), not null),
  website_visits_30d (int, not null, default 0), product_views_30d (int, not null, default 0),
  cart_additions_30d (int, not null, default 0), cart_abandonments_30d (int, not null, default 0),
  support_tickets_30d (int, not null, default 0),
  engagement_change_pct (numeric(6,2), not null, default 0),
  snapshot_at (timestamptz, default now()), composite primary key (customer_id, snapshot_at)

predictions: id (UUID pk), customer_id (UUID, FK -> customers.id, on delete cascade),
  segment (text), churn_probability (numeric(5,4)), purchase_propensity (numeric(5,4)),
  estimated_clv (numeric(14,2)), next_best_action (jsonb, not null),
  shap_explanations (jsonb, not null), explanation_type (text), inference_mode (text),
  raw_response (jsonb, not null), analyzed_at (timestamptz, default now()),
  index on (customer_id, analyzed_at desc)

audit_log: id (UUID pk), user_id (UUID, FK -> users.id), action (text, not null),
  entity (text), entity_id (text), created_at (timestamptz, default now())

All UUID primary keys default to gen_random_uuid() (enable the pgcrypto extension in
the migration). Generate the initial Alembic migration by autogenerating it from these
models (not hand-written SQL), so the migration and the models can never drift apart.

Then write scripts/seed.py (async SQLAlchemy) that inserts 10 realistic customers with
matching customer_signals rows, covering every segment label the model can return
(High Value, Loyal Customers, At Risk, Potential High Value, Emerging Customer) and
every NBA priority (high/medium/low), including one flagship customer:
customer_ref="CUST-FLAGSHIP", name="Ananya Sharma", recency_days=74,
frequency_purchases=3, monetary_total_spend=180000, cart_abandonments_30d=2,
website_visits_30d=6, product_views_30d=9, support_tickets_30d=1,
engagement_change_pct=-45, preferred_channel="whatsapp", preferred_category="electronics".
Also write scripts/reset_seed.py that truncates all tables (respecting FK order) and
re-runs the seed cleanly, idempotently, safe to run repeatedly during demo rehearsal.
```

**Verify before moving on:** run the migration against a local Postgres, run the seed script twice in a row without error, and confirm `SELECT * FROM customers;` returns 10 rows including `CUST-FLAGSHIP`.

---

### Prompt B — Backend API, auth, and the model adapter
```
Continue the "customer360-backend" FastAPI project (models/migration/seed already exist
from the previous step — reuse app/db/models.py, do not redefine the schema).

Add this structure:
app/core/config.py       — pydantic-settings, reads DATABASE_URL, JWT_SECRET,
                            MODEL_API_BASE_URL, MODEL_API_KEY, MODEL_TIMEOUT_SECONDS,
                            CORS_ALLOWED_ORIGINS (comma-separated list) from env
app/core/security.py     — JWT issue/verify (python-jose), bcrypt password hashing (passlib)
app/adapters/model_client.py
app/services/customer_service.py
app/services/prediction_service.py
app/api/v1/auth.py
app/api/v1/customers.py
app/api/v1/predictions.py
app/schemas/              — pydantic request/response models
app/main.py

In main.py, add FastAPI's CORSMiddleware, allowing origins from CORS_ALLOWED_ORIGINS,
with allow_credentials=True (required for the cookie-based auth below).

Implement app/adapters/model_client.py as an async httpx client. It must:
- POST to f"{MODEL_API_BASE_URL}/demo-predict" with header "X-API-Key": MODEL_API_KEY
- Send exactly this JSON payload shape (13 fields, exact names and types):
  {
    "customer_id": str, "name": str,
    "recency_days": int, "frequency_purchases": int, "monetary_total_spend": float,
    "website_visits_30d": int, "product_views_30d": int, "cart_additions_30d": int,
    "cart_abandonments_30d": int, "support_tickets_30d": int,
    "engagement_change_pct": float,
    "preferred_channel": str, "preferred_category": str
  }
- Use a 12 second timeout, 2 retries with exponential backoff (httpx + tenacity is fine)
- Treat a 200 response whose JSON body contains an "error" key as a failure, not success
- On timeout, connection failure, non-200 status, or an "error" body: raise a custom
  ModelUnavailable(reason: str) exception — never let raw httpx exceptions escape this module
- On success, return the full response dict unmodified: it will contain customer_id,
  segment, churn_probability, churn_risk_pct, purchase_propensity, purchase_intent_pct,
  estimated_clv, shap_explanations (list of {feature, impact, direction, reason, shap_value}),
  explanation_type, next_best_action ({action, reason, recommended_offer,
  preferred_channel, preferred_category, priority}), inference_mode
- Add a separate get_model_health() method that GETs f"{MODEL_API_BASE_URL}/health"
  with a short timeout (3s) and returns a boolean, used by our own /api/v1/health

In pydantic schemas, constrain preferred_channel to Literal["email","sms","whatsapp",
"push","web"] and preferred_category to Literal["electronics","fashion","home","beauty",
"sports"] — reject anything else with a 422 rather than forwarding an unverified value
to the model. Constrain recency_days, frequency_purchases, and the *_30d fields to >= 0.

Implement app/services/prediction_service.py: load the customer and their most recent
customer_signals row, validate the row exists (404 if not), build the 13-field payload,
call model_client, on success persist a new row into predictions (store the full
response in raw_response as JSONB, plus the individual columns for querying), and return:
  { customer: {...}, prediction: {...full model response...}, analyzed_at, cached: false }
On ModelUnavailable: query the most recent existing predictions row for this customer.
If one exists, return it with cached: true and an HTTP 200 (not an error — the frontend
shows a "last known result" banner). If none exists, return HTTP 502 with
{ "error": "model_unavailable", "detail": "<reason>" }.

Implement JWT auth in app/api/v1/auth.py: POST /auth/register, POST /auth/login.
On login, set the JWT in an httpOnly, Secure, SameSite=Lax cookie (not returned in the
JSON body) so the frontend never touches the raw token. Add a FastAPI dependency that
reads the JWT from that cookie and enforces role in {"admin","analyst","viewer"} per
route (admin: full access; analyst: read + POST /analyze; viewer: read-only, 403 on
POST /analyze).

Implement:
GET  /api/v1/customers                    (filter by ?segment=&risk_min=&page=)
GET  /api/v1/customers/{customer_ref}
GET  /api/v1/customers/{customer_ref}/history   (from the predictions table, no model call)
POST /api/v1/customers/{customer_ref}/analyze   (analyst/admin only, calls prediction_service)
GET  /api/v1/health   (checks DB connectivity AND calls model_client.get_model_health(),
                        returns { status, database: "ok"/"down", model_service: "ok"/"down" })

Do not implement, import, or reference any ML/model code directly anywhere in this
backend — the model is external and must only ever be reached through app/adapters/model_client.py.
```

**Verify before moving on:** call the real `GET /health` on `https://vishu2006-customer.hf.space/health` from your own `/api/v1/health` and confirm it reports `model_service: "ok"`. Then call `POST /api/v1/customers/CUST-FLAGSHIP/analyze` and confirm you get back a real prediction with a populated `next_best_action` — this is hitting your actual live model, not a mock, so a working response here means the hardest integration risk is already resolved.

---

### Prompt C — Frontend
```
Build a React + TypeScript + Vite frontend called "customer360-frontend". Use
react-router-dom for routing, @tanstack/react-query for data fetching/caching, and
Tailwind CSS for styling.

Structure:
src/api/client.ts       — fetch wrapper, base URL from VITE_API_BASE_URL env var,
                           credentials: 'include' on every request (auth is a cookie,
                           not a bearer token in JS — never store the JWT in localStorage)
src/api/types.ts        — TypeScript interfaces mirroring this exact JSON shape (keep
                           snake_case field names to match the backend/model exactly,
                           do not convert to camelCase — avoids dual-casing bugs):
  interface Prediction {
    customer_id: string; segment: string;
    churn_probability: number; churn_risk_pct: number;
    purchase_propensity: number; purchase_intent_pct: number;
    estimated_clv: number;
    shap_explanations: { feature: string; impact: "high"|"medium";
      direction: "positive"|"negative"; reason: string; shap_value: number|null }[];
    explanation_type: string;
    next_best_action: { action: string; reason: string; recommended_offer: string;
      preferred_channel: string; preferred_category: string;
      priority: "high"|"medium"|"low" };
    inference_mode: string;
  }
  interface AnalyzeResponse {
    customer: { id: string; customer_ref: string; name: string };
    prediction: Prediction; analyzed_at: string; cached: boolean;
  }
src/features/auth/          — login page, auth context (derives logged-in state from a
                               /auth/me call, since the JWT lives in an httpOnly cookie
                               the frontend can't read directly), protected route wrapper
src/features/customers/
  CustomerList.tsx          — table, filterable by segment and a churn-risk minimum slider
  CustomerProfile.tsx       — risk badges: churn_risk_pct, recency, cart_abandonments_30d,
                               estimated_clv; "Run Analysis" button calling POST /analyze
  NBACard.tsx                — action, reason, recommended_offer, preferred_channel,
                                priority badge colored red/amber/green for high/medium/low
  WhyPanel.tsx                — renders shap_explanations as chips grouped by impact
                                (high/medium) and direction (positive=green, negative=red);
                                render the "reason" text as the primary content — do NOT
                                build a numeric bar chart against shap_value, since it is
                                currently always null in every response from this model
src/features/dashboard/     — segment distribution chart, count of "high" priority NBAs
src/mocks/predictionFixtures.ts — 4-5 fixture AnalyzeResponse objects matching the type
                                   above exactly, covering high/medium/low priority and
                                   both cached:true and cached:false, for building the UI
                                   before the backend is wired up
src/App.tsx

Every screen that calls the API needs three explicit states beyond the happy path:
a loading state ("Analyzing customer…"), an empty state (customer has no prediction
history yet — "Run Analysis" call to action, not a blank screen), and a distinct
"model temporarily unavailable — showing last known result" banner rendered when the
API response has cached: true, using a warm amber accent, not treated as an error.
Fully responsive: risk badges and the NBA card must reflow to a single column below
640px width, since this may be viewed on a phone during a demo.

Wire up components against src/mocks/predictionFixtures.ts first. Swapping to the real
backend should only require pointing VITE_API_BASE_URL at the running backend — no
component code should change.
```

**Verify before moving on:** with the backend from Prompt B running, load the customer list, open `CUST-FLAGSHIP`, click "Run Analysis," and confirm the risk badges, NBA card, and Why panel populate with real values (churn risk should read noticeably high for this customer, given the seed data) — not the mock fixtures.

---

### Prompt D — DevOps
```
Add Docker + Compose to the existing customer360-backend and customer360-frontend
projects (both already built).

backend/Dockerfile — Python 3.11-slim base, installs requirements.txt, runs uvicorn
  app.main:app on port 8000.
frontend/Dockerfile — multi-stage: Node 20 to build the Vite app, then nginx:alpine to
  serve the static build on port 80.

Root docker-compose.yml with three services:
  db: postgres:16, env POSTGRES_DB/POSTGRES_USER/POSTGRES_PASSWORD from .env,
      named volume pgdata for persistence, healthcheck using pg_isready
  backend: builds ./backend, depends_on db (condition: service_healthy), env
      DATABASE_URL, JWT_SECRET, MODEL_API_BASE_URL=https://vishu2006-customer.hf.space,
      MODEL_API_KEY, MODEL_TIMEOUT_SECONDS=12, CORS_ALLOWED_ORIGINS=http://localhost:5173,
      port 8000:8000
  frontend: builds ./frontend, env VITE_API_BASE_URL=http://localhost:8000, port 5173:80

Add .env.example at the repo root listing every variable above with placeholder values
(never a real key) and add .env to .gitignore.

Add .github/workflows/ci.yml: on push/PR, install backend deps, run ruff/flake8 lint,
run pytest with app/adapters/model_client.py mocked (patch httpx so CI never makes a
real network call to the Hugging Face Space), then install and build the frontend
(npm ci && npm run build) to catch TypeScript errors.

Add a root README.md quickstart: clone, cp .env.example .env and fill in a rotated
MODEL_API_KEY, docker compose up --build, run the Alembic migration and scripts/seed.py
inside the backend container, then open http://localhost:5173 and confirm
GET http://localhost:8000/api/v1/health reports both database and model_service as "ok".
```

**Verify before moving on:** run the full README quickstart on a machine (or a clean clone) that isn't the one you developed on — this is the actual test of whether the setup instructions are complete, not just whether they look complete.

---

**Bottom line:** the model is not a hackathon risk anymore — it's already live and working. The real risks now are (1) the exposed API key, (2) HF Space cold-start latency, and (3) getting the "Why" panel's data source right (`reason` text, not `shap_value`, which is always null). The prompts above are now fully self-contained — no manual assembly required — and each has a concrete check so a bad output gets caught before the next prompt builds on top of it.
