import React, { useState } from 'react';
import { FlaskConical, Sliders, TrendingDown, Play, Sparkles, DollarSign, Zap, CheckCircle2, BarChart3, Layers, Send } from 'lucide-react';
import { CustomerProfile } from '../types/api';
import { Badge } from '../components/common/Badge';

import { Breadcrumb } from '../components/common/Breadcrumb';

export type StudioSubFeature = 'sandbox' | 'macro';

interface ScenarioStudioPageProps {
  selectedCustomer: CustomerProfile | null;
  selectedSubFeature?: StudioSubFeature;
  onNavigateTab?: (tab: string) => void;
}

const SUB_FEATURE_LABELS: Record<StudioSubFeature, string> = {
  sandbox: '4.1 Micro "What-If" Customer Sandbox',
  macro: '4.2 Macro Campaign Simulator',
};

interface CohortConfig {
  name: string;
  deliveryRate: number;
  conversionRate: number;
  revenueMultiplier: number;
  actionsPerThousand: number;
  channels: Array<{
    name: string;
    revenueShare: number;
    convRate: number;
    color: string;
  }>;
  actionTypes: Array<{
    name: string;
    revenueShare: number;
    actions: number;
    color: string;
  }>;
}

const COHORT_CONFIGS: Record<string, CohortConfig> = {
  HIGH_RISK: {
    name: 'At-Risk (1.2k)',
    deliveryRate: 78.5,
    conversionRate: 46.2,
    revenueMultiplier: 5.8,
    actionsPerThousand: 1.0,
    channels: [
      { name: 'WhatsApp', revenueShare: 0.48, convRate: 50, color: 'bg-emerald-600' },
      { name: 'Email', revenueShare: 0.38, convRate: 30, color: 'bg-emerald-500/80' },
      { name: 'SMS', revenueShare: 0.14, convRate: 25, color: 'bg-emerald-400/80' },
      { name: 'Push', revenueShare: 0.00, convRate: 0, color: 'bg-emerald-300/40' },
    ],
    actionTypes: [
      { name: 'RETENTION', revenueShare: 0.58, actions: 10, color: 'bg-emerald-600' },
      { name: 'UPSELL', revenueShare: 0.29, actions: 8, color: 'bg-emerald-500/80' },
      { name: 'REENGAGEMENT', revenueShare: 0.13, actions: 4, color: 'bg-emerald-400/80' },
      { name: 'CROSS_SELL', revenueShare: 0.00, actions: 2, color: 'bg-emerald-300/40' },
    ],
  },
  VIP: {
    name: 'VIP Champions (620)',
    deliveryRate: 94.2,
    conversionRate: 68.5,
    revenueMultiplier: 9.4,
    actionsPerThousand: 1.4,
    channels: [
      { name: 'WhatsApp', revenueShare: 0.62, convRate: 72, color: 'bg-emerald-600' },
      { name: 'Email', revenueShare: 0.28, convRate: 54, color: 'bg-emerald-500/80' },
      { name: 'Push', revenueShare: 0.07, convRate: 38, color: 'bg-emerald-400/80' },
      { name: 'SMS', revenueShare: 0.03, convRate: 15, color: 'bg-emerald-300/40' },
    ],
    actionTypes: [
      { name: 'UPSELL', revenueShare: 0.52, actions: 15, color: 'bg-emerald-600' },
      { name: 'CROSS_SELL', revenueShare: 0.32, actions: 12, color: 'bg-emerald-500/80' },
      { name: 'RETENTION', revenueShare: 0.12, actions: 6, color: 'bg-emerald-400/80' },
      { name: 'REENGAGEMENT', revenueShare: 0.04, actions: 2, color: 'bg-emerald-300/40' },
    ],
  },
  CART: {
    name: 'Cart Abandoners (480)',
    deliveryRate: 85.0,
    conversionRate: 52.4,
    revenueMultiplier: 4.2,
    actionsPerThousand: 0.8,
    channels: [
      { name: 'Push', revenueShare: 0.45, convRate: 58, color: 'bg-emerald-600' },
      { name: 'WhatsApp', revenueShare: 0.35, convRate: 48, color: 'bg-emerald-500/80' },
      { name: 'Email', revenueShare: 0.15, convRate: 32, color: 'bg-emerald-400/80' },
      { name: 'SMS', revenueShare: 0.05, convRate: 20, color: 'bg-emerald-300/40' },
    ],
    actionTypes: [
      { name: 'REENGAGEMENT', revenueShare: 0.60, actions: 14, color: 'bg-emerald-600' },
      { name: 'RETENTION', revenueShare: 0.25, actions: 7, color: 'bg-emerald-500/80' },
      { name: 'UPSELL', revenueShare: 0.10, actions: 3, color: 'bg-emerald-400/80' },
      { name: 'CROSS_SELL', revenueShare: 0.05, actions: 1, color: 'bg-emerald-300/40' },
    ],
  },
};

