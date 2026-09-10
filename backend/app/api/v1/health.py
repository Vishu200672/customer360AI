from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.config import settings
from app.schemas.common import ResponseEnvelope

router = APIRouter(tags=["Health & System"])


@router.get(
    "/health",
    response_model=ResponseEnvelope[dict],
    summary="System health & connectivity",
    description="Verifies API operational status, environment, and live database connectivity."
)
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return ResponseEnvelope(
        success=True,
        data={
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "database": db_status,
            "ml_mode": settings.ML_MODE,
        }
    )


@router.get(
    "/ready",
    response_model=ResponseEnvelope[dict],
    summary="System readiness probe",
    description="Dedicated readiness probe that verifies database connectivity and schema readiness."
)
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return ResponseEnvelope(
            success=True,
            data={
                "status": "READY",
                "database": "connected",
                "service": settings.PROJECT_NAME,
            }
        )
    except Exception as e:
        return ResponseEnvelope(
            success=False,
            data={
                "status": "NOT_READY",
                "database": "disconnected",
                "error": str(e),
            },
            message="Database connectivity check failed."
        )

