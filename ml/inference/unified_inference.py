Hugging Face's logo
Hugging Face
Models
Datasets
Spaces
Buckets
new
Docs
Pricing


Spaces:
Vishu2006
/
customer


Like
0

App
Files
Community
Settings
customer
/
ml
/
inference
/
unified_inference.py

Vishu2006's picture
Vishu2006
Update ml/inference/unified_inference.py
26ca20e
verified
5 days ago
Raw

Download with hf CLI

Copy download link
History
Blame
Edit
Delete
57.8 kB
"""
Customer360 AI
Unified ML Inference Service

Expected project structure:

customer360AI/
│
├── app.py
│
└── ml/
    ├── inference/
    │   └── unified_inference.py
    │
    └── models/
        └── artifacts/
            ├── churn_model.joblib
            ├── clv_model.joblib
            ├── feature_engineer.joblib
            ├── prop_model.joblib
            ├── seg_model.joblib
            └── shap_engine.joblib

Live inference:
    - Uses trained artifacts whenever possible.
    - SHAP is NOT executed during request-time inference.
    - Rule-based explanations are used for low latency.
    - Fallback mode is used only if trained inference cannot run.
"""

import os
import warnings
from typing import Any, Dict, Optional

import joblib
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")


# ============================================================
# OPTIONAL XGBOOST
# ============================================================

try:
    import xgboost as xgb
except Exception:
    xgb = None


# ============================================================
# UNIFIED ML INFERENCE SERVICE
# ============================================================

