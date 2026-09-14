export interface ResponseEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface CustomerProfile {
  id: string;
  external_customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  acquisition_channel: string;
  customer_status: string;
  recency_days?: number;
  monetary_value?: number;
  churn_probability?: number;
  churn_risk_pct?: number;
  next_best_action?: string;
  preferred_category?: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomerFeatures {
  id?: string;
  customer_id: string;
  recency_days: number;
  frequency_count: number;
  monetary_value: number;
  days_inactive: number;
  engagement_score: number;
  cart_abandonment_count: number;
  average_order_value: number;
  estimated_clv: number;
  updated_at: string;
}

export interface SegmentRead {
  id: string;
  name: string;
  description?: string;
}

export interface PredictionSummary {
  id?: string;
  customer_id?: string;
  model_name: string;
  model_version: string;
  prediction_type: string;
  score: number;
  predicted_class?: string;
  confidence?: number;
  created_at: string;
}

export interface ShapDriver {
  feature_name: string;
  feature_value?: any;
  contribution: number;
  rank: number;
  direction: 'positive' | 'negative' | string;
  reason?: string;
}

export interface ActionOutcomeRead {
  id: string;
  action_id?: string;
  delivered: boolean;
  opened: boolean;
  clicked: boolean;
  purchased: boolean;
  converted: boolean;
  churned?: boolean;
  revenue: number;
  executed_at?: string;
}

export interface ActionSummary {
  id: string;
  customer_id?: string;
  action: string;
  action_type: string;
  reason: string;
  recommended_offer?: string;
  offer?: string;
  preferred_channel?: string;
  channel: string;
  preferred_category?: string;
  product?: string;
  priority?: string;
  score: number;
  timing?: string;
  message?: string;
  objective?: string;
  rank?: number;
  status: 'PENDING' | 'EXECUTED' | 'DISMISSED' | string;
  created_at: string;
  outcome?: ActionOutcomeRead | null;
}

export interface TransactionRead {
  id: string;
  customer_id: string;
  reference_id?: string;
  product_name: string;
  category: string;
  amount: number;
  quantity: number;
  transaction_time: string;
  channel?: string;
  status?: string;
}

export interface InteractionRead {
  id: string;
  customer_id: string;
  event_type: string;
  event_value?: string;
  metadata_json?: any;
  timestamp: string;
}

export interface CustomerActionFeedbackRead {
  total_actions: number;
  pending_actions: number;
  executed_actions: number;
  dismissed_actions: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  ctr: number;
  conversion_rate: number;
  total_revenue: number;
  average_revenue_per_converted: number;
}

export interface Customer360Read {
  profile: CustomerProfile;
  features: CustomerFeatures | null;
  segments: SegmentRead[];
  predictions: Record<string, PredictionSummary>;
  shap_drivers: ShapDriver[];
  next_best_action: ActionSummary | null;
  recent_transactions: TransactionRead[];
  recent_interactions: InteractionRead[];
  action_history: ActionSummary[];
  action_feedback: CustomerActionFeedbackRead | null;
}

export interface CustomerDecisionRead {
  profile: CustomerProfile;
  segments: SegmentRead[];
  churn_probability: number | null;
  purchase_propensity: number | null;
  clv: number | null;
  shap_explanations: ShapDriver[];
  next_best_action: ActionSummary | null;
  decision_trace: string[];
}

export interface CreateCustomerInput {
  external_customer_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  acquisition_channel?: string;
  customer_status?: string;
  recency_days?: number;
  frequency_count?: number;
  monetary_value?: number;
  cart_abandonment_count?: number;
}

export interface UpdateCustomerInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: string;
  acquisition_channel?: string;
  customer_status?: string;
}

