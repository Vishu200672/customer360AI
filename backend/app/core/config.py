from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    PROJECT_NAME: str = "Customer360 AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/customer360_db"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return []

    # ML & Decision Intelligence Integration (Vishvam)
    ML_MODE: str = "local"  # "local" or "remote"
    ML_SERVICE_URL: str = "https://vishu2006-customer.hf.space"
    ML_REQUEST_TIMEOUT_SECONDS: float = 15.0
    ML_API_KEY: Optional[str] = None

    # Next Best Action (NBA) Decision Engine Integration
    DECISION_MODE: str = "local"  # "local" or "remote"
    DECISION_SERVICE_URL: str = "http://localhost:8002"
    DECISION_REQUEST_TIMEOUT_SECONDS: float = 5.0

    # Logging
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
