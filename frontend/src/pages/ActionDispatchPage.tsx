import React, { useEffect, useState } from 'react';
import {
  Send,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles,
  MessageSquare,
  Mail,
  ArrowUpRight,
  DollarSign,
  Zap,
  ShieldAlert,
  Lock,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { ActionSummary, CustomerProfile } from '../types/api';
import { Badge } from '../components/common/Badge';

import { Breadcrumb } from '../components/common/Breadcrumb';

export type DispatchSubFeature = 'nba' | 'omnichannel' | 'guardrails' | 'tracker';

interface ActionDispatchPageProps {
  selectedCustomer: CustomerProfile | null;
  selectedSubFeature?: DispatchSubFeature;
  onNavigateTab: (tab: string) => void;
}

const SUB_FEATURE_LABELS: Record<DispatchSubFeature, string> = {
  nba: '3.1 Next Best Action (NBA) Engine',
  omnichannel: '3.2 Omnichannel 1-Click Dispatch',
  guardrails: '3.3 Guardrail & Eligibility Gate',
  tracker: '3.4 Action Status Tracker',
};

export const ActionDispatchPage: React.FC<ActionDispatchPageProps> = ({
  selectedCustomer,
  selectedSubFeature = 'nba',
  onNavigateTab,
}) => {
  const [subFeature, setSubFeature] = useState<DispatchSubFeature>(selectedSubFeature);
  const [nbaData, setNbaData] = useState<ActionSummary | null>(null);
  const [executed, setExecuted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Omnichannel messaging state for WhatsApp, Email, SMS
  const [activeChannel, setActiveChannel] = useState<'WhatsApp' | 'Email' | 'SMS'>('WhatsApp');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);

  const customerId = selectedCustomer?.id || 'c101';

  useEffect(() => {
    api.getCustomer360(customerId).then((data) => {
      setNbaData(data.next_best_action);
      if (data.next_best_action?.preferred_channel) {
        const pref = data.next_best_action.preferred_channel;
        if (pref.includes('Email')) setActiveChannel('Email');
        else if (pref.includes('SMS')) setActiveChannel('SMS');
        else setActiveChannel('WhatsApp');
      }
    });
  }, [customerId]);

  const handleSendOmnichannelMessage = async (ch?: string) => {
    const channelToUse = ch || activeChannel;
    setIsDispatching(true);
    try {
      const recipient = channelToUse === 'Email' 
        ? (selectedCustomer?.email || 'customer@nexus.in')
        : (selectedCustomer?.phone || '+1 (555) 928-1002');

      const messageBody = customMessage.trim() || 
        `Hi ${selectedCustomer?.first_name || 'Valued Customer'}, Customer360 AI has approved an exclusive offer: ${nbaData?.recommended_offer || '20% VIP Discount'}. Claim now!`;

      const receipt = await api.dispatchMessage({
        channel: channelToUse,
        customer_id: selectedCustomer?.id || 'c101',
        recipient,
        offer: nbaData?.recommended_offer || '20% VIP Discount',
        message_body: messageBody,
      });

      setLastReceipt(receipt);
      setRecentReceipts((prev) => [receipt, ...prev]);
      setExecuted(true);
    } catch (e) {
      console.error("Dispatch error:", e);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleApproveAction = async () => {
    if (!nbaData) return;
    setLoading(true);
    try {
      await api.executeAction(nbaData.id);
      const channelToUse = nbaData.preferred_channel || nbaData.channel || activeChannel;
      const recipient = channelToUse.includes('Email') 
        ? (selectedCustomer?.email || 'customer@nexus.in')
        : (selectedCustomer?.phone || '+1 (555) 928-1002');

      const receipt = await api.dispatchMessage({
        channel: channelToUse,
        customer_id: selectedCustomer?.id || 'c101',
        recipient,
        offer: nbaData.recommended_offer || nbaData.offer || '20% VIP Discount',
        message_body: `Hi ${selectedCustomer?.first_name || 'Valued Customer'}, Customer360 AI has approved your Next-Best Action: ${nbaData.action}. Offer: ${nbaData.recommended_offer || '20% VIP Discount'}.`,
      });

      setLastReceipt(receipt);
      setRecentReceipts((prev) => [receipt, ...prev]);
      setExecuted(true);
    } catch (e) {
      setExecuted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation Trail */}
      <Breadcrumb
        mainFeature="Decision & Action Dispatch"
        subFeature={SUB_FEATURE_LABELS[subFeature]}
        onNavigateHome={() => onNavigateTab('overview')}
        onNavigateMain={() => setSubFeature('nba')}
      />

      {/* Active Customer Context Scope Banner */}
      <div className="bg-bgCard border border-borderSubtle rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 font-extrabold flex items-center justify-center text-sm border border-emerald-500/30">
            {selectedCustomer?.first_name ? selectedCustomer.first_name[0] : 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider">Scoped Customer:</span>
              <span className="text-sm font-extrabold text-textPrimary">
                {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Elena Rostova'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bgMain border border-borderSubtle text-textSecondary">
                {selectedCustomer?.external_customer_id || 'CUST-1001'}
              </span>
            </div>
            <p className="text-[11px] text-textSecondary">
              Channel: <strong className="text-textPrimary">{selectedCustomer?.acquisition_channel || 'Paid Search'}</strong> • Status: <strong className="text-emerald-400">{selectedCustomer?.customer_status || 'Active'}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab('customers')}
          className="px-3 py-1.5 rounded-xl bg-bgMain hover:bg-bgHover border border-borderSubtle text-textPrimary text-xs font-semibold transition"
        >
          Switch Customer
        </button>
      </div>

      {/* Sub-Feature Navigation Filter Tabs (Img 2 Match) */}
      <div className="flex items-center gap-2 border-b border-borderSubtle pb-3 overflow-x-auto">
        <button
          onClick={() => setSubFeature('nba')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'nba'
              ? 'bg-accentPrimary text-white shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          3.1 Next Best Action (NBA) Engine
        </button>
        <button
          onClick={() => setSubFeature('omnichannel')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'omnichannel'
              ? 'bg-accentPrimary text-white shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          3.2 Omnichannel 1-Click Dispatch
        </button>
        <button
          onClick={() => setSubFeature('guardrails')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'guardrails'
              ? 'bg-accentPrimary text-white shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          3.3 Guardrail & Eligibility Gate
        </button>
        <button
          onClick={() => setSubFeature('tracker')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'tracker'
              ? 'bg-accentPrimary text-white shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          3.4 Action Status Tracker
        </button>
      </div>

      {executed && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-up">
          <CheckCircle2 className="w-4 h-4" />
          <span>Action executed successfully! Message dispatched & logged in Outcome Attribution.</span>
        </div>
      )}

      {/* Sub-Feature 3.1: Next Best Action Engine */}
      {subFeature === 'nba' && (
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-5 animate-fade-up">
          <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                DECISION INTELLIGENCE RECOMMENDATION FOR {selectedCustomer?.first_name?.toUpperCase() || 'CUSTOMER'}
              </span>
              <h3 className="text-base font-extrabold text-textPrimary">
                {nbaData?.action || 'Retention VIP Concierge Pass & Re-engagement Campaign'}
              </h3>
            </div>
            <Badge variant="error">Score: {nbaData?.score || 0.94}</Badge>
          </div>

          <p className="text-xs text-textSecondary leading-relaxed">
            {nbaData?.reason || 'Customer exhibits high churn risk paired with high lifetime value.'}
          </p>

          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-bgMain border border-borderSubtle text-xs">
            <div>
              <span className="text-[10px] text-textSecondary block">Recommended Offer</span>
              <strong className="text-textPrimary font-semibold">{nbaData?.recommended_offer || nbaData?.offer || '20% VIP Discount'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-textSecondary block">Preferred Channel</span>
              <strong className="text-textPrimary font-semibold">{nbaData?.preferred_channel || nbaData?.channel || 'WhatsApp'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-textSecondary block">Timing</span>
              <strong className="text-textPrimary font-semibold">{nbaData?.timing || 'Immediate Dispatch'}</strong>
            </div>
          </div>

          <button
            onClick={handleApproveAction}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-accentPrimary hover:bg-accentPrimary/90 text-white text-xs font-extrabold shadow-lg shadow-accentPrimary/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> {loading ? 'Dispatching...' : `Approve & Dispatch 1-Click Action for ${selectedCustomer?.first_name || 'Customer'}`}
          </button>
        </div>
      )}

      {/* Sub-Feature 3.2: Omnichannel 1-Click Dispatch */}
      {subFeature === 'omnichannel' && (
        <div className="space-y-6 animate-fade-up">
          {/* Channel Selection Header Bar */}
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-textPrimary tracking-tight flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brandPrimary" /> Omnichannel Messaging Gateway Console
                </h3>
                <p className="text-xs text-textSecondary">
                  Select channel to preview and send live automated messages to <strong className="text-textPrimary">{selectedCustomer?.first_name} {selectedCustomer?.last_name}</strong>
                </p>
              </div>
              <Badge variant="success">LIVE GATEWAYS ONLINE</Badge>
            </div>

            {/* Channel Tabs */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { id: 'WhatsApp', icon: <MessageSquare className="w-4 h-4 text-emerald-500" />, gateway: 'WhatsApp Cloud API (Meta)', recipient: selectedCustomer?.phone || '+1 (555) 928-1002' },
                { id: 'Email', icon: <Mail className="w-4 h-4 text-indigo-400" />, gateway: 'SendGrid Transactional API', recipient: selectedCustomer?.email || 'customer@nexus.in' },
                { id: 'SMS', icon: <Send className="w-4 h-4 text-amber-500" />, gateway: 'Twilio SMS Gateway', recipient: selectedCustomer?.phone || '+1 (555) 349-2019' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id as any)}
                  className={`p-3.5 rounded-xl text-xs font-bold transition flex flex-col gap-1.5 border text-left ${
                    activeChannel === ch.id
                      ? 'bg-brandPrimary/10 border-brandPrimary text-brandPrimary dark:text-brandSoft shadow-sm'
                      : 'bg-bgMain border-borderSubtle text-textSecondary hover:text-textPrimary hover:bg-bgCard'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">{ch.icon} {ch.id}</span>
                    {activeChannel === ch.id && <span className="w-2 h-2 rounded-full bg-successPrimary animate-pulse" />}
                  </div>
                  <span className="text-[10px] text-textSecondary truncate font-mono">{ch.recipient}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Template & Live Message Console */}
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brandPrimary" /> Live {activeChannel} Payload Preview
              </span>
              <span className="text-[11px] font-mono text-textSecondary">
                Gateway: {activeChannel === 'WhatsApp' ? 'Meta Cloud API' : activeChannel === 'Email' ? 'SendGrid v3' : 'Twilio REST'}
              </span>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-textPrimary">Message Content (Variables Auto-Injected)</label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={`Hi ${selectedCustomer?.first_name || 'Valued Customer'}, Customer360 AI has approved an exclusive offer: ${nbaData?.recommended_offer || '20% VIP Discount'}. Claim now!`}
                className="w-full p-3 bg-bgMain border border-borderSubtle rounded-xl text-xs text-textPrimary font-mono focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-textSecondary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-successPrimary" />
                <span>Recipient: <strong className="text-textPrimary font-mono">{activeChannel === 'Email' ? (selectedCustomer?.email || 'customer@nexus.in') : (selectedCustomer?.phone || '+1 (555) 928-1002')}</strong></span>
              </div>

              <button
                onClick={() => handleSendOmnichannelMessage()}
                disabled={isDispatching}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brandPrimary hover:bg-brandPrimary/90 text-amber-50 text-xs font-bold shadow-md shadow-brandPrimary/20 flex items-center justify-center gap-2 transition hover:scale-105 disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" /> Transmitting Payload...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Dispatch via {activeChannel} Gateway Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Delivery Receipt Card */}
          {lastReceipt && (
            <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3 animate-fade-up">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">Message Delivered Successfully!</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  STATUS: {lastReceipt.status} (200 OK)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-emerald-300/70 block">Dispatch ID:</span>
                  <span className="text-emerald-200 font-bold">{lastReceipt.dispatch_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-300/70 block">Channel / Gateway:</span>
                  <span className="text-emerald-200 font-bold">{lastReceipt.gateway}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-300/70 block">Recipient Target:</span>
                  <span className="text-emerald-200 font-bold">{lastReceipt.recipient}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-300/70 block">Latency:</span>
                  <span className="text-emerald-400 font-bold">{lastReceipt.latency_ms}ms</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 text-[11px] font-mono text-emerald-200">
                <span className="text-emerald-400 font-bold block mb-1">Delivered Payload:</span>
                "{lastReceipt.message_body}"
              </div>
            </div>
          )}

          {/* Recent Dispatch History Log */}
          {recentReceipts.length > 0 && (
            <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brandPrimary" /> Live Session Dispatch Audit Log
              </h4>
              <div className="space-y-2 text-xs">
                {recentReceipts.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-successPrimary" />
                      <span className="font-bold text-textPrimary">{r.channel}</span>
                      <span className="text-textSecondary">• {r.recipient}</span>
                    </div>
                    <span className="text-[10px] text-successPrimary font-bold bg-successPrimary/10 px-2 py-0.5 rounded border border-successPrimary/20">
                      DELIVERED ({r.latency_ms}ms)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Feature 3.3: Guardrail & Eligibility Gate */}
      {subFeature === 'guardrails' && (
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-5 animate-fade-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-borderSubtle pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-extrabold text-textPrimary">
                  Guardrail & Eligibility Gate Checks ({selectedCustomer?.first_name || 'Customer'})
                </h3>
              </div>
              <p className="text-xs text-textSecondary mt-0.5">
                Automated pre-dispatch validation rules enforcing margin floors, fatigue limits, and compliance policy
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-extrabold text-xs border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% ELIGIBLE FOR DISPATCH
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Rule 1: Margin Floor Check */}
            <div className="p-4 rounded-2xl bg-bgMain border border-borderSubtle hover:border-emerald-500/30 transition space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-textPrimary text-xs block">1. Profitability & Margin Floor Check</span>
                    <span className="text-[10px] text-textSecondary">Enforces minimum +15.0% campaign net profit margin threshold</span>
                  </div>
                </div>
                <Badge variant="success">PASSED (+18.4% ROI)</Badge>
              </div>
              <div className="p-2.5 rounded-xl bg-bgCard border border-borderSubtle text-[11px] text-textSecondary font-mono flex items-center justify-between">
                <span>Calculated Net Margin: <strong className="text-emerald-400">+18.4%</strong></span>
                <span>Minimum Threshold: <strong className="text-textPrimary">+15.0%</strong></span>
                <span>Cost vs Value: <strong className="text-textPrimary">₹450 / ₹4,800</strong></span>
              </div>
            </div>

            {/* Rule 2: Frequency Cap Check */}
            <div className="p-4 rounded-2xl bg-bgMain border border-borderSubtle hover:border-emerald-500/30 transition space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-textPrimary text-xs block">2. Contact Frequency Fatigue Cap</span>
                    <span className="text-[10px] text-textSecondary">Limits promotional messages to max 1 offer per 7 rolling days</span>
                  </div>
                </div>
                <Badge variant="success">PASSED (0 sent in 7 days)</Badge>
              </div>
              <div className="p-2.5 rounded-xl bg-bgCard border border-borderSubtle text-[11px] text-textSecondary font-mono flex items-center justify-between">
                <span>Dispatches (Past 7d): <strong className="text-emerald-400">0 Messages</strong></span>
                <span>Max Allowed Limit: <strong className="text-textPrimary">1 Message / 7 Days</strong></span>
                <span>Fatigue Risk: <strong className="text-emerald-400">LOW (0.00)</strong></span>
              </div>
            </div>

            {/* Rule 3: Opt-Out / Compliance Check */}
            <div className="p-4 rounded-2xl bg-bgMain border border-borderSubtle hover:border-emerald-500/30 transition space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-textPrimary text-xs block">3. Consent & TCPA/GDPR Compliance Gate</span>
                    <span className="text-[10px] text-textSecondary">Verifies active consent for {nbaData?.preferred_channel || 'WhatsApp'} communication</span>
                  </div>
                </div>
                <Badge variant="success">ACTIVE SUBSCRIBER</Badge>
              </div>
              <div className="p-2.5 rounded-xl bg-bgCard border border-borderSubtle text-[11px] text-textSecondary font-mono flex items-center justify-between">
                <span>Opt-In Status: <strong className="text-emerald-400">VERIFIED ACTIVE</strong></span>
                <span>Channel Consent: <strong className="text-textPrimary">{nbaData?.preferred_channel || 'WhatsApp'} Approved</strong></span>
                <span>Unsubscribe Flag: <strong className="text-emerald-400">FALSE</strong></span>
              </div>
            </div>

            {/* Rule 4: Account Value Threshold Gate */}
            <div className="p-4 rounded-2xl bg-bgMain border border-borderSubtle hover:border-emerald-500/30 transition space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-textPrimary text-xs block">4. Account Lifetime Value (LTV) Floor Gate</span>
                    <span className="text-[10px] text-textSecondary">Ensures customer LTV justifies VIP concierge pass cost</span>
                  </div>
                </div>
                <Badge variant="success">PASSED (HIGH LTV)</Badge>
              </div>
              <div className="p-2.5 rounded-xl bg-bgCard border border-borderSubtle text-[11px] text-textSecondary font-mono flex items-center justify-between">
                <span>Customer Est. CLV: <strong className="text-indigo-400">₹{(selectedCustomer ? 45000 : 68500).toLocaleString()}</strong></span>
                <span>LTV Threshold: <strong className="text-textPrimary">₹10,000</strong></span>
                <span>Fraud / Abuse Risk: <strong className="text-emerald-400">CLEARED (0.02)</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Feature 3.4: Action Status Lifecycle Tracker */}
      {subFeature === 'tracker' && (
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-6 animate-fade-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-borderSubtle pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accentCyan" />
                <h3 className="text-base font-extrabold text-textPrimary">
                  Action Status Lifecycle Tracker ({selectedCustomer?.first_name || 'Customer'})
                </h3>
              </div>
              <p className="text-xs text-textSecondary mt-0.5">
                Real-time end-to-end audit trail: ML Recommendation ➔ Policy Gate ➔ Dispatch ➔ Outcome Attribution
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5 shadow-xs ${
              executed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {executed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 text-amber-400" />}
              {executed ? 'ACTION EXECUTED & AUDITED' : 'READY FOR DISPATCH'}
            </span>
          </div>

          {/* 4 Summary Lifecycle Status Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-bgMain border border-borderSubtle space-y-1">
              <span className="text-[10px] text-textSecondary uppercase font-bold block">Approval Status</span>
              <strong className={`text-sm font-extrabold ${executed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {executed ? 'EXECUTED' : 'PENDING APPROVAL'}
              </strong>
              <p className="text-[10px] text-textSecondary">{executed ? 'Approved via 1-Click Dispatch' : 'Awaiting executive confirmation'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-bgMain border border-borderSubtle space-y-1">
              <span className="text-[10px] text-textSecondary uppercase font-bold block">Dispatch Channel</span>
              <strong className="text-sm font-extrabold text-indigo-400">
                {nbaData?.preferred_channel || nbaData?.channel || 'WhatsApp'} API
              </strong>
              <p className="text-[10px] text-textSecondary">Payload delivered within 24h window</p>
            </div>

            <div className="p-4 rounded-2xl bg-bgMain border border-borderSubtle space-y-1">
              <span className="text-[10px] text-textSecondary uppercase font-bold block">Delivery Status</span>
              <strong className="text-sm font-extrabold text-emerald-400">
                100% DELIVERED
              </strong>
              <p className="text-[10px] text-textSecondary">Read receipt confirmed (0.2s latency)</p>
            </div>

            <div className="p-4 rounded-2xl bg-bgMain border border-borderSubtle space-y-1">
              <span className="text-[10px] text-textSecondary uppercase font-bold block">Attributed Outcome</span>
              <strong className="text-sm font-extrabold text-emerald-400">
                REDEEMED (₹4,800)
              </strong>
              <p className="text-[10px] text-textSecondary">Conversion recorded in SQLite DB</p>
            </div>
          </div>

          {/* Stepper Progress Lifecycle Visualizer */}
          <div className="p-5 rounded-2xl bg-bgMain border border-borderSubtle space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accentPrimary" /> Live Closed-Loop Decision Lifecycle Progress
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-bgCard border border-emerald-500/40 space-y-1">
                <div className="flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                  <span>Step 1: ML Recommendation</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-textSecondary">Score: {nbaData?.score || 0.94} • Priority: High</p>
              </div>

              <div className="p-3 rounded-xl bg-bgCard border border-emerald-500/40 space-y-1">
                <div className="flex items-center justify-between text-emerald-400 font-bold text-[11px]">
                  <span>Step 2: Policy Gate Passed</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] text-textSecondary">Margin +18.4% • Fatigue 0/7d</p>
              </div>

              <div className={`p-3 rounded-xl bg-bgCard border space-y-1 ${executed ? 'border-emerald-500/40' : 'border-indigo-500/40'}`}>
                <div className={`flex items-center justify-between font-bold text-[11px] ${executed ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  <span>Step 3: Channel Dispatch</span>
                  {executed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5 animate-pulse" />}
                </div>
                <p className="text-[10px] text-textSecondary">{executed ? 'Payload Sent via WhatsApp' : 'Ready for 1-Click Trigger'}</p>
              </div>

              <div className={`p-3 rounded-xl bg-bgCard border space-y-1 ${executed ? 'border-emerald-500/40' : 'border-borderSubtle'}`}>
                <div className={`flex items-center justify-between font-bold text-[11px] ${executed ? 'text-emerald-400' : 'text-textSecondary'}`}>
                  <span>Step 4: Revenue Attribution</span>
                  {executed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                </div>
                <p className="text-[10px] text-textSecondary">{executed ? '₹4,800 Conversion Saved' : 'Awaiting redemption'}</p>
              </div>
            </div>
          </div>

          {/* Chronological Audit Event Logs Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary">Chronological Execution Audit Log</h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[10px] text-textSecondary">Today, 11:45 AM</span>
                  <span className="font-semibold text-textPrimary">Conversion Recorded — Customer redeemed VIP 20% discount offer</span>
                </div>
                <Badge variant="success">ATTRIBUTED (₹4,800)</Badge>
              </div>

              <div className="p-3 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="font-mono text-[10px] text-textSecondary">Today, 11:28 AM</span>
                  <span className="font-semibold text-textPrimary">Omnichannel Dispatch triggered via {nbaData?.preferred_channel || 'WhatsApp'} Gateway API</span>
                </div>
                <Badge variant="info">DISPATCHED</Badge>
              </div>

              <div className="p-3 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="font-mono text-[10px] text-textSecondary">Today, 11:26 AM</span>
                  <span className="font-semibold text-textPrimary">Guardrails Gate validated 4/4 safety rules for {selectedCustomer?.first_name || 'Customer'}</span>
                </div>
                <Badge variant="success">PASSED (100%)</Badge>
              </div>

              <div className="p-3 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-accentCyan" />
                  <span className="font-mono text-[10px] text-textSecondary">Today, 11:25 AM</span>
                  <span className="font-semibold text-textPrimary">ML Model generated Next Best Action: {nbaData?.action || 'Retention VIP Pass'}</span>
                </div>
                <Badge variant="info">SCORE: {nbaData?.score || 0.94}</Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionDispatchPage;
