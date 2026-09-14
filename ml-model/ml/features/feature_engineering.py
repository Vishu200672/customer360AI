import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "recency_days",
    "frequency_purchases",
    "monetary_total_spend",
    "avg_order_value",
    "website_visits_30d",
    "product_views_30d",
    "cart_additions_30d",
    "cart_abandonments_30d",
    "email_opens_30d",
    "email_clicks_30d",
    "support_tickets_30d",
    "engagement_change_pct",
    "return_rate",
    "discount_dependency_ratio",
    "spend_30d",
    "spend_90d",
    "purchase_velocity",
    "cart_abandon_ratio",
    "email_click_ratio",
    "rfm_score"
]

class CustomerFeatureEngineer:
    def __init__(self):
        pass

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        for col in FEATURE_COLUMNS:
            if col not in df.columns:
                df[col] = 0.0

        cart_additions = df["cart_additions_30d"].replace(0, 1)
        df["cart_abandon_ratio"] = (df["cart_abandonments_30d"] / cart_additions).clip(0, 1.0)
        
        email_opens = df["email_opens_30d"].replace(0, 1)
        df["email_click_ratio"] = (df["email_clicks_30d"] / email_opens).clip(0, 1.0)
        
        if len(df) > 5:
            try:
                recency_score = pd.qcut(df["recency_days"], q=5, labels=[5, 4, 3, 2, 1], duplicates='drop').astype(float)
            except Exception:
                recency_score = df["recency_days"].apply(lambda r: 5.0 if r <= 14 else (4.0 if r <= 30 else (3.0 if r <= 60 else (2.0 if r <= 90 else 1.0))))
                
            try:
                freq_score = pd.qcut(df["frequency_purchases"].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5]).astype(float)
            except Exception:
                freq_score = df["frequency_purchases"].apply(lambda f: min(5.0, max(1.0, float(f) / 4.0)))

            try:
                monetary_score = pd.qcut(df["monetary_total_spend"].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5]).astype(float)
            except Exception:
                monetary_score = df["monetary_total_spend"].apply(lambda m: min(5.0, max(1.0, float(m) / 8000.0)))
        else:
            recency_score = df["recency_days"].apply(lambda r: 5.0 if r <= 14 else (4.0 if r <= 30 else (3.0 if r <= 60 else (2.0 if r <= 90 else 1.0))))
            freq_score = df["frequency_purchases"].apply(lambda f: min(5.0, max(1.0, float(f) / 4.0)))
            monetary_score = df["monetary_total_spend"].apply(lambda m: min(5.0, max(1.0, float(m) / 8000.0)))

        df["rfm_score"] = (recency_score * 0.35 + freq_score * 0.35 + monetary_score * 0.30)
        
        return df[FEATURE_COLUMNS]
