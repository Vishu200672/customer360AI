import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { AddCustomerModal } from './components/modals/AddCustomerModal';
import { CustomerProfile } from './types/api';
import { api } from './services/api';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExecutiveCommandPage } from './pages/ExecutiveCommandPage';
import { Customer360Page } from './pages/Customer360Page';
import { ActionDispatchPage } from './pages/ActionDispatchPage';
import { ScenarioStudioPage } from './pages/ScenarioStudioPage';
import { ExplainabilityPage } from './pages/ExplainabilityPage';
import { LiveDataLabPage } from './pages/LiveDataLabPage';
import { ViewAllCustomersPage } from './pages/ViewAllCustomersPage';
import { AnimatedBackground } from './components/common/AnimatedBackground';
import { LiveMessageNotificationToast } from './components/common/LiveMessageNotificationToast';
import { EmailNotificationToast } from './components/common/EmailNotificationToast';
import { EmailLogsModal } from './components/modals/EmailLogsModal';
import { CustomerChatbot } from './components/chat/CustomerChatbot';

export function AppContent() {
  const [activeFeature, setActiveFeature] = useState<FeatureGroup>('dashboard');
  const [activeSubFeature, setActiveSubFeature] = useState<string | undefined>(undefined);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  useEffect(() => {
    api.getCustomers().then((custs) => {
      if (custs.length > 0) {
        setSelectedCustomer(custs[0]);
      }
    }).catch(() => {});
  }, []);

  type FeatureGroup = 'dashboard' | 'executive' | 'customer360' | 'allcustomers' | 'datalab' | 'dispatch' | 'sandbox' | 'explainability';

  const featureToMainTab: Record<FeatureGroup, 'overview' | 'customers' | 'all-customers' | 'datalab' | 'segments' | 'actions' | 'insights' | 'settings'> = {
    dashboard: 'overview',
    executive: 'settings',
    customer360: 'customers',
    allcustomers: 'all-customers',
    datalab: 'datalab',
    dispatch: 'actions',
    sandbox: 'segments',
    explainability: 'insights',
  };

  const mainTabToFeature: Record<string, FeatureGroup> = {
    overview: 'dashboard',
    customers: 'customer360',
    'all-customers': 'allcustomers',
    allcustomers: 'allcustomers',
    datalab: 'datalab',
    segments: 'sandbox',
    actions: 'dispatch',
    insights: 'explainability',
    settings: 'executive',
  };

  const handleSelectTab = (tab: string) => {
    const feat = mainTabToFeature[tab] || 'dashboard';
    setActiveFeature(feat);
    setActiveSubFeature(undefined);
  };

  const renderActivePage = () => {
    switch (activeFeature) {
      case 'dashboard':
        return (
          <DashboardPage
            selectedCustomer={selectedCustomer}
            onSelectCustomer={(c) => {
              setSelectedCustomer(c);
            }}
            onNavigateTab={handleSelectTab}
          />
        );
      case 'executive':
        return (
          <ExecutiveCommandPage
            onSelectCustomer={(c) => {
              setSelectedCustomer(c);
            }}
            onNavigateTab={handleSelectTab}
          />
        );
      case 'customer360':
        return (
          <Customer360Page
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onNavigateTab={handleSelectTab}
          />
        );
      case 'allcustomers':
        return (
          <ViewAllCustomersPage
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onNavigateTab={handleSelectTab}
          />
        );
      case 'datalab':
        return (
          <LiveDataLabPage
            onSelectCustomer={(c) => {
              setSelectedCustomer(c);
            }}
            onNavigateTab={handleSelectTab}
          />
        );
      case 'dispatch':
        return (
          <ActionDispatchPage
            selectedCustomer={selectedCustomer}
            onNavigateTab={handleSelectTab}
          />
        );
      case 'sandbox':
        return <ScenarioStudioPage selectedCustomer={selectedCustomer} onNavigateTab={handleSelectTab} />;
      case 'explainability':
        return (
          <ExplainabilityPage
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onNavigateTab={handleSelectTab}
          />
        );
      default:
        return (
          <DashboardPage
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onNavigateTab={handleSelectTab}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-bgMain/70 dark:bg-bgMain/80 text-textPrimary flex flex-col font-sans transition-colors duration-200 relative">
      {/* Animated Movable Tech Background */}
      <AnimatedBackground />

      {/* Header Navigation Bar */}
      <Header
        activeTab={featureToMainTab[activeFeature]}
        activeSubFeature={activeSubFeature}
        onSelectTab={handleSelectTab}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
      />

      {/* Main Content Workspace Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6 relative z-10">
        {renderActivePage()}
      </main>

      {/* Live Customer Entry Modal */}
      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCustomerAdded={(newCust) => {
          setSelectedCustomer(newCust);
          setActiveFeature('customer360');
        }}
      />

      {/* Live Incoming Customer Message Toast Notification (2s simulated carrier arrival) */}
      <LiveMessageNotificationToast selectedCustomer={selectedCustomer} />

      {/* Customer Intelligence Chatbot */}
      <CustomerChatbot selectedCustomer={selectedCustomer} />
    </div>
  );
}

export function AppRoot() {
  const { isAuthenticated, isLoading, isEmailModalOpen, setIsEmailModalOpen } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bgMain flex flex-col items-center justify-center p-6 text-textPrimary relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-3xl bg-brandPrimary flex items-center justify-center text-textInverse font-black text-xl shadow-2xl animate-pulse border border-brandHover">
            C360
          </div>
          <div>
            <div className="text-xs font-black text-brandPrimary dark:text-aiAccent uppercase tracking-widest">
              Customer360 AI Platform
            </div>
            <div className="text-[11px] text-textSecondary font-semibold mt-1">
              Verifying encrypted security session...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
      </>
    );
  }

  return (
    <>
      <AppContent />
      {/* Live Email Security Toast on Login */}
      <EmailNotificationToast />
      {/* Interactive Email Audit & Inspector Modal */}
      <EmailLogsModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </ThemeProvider>
  );
}

