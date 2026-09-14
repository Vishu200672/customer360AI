import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtext?: string;
  icon?: React.ReactNode;
  delayIndex?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  subtext,
  icon,
  delayIndex = 1,
}) => {
  const delays = ['0.1s', '0.3s', '0.4s', '0.5s'];
  const delayStyle = { animationDelay: delays[Math.min(delayIndex - 1, 3)] };

  return (
    <div
      style={delayStyle}
      className="p-5 rounded-2xl bg-bgCard border border-borderSubtle opacity-0 scale-95 animate-scale-up shadow-sm hover:border-accentPrimary/40 transition-all space-y-2"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-textSecondary uppercase tracking-wider">
          {title}
        </h3>
        {icon && <div className="p-2 rounded-xl bg-bgMain text-accentPrimary border border-borderSubtle">{icon}</div>}
      </div>

      <div className="text-2xl font-black text-textPrimary tracking-tight">{value}</div>

      {(change || subtext) && (
        <div className="flex items-center gap-2 text-xs">
          {change && (
            <span
              className={`font-bold px-1.5 py-0.5 rounded-md ${
                changeType === 'positive'
                  ? 'bg-successPrimary/10 text-successPrimary'
                  : changeType === 'negative'
                  ? 'bg-riskPrimary/10 text-riskPrimary'
                  : 'bg-textSecondary/10 text-textSecondary'
              }`}
            >
              {change}
            </span>
          )}
          {subtext && <span className="text-[11px] text-textSecondary">{subtext}</span>}
        </div>
      )}
    </div>
  );
};
