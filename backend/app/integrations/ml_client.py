from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from decimal import Decimal
from uuid import UUID
import httpx
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.exceptions import MLIntegrationException, ValidationException
from app.core.logging import get_logger
from app.schemas.prediction import SUPPORTED_PREDICTION_TYPES

logger = get_logger("app.integrations.ml_client")


class PredictionOutput(BaseModel):
    model_name: str
    model_version: str
    prediction_type: str
    score: Decimal
    predicted_class: Optional[str] = None
    confidence: Optional[Decimal] = None
    is_synthetic: bool = False
    explanations: Optional[list] = None
    next_best_action: Optional[Dict[str, Any]] = None


class BaseMLClient(ABC):
    @abstractmethod
    def predict(
        self,
        customer_id: UUID,
        features: Dict[str, Any],
        prediction_type: str = "churn",
    ) -> PredictionOutput:
        """Generate prediction for given customer and feature set."""
        pass


class LocalDemoMLClient(BaseMLClient):
    """
    LOCAL / DEMO MODE:
    Uses deterministic rule-based heuristics to generate simulated predictions
    for end-to-end integration and UI workflow testing during hackathon development.
    ALL outputs are explicitly marked with is_synthetic=True and model_version='demo-synthetic-v1.0'.
    NEVER presented as measured production ML results.
    """

    def predict(
        self,
        customer_id: UUID,
        features: Dict[str, Any],
        prediction_type: str = "churn",
    ) -> PredictionOutput:
        ptype = prediction_type.lower()
        if ptype not in SUPPORTED_PREDICTION_TYPES:
            raise ValidationException(
                f"Unsupported prediction type: '{prediction_type}'. Supported: {SUPPORTED_PREDICTION_TYPES}"
            )

        days_inactive = float(features.get("days_inactive", 0) or 0)
        recency_days = float(features.get("recency_days", 0) or 0)
        engagement_score = float(features.get("engagement_score", 0.5) or 0.5)
        monetary_value = float(features.get("monetary_value", 0.0) or 0.0)
        frequency_count = int(features.get("frequency_count", 0) or 0)
        cart_abandonment = int(features.get("cart_abandonment_count", 0) or 0)

        if ptype == "churn":
            # Heuristic: Higher inactivity & cart abandonment + lower engagement increases churn risk
            raw_score = (
                (min(days_inactive, 90.0) / 90.0) * 0.45
                + (1.0 - engagement_score) * 0.35
                + min(cart_abandonment * 0.1, 0.2)
            )
            score = round(max(0.05, min(0.98, raw_score)), 4)
            predicted_class = "high_risk" if score >= 0.65 else ("medium_risk" if score >= 0.35 else "low_risk")
            confidence = 0.85

        elif ptype == "purchase_propensity":
            # Heuristic: High engagement and recent purchase frequency increases propensity
            raw_score = (
                engagement_score * 0.55
                + (1.0 / (1.0 + (recency_days / 15.0))) * 0.45
            )
            score = round(max(0.05, min(0.98, raw_score)), 4)
            predicted_class = "high" if score >= 0.60 else ("medium" if score >= 0.30 else "low")
            confidence = 0.82

        elif ptype == "clv":
            # Heuristic: Project future value from historical monetary value and frequency
            base_val = monetary_value if monetary_value > 0 else 100.0
            projected = base_val * 1.4 + (frequency_count * 75.0)
            score = round(projected, 2)
            predicted_class = "high_value" if score >= 1000.0 else ("medium_value" if score >= 400.0 else "standard")
            confidence = 0.80

        elif ptype == "affinity":
            # Heuristic category affinity
            score = 0.75
            predicted_class = "high_affinity"
            confidence = 0.78

        else:
            score = 0.50
            predicted_class = "neutral"
            confidence = 0.70

        return PredictionOutput(
            model_name="demo_heuristic_engine",
            model_version="demo-synthetic-v1.0",
            prediction_type=ptype,
            score=Decimal(str(score)),
            predicted_class=predicted_class,
            confidence=Decimal(str(confidence)),
            is_synthetic=True,
        )


