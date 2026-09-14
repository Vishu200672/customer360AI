import axios from 'axios';
import { config } from '../config/env.js';
import { CustomerProfile, CustomerFeatures } from '../types/index.js';

export interface MLPredictionOutput {
  customer_id: string;
  segment: string;
  churn_probability: number;
  churn_risk_pct: number;
  purchase_propensity: number;
  purchase_intent_pct: number;
  estimated_clv: number;
  shap_explanations: Array<{
    feature: string;
    impact: string;
    direction: string;
    reason: string;
    shap_value: number | null;
  }>;
  explanation_type: string;
  next_best_action?: {
    action: string;
    reason: string;
    recommended_offer: string;
    preferred_channel: string;
    preferred_category: string;
    priority: string;
  } | null;
  inference_mode: string;
}

export class MLClient {
  async predict(profile: CustomerProfile, features: CustomerFeatures): Promise<MLPredictionOutput> {
    const recency = features.recency_days || 10;
    const cartAbandons = features.cart_abandonment_count || 0;
    const isHighRecency = recency > 30 || cartAbandons > 2;

    if (config.mlMode === 'remote') {
      try {
        const payload = {
          customer_id: profile.external_customer_id || profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          recency_days: recency,
          frequency_purchases: features.frequency_count || 1,
          monetary_total_spend: Number(features.monetary_value || 1000),
          website_visits_30d: isHighRecency ? Math.max(1, Math.floor(15 - recency / 5)) : Math.max(12, (features.frequency_count || 5) * 2),
          product_views_30d: isHighRecency ? Math.max(2, Math.floor(35 - recency / 2)) : Math.max(30, (features.frequency_count || 5) * 5),
          cart_additions_30d: isHighRecency ? Math.max(0, cartAbandons) : cartAbandons + 4,
          cart_abandonments_30d: cartAbandons,
          support_tickets_30d: isHighRecency || cartAbandons > 2 ? 3 : 0,
          engagement_change_pct: isHighRecency ? -Math.min(65.0, Number((recency * 0.8).toFixed(1))) : (features.engagement_score < 0.4 ? -25.0 : 12.5),
          preferred_channel: profile.acquisition_channel || 'Email',
          preferred_category: profile.preferred_category || 'Electronics',
        };

        const res = await axios.post<MLPredictionOutput>(
          `${config.mlServiceUrl}/demo-predict`,
          payload,
          { timeout: config.mlRequestTimeoutMs }
        );

        if (res.status === 200 && res.data && !('error' in res.data)) {
          return res.data;
        }
      } catch (error) {
        // Fall back gracefully to local deterministic heuristic if remote HF Space is sleeping
      }
    }

    // Local deterministic heuristic prediction
    const engagement = Number(features.engagement_score);

    let churnProb = 0.12;
    if (recency > 45 || (recency > 30 && cartAbandons > 2) || engagement < 0.4) {
      churnProb = 0.784;
    } else if (recency > 30 || cartAbandons > 1) {
      churnProb = 0.485;
    } else {
      churnProb = Math.min(0.25, Math.max(0.01, Number((0.02 + recency * 0.005).toFixed(3))));
    }

    const propensity = churnProb > 0.5 ? 0.245 : 0.85;

    return {
      customer_id: profile.external_customer_id || profile.id,
      segment: churnProb > 0.5 ? 'At Risk of Churn' : (recency > 30 ? 'Dormant' : 'High Value Loyal'),
      churn_probability: churnProb,
      churn_risk_pct: Math.round(churnProb * 1000) / 10,
      purchase_propensity: propensity,
      purchase_intent_pct: Math.round(propensity * 1000) / 10,
      estimated_clv: Number(features.estimated_clv) || 68500.0,
      shap_explanations: [
        {
          feature: 'recency_days',
          impact: 'high',
          direction: 'positive',
          reason: `Customer has not purchased for ${recency} days.`,
          shap_value: null,
        },
        {
          feature: 'cart_abandonment_count',
          impact: 'medium',
          direction: 'positive',
          reason: `Recorded ${cartAbandons} abandoned carts.`,
          shap_value: null,
        },
      ],
      explanation_type: 'rule_based',
      next_best_action:
        churnProb > 0.5
          ? {
              action: 'Retention VIP Concierge Pass & Re-engagement Campaign',
              reason: 'Customer exhibits high churn risk paired with high CLV and abandoned carts.',
              recommended_offer: '20% VIP Re-engagement Discount',
              preferred_channel: profile.acquisition_channel || 'WhatsApp',
              preferred_category: profile.preferred_category || 'Electronics',
              priority: 'high',
            }
          : {
              action: 'Enterprise Tier Upsell & Exclusive Preview',
              reason: 'High purchase intent and active account usage.',
              recommended_offer: 'Pro Analytics Annual Upgrade',
              preferred_channel: profile.acquisition_channel || 'Email',
              preferred_category: profile.preferred_category || 'Electronics',
              priority: 'medium',
            },
      inference_mode: 'local_fallback',
    };
  }
}
