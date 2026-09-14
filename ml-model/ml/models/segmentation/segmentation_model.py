import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

BUSINESS_SEGMENTS = [
    "High Value Loyal",
    "High Value At Risk",
    "High Intent",
    "Low Value Active",
    "Dormant"
]

class CustomerSegmentationModel:
    def __init__(self, n_clusters=5, random_state=42):
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.kmeans = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
        self.cluster_to_segment_map = {}

    def fit(self, X: pd.DataFrame, df_raw: pd.DataFrame = None):
        X_scaled = self.scaler.fit_transform(X)
        cluster_labels = self.kmeans.fit_predict(X_scaled)
        
        if df_raw is not None:
            df_temp = df_raw.copy()
            df_temp['cluster'] = cluster_labels
            
            cluster_stats = df_temp.groupby('cluster').agg({
                'monetary_total_spend': 'mean',
                'recency_days': 'mean',
                'product_views_30d': 'mean'
            })
            
            assigned = {}
            loyal_idx = cluster_stats.sort_values(by=['monetary_total_spend', 'recency_days'], ascending=[False, True]).index[0]
            assigned[loyal_idx] = "High Value Loyal"
            
            at_risk_candidates = cluster_stats.drop(index=[loyal_idx])
            at_risk_idx = at_risk_candidates.sort_values(by=['recency_days', 'monetary_total_spend'], ascending=[False, False]).index[0]
            assigned[at_risk_idx] = "High Value At Risk"
            
            intent_candidates = cluster_stats.drop(index=list(assigned.keys()))
            intent_idx = intent_candidates.sort_values(by='product_views_30d', ascending=False).index[0]
            assigned[intent_idx] = "High Intent"
            
            dormant_candidates = cluster_stats.drop(index=list(assigned.keys()))
            dormant_idx = dormant_candidates.sort_values(by=['recency_days', 'monetary_total_spend'], ascending=[True, True]).index[0]
            assigned[dormant_idx] = "Dormant"
            
            remaining = [c for c in range(self.n_clusters) if c not in assigned]
            if remaining:
                assigned[remaining[0]] = "Low Value Active"
                
            self.cluster_to_segment_map = assigned
        else:
            self.cluster_to_segment_map = {i: BUSINESS_SEGMENTS[i % len(BUSINESS_SEGMENTS)] for i in range(self.n_clusters)}

        return self

    def predict(self, X: pd.DataFrame) -> list[str]:
        X_scaled = self.scaler.transform(X)
        clusters = self.kmeans.predict(X_scaled)
        return [self.cluster_to_segment_map.get(c, "Low Value Active") for c in clusters]