class UnifiedMLInferenceService:

    def __init__(self):

        # ----------------------------------------------------
        # Runtime state
        # ----------------------------------------------------

        self.loaded = False
        self.fallback_mode = True

        self.artifact_dir = None

        # ----------------------------------------------------
        # ML artifacts
        # ----------------------------------------------------

        self.feature_engineer = None
        self.churn_model = None
        self.prop_model = None
        self.clv_model = None
        self.seg_model = None
        self.shap_engine = None

        # ----------------------------------------------------
        # Model metadata
        # ----------------------------------------------------

        self.churn_classes = None
        self.prop_classes = None

        # ----------------------------------------------------
        # Startup
        # ----------------------------------------------------

        print("=" * 70)
        print("Customer360 AI - Unified ML Inference Service")
        print("=" * 70)

        self._load_or_train_artifacts()

        self._print_model_status()

        print("=" * 70)


    # ========================================================
    # PROJECT / ARTIFACT PATH
    # ========================================================

    def _find_artifact_directory(self) -> Optional[str]:

        """
        Locate:

            ml/models/artifacts/

        The deployed HF Space uses:

            /home/user/app/ml/models/artifacts/
        """

        current_file = os.path.abspath(__file__)

        current_dir = os.path.dirname(current_file)

        # Current structure:
        #
        # /home/user/app/ml/inference/unified_inference.py
        #
        # parent:
        # /home/user/app/ml/inference
        #
        # parent:
        # /home/user/app/ml
        #
        # parent:
        # /home/user/app

        project_root = os.path.dirname(
            os.path.dirname(
                current_dir
            )
        )

        candidates = [

            # Expected production path
            os.path.join(
                project_root,
                "ml",
                "models",
                "artifacts"
            ),

            # If project root calculation differs
            os.path.join(
                os.getcwd(),
                "ml",
                "models",
                "artifacts"
            ),

            # If this module is placed differently
            os.path.join(
                os.path.dirname(current_dir),
                "models",
                "artifacts"
            ),

            # Direct artifact directory
            os.path.join(
                project_root,
                "models",
                "artifacts"
            ),

            # Direct artifacts directory
            os.path.join(
                project_root,
                "artifacts"
            ),
        ]

        print("\n[Artifact Search]")
        print("-" * 70)

        checked = set()

        for directory in candidates:

            directory = os.path.abspath(
                directory
            )

            if directory in checked:
                continue

            checked.add(directory)

            print(
                f"Checking: {directory}"
            )

            if os.path.isdir(directory):

                print(
                    f"[FOUND] Artifact directory: "
                    f"{directory}"
                )

                return directory

        print(
            "[ERROR] No artifact directory found."
        )

        return None


    # ========================================================
    # LOAD SINGLE ARTIFACT
    # ========================================================

    def _load_artifact(
        self,
        filename: str,
        artifact_name: str
    ) -> Any:

        if self.artifact_dir is None:

            return None

        path = os.path.join(
            self.artifact_dir,
            filename
        )

        print("\n" + "-" * 70)

        print(
            f"[Artifact] {artifact_name}"
        )

        print(
            f"Path: {path}"
        )

        if not os.path.exists(path):

            print(
                "[MISS] File does not exist."
            )

            return None

        try:

            size = os.path.getsize(path)

            print(
                f"Size: {size / 1024:.2f} KB"
            )

            obj = joblib.load(path)

            print(
                f"[LOADED] Type: "
                f"{type(obj).__name__}"
            )

            return obj

        except Exception as e:

            print(
                f"[ERROR] Failed loading "
                f"{filename}"
            )

            print(
                f"Error type: {type(e).__name__}"
            )

            print(
                f"Error: {e}"
            )

            return None


    # ========================================================
    # LOAD FIRST EXISTING ARTIFACT
    # ========================================================

    def _load_first_existing(
        self,
        filenames,
        artifact_name: str
    ) -> Any:

        if self.artifact_dir is None:

            return None

        for filename in filenames:

            path = os.path.join(
                self.artifact_dir,
                filename
            )

            if os.path.exists(path):

                return self._load_artifact(
                    filename,
                    artifact_name
                )

        print("\n" + "-" * 70)

        print(
            f"[Artifact] {artifact_name}"
        )

        print(
            "[MISS] No supported artifact filename found."
        )

        return None


    # ========================================================
    # LOAD ALL TRAINED ARTIFACTS
    # ========================================================

    def _load_or_train_artifacts(self):

        self.artifact_dir = (
            self._find_artifact_directory()
        )

        if self.artifact_dir is None:

            print(
                "\n[Startup] Artifact directory "
                "could not be located."
            )

            self._activate_fallback_mode()

            return

        # ----------------------------------------------------
        # Show directory contents
        # ----------------------------------------------------

        print("\n[Artifact Directory Contents]")
        print("-" * 70)

        try:

            files = sorted(
                os.listdir(
                    self.artifact_dir
                )
            )

            if not files:

                print(
                    "[WARNING] Artifact directory is empty."
                )

            for filename in files:

                path = os.path.join(
                    self.artifact_dir,
                    filename
                )

                if os.path.isfile(path):

                    size = os.path.getsize(path)

                    print(
                        f"{filename} "
                        f"({size / 1024:.2f} KB)"
                    )

        except Exception as e:

            print(
                f"[WARNING] Could not list artifacts: {e}"
            )

        # ====================================================
        # FEATURE ENGINEER
        # ====================================================

        self.feature_engineer = (
            self._load_first_existing(
                [
                    "feature_engineer.joblib",
                    "feature_engineer.pkl",
                    "feature_engineering.joblib",
                    "feature_engineering.pkl",
                    "preprocessor.joblib",
                    "preprocessor.pkl",
                    "preprocessing.joblib",
                    "preprocessing.pkl",
                ],
                "Feature Engineer"
            )
        )

        # ====================================================
        # CHURN MODEL
        # ====================================================

        self.churn_model = (
            self._load_first_existing(
                [
                    "churn_model.joblib",
                    "churn_model.pkl",
                    "churn.pkl",
                ],
                "Churn Model"
            )
        )

        # ====================================================
        # PURCHASE PROPENSITY MODEL
        # ====================================================

        self.prop_model = (
            self._load_first_existing(
                [
                    "prop_model.joblib",
                    "prop_model.pkl",
                    "propensity_model.joblib",
                    "propensity_model.pkl",
                    "purchase_propensity.joblib",
                    "purchase_propensity.pkl",
                ],
                "Purchase Propensity Model"
            )
        )

        # ====================================================
        # CLV MODEL
        # ====================================================

        self.clv_model = (
            self._load_first_existing(
                [
                    "clv_model.joblib",
                    "clv_model.pkl",
                    "customer_lifetime_value.joblib",
                    "customer_lifetime_value.pkl",
                ],
                "CLV Model"
            )
        )

        # ====================================================
        # SEGMENTATION MODEL
        # ====================================================

        self.seg_model = (
            self._load_first_existing(
                [
                    "seg_model.joblib",
                    "seg_model.pkl",
                    "segmentation_model.joblib",
                    "segmentation_model.pkl",
                    "segment_model.joblib",
                    "segment_model.pkl",
                    "kmeans_model.joblib",
                    "kmeans_model.pkl",
                    "kmeans.joblib",
                    "kmeans.pkl",
                ],
                "Segmentation Model"
            )
        )

        # ====================================================
        # SHAP ENGINE
        # ====================================================

        self.shap_engine = (
            self._load_first_existing(
                [
                    "shap_engine.joblib",
                    "shap_engine.pkl",
                ],
                "SHAP Engine"
            )
        )

        # ====================================================
        # MODEL CLASS INFORMATION
        # ====================================================

        if self.churn_model is not None:

            try:

                if hasattr(
                    self.churn_model,
                    "classes_"
                ):

                    self.churn_classes = (
                        self.churn_model.classes_
                    )

                    print(
                        "\n[Churn Classes]",
                        self.churn_classes
                    )

            except Exception:
                pass

        if self.prop_model is not None:

            try:

                if hasattr(
                    self.prop_model,
                    "classes_"
                ):

                    self.prop_classes = (
                        self.prop_model.classes_
                    )

                    print(
                        "[Propensity Classes]",
                        self.prop_classes
                    )

            except Exception:
                pass

        # ====================================================
        # VALIDATION
        # ====================================================

        required_artifacts = {

            "feature_engineer":
                self.feature_engineer,

            "churn_model":
                self.churn_model,

            "prop_model":
                self.prop_model,

            "clv_model":
                self.clv_model,

            "seg_model":
                self.seg_model,
        }

        missing = [
            name
            for name, value
            in required_artifacts.items()
            if value is None
        ]

        if missing:

            print(
                "\n[Startup] Missing required artifacts:"
            )

            for item in missing:

                print(
                    f"  - {item}"
                )

            print(
                "\n[Startup] "
                "Trained inference cannot be enabled."
            )

            self._activate_fallback_mode()

            return

        # ====================================================
        # SUCCESS
        # ====================================================

        self.loaded = True
        self.fallback_mode = False

        print(
            "\n" + "=" * 70
        )

        print(
            "[Startup] SUCCESS"
        )

        print(
            "All required ML artifacts loaded."
        )

        print(
            "Inference mode: TRAINED ARTIFACTS"
        )

        print(
            "=" * 70
        )


    # ========================================================
    # FALLBACK MODE
    # ========================================================

    def _activate_fallback_mode(self):

        self.loaded = False

        self.fallback_mode = True

        print(
            "[Startup] Fallback inference mode activated."
        )


    # ========================================================
    # MODEL STATUS
    # ========================================================

    def _print_model_status(self):

        print("\n[Model Status]")
        print("-" * 70)

        print(
            f"loaded           : {self.loaded}"
        )

        print(
            f"fallback_mode    : {self.fallback_mode}"
        )

        print(
            f"artifact_dir     : {self.artifact_dir}"
        )

        print(
            "feature_engineer :",
            (
                type(
                    self.feature_engineer
                ).__name__
                if self.feature_engineer is not None
                else "NOT LOADED"
            )
        )

        print(
            "churn_model      :",
            (
                type(
                    self.churn_model
                ).__name__
                if self.churn_model is not None
                else "NOT LOADED"
            )
        )

        print(
            "prop_model       :",
            (
                type(
                    self.prop_model
                ).__name__
                if self.prop_model is not None
                else "NOT LOADED"
            )
        )

        print(
            "clv_model        :",
            (
                type(
                    self.clv_model
                ).__name__
                if self.clv_model is not None
                else "NOT LOADED"
            )
        )

        print(
            "seg_model        :",
            (
                type(
                    self.seg_model
                ).__name__
                if self.seg_model is not None
                else "NOT LOADED"
            )
        )

        print(
            "shap_engine      :",
            (
                type(
                    self.shap_engine
                ).__name__
                if self.shap_engine is not None
                else "NOT LOADED"
            )
        )


    # ========================================================
    # INPUT NORMALIZATION
    # ========================================================

    def _normalize_customer(
        self,
        customer_dict: Dict[str, Any]
    ) -> Dict[str, Any]:

        customer = dict(
            customer_dict
        )

        # ----------------------------------------------------
        # Numeric fields
        # ----------------------------------------------------

        numeric_defaults = {

            "recency_days":
                30,

            "frequency_purchases":
                5,

            "monetary_total_spend":
                25000,

            "website_visits_30d":
                10,

            "product_views_30d":
                20,

            "cart_additions_30d":
                4,

            "cart_abandonments_30d":
                2,

            "support_tickets_30d":
                1,

            "engagement_change_pct":
                -20,

            "avg_order_value":
                5000,

            "email_opens_30d":
                8,

            "email_clicks_30d":
                3,

            "return_rate":
                0.05,

            "discount_dependency_ratio":
                0.30,

            "spend_30d":
                5000,

            "spend_90d":
                15000,

            "purchase_velocity":
                0.16,
        }

        for key, default in numeric_defaults.items():

            value = customer.get(
                key
            )

            if value is None or value == "":

                customer[key] = default

                continue

            try:

                customer[key] = float(
                    value
                )

            except Exception:

                customer[key] = default

        # ----------------------------------------------------
        # String fields
        # ----------------------------------------------------

        if not customer.get(
            "customer_id"
        ):

            customer[
                "customer_id"
            ] = "CUST001"

        if not customer.get(
            "name"
        ):

            customer[
                "name"
            ] = "Customer"

        if not customer.get(
            "preferred_channel"
        ):

            customer[
                "preferred_channel"
            ] = "email"

        if not customer.get(
            "preferred_category"
        ):

            customer[
                "preferred_category"
            ] = "electronics"

        return customer


    # ========================================================
    # DATAFRAME
    # ========================================================

    def _create_dataframe(
        self,
        customer: Dict[str, Any]
    ) -> pd.DataFrame:

        return pd.DataFrame(
            [customer]
        )


    # ========================================================
    # FEATURE TRANSFORMATION
    # ========================================================

    def _transform_features(
        self,
        df: pd.DataFrame
    ) -> Any:

        if self.feature_engineer is None:

            raise RuntimeError(
                "Feature engineer is not loaded."
            )

        # ----------------------------------------------------
        # sklearn transformer
        # ----------------------------------------------------

        if hasattr(
            self.feature_engineer,
            "transform"
        ):

            X = (
                self.feature_engineer
                .transform(df)
            )

            return X

        # ----------------------------------------------------
        # Callable feature engineer
        # ----------------------------------------------------

        if callable(
            self.feature_engineer
        ):

            return self.feature_engineer(
                df
            )

        raise TypeError(
            "feature_engineer does not "
            "have transform() and is not callable."
        )


    # ========================================================
    # SAFE PROBABILITY PREDICTION
    # ========================================================

    def _predict_probability(
        self,
        model: Any,
        X: Any,
        default: float = 0.5
    ) -> float:

        if model is None:

            return default

        # ----------------------------------------------------
        # predict_proba
        # ----------------------------------------------------

        if hasattr(
            model,
            "predict_proba"
        ):

            probabilities = (
                model.predict_proba(X)
            )

            probabilities = np.asarray(
                probabilities
            )

            if probabilities.ndim == 2:

                if probabilities.shape[1] >= 2:

                    return float(
                        probabilities[0, 1]
                    )

                if probabilities.shape[1] == 1:

                    return float(
                        probabilities[0, 0]
                    )

            flattened = (
                probabilities
                .reshape(-1)
            )

            if len(flattened) > 0:

                return float(
                    flattened[0]
                )

        # ----------------------------------------------------
        # decision_function
        # ----------------------------------------------------

        if hasattr(
            model,
            "decision_function"
        ):

            score = (
                model
                .decision_function(X)
            )

            score = float(
                np.asarray(
                    score
                ).reshape(-1)[0]
            )

            probability = (
                1.0 /
                (
                    1.0 +
                    np.exp(-score)
                )
            )

            return float(
                probability
            )

        # ----------------------------------------------------
        # predict
        # ----------------------------------------------------

        if hasattr(
            model,
            "predict"
        ):

            prediction = (
                model.predict(X)
            )

            value = float(
                np.asarray(
                    prediction
                ).reshape(-1)[0]
            )

            return float(
                np.clip(
                    value,
                    0.0,
                    1.0
                )
            )

        return default


    # ========================================================
    # SAFE REGRESSION
    # ========================================================

    def _predict_value(
        self,
        model: Any,
        X: Any,
        default: float = 0.0
    ) -> float:

        if model is None:

            return default

        if not hasattr(
            model,
            "predict"
        ):

            return default

        prediction = (
            model.predict(X)
        )

        prediction = np.asarray(
            prediction
        ).reshape(-1)

        if len(prediction) == 0:

            return default

        value = float(
            prediction[0]
        )

        if not np.isfinite(value):

            return default

        return value


    # ========================================================
    # SEGMENT PREDICTION
    # ========================================================

    def _predict_segment(
        self,
        X: Any,
        customer: Dict[str, Any]
    ) -> str:

        if self.seg_model is None:

            return "Unknown"

        if not hasattr(
            self.seg_model,
            "predict"
        ):

            return "Unknown"

        prediction = (
            self.seg_model.predict(X)
        )

        prediction = np.asarray(
            prediction
        ).reshape(-1)

        if len(prediction) == 0:

            return "Unknown"

        segment = prediction[0]

        if isinstance(
            segment,
            np.generic
        ):

            segment = segment.item()

        # ----------------------------------------------------
        # String segment
        # ----------------------------------------------------

        if isinstance(
            segment,
            str
        ):

            return segment

        # ----------------------------------------------------
        # Numeric cluster
        # ----------------------------------------------------

        try:

            segment_id = int(
                segment
            )

        except Exception:

            return str(
                segment
            )

        return self._map_segment(
            segment_id,
            customer
        )


    # ========================================================
    # SEGMENT LABELING
    # ========================================================

    def _map_segment(
        self,
        segment_id: int,
        customer: Dict[str, Any]
    ) -> str:

        # ----------------------------------------------------
        # Custom labels
        # ----------------------------------------------------

        if hasattr(
            self.seg_model,
            "segment_labels_"
        ):

            try:

                labels = (
                    self.seg_model
                    .segment_labels_
                )

                return str(
                    labels[segment_id]
                )

            except Exception:

                pass

        # ----------------------------------------------------
        # Known Customer360 labels
        # ----------------------------------------------------

        segment_names = {

            0:
                "Potential High Value",

            1:
                "Loyal Customers",

            2:
                "At Risk",

            3:
                "Low Engagement",
        }

        if segment_id in segment_names:

            return segment_names[
                segment_id
            ]

        # ----------------------------------------------------
        # Dynamic business interpretation
        # ----------------------------------------------------

        monetary = float(
            customer.get(
                "monetary_total_spend",
                0
            )
        )

        frequency = float(
            customer.get(
                "frequency_purchases",
                0
            )
        )

        recency = float(
            customer.get(
                "recency_days",
                999
            )
        )

        if (
            monetary >= 50000
            and frequency >= 8
            and recency <= 30
        ):

            return "High Value"

        if recency >= 90:

            return "At Risk"

        if frequency >= 8:

            return "Loyal Customers"

        return "Emerging Customer"


    # ========================================================
    # EXPLANATIONS
    # ========================================================

    def _generate_explanations(
        self,
        customer: Dict[str, Any],
        churn_probability: float,
        purchase_propensity: float
    ):

        explanations = []

        recency = float(
            customer.get(
                "recency_days",
                0
            )
        )

        abandoned = float(
            customer.get(
                "cart_abandonments_30d",
                0
            )
        )

        engagement_change = float(
            customer.get(
                "engagement_change_pct",
                0
            )
        )

        monetary = float(
            customer.get(
                "monetary_total_spend",
                0
            )
        )

        frequency = float(
            customer.get(
                "frequency_purchases",
                0
            )
        )

        # ----------------------------------------------------
        # Recency
        # ----------------------------------------------------

        if recency >= 60:

            explanations.append({

                "feature":
                    "recency_days",

                "impact":
                    "high",

                "direction":
                    "negative",

                "reason":
                    (
                        "Customer has not purchased "
                        f"for {int(recency)} days."
                    ),

                "shap_value":
                    None,
            })

        elif recency >= 30:

            explanations.append({

                "feature":
                    "recency_days",

                "impact":
                    "medium",

                "direction":
                    "negative",

                "reason":
                    (
                        "Customer has not purchased "
                        f"for {int(recency)} days."
                    ),

                "shap_value":
                    None,
            })

        # ----------------------------------------------------
        # Abandoned carts
        # ----------------------------------------------------

        if abandoned >= 2:

            explanations.append({

                "feature":
                    "cart_abandonments_30d",

                "impact":
                    "medium",

                "direction":
                    "negative",

                "reason":
                    (
                        f"{int(abandoned)} cart(s) "
                        "abandoned in the last 30 days."
                    ),

                "shap_value":
                    None,
            })

        # ----------------------------------------------------
        # Engagement
        # ----------------------------------------------------

        if engagement_change <= -30:

            explanations.append({

                "feature":
                    "engagement_change_pct",

                "impact":
                    "high",

                "direction":
                    "negative",

                "reason":
                    (
                        "Engagement has decreased by "
                        f"{abs(engagement_change):.1f}%."
                    ),

                "shap_value":
                    None,
            })

        elif engagement_change < 0:

            explanations.append({

                "feature":
                    "engagement_change_pct",

                "impact":
                    "medium",

                "direction":
                    "negative",

                "reason":
                    (
                        "Engagement has decreased by "
                        f"{abs(engagement_change):.1f}%."
                    ),

                "shap_value":
                    None,
            })

        # ----------------------------------------------------
        # Monetary value
        # ----------------------------------------------------

        if monetary >= 10000:

            explanations.append({

                "feature":
                    "monetary_total_spend",

                "impact":
                    "medium",

                "direction":
                    "positive",

                "reason":
                    (
                        "Customer has meaningful lifetime "
                        f"spend of ₹{monetary:,.0f}."
                    ),

                "shap_value":
                    None,
            })

        # ----------------------------------------------------
        # Purchase frequency
        # ----------------------------------------------------

        if frequency >= 5:

            explanations.append({

                "feature":
                    "frequency_purchases",

                "impact":
                    "medium",

                "direction":
                    "positive",

                "reason":
                    (
                        f"Customer has made "
                        f"{int(frequency)} purchases."
                    ),

                "shap_value":
                    None,
            })

        # ----------------------------------------------------
        # Purchase opportunity
        # ----------------------------------------------------

        if purchase_propensity >= 0.70:

            explanations.append({

                "feature":
                    "purchase_propensity",

                "impact":
                    "high",

                "direction":
                    "positive",

                "reason":
                    (
                        "Customer shows strong purchase "
                        "intent based on behavioral signals."
                    ),

                "shap_value":
                    None,
            })

        # ----------------------------------------------------
        # Churn
        # ----------------------------------------------------

        if churn_probability >= 0.70:

            explanations.append({

                "feature":
                    "churn_probability",

                "impact":
                    "high",

                "direction":
                    "negative",

                "reason":
                    (
                        "Customer has a high predicted "
                        "churn probability."
                    ),

                "shap_value":
                    None,
            })

        return explanations[:6]


    # ========================================================
    # NEXT BEST ACTION
    # ========================================================

    def _generate_next_best_action(
        self,
        customer: Dict[str, Any],
        churn_probability: float,
        purchase_propensity: float
    ) -> Dict[str, Any]:

        abandoned = float(
            customer.get(
                "cart_abandonments_30d",
                0
            )
        )

        engagement_change = float(
            customer.get(
                "engagement_change_pct",
                0
            )
        )

        preferred_channel = str(
            customer.get(
                "preferred_channel",
                "email"
            )
        )

        preferred_category = str(
            customer.get(
                "preferred_category",
                "general"
            )
        )

        # ----------------------------------------------------
        # Priority
        # ----------------------------------------------------

        if (
            churn_probability >= 0.70
            or engagement_change <= -50
        ):

            priority = "high"

        elif (
            churn_probability >= 0.40
            or abandoned >= 2
            or purchase_propensity >= 0.70
            or engagement_change <= -30
        ):

            priority = "medium"

        else:

            priority = "low"

        # ----------------------------------------------------
        # Retention
        # ----------------------------------------------------

        if churn_probability >= 0.70:

            return {

                "action":
                    "Customer retention intervention",

                "reason":
                    (
                        "Customer has high churn risk "
                        "and requires immediate retention."
                    ),

                "recommended_offer":
                    "Personalized retention offer",

                "preferred_channel":
                    preferred_channel,

                "preferred_category":
                    preferred_category,

                "priority":
                    priority,
            }

        # ----------------------------------------------------
        # Cart recovery
        # ----------------------------------------------------

        if abandoned >= 2:

            return {

                "action":
                    "Abandoned cart recovery",

                "reason":
                    (
                        "Customer has multiple abandoned carts "
                        "and shows purchase opportunity."
                    ),

                "recommended_offer":
                    (
                        f"Recommend {preferred_category} "
                        "cart recovery offer"
                    ),

                "preferred_channel":
                    preferred_channel,

                "preferred_category":
                    preferred_category,

                "priority":
                    priority,
            }

        # ----------------------------------------------------
        # Conversion
        # ----------------------------------------------------

        if purchase_propensity >= 0.70:

            return {

                "action":
                    "Conversion acceleration",

                "reason":
                    (
                        "Customer demonstrates high "
                        "purchase intent."
                    ),

                "recommended_offer":
                    (
                        f"Personalized {preferred_category} "
                        "recommendation"
                    ),

                "preferred_channel":
                    preferred_channel,

                "preferred_category":
                    preferred_category,

                "priority":
                    priority,
            }

        # ----------------------------------------------------
        # Engagement
        # ----------------------------------------------------

        if engagement_change <= -30:

            return {

                "action":
                    "Engagement reactivation",

                "reason":
                    (
                        "Customer engagement has declined "
                        "significantly."
                    ),

                "recommended_offer":
                    "Personalized re-engagement campaign",

                "preferred_channel":
                    preferred_channel,

                "preferred_category":
                    preferred_category,

                "priority":
                    priority,
            }

        # ----------------------------------------------------
        # Default
        # ----------------------------------------------------

        return {

            "action":
                "Personalized product recommendation",

            "reason":
                (
                    "Customer has an opportunity for "
                    "continued engagement."
                ),

            "recommended_offer":
                (
                    f"Recommend products from "
                    f"{preferred_category}"
                ),

            "preferred_channel":
                preferred_channel,

            "preferred_category":
                preferred_category,

            "priority":
                priority,
        }


    # ========================================================
    # FALLBACK PREDICTION
    # ========================================================

    def _fallback_prediction(
        self,
        customer: Dict[str, Any]
    ) -> Dict[str, Any]:

        recency = float(
            customer.get(
                "recency_days",
                30
            )
        )

        frequency = float(
            customer.get(
                "frequency_purchases",
                5
            )
        )

        monetary = float(
            customer.get(
                "monetary_total_spend",
                25000
            )
        )

        abandoned = float(
            customer.get(
                "cart_abandonments_30d",
                2
            )
        )

        engagement_change = float(
            customer.get(
                "engagement_change_pct",
                -20
            )
        )

        website_visits = float(
            customer.get(
                "website_visits_30d",
                10
            )
        )

        # ----------------------------------------------------
        # Churn
        # ----------------------------------------------------

        churn_score = 0.15

        churn_score += min(
            recency / 180.0,
            0.45
        )

        churn_score += min(
            abandoned * 0.04,
            0.15
        )

        if engagement_change < 0:

            churn_score += min(
                abs(
                    engagement_change
                ) / 200.0,
                0.20
            )

        churn_probability = float(
            np.clip(
                churn_score,
                0.02,
                0.95
            )
        )

        # ----------------------------------------------------
        # Purchase propensity
        # ----------------------------------------------------

        propensity = 0.35

        propensity += min(
            frequency * 0.025,
            0.20
        )

        propensity += min(
            website_visits * 0.01,
            0.15
        )

        propensity += min(
            abandoned * 0.04,
            0.10
        )

        if engagement_change > 0:

            propensity += min(
                engagement_change / 200.0,
                0.15
            )

        purchase_propensity = float(
            np.clip(
                propensity,
                0.02,
                0.95
            )
        )

        # ----------------------------------------------------
        # CLV
        # ----------------------------------------------------

        estimated_clv = float(
            max(
                monetary * 2.5,
                monetary
            )
        )

        # ----------------------------------------------------
        # Segment
        # ----------------------------------------------------

        if (
            monetary >= 50000
            and frequency >= 8
        ):

            segment = "High Value"

        elif churn_probability >= 0.65:

            segment = "At Risk"

        elif frequency >= 6:

            segment = "Loyal Customers"

        else:

            segment = "Potential High Value"

        # ----------------------------------------------------
        # Explanations
        # ----------------------------------------------------

        explanations = (
            self._generate_explanations(
                customer,
                churn_probability,
                purchase_propensity
            )
        )

        # ----------------------------------------------------
        # NBA
        # ----------------------------------------------------

        nba = (
            self._generate_next_best_action(
                customer,
                churn_probability,
                purchase_propensity
            )
        )

        return {

            "customer_id":
                customer.get(
                    "customer_id",
                    "CUST001"
                ),

            "segment":
                segment,

            "churn_probability":
                round(
                    churn_probability,
                    4
                ),

            "churn_risk_pct":
                round(
                    churn_probability * 100,
                    1
                ),

            "purchase_propensity":
                round(
                    purchase_propensity,
                    4
                ),

            "purchase_intent_pct":
                round(
                    purchase_propensity * 100,
                    1
                ),

            "estimated_clv":
                round(
                    estimated_clv,
                    2
                ),

            "shap_explanations":
                explanations,

            "explanation_type":
                "rule_based_fallback",

            "next_best_action":
                nba,

            "inference_mode":
                "fallback",
        }


    # ========================================================
    # MAIN PREDICTION FUNCTION
    # ========================================================

    def predict_customer_decision(
        self,
        customer_dict: Dict[str, Any]
    ) -> Dict[str, Any]:

        # ----------------------------------------------------
        # Normalize input
        # ----------------------------------------------------

        customer = (
            self._normalize_customer(
                customer_dict
            )
        )

        # ----------------------------------------------------
        # Fallback if models unavailable
        # ----------------------------------------------------

        if not self.loaded:

            print(
                "[Inference] "
                "Service is currently in fallback mode."
            )

            return (
                self._fallback_prediction(
                    customer
                )
            )

        # ----------------------------------------------------
        # Create DataFrame
        # ----------------------------------------------------

        df = (
            self._create_dataframe(
                customer
            )
        )

        try:

            print(
                "\n[Inference] "
                "Starting trained-model inference..."
            )

            # =================================================
            # FEATURE ENGINEERING
            # =================================================

            X = (
                self._transform_features(
                    df
                )
            )

            print(
                "[Inference] "
                "Feature transformation successful."
            )

            # =================================================
            # CHURN
            # =================================================

            churn_probability = (
                self._predict_probability(
                    self.churn_model,
                    X,
                    default=0.5
                )
            )

            churn_probability = float(
                np.clip(
                    churn_probability,
                    0.0,
                    1.0
                )
            )

            print(
                "[Inference] "
                f"Churn probability: "
                f"{churn_probability:.4f}"
            )

            # =================================================
            # PURCHASE PROPENSITY
            # =================================================

            purchase_propensity = (
                self._predict_probability(
                    self.prop_model,
                    X,
                    default=0.5
                )
            )

            purchase_propensity = float(
                np.clip(
                    purchase_propensity,
                    0.0,
                    1.0
                )
            )

            print(
                "[Inference] "
                f"Purchase propensity: "
                f"{purchase_propensity:.4f}"
            )

            # =================================================
            # CLV
            # =================================================

            default_clv = float(
                customer.get(
                    "monetary_total_spend",
                    0
                )
            )

            estimated_clv = (
                self._predict_value(
                    self.clv_model,
                    X,
                    default=default_clv
                )
            )

            estimated_clv = max(
                0.0,
                estimated_clv
            )

            print(
                "[Inference] "
                f"Estimated CLV: "
                f"₹{estimated_clv:,.2f}"
            )

            # =================================================
            # SEGMENT
            # =================================================

            segment = (
                self._predict_segment(
                    X,
                    customer
                )
            )

            print(
                "[Inference] "
                f"Segment: {segment}"
            )

            # =================================================
            # EXPLANATIONS
            # =================================================

            explanations = (
                self._generate_explanations(
                    customer,
                    churn_probability,
                    purchase_propensity
                )
            )

            # =================================================
            # NEXT BEST ACTION
            # =================================================

            nba = (
                self._generate_next_best_action(
                    customer,
                    churn_probability,
                    purchase_propensity
                )
            )

            # =================================================
            # RESPONSE
            # =================================================

            result = {

                "customer_id":
                    customer.get(
                        "customer_id",
                        "CUST001"
                    ),

                "segment":
                    segment,

                "churn_probability":
                    round(
                        churn_probability,
                        4
                    ),

                "churn_risk_pct":
                    round(
                        churn_probability * 100,
                        1
                    ),

                "purchase_propensity":
                    round(
                        purchase_propensity,
                        4
                    ),

                "purchase_intent_pct":
                    round(
                        purchase_propensity * 100,
                        1
                    ),

                "estimated_clv":
                    round(
                        estimated_clv,
                        2
                    ),

                "shap_explanations":
                    explanations,

                "explanation_type":
                    "rule_based",

                "next_best_action":
                    nba,

                "inference_mode":
                    "trained_artifacts",
            }

            print(
                "[Inference] "
                "Trained-model inference completed."
            )

            return result

        except Exception as e:

            # ------------------------------------------------
            # IMPORTANT
            # ------------------------------------------------
            # Do not pretend trained inference succeeded.
            # ------------------------------------------------

            print(
                "\n" + "=" * 70
            )

            print(
                "[Inference ERROR]"
            )

            print(
                f"Type: {type(e).__name__}"
            )

            print(
                f"Message: {e}"
            )

            print(
                "=" * 70
            )

            print(
                "[Inference] "
                "Switching this request to fallback."
            )

            fallback_result = (
                self._fallback_prediction(
                    customer
                )
            )

            fallback_result[
                "inference_error"
            ] = str(e)

            fallback_result[
                "inference_error_type"
            ] = type(e).__name__

            return fallback_result


