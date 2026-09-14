import React from 'react';

type Step = 'understand' | 'predict' | 'explain' | 'decide' | 'personalize' | 'act' | 'learn';

interface DecisionLoopStepperProps {
  activeStep: Step;
}

const STEPS: { id: Step; label: string; icon: string }[] = [
  { id: 'understand', label: 'Understand', icon: '🔍' },
  { id: 'predict', label: 'Predict', icon: '🧠' },
  { id: 'explain', label: 'Explain', icon: '⚡' },
  { id: 'decide', label: 'Decide', icon: '🎯' },
  { id: 'personalize', label: 'Personalize', icon: '✨' },
  { id: 'act', label: 'Act', icon: '🚀' },
  { id: 'learn', label: 'Learn', icon: '🔄' },
];

export const DecisionLoopStepper: React.FC<DecisionLoopStepperProps> = ({ activeStep }) => {
  return (
    <div className="bg-bgCard border border-borderSubtle rounded-2xl p-3 shadow-xs mb-6 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[650px] px-2">
        {STEPS.map((s, idx) => {
          const isActive = s.id === activeStep;
          return (
            <React.Fragment key={s.id}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-accentPrimary text-white font-bold shadow-md shadow-accentPrimary/20 scale-105'
                    : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                <span className="text-xs">{s.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wider">{s.label}</span>
              </div>

              {idx < STEPS.length - 1 && (
                <div className="h-[1px] flex-1 bg-borderSubtle mx-1" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
