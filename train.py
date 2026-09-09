import os
import sys

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, mean_squared_error, silhouette_score

from ml.features.feature_engineering import CustomerFeatureEngineer, FEATURE_COLUMNS
from ml.models.segmentation.segmentation_model import CustomerSegmentationModel
from ml.models.churn.churn_model import ChurnPredictionModel
from ml.models.propensity.propensity_model import PurchasePropensityModel
from ml.models.clv.clv_model import CustomerLifetimeValueModel
from ml.explainability.shap_explainer import ShapExplainabilityEngine
from scripts.generate_dataset import generate_customer_dataset

ARTIFACTS_DIR = os.path.join(PROJECT_ROOT, "ml", "models", "artifacts")

def train_pipeline():
    print("=== [1/5] Loading or Generating Training Data ===")
    dataset_path = os.path.join(PROJECT_ROOT, "ml", "data", "customer_signals.csv")
    if not os.path.exists(dataset_path):
        df_raw = generate_customer_dataset(500)
    else:
        df_raw = pd.read_csv(dataset_path)

    print("=== [2/5] Engineering Features ===")
    feature_engineer = CustomerFeatureEngineer()
    X = feature_engineer.transform(df_raw)
    y_churn = df_raw["churn_label"]
    y_intent = df_raw["purchase_intent_label"]
    y_clv = df_raw["clv"]

    X_train, X_test, y_churn_train, y_churn_test = train_test_split(X, y_churn, test_size=0.2, random_state=42)
    _, _, y_intent_train, y_intent_test = train_test_split(X, y_intent, test_size=0.2, random_state=42)
    _, _, y_clv_train, y_clv_test = train_test_split(X, y_clv, test_size=0.2, random_state=42)

    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    print("=== [3/5] Training Models ===")
    # 1. Segmentation
    print(" -> Training Segmentation Model (K-Means)...")
    seg_model = CustomerSegmentationModel(n_clusters=5)
    seg_model.fit(X, df_raw)
    sil_score = silhouette_score(seg_model.scaler.transform(X_test), seg_model.kmeans.predict(seg_model.scaler.transform(X_test)))
    print(f"    Segmentation Silhouette Score: {sil_score:.4f}")

    # 2. Churn Model
    print(" -> Training Churn Prediction Model (XGBoost)...")
    churn_model = ChurnPredictionModel(use_xgboost=True)
    churn_model.fit(X_train, y_churn_train)
    churn_preds_prob = churn_model.predict_proba(X_test)
    churn_auc = roc_auc_score(y_churn_test, churn_preds_prob)
    print(f"    Churn Model ROC-AUC: {churn_auc:.4f}")

    # 3. Propensity Model
    print(" -> Training Purchase Propensity Model (XGBoost)...")
    prop_model = PurchasePropensityModel(use_xgboost=True)
    prop_model.fit(X_train, y_intent_train)
    prop_preds_prob = prop_model.predict_proba(X_test)
    prop_auc = roc_auc_score(y_intent_test, prop_preds_prob)
    print(f"    Purchase Propensity ROC-AUC: {prop_auc:.4f}")

    # 4. CLV Model
    print(" -> Training Customer Lifetime Value Model...")
    clv_model = CustomerLifetimeValueModel(use_xgboost=True)
    clv_model.fit(X_train, y_clv_train)
    clv_preds = clv_model.predict(X_test)
    clv_rmse = np.sqrt(mean_squared_error(y_clv_test, clv_preds))
    print(f"    CLV Model RMSE: Rs.{clv_rmse:,.2f}")

    print("=== [4/5] Testing SHAP Explainer Initialization ===")
    shap_engine = ShapExplainabilityEngine(churn_model.model, FEATURE_COLUMNS)
    test_exp = shap_engine.explain_instance(X_test.iloc[[0]])
    print(f"    SHAP Explainer initialized successfully ({len(test_exp)} feature attributions).")

    print("=== [5/5] Serializing Artifacts ===")
    joblib.dump(feature_engineer, os.path.join(ARTIFACTS_DIR, "feature_engineer.joblib"))
    joblib.dump(seg_model, os.path.join(ARTIFACTS_DIR, "seg_model.joblib"))
    joblib.dump(churn_model, os.path.join(ARTIFACTS_DIR, "churn_model.joblib"))
    joblib.dump(prop_model, os.path.join(ARTIFACTS_DIR, "prop_model.joblib"))
    joblib.dump(clv_model, os.path.join(ARTIFACTS_DIR, "clv_model.joblib"))

    print(f"\n[SUCCESS] All models trained & saved successfully to '{ARTIFACTS_DIR}'!")

if __name__ == "__main__":
    train_pipeline()
