# Customer360 AI — Decision Intelligence Platform

> **Closed-Loop Customer Decision Intelligence System**  
> *Decision Loop: UNDERSTAND → PREDICT → EXPLAIN → DECIDE → PERSONALIZE → ACT → LEARN*

Customer360 AI transforms fragmented customer signals (transactions, web clicks, cart events, support tickets, inactivity) into unified customer states, explainable machine learning predictions, and automated Next Best Actions (NBA).

---

## 📁 Repository Structure

```text
byte/
├── backend/                  # Core Backend REST API Service
│   ├── app/                  # FastAPI Application (FastAPI, SQLAlchemy 2.x, Pydantic v2)
│   ├── alembic/              # PostgreSQL Database Migrations
│   ├── scripts/              # Database schema & seed scripts (init.sql)
│   ├── src/                  # Node.js / Express TypeScript alternative server
│   ├── tests/                # Automated integration & unit test suite (pytest)
│   ├── Dockerfile            # Container configuration
│   ├── requirements.txt      # Python dependencies
│   ├── package.json          # Node dependencies
│   └── README.md             # Backend setup & API documentation
│
├── frontend/                 # Enterprise Customer Intelligence Dashboard
│   ├── src/                  # React 18 + Vite + Tailwind CSS + Lucide Icons
│   ├── Dockerfile            # Container configuration
│   ├── nginx.conf            # Production reverse proxy configuration
│   ├── package.json          # Frontend dependencies
│   └── vite.config.ts        # Vite configuration & API proxy
│
├── ml-model/                 # Machine Learning Inference & Training Engine
│   ├── ml/                   # Feature engineering, XGBoost models (churn, propensity, CLV, seg), NBA engine
│   ├── scripts/              # Synthetic dataset generator & Hugging Face upload tools
│   ├── app.py                # Gradio UI & FastAPI inference endpoints
│   ├── train.py              # Model training pipeline
│   ├── requirements.txt      # ML dependencies
│   └── README.md             # Model card & Hugging Face deployment notes
│
├── docs/                     # Specifications, Architecture, & Playbooks
│   ├── Customer360_AI.pdf                    # Pitch deck & presentation
│   ├── Hackathon_Team_Playbook_Hinglish.pdf  # Team collaboration playbook
│   ├── Customer360_AI_Implementation_Plan.md# Fullstack system engineering plan
│   ├── backend.md                            # Backend engineering & architecture guide
│   └── walkthrough.md                        # Verification & test execution records
│
├── docker-compose.yml        # Multi-container orchestration (PostgreSQL, Redis, Backend, Frontend)
├── .gitignore                # Git ignore configuration
├── LICENSE                   # Project license (MIT)
└── README.md                 # This documentation
```

---

## 🚀 Quickstart Guide

### Option 1: Run with Docker Compose (Recommended)

To start the full stack (PostgreSQL, Redis, Backend API, and Frontend Dashboard):

```bash
docker-compose up --build
```

- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:8000](http://localhost:8000)
- **API Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option 2: Run Services Individually

#### 1. Backend (FastAPI Python)
```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend (React + Vite)
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
The dashboard will launch at [http://localhost:5173](http://localhost:5173).

#### 3. ML Model Service (Gradio + FastAPI)
```bash
cd ml-model

# Install dependencies
pip install -r requirements.txt

# Start model service locally
python app.py
```
Model studio will open at [http://localhost:7860](http://localhost:7860).  
*(Note: By default, the backend can also connect to the deployed Hugging Face Space at `https://vishu2006-customer.hf.space`.)*

---

## 🧪 Testing

Run backend tests:
```bash
cd backend
pytest tests/ -v
```

---

## 📜 Documentation

For in-depth architectural specifications and implementation details, refer to the [`docs/`](./docs/) directory:
- [Backend Engineering Guide](./docs/backend.md)
- [System Implementation Plan](./docs/Customer360_AI_Implementation_Plan.md)
- [Verification Walkthrough](./docs/walkthrough.md)
