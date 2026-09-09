import numpy as np
import pandas as pd
from xgboost import XGBRegressor

class CustomerLifetimeValueModel:
    def __init__(self, use_xgboost=True, random_state=42):
        self.use_xgboost = use_xgboost
        self.model = XGBRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.08,
            random_state=random_state
        )

    def fit(self, X: pd.DataFrame, y: pd.Series):
        self.model.fit(X, y)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        preds = self.model.predict(X)
        return np.maximum(500.0, preds)
