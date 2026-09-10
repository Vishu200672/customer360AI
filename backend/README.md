# Customer360 AI — Backend

Decision Intelligence Platform backend built with FastAPI, PostgreSQL, SQLAlchemy 2.x, Alembic, and Pydantic v2.

## Quickstart

### 1. Prerequisites
- Python 3.10+
- PostgreSQL 14+ (Local service or Docker)

### 2. Environment Setup
```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment (optional)
python -m venv .venv
# On Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` matches your local PostgreSQL instance:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/customer360_db
```

### 4. Apply Database Migrations
```bash
alembic upgrade head
```

### 5. Run FastAPI Application
```bash
uvicorn app.main:app --reload --port 8000
```
Interactive API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
