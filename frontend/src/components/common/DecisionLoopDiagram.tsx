import React, { useState, useEffect } from 'react';
import {
  User,
  Zap,
  Target,
  Rocket,
  RefreshCw,
  Sparkles,
  Activity,
  ArrowRight,
  Play,
  Pause,
  Info,
} from 'lucide-react';

export interface DecisionStepInfo {
  id: number;
  name: string;
  icon: React.ReactNode;
  title: string;
  tag: string;
  desc: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  activeClass: string;
  targetTab: string;
}

export const DECISION_STEPS: DecisionStepInfo[] = [
  {
    id: 0,
    name: 'Understand',
    icon: <User className="w-3.5 h-3.5" />,
    title: '1. Understand 👤',
    tag: '360° Aggregation',
    desc: 'Aggregates 360° behavioral signals, RFM features, transaction recency, and omnichannel touches into a unified dossier.',
    color: 'emerald',
    badgeBg: 'bg-brandSoft dark:bg-brandPrimary/30',
    badgeText: 'text-brandPrimary dark:text-brandSoft font-bold',
    badgeBorder: 'border-brandPrimary/30 dark:border-brandPrimary/50',
    activeClass: 'bg-brandPrimary text-amber-50 border-brandPrimary ring-4 ring-brandPrimary/20 scale-110 shadow-lg shadow-brandPrimary/30',
    targetTab: 'customers',
  },
  {
    id: 1,
    name: 'Predict',
    icon: <Zap className="w-3.5 h-3.5" />,
    title: '2. Predict ⚡',
    tag: 'ML Scoring Pipeline',
    desc: 'Calculates real-time churn risk scores (92%) and estimated CLV ($120k) via trained XGBoost models.',
    color: 'indigo',
    badgeBg: 'bg-aiAccent/10 dark:bg-aiAccent/20',
    badgeText: 'text-brandPrimary dark:text-aiAccent font-bold',
    badgeBorder: 'border-aiAccent/30 dark:border-aiAccent/50',
    activeClass: 'bg-aiAccent text-brandPrimary font-bold border-aiAccent ring-4 ring-aiAccent/20 scale-110 shadow-lg shadow-aiAccent/30',
    targetTab: 'insights',
  },
  {
    id: 2,
    name: 'Decide',
    icon: <Target className="w-3.5 h-3.5" />,
    title: '3. Decide 🎯',
    tag: 'SHAP & Rules Engine',
    desc: 'Evaluates business rules, margin floors, TCPA consent, and SHAP driver contributions to recommend optimal Next Best Action.',
    color: 'amber',
    badgeBg: 'bg-goldAccent/10 dark:bg-goldAccent/20',
    badgeText: 'text-goldAccent dark:text-goldAccent font-bold',
    badgeBorder: 'border-goldAccent/30 dark:border-goldAccent/50',
    activeClass: 'bg-goldAccent text-white border-goldAccent ring-4 ring-goldAccent/20 scale-110 shadow-lg shadow-goldAccent/30',
    targetTab: 'segments',
  },
  {
    id: 3,
    name: 'Act',
    icon: <Rocket className="w-3.5 h-3.5" />,
    title: '4. Act 🚀',
    tag: 'Omnichannel Dispatch',
    desc: 'Automates personalized message dispatch via WhatsApp, Email, or SMS within optimal 24h conversion window.',
    color: 'emerald',
    badgeBg: 'bg-successPrimary/10 dark:bg-successPrimary/20',
    badgeText: 'text-successPrimary dark:text-successPrimary font-bold',
    badgeBorder: 'border-successPrimary/30 dark:border-successPrimary/50',
    activeClass: 'bg-successPrimary text-white border-successPrimary ring-4 ring-successPrimary/20 scale-110 shadow-lg shadow-successPrimary/30',
    targetTab: 'actions',
  },
  {
    id: 4,
    name: 'Learn',
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    title: '5. Learn 🔄',
    tag: 'Closed-Loop Feedback',
    desc: 'Tracks open rates, click-through, and conversion revenue to continuously retrain ML propensity weights.',
    color: 'rose',
    badgeBg: 'bg-riskPrimary/10 dark:bg-riskPrimary/20',
    badgeText: 'text-riskPrimary dark:text-riskPrimary font-bold',
    badgeBorder: 'border-riskPrimary/30 dark:border-riskPrimary/50',
    activeClass: 'bg-riskPrimary text-white border-riskPrimary ring-4 ring-riskPrimary/20 scale-110 shadow-lg shadow-riskPrimary/30',
    targetTab: 'insights',
  },
];

interface DecisionLoopDiagramProps {
  onNavigateTab?: (tab: string) => void;
}

