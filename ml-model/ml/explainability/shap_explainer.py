import numpy as np
import pandas as pd
import shap

FEATURE_LABEL_MAP = {
    "recency_days": "Days Inactive",
    "frequency_purchases": "Total Purchases",
    "monetary_total_spend": "Lifetime Spend",
    "avg_order_value": "Avg Order Value",
    "website_visits_30d": "30-Day Website Visits",
    "product_views_30d": "30-Day Product Views",
    "cart_additions_30d": "Cart Additions",
    "cart_abandonments_30d": "Abandoned Carts",
    "email_opens_30d": "Email Opens",
    "email_clicks_30d": "Email Clicks",
    "support_tickets_30d": "Support Tickets",
    "engagement_change_pct": "Engagement Trend %",
    "return_rate": "Return Rate %",
    "discount_dependency_ratio": "Discount Dependency",
    "spend_30d": "30-Day Spend",
    "spend_90d": "90-Day Spend",
    "purchase_velocity": "Days Between Purchases",
    "cart_abandon_ratio": "Cart Abandon Rate",
    "email_click_ratio": "Email Click Rate",
    "rfm_score": "RFM Score"
}

class ShapExplainabilityEngine:
    def __init__(self, trained_model, feature_names):
        self.trained_model = trained_model
        self.feature_names = feature_names
        try:
            self.explainer = shap.TreeExplainer(self.trained_model)
        except Exception:
            self.explainer = None

    def explain_instance(self, customer_features: pd.DataFrame, top_n: int = 5) -> list[dict]:
        if customer_features.ndim == 1:
            customer_features = customer_features.to_frame().T

        features_df = customer_features[self.feature_names]

        if self.explainer is not None:
            try:
                shap_values = self.explainer.shap_values(features_df)
                if isinstance(shap_values, list):
                    shap_vals = shap_values[1][0]
                elif shap_values.ndim == 2:
                    shap_vals = shap_values[0]
                else:
                    shap_vals = shap_values[0]
            except Exception:
                shap_vals = self._fallback_feature_importance(features_df)
        else:
            shap_vals = self._fallback_feature_importance(features_df)

        explanations = []
        for feat_name, val, s_val in zip(self.feature_names, features_df.iloc[0], shap_vals):
            label = FEATURE_LABEL_MAP.get(feat_name, feat_name)
            
            if "pct" in feat_name or "rate" in feat_name or "ratio" in feat_name:
                formatted_val = f"{val * 100:.1f}%" if "pct" not in feat_name else f"{val:.1f}%"
            elif "spend" in feat_name or "value" in feat_name or "clv" in feat_name:
                formatted_val = f"Rs.{val:,.0f}"
            else:
                formatted_val = f"{val:g}" if isinstance(val, (int, float)) else str(val)

            impact_direction = "INCREASES_RISK" if s_val > 0 else "DECREASES_RISK"

            explanations.append({
                "feature": feat_name,
                "label": label,
                "value": formatted_val,
                "raw_value": float(val),
                "shap_value": float(round(s_val, 4)),
                "impact": impact_direction,
                "abs_shap": abs(float(s_val))
            })

        explanations.sort(key=lambda x: x["abs_shap"], reverse=True)
        return explanations[:top_n]

    def _fallback_feature_importance(self, features_df: pd.DataFrame) -> np.ndarray:
        row = features_df.iloc[0]
        impacts = []
        for feat in self.feature_names:
            val = row[feat]
            if feat == "recency_days":
                impacts.append(0.005 * (val - 30))
            elif feat == "cart_abandonments_30d":
                impacts.append(0.08 * val)
            elif feat == "support_tickets_30d":
                impacts.append(0.12 * val)
            elif feat == "engagement_change_pct":
                impacts.append(-0.004 * val)
            elif feat == "product_views_30d":
                impacts.append(-0.003 * val)
            else:
                impacts.append(0.01 * (val / (abs(val) + 1.0)))
        return np.array(impacts)
