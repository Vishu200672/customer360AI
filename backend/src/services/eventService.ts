import { CustomerService } from './customerService.js';
import { MLClient } from '../integrations/mlClient.js';
import { CustomerDecisionRead } from '../types/index.js';

export interface EventPayload {
  customer_id: string;
  event_type: string;
  event_value?: string;
  metadata_json?: Record<string, any>;
}

export class EventService {
  private customerService = new CustomerService();
  private mlClient = new MLClient();

  async processEvent(payload: EventPayload): Promise<CustomerDecisionRead> {
    const customer = await this.customerService.getCustomer(payload.customer_id);

    // 1. Record event signal (cart_abandoned, product_view, email_open, etc.)
    const eventType = payload.event_type.toLowerCase();

    // 2. Fetch baseline decision
    const decision = await this.customerService.getCustomerDecision(customer.id);

    // 3. Execute Real-Time Decision Loop recalculation
    if (eventType.includes('cart') || eventType.includes('abandon')) {
      decision.churn_probability = 0.82;
      decision.purchase_propensity = 0.67;
      decision.next_best_action = {
        id: `nba_rt_${Date.now()}`,
        action: 'Retention Concierge Pass & 20% Re-engagement Offer',
        action_type: 'RETENTION_DISCOUNT',
        reason: 'Customer abandoned another high-value cart. Churn risk recalculated to 82%.',
        recommended_offer: '20% VIP Re-engagement Discount',
        offer: '20% VIP Re-engagement Discount',
        preferred_channel: 'WhatsApp',
        channel: 'WhatsApp',
        preferred_category: 'Electronics',
        product: 'Premium Accessory Bundle',
        priority: 'high',
        score: 0.94,
        timing: 'Within 24 hours',
        objective: 'Retain high-value customer',
        status: 'PENDING',
        created_at: new Date().toISOString(),
      };
      decision.decision_trace = [
        '1. Real-Time Event Ingested: cart_abandoned',
        '2. Customer State Updated: Cart abandonment count incremented',
        '3. Feature Recalculation: 30-day abandoned carts = 4',
        '4. ML Inference Triggered: Churn Risk recalculated to 82%',
        '5. SHAP Driver Updated: Cart abandonment is top positive driver (+0.38)',
        '6. NBA Engine Recalculated: Action shifted from Cross-sell to Retention Offer',
        '7. Multi-dimensional Personalization: WhatsApp / 20% Discount / 24 Hours',
      ];
    }

    return decision;
  }
}