export const DecisionLoopDiagram: React.FC<DecisionLoopDiagramProps> = ({ onNavigateTab }) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % DECISION_STEPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const CX = 160;
  const CY = 160;
  const RADIUS = 115;

  // Exact 5-point pentagonal positions around circle
  const stepPositions = DECISION_STEPS.map((_, i) => {
    const angleDeg = -90 + i * 72;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = CX + RADIUS * Math.cos(angleRad);
    const y = CY + RADIUS * Math.sin(angleRad);
    return { x, y, angleDeg, angleRad };
  });

  const activePos = stepPositions[activeStep];
  const activeDetail = DECISION_STEPS[activeStep];

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-8 w-full">
      {/* Left Info Panel */}
      <div className="space-y-4 max-w-xl flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" /> UNIFIED DECISION INTELLIGENCE PLATFORM
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-textPrimary tracking-tight leading-tight">
          Know your customers.<br />
          <span className="text-emerald-800 dark:text-emerald-300">Know your next move.</span>
        </h1>
        <p className="text-xs sm:text-sm text-textSecondary leading-relaxed">
          Customer360 AI synthesizes multi-channel behavior into real-time explainable decisions — recommending what action to dispatch next.
        </p>

        {/* Interactive Step Detail Card */}
        <div className="p-4 rounded-2xl bg-bgMain border border-borderSubtle text-xs space-y-2.5 shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-textPrimary text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> {activeDetail.title}
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${activeDetail.badgeBg} ${activeDetail.badgeText} ${activeDetail.badgeBorder}`}>
                {activeDetail.tag}
              </span>
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="p-1 rounded-md bg-bgCard border border-borderSubtle hover:border-accentPrimary text-textSecondary hover:text-textPrimary transition"
                title={isAutoPlaying ? "Pause Auto-Cycle" : "Play Auto-Cycle"}
              >
                {isAutoPlaying ? <Pause className="w-3 h-3 text-accentPrimary" /> : <Play className="w-3 h-3 text-textSecondary" />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-textSecondary leading-relaxed">
            {activeDetail.desc}
          </p>

          <div className="pt-1 flex items-center justify-between border-t border-borderSubtle/60">
            <span className="text-[10px] text-textSecondary font-mono">Phase {activeStep + 1} of 5</span>
            <button
              onClick={() => onNavigateTab?.(activeDetail.targetTab)}
              className="text-[11px] font-bold text-accentPrimary hover:text-accentPrimary/80 flex items-center gap-1 transition"
            >
              Explore {activeDetail.name} Workspace <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Diagram Canvas: Mathematically Symmetric 5-Node Pentagonal Loop */}
      <div className="relative w-[320px] h-[320px] shrink-0 flex items-center justify-center select-none">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 320">
          <defs>
            <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
            </linearGradient>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer Ambient Glow */}
          <circle cx={CX} cy={CY} r={RADIUS + 25} fill="url(#hubGlow)" />

          {/* Outer Dashed Orbit Line */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke="url(#circleGrad)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="animate-spin-slow"
            style={{ transformOrigin: 'center center', animationDuration: '45s' }}
          />

          {/* Inner Solid Guide Circle */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS - 24}
            fill="none"
            stroke="#10b981"
            strokeOpacity="0.15"
            strokeWidth="1"
          />

          {/* Dynamic Beam Ray connecting Center Hub to Active Node */}
          <line
            x1={CX}
            y1={CY}
            x2={activePos.x}
            y2={activePos.y}
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="3 3"
            strokeOpacity="0.8"
            className="animate-pulse"
          />
        </svg>

        {/* Center Hub Circle with Official Logo */}
        <div className="w-28 h-28 rounded-full border-2 border-emerald-500/40 bg-bgMain flex flex-col items-center justify-center text-center p-2 shadow-lg relative z-10 hover:border-emerald-500 transition-all cursor-pointer group"
             onClick={() => setIsAutoPlaying(!isAutoPlaying)}>
          <div className="w-9 h-9 rounded-lg border border-emerald-500/30 overflow-hidden bg-white p-0.5 shadow-xs mb-0.5 group-hover:scale-110 transition-transform">
            <img src="/logo.jpg" alt="C360 Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-[9px] uppercase font-black tracking-wider text-textSecondary group-hover:text-accentPrimary transition">DECISION HUB</span>
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <Activity className={`w-2.5 h-2.5 ${isAutoPlaying ? 'animate-pulse text-emerald-500' : 'text-textSecondary'}`} />
            {isAutoPlaying ? 'Active Loop' : 'Paused'}
          </span>
        </div>

        {/* 5 Perfectly Positioned Nodes around the Pentagonal Orbit */}
        {DECISION_STEPS.map((step, idx) => {
          const pos = stepPositions[idx];
          const isActive = idx === activeStep;

          return (
            <button
              key={step.id}
              onClick={() => {
                setActiveStep(idx);
                setIsAutoPlaying(false);
              }}
              style={{
                position: 'absolute',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap shadow-sm border ${
                isActive
                  ? step.activeClass
                  : `${step.badgeBg} ${step.badgeText} ${step.badgeBorder} hover:scale-105 hover:shadow-md`
              }`}
            >
              <span>{step.icon}</span>
              <span>{step.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecisionLoopDiagram;
