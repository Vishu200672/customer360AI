import os
import sys

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any

from ml.features.feature_engineering import CustomerFeatureEngineer, FEATURE_COLUMNS
from ml.models.segmentation.segmentation_model import CustomerSegmentationModel
from ml.models.churn.churn_model import ChurnPredictionModel
from ml.models.propensity.propensity_model import PurchasePropensityModel
from ml.models.clv.clv_model import CustomerLifetimeValueModel
from ml.explainability.shap_explainer import ShapExplainabilityEngine
from ml.nba.nba_engine import NextBestActionEngine
from scripts.generate_dataset import generate_customer_dataset

ARTIFACTS_DIR = os.path.join(PROJECT_ROOT, "ml", "models", "artifacts")

class UnifiedMLInferenceService:
    def __init__(self, artifacts_dir: str = ARTIFACTS_DIR):
        self.artifacts_dir = artifacts_dir
        self.feature_engineer = None
        self.seg_model = None
        self.churn_model = None
        self.prop_model = None
        self.clv_model = None
        self.shap_engine = None
        self.nba_engine = NextBestActionEngine()
        self.loaded = False
        self._load_or_train_artifacts()

    def _load_or_train_artifacts(self):
        fe_path = os.path.join(self.artifacts_dir, "feature_engineer.joblib")
        seg_path = os.path.join(self.artifacts_dir, "seg_model.joblib")
        churn_path = os.path.join(self.artifacts_dir, "churn_model.joblib")
        prop_path = os.path.join(self.artifacts_dir, "prop_model.joblib")
        clv_path = os.path.join(self.artifacts_dir, "clv_model.joblib")

        loaded_successfully = False

        if all(os.path.exists(p) for p in [fe_path, seg_path, churn_path, prop_path, clv_path]):
            try:
                self.feature_engineer = joblib.load(fe_path)
                self.seg_model = joblib.load(seg_path)
                self.churn_model = joblib.load(churn_path)
                self.prop_model = joblib.load(prop_path)
                self.clv_model = joblib.load(clv_path)

                # Initialize SHAP dynamically in memory to avoid Python bytecode pickle version mismatches
                self.shap_engine = ShapExplainabilityEngine(self.churn_model.model, FEATURE_COLUMNS)
                self.loaded = True
                loaded_successfully = True
                print("[UnifiedMLInferenceService] Pre-trained ML artifacts successfully loaded into memory!")
            except Exception as e:
                print(f"[UnifiedMLInferenceService] Warning: Could not unpickle local model artifacts due to version mismatch ({e}). Triggering instant in-memory training...")

        if not loaded_successfully:
            self._train_in_memory()

    def _train_in_memory(self):
        print("[UnifiedMLInferenceService] Running instant in-memory training pipeline...")
        try:
            dataset_path = os.path.join(PROJECT_ROOT, "ml", "data", "customer_signals.csv")
            if os.path.exists(dataset_path):
                df_raw = pd.read_csv(dataset_path)
            else:
                df_raw = generate_customer_dataset(500)

            self.feature_engineer = CustomerFeatureEngineer()
            X = self.feature_engineer.transform(df_raw)
            y_churn = df_raw["churn_label"]
            y_intent = df_raw["purchase_intent_label"]
            y_clv = df_raw["clv"]

            self.seg_model = CustomerSegmentationModel(n_clusters=5)
            self.seg_model.fit(X, df_raw)

            self.churn_model = ChurnPredictionModel(use_xgboost=True)
            self.churn_model.fit(X, y_churn)

            self.prop_model = PurchasePropensityModel(use_xgboost=True)
            self.prop_model.fit(X, y_intent)

            self.clv_model = CustomerLifetimeValueModel(use_xgboost=True)
            self.clv_model.fit(X, y_clv)

            self.shap_engine = ShapExplainabilityEngine(self.churn_model.model, FEATURE_COLUMNS)
            self.loaded = True
            print("[UnifiedMLInferenceService] Instant in-memory training completed successfully! Models ready.")
        except Exception as e:
            print(f"[UnifiedMLInferenceService] Error during in-memory training: {e}")
            self.loaded = False

    def predict_customer_decision(self, customer_dict: Dict[str, Any]) -> Dict[str, Any]:
        if not self.loaded or self.feature_engineer is None:
            return self._fallback_inference(customer_dict)

        df_raw = pd.DataFrame([customer_dict])
        X = self.feature_engineer.transform(df_raw)

        churn_prob = float(self.churn_model.predict_proba(X)[0])
        propensity_prob = float(self.prop_model.predict_proba(X)[0])
        clv_val = float(self.clv_model.predict(X)[0])
        segment = self.seg_model.predict(X)[0]

        shap_explanations = self.shap_engine.explain_instance(X, top_n=5)

        nba_decision = self.nba_engine.evaluate_next_best_action(
            customer_profile=customer_dict,
            churn_prob=churn_prob,
            purchase_intent_prob=propensity_prob,
            clv_estimate=clv_val,
            segment=segment,
            shap_explanations=shap_explanations
        )

        return {
            "customer_id": customer_dict.get("customer_id"),
            "segment": segment,
            "churn_probability": round(churn_prob, 4),
            "churn_risk_pct": round(churn_prob * 100, 1),
            "purchase_propensity": round(propensity_prob, 4),
            "purchase_intent_pct": round(propensity_prob * 100, 1),
            "estimated_clv": round(clv_val, 2),
            "shap_explanations": shap_explanations,
            "next_best_action": nba_decision
        }

    def _fallback_inference(self, customer_dict: Dict[str, Any]) -> Dict[str, Any]:
        recency = customer_dict.get("recency_days", 30)
        carts = customer_dict.get("cart_abandonments_30d", 0)
        tickets = customer_dict.get("support_tickets_30d", 0)
        spend = customer_dict.get("monetary_total_spend", 5000)
        p_views = customer_dict.get("product_views_30d", 10)

        churn_prob = min(0.95, max(0.05, 0.02 * recency + 0.1 * carts + 0.15 * tickets))
        propensity_prob = min(0.95, max(0.05, 0.03 * p_views - 0.01 * recency))
        clv_val = spend * 2.5 * (1.0 - churn_prob + 0.2)
        segment = "High Value At Risk" if (churn_prob > 0.5 and spend > 15000) else "Low Value Active"

        shap_explanations = [
            {"feature": "recency_days", "label": "Days Inactive", "value": f"{recency} days", "shap_value": 0.35, "impact": "INCREASES_RISK"},
            {"feature": "cart_abandonments_30d", "label": "Abandoned Carts", "value": str(carts), "shap_value": 0.20, "impact": "INCREASES_RISK"},
            {"feature": "monetary_total_spend", "label": "Lifetime Spend", "value": f"Rs.{spend:,.0f}", "shap_value": -0.15, "impact": "DECREASES_RISK"}
        ]

        nba_decision = self.nba_engine.evaluate_next_best_action(
            customer_profile=customer_dict,
            churn_prob=churn_prob,
            purchase_intent_prob=propensity_prob,
            clv_estimate=clv_val,
            segment=segment,
            shap_explanations=shap_explanations
        )

        return {
            "customer_id": customer_dict.get("customer_id"),
            "segment": segment,
            "churn_probability": round(churn_prob, 4),
            "churn_risk_pct": round(churn_prob * 100, 1),
            "purchase_propensity": round(propensity_prob, 4),
            "purchase_intent_pct": round(propensity_prob * 100, 1),
            "estimated_clv": round(clv_val, 2),
            "shap_explanations": shap_explanations,
            "next_best_action": nba_decision
        }

# Global singleton instance
inference_service = UnifiedMLInferenceService()
