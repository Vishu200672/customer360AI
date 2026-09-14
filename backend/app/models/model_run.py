import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import GUID


class ModelRun(Base):
    __tablename__ = "model_runs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    run_timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    metrics = Column(JSON, nullable=True)
    status = Column(String(50), default="SUCCESS", nullable=False)  # SUCCESS, FAILED, RUNNING

    # Relationships
    predictions = relationship("Prediction", back_populates="model_run")
