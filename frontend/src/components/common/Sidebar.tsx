import React from 'react';
import {
  LayoutDashboard,
  Zap,
  Users,
  Database,
  Send,
  FlaskConical,
  BrainCircuit,
  X,
  Sparkles,
} from 'lucide-react';

export type FeatureGroup = 'dashboard' | 'executive' | 'customer360' | 'datalab' | 'dispatch' | 'sandbox' | 'explainability';

interface SidebarProps {
  activeFeature: FeatureGroup;
  onSelectFeature: (feature: FeatureGroup) => void;
  isOpen: boolean;
  onClose: () => void;
}

const MENU_ITEMS: { id: FeatureGroup; label: string; icon: React.ReactNode; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'executive', label: '1. Executive Command & Copilot', icon: <Zap className="w-4 h-4" />, badge: 'Triage' },
  { id: 'customer360', label: '2. Customer 360 Intelligence', icon: <Users className="w-4 h-4" />, badge: 'RFM & CLV' },
  { id: 'datalab', label: '3. Live Data & Model Lab', icon: <Database className="w-4 h-4" />, badge: 'Real Ingest' },
  { id: 'dispatch', label: '4. Decision & Action Dispatch', icon: <Send className="w-4 h-4" />, badge: 'NBA Engine' },
  { id: 'sandbox', label: '5. Scenario Simulation Studio', icon: <FlaskConical className="w-4 h-4" />, badge: 'What-If' },
  { id: 'explainability', label: '6. Explainability & Closed-Loop', icon: <BrainCircuit className="w-4 h-4" />, badge: 'SHAP & ROI' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeFeature,
  onSelectFeature,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-bgSidebar border-r border-borderSubtle flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-borderSubtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-borderBrand overflow-hidden shadow-xs shrink-0 bg-white flex items-center justify-center p-0.5">
              <img src="/logo.jpg" alt="C360 Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-textPrimary tracking-tight flex items-center gap-1">
                Customer360 AI
              </h1>
              <span className="text-[10px] text-textSecondary block font-medium">
                Decision Intelligence Platform
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg lg:hidden text-textSecondary hover:text-textPrimary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Principle Badge */}
        <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-brandSoft border border-borderBrand text-[11px] text-textForest font-semibold flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-aiAccent" />
          <span>"Prediction is not the decision."</span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto py-2">
          <div className="text-[10px] uppercase font-bold text-textSecondary px-3 py-1 tracking-wider">
            Main Feature Modules
          </div>

          {MENU_ITEMS.map((item) => {
            const isActive = activeFeature === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectFeature(item.id);
                  onClose();
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-brandPrimary text-textInverse shadow-sm'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-bgHover'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                      isActive ? 'bg-white/20 text-white' : 'bg-bgCard text-textSecondary border border-borderSubtle'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-borderSubtle text-[10px] text-textSecondary space-y-1">
          <div className="font-semibold text-textPrimary">Customer360 AI Enterprise v1.0</div>
          <div>ML Microservice: Remote HF Space</div>
        </div>
      </aside>
    </>
  );
};