class RemoteMLClient(BaseMLClient):
    """
    MODEL SERVICE MODE:
    Calls Vishvam's deployed remote Customer360 AI ML service on Hugging Face Spaces.
    Endpoint: POST /demo-predict
    Constructs normalized CustomerRequest payload, executes HTTP POST with timeout,
    and maps the model predictions (churn, propensity, clv, affinity) into normalized PredictionOutput.
    """

    def __init__(
        self,
        service_url: Optional[str] = None,
        timeout: Optional[float] = None,
        api_key: Optional[str] = None,
    ):
        self.service_url = (service_url or settings.ML_SERVICE_URL).rstrip("/")
        self.timeout = timeout or settings.ML_REQUEST_TIMEOUT_SECONDS
        self.api_key = api_key or settings.ML_API_KEY

    def predict(
        self,
        customer_id: UUID,
        features: Dict[str, Any],
        prediction_type: str = "churn",
    ) -> PredictionOutput:
        # If url already includes /demo-predict or /predict, respect it; otherwise append /demo-predict
        if self.service_url.endswith("/demo-predict") or self.service_url.endswith("/predict"):
            endpoint = self.service_url
        else:
            endpoint = f"{self.service_url}/demo-predict"

        # Build CustomerRequest expected by Vishvam's deployed service
        payload = {
            "customer_id": str(customer_id),
            "name": str(features.get("name") or "Customer"),
            "recency_days": int(features.get("recency_days", 0) or 0),
            "frequency_purchases": int(features.get("frequency_purchases") or features.get("frequency_count", 0) or 0),
            "monetary_total_spend": float(features.get("monetary_total_spend") or features.get("monetary_value", 0.0) or 0.0),
            "website_visits_30d": int(features.get("website_visits_30d", 10) or 10),
            "product_views_30d": int(features.get("product_views_30d", 25) or 25),
            "cart_additions_30d": int(features.get("cart_additions_30d", 5) or 5),
            "cart_abandonments_30d": int(features.get("cart_abandonments_30d") or features.get("cart_abandonment_count", 0) or 0),
            "support_tickets_30d": int(features.get("support_tickets_30d", 0) or 0),
            "engagement_change_pct": float(features.get("engagement_change_pct", 0.0) or 0.0),
            "preferred_channel": str(features.get("preferred_channel") or features.get("acquisition_channel") or "Email"),
            "preferred_category": str(features.get("preferred_category") or "General"),
        }

        headers = {}
        if self.api_key:
            headers["X-Api-Key"] = self.api_key

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(endpoint, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            logger.error(f"Remote ML request timed out after {self.timeout}s: {exc}")
            raise MLIntegrationException(
                f"Remote ML service timed out after {self.timeout} seconds."
            ) from exc
        except (httpx.ConnectError, httpx.NetworkError) as exc:
            logger.error(f"Remote ML service connection failure to {endpoint}: {exc}")
            raise MLIntegrationException(
                f"Remote ML service at '{self.service_url}' is unreachable."
            ) from exc
        except Exception as exc:
            logger.error(f"Unexpected communication error with remote ML service: {exc}")
            raise MLIntegrationException(
                f"Failed to communicate with remote ML service: {str(exc)}"
            ) from exc

        if response.status_code != 200:
            logger.error(f"Remote ML service responded with HTTP {response.status_code}: {response.text}")
            raise MLIntegrationException(
                f"Remote ML service returned HTTP error {response.status_code}."
            )

        try:
            data = response.json()
        except Exception as exc:
            logger.error(f"Failed to parse JSON response from ML service: {response.text}")
            raise MLIntegrationException("Remote ML service returned a non-JSON response payload.") from exc

        if isinstance(data, dict) and "error" in data:
            logger.error(f"Remote ML service returned error: {data['error']}")
            raise MLIntegrationException(f"Remote ML service returned a malformed response payload: {data['error']}")

        try:
            ptype = prediction_type.lower()

            # Determine score based on prediction_type or explicit score
            if "score" in data and data["score"] is not None:
                score = Decimal(str(data["score"]))
            elif ptype == "churn" and "churn_probability" in data and data["churn_probability"] is not None:
                score = Decimal(str(data["churn_probability"]))
            elif ptype in ("purchase_propensity", "propensity") and "purchase_propensity" in data and data["purchase_propensity"] is not None:
                score = Decimal(str(data["purchase_propensity"]))
            elif ptype == "clv" and "estimated_clv" in data and data["estimated_clv"] is not None:
                score = Decimal(str(data["estimated_clv"]))
            elif ptype == "affinity":
                raw = data.get("score") or data.get("purchase_propensity")
                if raw is None:
                    raise MLIntegrationException("Remote ML service returned a malformed response payload: missing score.")
                score = Decimal(str(raw))
            else:
                raw_score = data.get("churn_probability") or data.get("purchase_propensity") or data.get("score")
                if raw_score is None:
                    raise MLIntegrationException("Remote ML service returned a malformed response payload: missing prediction score.")
                score = Decimal(str(raw_score))

            # Determine predicted_class
            if data.get("predicted_class"):
                predicted_class = data["predicted_class"]
            elif ptype == "churn":
                predicted_class = "high_risk" if score >= Decimal("0.65") else ("medium_risk" if score >= Decimal("0.35") else "low_risk")
            elif ptype in ("purchase_propensity", "propensity"):
                predicted_class = "high" if score >= Decimal("0.60") else ("medium" if score >= Decimal("0.30") else "low")
            elif ptype == "clv":
                predicted_class = data.get("segment", "standard")
            else:
                predicted_class = data.get("segment", "standard")

            # Determine confidence
            if data.get("confidence") is not None:
                confidence = Decimal(str(data["confidence"]))
            elif ptype in ("churn", "purchase_propensity", "propensity"):
                confidence = Decimal(str(round(float(abs(score - Decimal("0.5")) * 2), 4)))
            else:
                confidence = Decimal("0.85")

            model_name = data.get("model_name") or f"customer360_unified_{data.get('inference_mode', 'trained_artifacts')}"
            model_version = data.get("model_version") or "v1.0.0"

            # Parse explanations ONLY if genuine numeric SHAP contributions are present
            # Note: Remote service currently returns shap_explanations with shap_value: null (shap_enabled: false).
            # We strictly ignore null SHAP values so that zero fake explanations are persisted.
            explanations = None
            raw_exps = data.get("shap_explanations") or data.get("explanations") or []
            valid_exps = []
            for rank, exp in enumerate(raw_exps, start=1):
                if not isinstance(exp, dict):
                    continue
                contrib = exp.get("shap_value") if exp.get("shap_value") is not None else exp.get("contribution")
                if contrib is not None:
                    try:
                        contrib_dec = Decimal(str(contrib))
                        feat_name = exp.get("feature") or exp.get("feature_name") or f"feature_{rank}"
                        dir_val = str(exp.get("direction", "positive")).lower()
                        if dir_val not in ("positive", "negative"):
                            dir_val = "positive"
                        valid_exps.append({
                            "feature_name": feat_name,
                            "contribution": contrib_dec,
                            "rank": exp.get("rank", rank),
                            "direction": dir_val,
                            "feature_value": Decimal(str(exp["feature_value"])) if exp.get("feature_value") is not None else None,
                            "explanation_metadata": {"reason": exp.get("reason"), "impact": exp.get("impact")},
                        })
                    except (ValueError, TypeError):
                        pass

            if valid_exps:
                explanations = valid_exps

            # Parse Next Best Action (NBA) from Vishvam's response
            next_best_action = None
            raw_nba = data.get("next_best_action")
            if isinstance(raw_nba, dict) and (raw_nba.get("action") or raw_nba.get("action_type")):
                next_best_action = raw_nba

            return PredictionOutput(
                model_name=model_name,
                model_version=model_version,
                prediction_type=ptype,
                score=score,
                predicted_class=predicted_class,
                confidence=confidence,
                is_synthetic=False,
                explanations=explanations,
                next_best_action=next_best_action,
            )
        except (KeyError, ValueError, TypeError) as exc:
            logger.error(f"Malformed response payload from ML service: {response.text}")
            raise MLIntegrationException(
                "Remote ML service returned a malformed response payload."
            ) from exc


def get_ml_client(mode: Optional[str] = None) -> BaseMLClient:
    ml_mode = (mode or settings.ML_MODE).lower()
    if ml_mode == "remote":
        return RemoteMLClient()
    return LocalDemoMLClient()
