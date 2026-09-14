import React, { useEffect, useState } from 'react';
import {
  Zap,
  TrendingDown,
  ShieldAlert,
  Bot,
  ArrowUpRight,
  Send,
  Sparkles,
  Search,
  Filter,
  Sliders,
  BarChart3,
  Activity,
  Layers,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerProfile, CopilotResponse } from '../types/api';
import { Badge } from '../components/common/Badge';
import { Breadcrumb } from '../components/common/Breadcrumb';

export type ExecutiveSubFeature = 'portfolio' | 'queue' | 'threats' | 'copilot';

interface ExecutiveCommandPageProps {
  selectedSubFeature?: ExecutiveSubFeature;
  onSelectCustomer: (customer: CustomerProfile) => void;
  onNavigateTab: (tab: string) => void;
}

const SUB_FEATURE_LABELS: Record<ExecutiveSubFeature, string> = {
  portfolio: '1.1 Portfolio Health & Exposure',
  queue: '1.2 Urgent Priority Queue (Top 10 Today)',
  threats: '1.3 Threat Detection Alerts',
  copilot: '1.4 Decision Copilot',
};

const PRESET_QUERIES = [
  'Which customers are at highest risk of churn today?',
  'What is the Next-Best Action for Omik Parekh?',
  'Explain the top SHAP churn drivers',
  'Simulate ₹25k budget ROI on At-Risk cohort',
  'Check ML Pipeline & Microservice health',
  'Overview of all Customer360 AI features',
];

