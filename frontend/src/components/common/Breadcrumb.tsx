import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbProps {
  mainFeature: string;
  subFeature?: string;
  onNavigateHome: () => void;
  onNavigateMain?: () => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  mainFeature,
  subFeature,
  onNavigateHome,
  onNavigateMain,
}) => {
  return (
    <nav className="flex items-center gap-2 text-xs text-textSecondary font-medium py-1.5 px-3 rounded-xl bg-bgCard border border-borderSubtle shadow-xs w-fit">
      <button
        onClick={onNavigateHome}
        className="hover:text-brandPrimary transition-colors flex items-center gap-1.5 text-[11px] font-semibold hover:underline"
        title="Return to Dashboard Overview"
      >
        <Home className="w-3.5 h-3.5 text-brandPrimary" />
        <span>Dashboard</span>
      </button>

      <ChevronRight className="w-3.5 h-3.5 text-textSecondary/50 flex-shrink-0" />

      {onNavigateMain ? (
        <button
          onClick={onNavigateMain}
          className="font-semibold text-textPrimary hover:text-brandPrimary transition-colors text-[11px] hover:underline"
          title={`Go to ${mainFeature}`}
        >
          {mainFeature}
        </button>
      ) : (
        <span className="font-semibold text-textPrimary text-[11px]">{mainFeature}</span>
      )}

      {subFeature && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-textSecondary/50 flex-shrink-0" />
          <span className="font-bold text-textForest text-[11px] bg-brandSoft px-2 py-0.5 rounded-md border border-borderBrand">
            {subFeature}
          </span>
        </>
      )}
    </nav>
  );
};