# ============================================================
# GLOBAL INFERENCE SERVICE
# ============================================================
#
# THIS IS REQUIRED BY app.py:
#
# from ml.inference.unified_inference import inference_service
#
# ============================================================

inference_service = (
    UnifiedMLInferenceService()
)


# ============================================================
# LOCAL TEST
# ============================================================

if __name__ == "__main__":

    import json

    print(
        "\nRunning Customer360 local inference test..."
    )

    test_customer = {

        "customer_id":
            "CUST001",

        "name":
            "Test Customer",

        "recency_days":
            30,

        "frequency_purchases":
            5,

        "monetary_total_spend":
            25000,

        "website_visits_30d":
            10,

        "product_views_30d":
            20,

        "cart_additions_30d":
            4,

        "cart_abandonments_30d":
            2,

        "support_tickets_30d":
            1,

        "engagement_change_pct":
            -20,

        "preferred_channel":
            "email",

        "preferred_category":
            "electronics",

        "avg_order_value":
            5000,

        "email_opens_30d":
            8,

        "email_clicks_30d":
            3,

        "return_rate":
            0.05,

        "discount_dependency_ratio":
            0.30,

        "spend_30d":
            5000,

        "spend_90d":
            15000,

        "purchase_velocity":
            0.16,
    }

    result = (
        inference_service
        .predict_customer_decision(
            test_customer
        )
    )

    print(
        "\n" + "=" * 70
    )

    print(
        "FINAL RESULT"
    )

    print(
        "=" * 70
    )

    print(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False,
            default=str
        )
    )