export const ScenarioStudioPage: React.FC<ScenarioStudioPageProps> = ({
  selectedCustomer,
  selectedSubFeature = 'sandbox',
  onNavigateTab,
}) => {
  const [subFeature, setSubFeature] = useState<StudioSubFeature>(selectedSubFeature);
  const [discountPct, setDiscountPct] = useState<number>(20);
  const [supportCall, setSupportCall] = useState<boolean>(true);
  const [selectedChannel, setSelectedChannel] = useState<string>('WhatsApp');

  // Macro Simulator Controls State
  const [targetCohort, setTargetCohort] = useState<string>('HIGH_RISK');
  const [budgetCap, setBudgetCap] = useState<number>(25000);

  // Compute live simulated risk delta based on backend prediction formulas
  const baseRisk = 78.4;
  const simulatedRisk = Math.max(5.0, baseRisk - discountPct * 1.5 - (supportCall ? 25 : 0));
  const riskDelta = (baseRisk - simulatedRisk).toFixed(1);

  // Cohort simulation calculations
  const currentCohort = COHORT_CONFIGS[targetCohort] || COHORT_CONFIGS.HIGH_RISK;
  const simulatedActions = Math.round((budgetCap / 1000) * currentCohort.actionsPerThousand);
  const attributedRevenue = Math.round(budgetCap * currentCohort.revenueMultiplier);

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation Trail */}
      <Breadcrumb
        mainFeature="Scenario Simulation Studio"
        subFeature={SUB_FEATURE_LABELS[subFeature]}
        onNavigateHome={() => onNavigateTab?.('overview')}
        onNavigateMain={() => setSubFeature('sandbox')}
      />

      {/* Active Customer Context Scope Banner */}
      {selectedCustomer && (
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 font-extrabold flex items-center justify-center text-sm border border-emerald-500/30">
              {selectedCustomer.first_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider">Simulation Subject:</span>
                <span className="text-sm font-extrabold text-textPrimary">
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bgMain border border-borderSubtle text-textSecondary">
                  {selectedCustomer.external_customer_id}
                </span>
              </div>
              <p className="text-[11px] text-textSecondary">
                Status: <strong className="text-emerald-400">{selectedCustomer.customer_status}</strong> • Channel: <strong className="text-textPrimary">{selectedCustomer.acquisition_channel}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Feature Navigation Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-borderSubtle pb-3 overflow-x-auto">
        <button
          onClick={() => setSubFeature('sandbox')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'sandbox'
              ? 'bg-accentPrimary text-white shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          4.1 Micro "What-If" Customer Sandbox
        </button>
        <button
          onClick={() => setSubFeature('macro')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'macro'
              ? 'bg-accentPrimary text-white shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          4.2 Macro Campaign Simulator
        </button>
      </div>

      {/* Sub-Feature 4.1: Micro "What-If" Customer Sandbox */}
      {subFeature === 'sandbox' && (
        <div className="space-y-6 animate-fade-up">
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-borderSubtle pb-4">
              <div>
                <h2 className="text-base font-extrabold text-textPrimary flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  Micro "What-If" Customer Intervention Sandbox ({selectedCustomer?.first_name || 'Customer'})
                </h2>
                <p className="text-xs text-textSecondary mt-0.5">
                  Simulate live risk reduction and conversion probability by adjusting discount offers and outreach parameters
                </p>
              </div>
              <Badge variant="info">Live Simulation Engine</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interactive Control Panel */}
              <div className="space-y-5 p-5 rounded-2xl bg-bgMain border border-borderSubtle">
                <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" /> Intervention Controls
                </h3>

                {/* Slider 1: Discount % */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-textPrimary">Re-engagement Discount Offer</span>
                    <span className="text-indigo-400 font-mono">{discountPct}% OFF</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(Number(e.target.value))}
                    className="w-full h-2 rounded-lg bg-bgHover accent-accentPrimary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-textSecondary">
                    <span>0% (No Offer)</span>
                    <span>25% (Standard)</span>
                    <span>50% (Max VIP)</span>
                  </div>
                </div>

                {/* Toggle 2: Outbound Concierge Call */}
                <div className="p-3.5 rounded-xl bg-bgCard border border-borderSubtle flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-textPrimary block">VIP Outbound Concierge Call</span>
                    <span className="text-[10px] text-textSecondary">Triggers priority support agent follow-up</span>
                  </div>
                  <button
                    onClick={() => setSupportCall(!supportCall)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      supportCall ? 'bg-emerald-600 text-white' : 'bg-bgMain border border-borderSubtle text-textSecondary'
                    }`}
                  >
                    {supportCall ? 'ENABLED (+25% Lift)' : 'DISABLED'}
                  </button>
                </div>

                {/* Selector 3: Preferred Channel */}
                <div className="space-y-2">
                  <span className="font-bold text-xs text-textPrimary block">Primary Dispatch Channel</span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['WhatsApp', 'Email', 'SMS'].map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setSelectedChannel(ch)}
                        className={`py-2 rounded-xl font-bold transition border ${
                          selectedChannel === ch
                            ? 'bg-accentPrimary text-white border-accentPrimary shadow-xs'
                            : 'bg-bgCard border-borderSubtle text-textSecondary hover:text-textPrimary'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Real-time Output Impact Box */}
              <div className="space-y-5 p-5 rounded-2xl bg-bgMain border border-borderSubtle flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-textSecondary flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Simulated Churn Impact Output
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-4 rounded-xl bg-bgCard border border-borderSubtle">
                      <span className="text-[10px] text-textSecondary uppercase font-bold block">Baseline Churn Risk</span>
                      <div className="text-2xl font-black text-rose-400">{baseRisk}%</div>
                      <span className="text-[9px] text-rose-400 font-semibold">High Risk</span>
                    </div>

                    <div className="p-4 rounded-xl bg-bgCard border border-emerald-500/40">
                      <span className="text-[10px] text-textSecondary uppercase font-bold block">Simulated Churn Risk</span>
                      <div className="text-2xl font-black text-emerald-400">{simulatedRisk.toFixed(1)}%</div>
                      <span className="text-[9px] text-emerald-400 font-semibold">-{riskDelta}% Risk Reduction</span>
                    </div>
                  </div>

                  {/* Impact Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-textPrimary">Predicted Risk Reduction</span>
                      <span className="text-emerald-400 font-mono">-{riskDelta}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-bgHover overflow-hidden p-0.5 border border-borderSubtle">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (Number(riskDelta) / baseRisk) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-textPrimary space-y-1">
                  <span className="font-bold text-indigo-400 block">✦ Scenario Insight Summary:</span>
                  <p className="text-[11px] text-textSecondary">
                    Offering a <strong className="text-textPrimary">{discountPct}% discount</strong> via <strong className="text-textPrimary">{selectedChannel}</strong> {supportCall ? 'combined with an outbound VIP concierge call' : ''} is projected to reduce {selectedCustomer?.first_name || 'Customer'}'s churn risk from <strong className="text-rose-400">{baseRisk}%</strong> down to <strong className="text-emerald-400">{simulatedRisk.toFixed(1)}%</strong>, preserving ₹{(selectedCustomer ? 45000 : 68500).toLocaleString()} in estimated LTV.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Feature 4.2: Macro Campaign Simulator */}
      {subFeature === 'macro' && (
        <div className="space-y-6 animate-fade-up">
          {/* Header Title Box */}
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                <FlaskConical className="w-4 h-4" />
              </div>
              <h2 className="text-base font-extrabold text-textPrimary tracking-tight">
                Global Macro Campaign & Conversion Simulator
              </h2>
            </div>
            <p className="text-xs text-textSecondary pl-8">
              Macro platform action delivery, click-through rates, conversions, and total attributed revenue simulation
            </p>
          </div>

          {/* Campaign Simulation Parameters Toolbar */}
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <span className="font-bold text-textPrimary block">Target Customer Cohort</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'HIGH_RISK', label: 'At-Risk (1.2k)' },
                  { id: 'VIP', label: 'VIP Champions (620)' },
                  { id: 'CART', label: 'Cart Abandoners (480)' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setTargetCohort(c.id)}
                    className={`py-2 rounded-xl font-bold transition border ${
                      targetCohort === c.id
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'bg-bgMain border-borderSubtle text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-textPrimary">Simulated Campaign Budget Cap</span>
                <span className="text-emerald-400 font-mono">₹{budgetCap.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="100000"
                step="5000"
                value={budgetCap}
                onChange={(e) => setBudgetCap(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-bgHover accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-textSecondary">
                <span>₹5,000</span>
                <span>₹50,000</span>
                <span>₹1,000,00 (Max)</span>
              </div>
            </div>
          </div>

          {/* 4 Summary Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                SIMULATED ACTIONS CREATED
              </span>
              <div className="text-3xl font-black text-textPrimary">
                {simulatedActions.toLocaleString()}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                DELIVERY RATE
              </span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {currentCohort.deliveryRate}%
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                PROJECTED CONVERSION RATE
              </span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {currentCohort.conversionRate}%
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                PROJECTED ATTRIBUTED REVENUE
              </span>
              <div className="text-3xl font-black text-textPrimary">
                ₹{attributedRevenue.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 2 Progress Bar Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Channel Effectiveness Breakdown */}
            <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-textPrimary border-b border-borderSubtle pb-3">
                Channel Effectiveness Breakdown
              </h3>
              <div className="space-y-4 text-xs">
                {currentCohort.channels.map((ch) => {
                  const rev = Math.round(attributedRevenue * ch.revenueShare);
                  const pctWidth = ch.revenueShare > 0 ? Math.max(5, Math.round(ch.revenueShare * 100)) : 5;
                  return (
                    <div key={ch.name}>
                      <div className="flex justify-between mb-1.5 font-bold">
                        <span className="text-textPrimary">{ch.name}</span>
                        <span className="text-textSecondary font-mono">
                          ₹{rev.toLocaleString()} • {ch.convRate}% Conv
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-bgHover overflow-hidden">
                        <div
                          className={`h-full ${ch.color} rounded-full transition-all duration-300`}
                          style={{ width: `${pctWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Action Type Revenue Attribution */}
            <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-textPrimary border-b border-borderSubtle pb-3">
                Action Type Revenue Attribution
              </h3>
              <div className="space-y-4 text-xs">
                {currentCohort.actionTypes.map((act) => {
                  const rev = Math.round(attributedRevenue * act.revenueShare);
                  const actionCount = Math.max(1, Math.round(act.actions * (budgetCap / 25000)));
                  const pctWidth = act.revenueShare > 0 ? Math.max(5, Math.round(act.revenueShare * 100)) : 5;
                  return (
                    <div key={act.name}>
                      <div className="flex justify-between mb-1.5 font-bold">
                        <span className="text-textPrimary">{act.name}</span>
                        <span className="text-textSecondary font-mono">
                          ₹{rev.toLocaleString()} ({actionCount} Actions)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-bgHover overflow-hidden">
                        <div
                          className={`h-full ${act.color} rounded-full transition-all duration-300`}
                          style={{ width: `${pctWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