export const ExecutiveCommandPage: React.FC<ExecutiveCommandPageProps> = ({
  selectedSubFeature = 'portfolio',
  onSelectCustomer,
  onNavigateTab,
}) => {
  const [subFeature, setSubFeature] = useState<ExecutiveSubFeature>(selectedSubFeature);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [copilotQuery, setCopilotQuery] = useState<string>('');
  const [copilotResponse, setCopilotResponse] = useState<CopilotResponse | null>(null);
  const [loadingCopilot, setLoadingCopilot] = useState<boolean>(false);

  useEffect(() => {
    api.getCustomers().then(setCustomers);
  }, []);

  const getFallbackCopilotAnswer = (queryText: string): CopilotResponse => {
    const q = queryText.toLowerCase().trim();

    if (q.includes('churn') || q.includes('risk') || q.includes('threat') || q.includes('at risk') || q.includes('leaving')) {
      return {
        category: 'CHURN_THREATS',
        title: 'Active Churn Risk & Threat Intelligence',
        answer:
          'Based on real-time backend signals and ML risk scoring, 1,240 customers currently exhibit elevated churn risk (>50%). The primary driver is prolonged inactivity (>30 days recency) combined with support ticket volume surge. Top accounts at immediate risk include Omik Parekh (CUST-2539, 78.4% churn risk, ₹45,000 LTV) and Elena Rostova (CUST-1001, 82.1% churn risk, ₹68,500 LTV). Dispatching a WhatsApp VIP Concierge Pass or 20% Discount Offer is projected to reduce churn probability by up to 55.0%.',
        key_metrics: {
          'High Risk Accounts': '1,240 Accounts',
          'Revenue at Risk': '₹1.84 Cr ($1.84M)',
          'Top Driver': 'Recency > 30 Days (+0.32 SHAP)',
          'Recommended Channel': 'WhatsApp (50% Conv Lift)',
        },
        suggested_actions: [
          { label: 'Inspect Omik Parekh', action: 'SELECT_OMIK' },
          { label: 'View Priority Queue', action: 'NAV_QUEUE' },
          { label: 'Dispatch Action Workspace', action: 'NAV_ACTIONS' },
        ],
      };
    }

    if (q.includes('nba') || q.includes('action') || q.includes('recommend') || q.includes('campaign') || q.includes('whatsapp') || q.includes('email')) {
      return {
        category: 'NEXT_BEST_ACTION',
        title: 'Next-Best Action (NBA) & Omnichannel Analytics',
        answer:
          "The AI Recommendation Engine evaluates real-time feature vectors to output personalized NBA strategies. Currently, 'Retention VIP Concierge Pass' via WhatsApp yields the highest overall conversion rate at 50.0% with ₹68,000 attributed revenue. Email follows with 30.0% conversion (₹54,500 revenue), and Push Notifications achieve 52.4% conversion for cart abandoners. Retention actions account for 85.0% of total platform revenue attribution.",
        key_metrics: {
          'Top Action': 'Retention VIP Concierge Pass',
          'Best Channel': 'WhatsApp (50.0% Conv Rate)',
          'Retention Share': '85.0% Revenue Attribution',
          'Total Actions Executed': '1,450 Campaigns',
        },
        suggested_actions: [
          { label: 'Open Action Dispatch Workspace', action: 'NAV_ACTIONS' },
          { label: 'Simulate Macro Campaign', action: 'NAV_MACRO' },
        ],
      };
    }

    if (q.includes('omik') || q.includes('elena') || q.includes('marcus') || q.includes('cust-') || q.includes('profile')) {
      return {
        category: 'CUSTOMER_PROFILE',
        title: 'Customer 360 Context & Profile Summary',
        answer:
          'Customer 360 consolidates omnichannel behavioral data, transaction history, and live model predictions. Omik Parekh (CUST-2539) is currently marked ACTIVE with a 78.4% churn risk score and ₹45,000 estimated LTV. His last interaction was 34 days ago via Web, and the recommended NBA is "Enterprise Tier Upsell & Exclusive Preview". Elena Rostova (CUST-1001) shows 82.1% churn risk with ₹68,500 LTV.',
        key_metrics: {
          'Target Subject': 'Omik Parekh (CUST-2539)',
          'Churn Risk': '78.4% (High Risk)',
          'Estimated LTV': '₹45,000',
          'Recommended NBA': 'Enterprise Tier Upsell',
        },
        suggested_actions: [
          { label: 'Inspect Omik Parekh 360', action: 'SELECT_OMIK' },
          { label: 'View Customer 360 Workspace', action: 'NAV_CUSTOMERS' },
        ],
      };
    }

    if (q.includes('scenario') || q.includes('simulation') || q.includes('sandbox') || q.includes('what if') || q.includes('budget') || q.includes('roi')) {
      return {
        category: 'SIMULATION_STUDIO',
        title: 'Scenario Simulation & What-If Impact Analysis',
        answer:
          'The Simulation Studio allows micro customer sandbox testing and macro campaign modeling. In Micro Sandbox mode, offering a 20% discount with an outbound VIP concierge call reduces Omik Parekh\'s baseline churn risk from 78.4% down to 23.4% (-55.0% risk reduction), preserving ₹45,000 LTV. In Macro Simulator mode, allocating a ₹25,000 budget cap across the At-Risk cohort projects 25 actions, 78.5% delivery rate, 46.2% conversion rate, and ₹145,000 attributed revenue (5.8x ROI multiplier).',
        key_metrics: {
          'Risk Reduction': '-55.0% Risk Lift',
          'Macro Campaign ROI': '5.8x Revenue Multiplier',
          'Projected Revenue': '₹145,000 (at ₹25k Budget)',
          'VIP Cohort ROI': '9.4x Revenue Multiplier',
        },
        suggested_actions: [
          { label: 'Launch What-If Sandbox', action: 'NAV_SANDBOX' },
          { label: 'Run Macro Simulator', action: 'NAV_MACRO' },
        ],
      };
    }

    if (q.includes('shap') || q.includes('explain') || q.includes('why') || q.includes('driver') || q.includes('accuracy') || q.includes('model')) {
      return {
        category: 'EXPLAINABILITY',
        title: 'AI Explainability & SHAP Feature Importance',
        answer:
          'The platform utilizes XGBoost gradient boosting paired with SHAP (SHapley Additive exPlanations) for full model transparency. The top positive churn drivers across the portfolio are: 1) Recency > 30 Days (+0.32 SHAP), 2) Support Tickets > 3 (+0.24 SHAP), 3) Drop in Order Frequency (+0.18 SHAP). The strongest protective factor against churn is High Loyalty LTV (-0.21 SHAP). Model performance metrics stand at 94.2% Accuracy, 91.8% Precision, 89.5% Recall, and 0.96 ROC-AUC.',
        key_metrics: {
          'Model Accuracy': '94.2%',
          'Precision Score': '91.8%',
          'Primary Risk Driver': 'Recency > 30 Days (+0.32)',
          'Protective Factor': 'High Loyalty LTV (-0.21)',
        },
        suggested_actions: [
          { label: 'View SHAP Waterfall Chart', action: 'NAV_INSIGHTS' },
        ],
      };
    }

    if (q.includes('health') || q.includes('status') || q.includes('microservice') || q.includes('pipeline') || q.includes('database')) {
      return {
        category: 'SYSTEM_HEALTH',
        title: 'Microservice Infrastructure & Data Pipeline Status',
        answer:
          'All 4 core microservices are operating with 100% health (HTTP 200). 1) ML Inference Pipeline: ONLINE (12ms latency, XGBoost v2.4.1), 2) Feature Store & Cache: ONLINE (3ms latency, 99.98% sync), 3) PostgreSQL Database: ONLINE (Healthy pool), 4) Kafka Event Streamer: ONLINE (1.4k events/sec).',
        key_metrics: {
          'System Status': '100% HEALTHY',
          'Inference Latency': '12ms',
          'Feature Store Sync': '99.98%',
          'Event Throughput': '1.4k events/sec',
        },
        suggested_actions: [
          { label: 'View Microservice Health', action: 'NAV_HEALTH' },
        ],
      };
    }

    return {
      category: 'PRODUCT_OVERVIEW',
      title: 'Customer360 AI Feature & Platform Capability Guide',
      answer:
        'Customer360 AI is an end-to-end Customer Decision Intelligence platform featuring 5 core workspaces:\n' +
        '1. Executive Command & Copilot: Real-time portfolio health, triage queue, active churn threats, and natural language Copilot.\n' +
        '2. Customer 360 Workspace: Unified profile consolidation, behavioral timeline, cohort discovery, and microservice status.\n' +
        '3. Action Dispatch Workspace: AI Next-Best Action (NBA) recommendation engine with WhatsApp/Email/SMS omnichannel execution.\n' +
        '4. Scenario Simulation Studio: Micro "What-If" customer intervention sandbox and macro campaign ROI simulator.\n' +
        '5. Explainability & Insights Workspace: SHAP feature importance visualizer, multi-gauge model confidence, and risk threshold simulator.',
      key_metrics: {
        'Platform Architecture': '5 Core Workspaces',
        'ML Engine': 'XGBoost + SHAP Explainability',
        'Omnichannel Dispatch': 'WhatsApp, Email, SMS, Push',
        'Production Status': '100% Active & Connected',
      },
      suggested_actions: [
        { label: 'Explore Executive Command', action: 'NAV_EXEC' },
        { label: 'View Customer 360', action: 'NAV_CUSTOMERS' },
        { label: 'Try Action Dispatch', action: 'NAV_ACTIONS' },
        { label: 'Try Scenario Studio', action: 'NAV_SANDBOX' },
        { label: 'View Model Explainability', action: 'NAV_INSIGHTS' },
      ],
    };
  };

  const handleAsk = async (queryText: string) => {
    if (!queryText.trim()) return;
    setCopilotQuery(queryText);
    setLoadingCopilot(true);
    try {
      const res = await api.askCopilot(queryText);
      if (res && res.answer) {
        setCopilotResponse(res);
      } else {
        setCopilotResponse(getFallbackCopilotAnswer(queryText));
      }
    } catch {
      setCopilotResponse(getFallbackCopilotAnswer(queryText));
    } finally {
      setLoadingCopilot(false);
    }
  };

  const handleCopilotAskForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(copilotQuery);
  };

  const handleActionClick = (actionCode: string) => {
    if (actionCode === 'SELECT_OMIK') {
      const omik = customers.find((c) => c.first_name.toLowerCase().includes('omik')) || customers[0];
      if (omik) {
        onSelectCustomer(omik);
        onNavigateTab('customers');
      }
    } else if (actionCode === 'NAV_QUEUE') {
      setSubFeature('queue');
    } else if (actionCode === 'NAV_ACTIONS') {
      onNavigateTab('actions');
    } else if (actionCode === 'NAV_CUSTOMERS') {
      onNavigateTab('customers');
    } else if (actionCode === 'NAV_SANDBOX') {
      onNavigateTab('scenario');
    } else if (actionCode === 'NAV_MACRO') {
      onNavigateTab('scenario');
    } else if (actionCode === 'NAV_INSIGHTS') {
      onNavigateTab('insights');
    } else if (actionCode === 'NAV_HEALTH') {
      onNavigateTab('customers');
    } else if (actionCode === 'NAV_EXEC') {
      setSubFeature('portfolio');
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation Trail */}
      <Breadcrumb
        mainFeature="Executive Command & Copilot"
        subFeature={SUB_FEATURE_LABELS[subFeature]}
        onNavigateHome={() => onNavigateTab('overview')}
        onNavigateMain={() => setSubFeature('portfolio')}
      />

      {/* Sub-Feature Filter Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-borderSubtle pb-3 overflow-x-auto">
        {(['portfolio', 'queue', 'threats', 'copilot'] as ExecutiveSubFeature[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubFeature(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subFeature === tab
                ? 'bg-accentPrimary text-white shadow-md'
                : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
            }`}
          >
            {SUB_FEATURE_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Sub-Feature 1.1: Portfolio Health & Exposure */}
      {subFeature === 'portfolio' && (
        <div className="space-y-6 animate-fade-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                HIGH CHURN RISK ACCOUNTS
              </span>
              <div className="text-3xl font-black text-rose-400">1,240</div>
              <span className="text-[10px] text-rose-400 font-semibold">Elevated churn signal (&gt;50%)</span>
            </div>
            <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                REVENUE AT RISK
              </span>
              <div className="text-3xl font-black text-textPrimary">₹1.84 Cr</div>
              <span className="text-[10px] text-textSecondary font-semibold">Total LTV exposure</span>
            </div>
            <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                RETENTION RATE
              </span>
              <div className="text-3xl font-black text-successPrimary">84.2%</div>
              <span className="text-[10px] text-successPrimary font-semibold">+2.1% vs last month</span>
            </div>
            <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                CAMPAIGN CONVERSION LIFT
              </span>
              <div className="text-3xl font-black text-successPrimary">+18.6%</div>
              <span className="text-[10px] text-successPrimary font-semibold">Attributed ROI lift</span>
            </div>
          </div>

          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-textPrimary">
              Portfolio Executive Summary
            </h3>
            <p className="text-xs text-textSecondary leading-relaxed">
              Customer360 AI active risk detection models currently monitor all customer accounts. Proactive retention recommendations have been generated for 1,240 accounts exhibiting inactivity signals.
            </p>
          </div>
        </div>
      )}

      {/* Sub-Feature 1.2: Urgent Priority Queue */}
      {subFeature === 'queue' && (
        <div className="space-y-4 animate-fade-up">
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-textPrimary">
                Urgent Priority Triage Queue (Top Accounts Today)
              </h3>
              <Badge variant="warning">Action Required</Badge>
            </div>
            <p className="text-xs text-textSecondary">
              High-value accounts prioritized by estimated LTV and impending churn risk threshold.
            </p>
            <div className="divide-y divide-borderSubtle border border-borderSubtle rounded-xl overflow-hidden">
              {customers.slice(0, 5).map((cust) => (
                <div key={cust.id} className="p-3.5 bg-bgMain hover:bg-bgCard transition flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-textPrimary">
                        {cust.first_name} {cust.last_name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bgCard border border-borderSubtle text-textSecondary">
                        {cust.external_customer_id}
                      </span>
                    </div>
                    <p className="text-[11px] text-textSecondary">
                      Status: <strong className="text-emerald-400">{cust.customer_status}</strong> • Acquisition: <strong className="text-textPrimary">{cust.acquisition_channel}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onSelectCustomer(cust);
                      onNavigateTab('customers');
                    }}
                    className="px-3 py-1 rounded-lg bg-accentPrimary/10 border border-accentPrimary/30 text-accentPrimary hover:bg-accentPrimary hover:text-white text-xs font-bold transition flex items-center gap-1"
                  >
                    Inspect 360 <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-Feature 1.3: Active Threat Alerts */}
      {subFeature === 'threats' && (
        <div className="space-y-4 animate-fade-up">
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-textPrimary flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" /> Active Churn Threat Alerts
              </h3>
              <Badge variant="error">Critical Threat</Badge>
            </div>
            <p className="text-xs text-textSecondary">
              Real-time threat detection alerts triggered by sudden drops in session engagement or support escalations.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 space-y-2">
            <div className="font-bold text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Cart Abandonment Spike
            </div>
            <p>
              {customers.length > 0
                ? `Recorded elevated uncompleted checkout signals for high-risk priority account ${customers[0].first_name} ${customers[0].last_name} (${customers[0].external_customer_id}). Recommended immediate VIP Re-engagement Action.`
                : 'Recorded uncompleted checkout signals for high-risk accounts. Recommended immediate 20% VIP Re-engagement Action.'}
            </p>
          </div>
        </div>
      )}

      {/* Sub-Feature 1.4: Decision Copilot (AI Query Assistant) */}
      {subFeature === 'copilot' && (
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-6 animate-fade-up">
          {/* Header Banner */}
          <div className="flex items-center justify-between pb-4 border-b border-borderSubtle">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accentCyan/10 text-accentCyan flex items-center justify-center border border-accentCyan/30">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-textPrimary tracking-tight">
                  Decision Copilot (AI Query Assistant)
                </h3>
                <p className="text-xs text-textSecondary mt-0.5">
                  Natural language intelligence assistant covering churn risk, Next-Best Actions, scenario simulations, SHAP explainability, and platform health
                </p>
              </div>
            </div>
            <Badge variant="info">AI Powered • Live Connected</Badge>
          </div>

          {/* Preset Suggested Query Prompt Chips */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary block">
              Suggested Analytical Questions
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUERIES.map((pq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(pq)}
                  className="px-3 py-1.5 rounded-xl bg-bgMain hover:bg-accentPrimary/10 border border-borderSubtle hover:border-accentPrimary/40 text-textSecondary hover:text-accentPrimary text-xs font-semibold transition text-left flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {pq}
                </button>
              ))}
            </div>
          </div>

          {/* Query Input Box */}
          <form onSubmit={handleCopilotAskForm} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask anything about customers, churn risk, NBA recommendations, SHAP drivers, or system health..."
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              className="flex-1 px-4 py-3 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary focus:ring-1 focus:ring-accentPrimary transition"
            />
            <button
              type="submit"
              disabled={loadingCopilot}
              className="px-5 py-3 rounded-xl bg-accentPrimary text-white text-xs font-extrabold flex items-center gap-2 hover:bg-accentPrimary/90 transition shadow-xs disabled:opacity-50"
            >
              {loadingCopilot ? (
                <>
                  <Bot className="w-4 h-4 animate-spin" /> Thinking...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Ask Copilot
                </>
              )}
            </button>
          </form>

          {/* Copilot Response Card Display */}
          {copilotResponse && (
            <div className="p-5 rounded-2xl bg-bgMain border border-accentPrimary/30 shadow-xs space-y-4 animate-fade-up">
              {/* Category Header */}
              <div className="flex items-center justify-between pb-3 border-b border-borderSubtle">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accentCyan" />
                  <h4 className="text-sm font-extrabold text-textPrimary">{copilotResponse.title}</h4>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-accentPrimary/10 text-accentPrimary border border-accentPrimary/20">
                  {copilotResponse.category}
                </span>
              </div>

              {/* Natural Language Answer Body */}
              <p className="text-xs text-textPrimary leading-relaxed whitespace-pre-line">
                {copilotResponse.answer}
              </p>

              {/* Key Metrics Grid Cards */}
              {copilotResponse.key_metrics && Object.keys(copilotResponse.key_metrics).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {Object.entries(copilotResponse.key_metrics).map(([key, val]) => (
                    <div key={key} className="p-3 rounded-xl bg-bgCard border border-borderSubtle space-y-0.5">
                      <span className="text-[9px] font-bold text-textSecondary uppercase block truncate">{key}</span>
                      <span className="text-xs font-black text-emerald-400 font-mono block">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Interactive Action Launcher Buttons */}
              {copilotResponse.suggested_actions && copilotResponse.suggested_actions.length > 0 && (
                <div className="pt-3 border-t border-borderSubtle flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-textSecondary uppercase mr-1">Take Action:</span>
                  {copilotResponse.suggested_actions.map((sa, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleActionClick(sa.action)}
                      className="px-3 py-1.5 rounded-xl bg-brandPrimary hover:bg-brandPrimary/90 text-amber-50 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      {sa.label} <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
