import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'ai' | 'gold' | 'premium' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const styles = {
    success: 'bg-successSoft text-successPrimary border-successBorder',
    error: 'bg-riskSoft text-riskPrimary border-riskBorder',
    warning: 'bg-warningSoft text-warningPrimary border-warningBorder',
    info: 'bg-aiSoft text-aiText border-aiBorder',
    ai: 'bg-aiSoft text-aiText border-aiBorder font-semibold',
    gold: 'bg-goldSoft text-goldAccent border-goldAccent/30 font-semibold',
    premium: 'bg-goldSoft text-goldAccent border-goldAccent/30 font-semibold',
    neutral: 'bg-bgHover text-textSecondary border-borderSubtle',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[variant] || styles.neutral} ${className}`}
    >
      {children}
    </span>
  );
};

