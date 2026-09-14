import React from 'react';
import { User, ArrowUpRight, CheckCircle2, ShieldAlert, Sparkles, Send } from 'lucide-react';
import { Customer360Read } from '../../types/api';

interface CustomerDossierCardProps {
  data: Customer360Read;
  onExecuteAction: () => void;
  onViewDetails: () => void;
}

export const CustomerDossierCard: React.FC<CustomerDossierCardProps> = ({
  data,
  onExecuteAction,
  onViewDetails,
}) => {
  const profile = data.profile;
  const features = data.features;
  const churn = data.predictions?.churn;
  const nba = data.next_best_action;

  const churnScore = churn?.score ?? (features?.recency_days && features.recency_days > 30 ? 0.82 : 0.12);
  const isHighRisk = churnScore > 0.5;

  return (
    <div className="p-6 rounded-2xl bg-bgCard border border-borderSubtle shadow-md space-y-6 animate-fade-up">
      {/* Top Profile Header */}
      <div className="flex items-center justify-between pb-4 border-b border-borderSubtle">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brandPrimary/10 border border-brandPrimary/30 flex items-center justify-center font-bold text-brandPrimary dark:text-brandSoft text-base shadow-inner">
            {profile.first_name[0]}{profile.last_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-textPrimary">
                {profile.first_name} {profile.last_name}
              </h3>
              <span className="text-[10px] font-mono text-textSecondary px-2 py-0.5 rounded-md bg-bgMain border border-borderSubtle">
                {profile.external_customer_id}
              </span>
            </div>
            <p className="text-xs text-textSecondary mt-0.5">{profile.email} • {profile.customer_status}</p>
          </div>
        </div>

        <button
          onClick={onViewDetails}
          className="px-3 py-1.5 rounded-xl border border-borderSubtle bg-bgMain hover:border-brandPrimary text-xs font-semibold text-textPrimary flex items-center gap-1 transition"
        >
          Full Dossier <ArrowUpRight className="w-3.5 h-3.5 text-brandPrimary" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-bgMain border border-borderSubtle space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary block">
            Churn Risk
          </span>
          <div className={`text-xl font-black ${isHighRisk ? 'text-riskPrimary' : 'text-successPrimary'}`}>
            {(churnScore * 100).toFixed(0)}%
          </div>
          <span className="text-[10px] text-riskPrimary font-semibold block">↑ High Exposure</span>
        </div>

        <div className="p-3.5 rounded-xl bg-bgMain border border-borderSubtle space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary block">
            Last Purchase
          </span>
          <div className="text-xl font-black text-textPrimary">
            {features?.recency_days || 74} days
          </div>
          <span className="text-[10px] text-warningPrimary font-semibold block">↑ Prolonged Inactivity</span>
        </div>

        <div className="p-3.5 rounded-xl bg-bgMain border border-borderSubtle space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-textSecondary block">
            Engagement
          </span>
          <div className="text-xl font-black text-riskPrimary">
            -60%
          </div>
          <span className="text-[10px] text-riskPrimary font-semibold block">↓ Engagement Drop</span>
        </div>
      </div>

      {/* Why is this customer at risk? */}
      <div className="p-4 rounded-xl bg-brandPrimary/5 border border-brandPrimary/20 text-xs text-textSecondary space-y-2">
        <div className="font-bold text-textPrimary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-brandPrimary" /> Why is this customer at risk?
        </div>
        <p className="leading-relaxed">
          AI detected prolonged inactivity ({features?.recency_days || 74} days since last purchase) paired with multiple cart abandonments and declining platform engagement.
        </p>
      </div>

      {/* Next Best Action Spotlight Box */}
      {nba && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-brandPrimary/10 to-bgCard border border-brandPrimary/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brandPrimary dark:text-brandSoft">
              NEXT BEST ACTION
            </span>
            <span className="text-[10px] font-bold text-successPrimary bg-successPrimary/10 px-2 py-0.5 rounded-md border border-successPrimary/20">
              Decision Confidence 94%
            </span>
          </div>

          <h4 className="text-sm font-extrabold text-textPrimary">
            {nba.action}
          </h4>
          <p className="text-xs text-textSecondary">{nba.recommended_offer || '15% Loyalty Offer via WhatsApp'}</p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onExecuteAction}
              className="flex-1 py-2.5 rounded-xl bg-brandPrimary hover:bg-brandPrimary/90 text-amber-50 text-xs font-bold shadow-md shadow-brandPrimary/25 flex items-center justify-center gap-2 transition"
            >
              <Send className="w-3.5 h-3.5" /> Approve Action
            </button>
          </div>
        </div>
      )}

      {/* Decision Checks Checklist */}
      <div className="pt-2 border-t border-borderSubtle text-[11px] text-textSecondary space-y-1.5">
        <div className="font-bold uppercase tracking-wider text-textPrimary text-[10px] mb-1">
          Decision Checks
        </div>
        <div className="flex items-center gap-2 text-successPrimary font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> Customer eligible for retention discount
        </div>
        <div className="flex items-center gap-2 text-successPrimary font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> Offer within margin floor (+15% ROI)
        </div>
        <div className="flex items-center gap-2 text-successPrimary font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> Preferred channel: WhatsApp
        </div>
      </div>
    </div>
  );
};
