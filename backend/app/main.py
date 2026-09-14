from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import AppException
from app.core.database import SessionLocal
from app.schemas.common import ErrorEnvelope, ErrorDetail, ResponseEnvelope
from app.api.v1.router import api_v1_router

logger = get_logger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger.info(f"Starting {settings.PROJECT_NAME} (v{settings.VERSION}) in {settings.ENVIRONMENT} mode...")
    yield
    # Shutdown
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")


app = FastAPI(
    title=f"{settings.PROJECT_NAME} API",
    version=settings.VERSION,
    description="""
# CUSTOMER360 AI — Customer Decision Intelligence Platform

The platform powers the decision loop:
**UNDERSTAND → PREDICT → EXPLAIN → DECIDE → PERSONALIZE → ACT → LEARN**

Core APIs:
- **Customers & 360:** Unified customer profile, RFM features, segmentation, and full 360 aggregation.
- **Transactions & Behavioral Signals:** Purchase records, cart events, clickstream signals, and inactivity tracking.
- **Predictions & SHAP Explainability:** Inference contracts for churn risk, propensity, and feature contributions.
- **Next Best Action (NBA):** Deterministic multi-factor recommendations and personalization.
- **Action Execution & Outcome Tracking:** Closed-loop feedback system capturing conversion and retention outcomes.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root Liveness Endpoint
@app.get(
    "/health",
    response_model=ResponseEnvelope[dict],
    tags=["Health & System"],
    summary="Root application health check",
    description="Basic service liveness probe."
)
def root_health():
    db_status = "healthy"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return ResponseEnvelope(
        success=True,
        data={
            "status": "UP",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "database": db_status,
        }
    )


# Include API Routers
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


# Custom Domain Exception Handler
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    logger.warning(f"Domain exception on {request.method} {request.url.path}: {exc.code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorEnvelope(
            success=False,
            error=ErrorDetail(
                code=exc.code,
                message=exc.message,
                details=exc.details,
            )
        ).model_dump()
    )


# Validation Error Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
    # Format cleaner error message from pydantic errors
    first_error = exc.errors()[0] if exc.errors() else {}
    field = ".".join([str(loc) for loc in first_error.get("loc", []) if loc != "body"])
    msg = first_error.get("msg", "Invalid request payload")
    detail_msg = f"Validation failed for '{field}': {msg}" if field else msg

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorEnvelope(
            success=False,
            error=ErrorDetail(
                code="VALIDATION_ERROR",
                message=detail_msg,
                details=exc.errors(),
            )
        ).model_dump()
    )


# Unhandled Exception Fallback
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorEnvelope(
            success=False,
            error=ErrorDetail(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected server error occurred. Please try again later.",
            )
        ).model_dump()
    )
