import numpy as np
import pandas as pd
from xgboost import XGBClassifier

class ChurnPredictionModel:
    def __init__(self, use_xgboost=True, random_state=42):
        self.use_xgboost = use_xgboost
        self.model = XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.08,
            random_state=random_state,
            eval_metric="logloss"
        )

    def fit(self, X: pd.DataFrame, y: pd.Series):
        self.model.fit(X, y)
        return self

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict_proba(X)[:, 1]

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        return self.model.predict(X)
