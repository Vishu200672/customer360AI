import { ActionSummary, ActionOutcomeRead } from '../types/index.js';

export interface DispatchMessagePayload {
  customer_id?: string;
  action_id?: string;
  channel: 'WhatsApp' | 'Email' | 'SMS' | string;
  recipient?: string;
  offer?: string;
  message_body?: string;
}

export interface DispatchReceipt {
  dispatch_id: string;
  customer_id: string;
  channel: string;
  recipient: string;
  gateway: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED';
  message_body: string;
  offer: string;
  delivered_at: string;
  latency_ms: number;
}

export interface FeedbackPayload {
  customer_id: string;
  action_id: string;
  response: string;
  revenue?: number;
}

export class ActionService {
  // In-memory store for active dispatch receipts and action states
  private dispatchLogs: DispatchReceipt[] = [];

  async getLatestAction(customerId: string): Promise<ActionSummary> {
    return {
      id: `nba_${customerId}`,
      customer_id: customerId,
      action: 'Retention VIP Concierge Pass & Re-engagement Campaign',
      action_type: 'RETENTION_DISCOUNT',
      reason: 'Customer exhibits 78.4% churn risk paired with high CLV ($68.5k).',
      recommended_offer: '20% VIP Re-engagement Discount',
      offer: '20% VIP Re-engagement Discount',
      preferred_channel: 'WhatsApp',
      channel: 'WhatsApp',
      preferred_category: 'Electronics',
      product: 'Premium Electronics Suite',
      priority: 'high',
      score: 0.92,
      timing: 'Within 24 hours',
      objective: 'Prevent immediate high-value customer churn',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
  }

  async updateActionStatus(actionId: string, status: string): Promise<ActionSummary> {
    return {
      id: actionId,
      action: 'Retention VIP Concierge Pass',
      action_type: 'RETENTION_DISCOUNT',
      reason: 'Customer exhibits high churn risk.',
      channel: 'WhatsApp',
      score: 0.92,
      status: status.toUpperCase(),
      created_at: new Date().toISOString(),
    };
  }

  async executeAction(actionId: string): Promise<ActionSummary & { dispatch_receipt?: DispatchReceipt }> {
    const updated = await this.updateActionStatus(actionId, 'EXECUTED');
    const receipt = await this.dispatchMessage({
      action_id: actionId,
      channel: 'WhatsApp',
      offer: '20% VIP Re-engagement Discount',
      message_body: 'Hi, Customer360 AI has generated an exclusive 20% Retention Discount for your next order! Use code: C360-VIP20',
    });
    return {
      ...updated,
      dispatch_receipt: receipt,
    };
  }

  async dispatchMessage(payload: DispatchMessagePayload): Promise<DispatchReceipt> {
    const channel = payload.channel || 'WhatsApp';
    let gateway = 'Customer360 Omnichannel Engine';
    let recipient = payload.recipient || 'customer@enterprise.io';

    if (channel.toLowerCase().includes('whatsapp')) {
      gateway = 'WhatsApp Business Cloud API (Meta)';
      if (!payload.recipient) recipient = '+1 (555) 928-1002';
    } else if (channel.toLowerCase().includes('email')) {
      gateway = 'SendGrid Transactional Email Gateway';
      if (!payload.recipient) recipient = 'customer.vip@nexus.in';
    } else if (channel.toLowerCase().includes('sms')) {
      gateway = 'Twilio SMS Gateway';
      if (!payload.recipient) recipient = '+1 (555) 349-2019';
    }

    const receipt: DispatchReceipt = {
      dispatch_id: `disp_${channel.toLowerCase().slice(0, 2)}_${Date.now()}`,
      customer_id: payload.customer_id || 'c101',
      channel,
      recipient,
      gateway,
      status: 'DELIVERED',
      message_body: payload.message_body || `Hi, Customer360 AI special offer: ${payload.offer || '20% VIP Discount'}. Claim now!`,
      offer: payload.offer || '20% VIP Discount',
      delivered_at: new Date().toISOString(),
      latency_ms: Math.floor(Math.random() * 40) + 15,
    };

    this.dispatchLogs.unshift(receipt);
    return receipt;
  }

  getDispatchLogs(): DispatchReceipt[] {
    return this.dispatchLogs;
  }

  async recordOutcome(actionId: string, outcomeData: Partial<ActionOutcomeRead>): Promise<ActionOutcomeRead> {
    return {
      id: `out_${Date.now()}`,
      action_id: actionId,
      delivered: true,
      opened: outcomeData.opened ?? true,
      clicked: outcomeData.clicked ?? true,
      purchased: outcomeData.converted ?? true,
      converted: outcomeData.converted ?? true,
      revenue: outcomeData.revenue || 299.0,
      executed_at: new Date().toISOString(),
    };
  }

  async recordFeedback(payload: FeedbackPayload): Promise<ActionOutcomeRead> {
    const isConverted = payload.response === 'purchased' || payload.response === 'converted';
    return {
      id: `fb_${Date.now()}`,
      action_id: payload.action_id,
      delivered: true,
      opened: payload.response === 'opened' || isConverted,
      clicked: payload.response === 'clicked' || isConverted,
      purchased: isConverted,
      converted: isConverted,
      revenue: payload.revenue || (isConverted ? 299.0 : 0.0),
      executed_at: new Date().toISOString(),
    };
  }
}
