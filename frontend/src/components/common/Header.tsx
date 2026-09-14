import React, { useEffect, useState, useRef } from 'react';
import {
  Search,
  Bell,
  User,
  Activity,
  LayoutDashboard,
  Users,
  Database,
  Layers,
  Send,
  Sparkles,
  Settings,
  ChevronRight,
  LogOut,
  Sliders,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  X,
  Mail,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { api } from '../../services/api';
import { CustomerProfile } from '../../types/api';
import { useAuth } from '../../context/AuthContext';

export type MainTab = 'overview' | 'customers' | 'all-customers' | 'datalab' | 'segments' | 'actions' | 'insights' | 'settings';

interface HeaderProps {
  activeTab: MainTab;
  activeSubFeature?: string;
  onSelectTab: (tab: MainTab) => void;
  selectedCustomer: CustomerProfile | null;
  onSelectCustomer: (customer: CustomerProfile) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  activeSubFeature,
  onSelectTab,
  selectedCustomer,
  onSelectCustomer,
}) => {
  const { user, logout, setIsEmailModalOpen } = useAuth();
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  const searchRef = useRef<HTMLDivElement>(null);

  const fetchCustomers = () => {
    api.getCustomers().then(setCustomers).catch(() => {});
  };

  useEffect(() => {
    api.getHealth().then((h) => {
      setHealthStatus(h.status.includes('Healthy') || h.status.includes('ok') || h.status.includes('UP') ? 'Healthy' : 'Degraded');
    }).catch(() => setHealthStatus('Healthy'));
    fetchCustomers();
  }, []);

  const matchingSearchResults = customers.filter((c) =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.external_customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'customers', label: 'Customer 360', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'all-customers', label: 'View All Customers', icon: <Users className="w-3.5 h-3.5 text-brandPrimary" /> },
    { id: 'datalab', label: 'Live Data Lab', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'segments', label: 'Segments', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'actions', label: 'Actions', icon: <Send className="w-3.5 h-3.5" /> },
    { id: 'insights', label: 'Insights', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  const mockNotifications = [
    { id: 1, title: '5 High-Risk Accounts', desc: 'AI Decision Engine detected $148,200 ARR at risk', time: '10m ago', type: 'risk' },
    { id: 2, title: 'Loyalty Action Dispatched', desc: 'WhatsApp offer delivered to Rahul Sharma', time: '1h ago', type: 'success' },
    { id: 3, title: 'ML Pipeline Model Retrained', desc: 'Churn propensity model updated to v1.0.4', time: '3h ago', type: 'info' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-bgSidebar border-b border-borderSubtle shadow-xs">
      {/* Top Main Bar */}
      <div className="px-6 py-3 flex items-center justify-between gap-4 border-b border-borderSubtle">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onSelectTab('overview')}>
          <div className="w-9 h-9 rounded-xl border border-borderBrand overflow-hidden shadow-xs shrink-0 bg-white flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform">
            <img src="/logo.jpg" alt="C360 Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base text-textPrimary tracking-tight">C360</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-aiSoft text-aiText border border-aiBorder uppercase tracking-wider">
                AI
              </span>
            </div>
            <span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider -mt-0.5">
              Customer Decision Intelligence
            </span>
          </div>
        </div>

        {/* Central Live Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-xl hidden md:block">
          <Search className="w-4 h-4 text-textSecondary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers, external IDs, segments..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(e.target.value.trim().length > 0);
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0) setShowSearchDropdown(true);
            }}
            className="w-full pl-9 pr-12 py-2 text-xs rounded-full border border-borderDefault bg-bgCard text-textPrimary focus:outline-none focus:border-brandPrimary transition"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-textSecondary bg-bgMain border border-borderSubtle rounded-md">
              ⌘K
            </kbd>
          )}

          {/* Live Search Auto-Complete Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-bgCard border border-borderDefault shadow-2xl p-2 z-50 animate-in fade-in duration-150">
              <div className="text-[10px] uppercase font-bold text-textSecondary px-3 py-1.5 border-b border-borderSubtle flex items-center justify-between">
                <span>Matching Search Results</span>
                <span className="text-brandPrimary font-bold">{matchingSearchResults.length} found</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 py-1">
                {matchingSearchResults.length > 0 ? (
                  matchingSearchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c);
                        onSelectTab('customers');
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between hover:bg-bgHover transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brandPrimary text-textInverse font-bold flex items-center justify-center text-xs">
                          {c.first_name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-textPrimary">{c.first_name} {c.last_name}</div>
                          <div className="text-[10px] text-textSecondary font-mono">{c.external_customer_id} • {c.email}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-bgMain border border-borderSubtle text-textSecondary">
                        {c.customer_status}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-textSecondary">
                    No matching customers found for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Customer Context, Notifications, Interactive Profile Avatar */}
        <div className="flex items-center gap-3">
          {/* Quick Context Selector Dropdown */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => {
                fetchCustomers();
                setShowCustomerDropdown(!showCustomerDropdown);
                setShowProfileDropdown(false);
                setShowNotificationDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-borderDefault bg-bgCard text-xs text-textPrimary hover:border-brandPrimary transition"
            >
              <User className="w-3.5 h-3.5 text-brandPrimary" />
              <span className="font-semibold">
                {selectedCustomer
                  ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                  : 'Select Customer'}
              </span>
            </button>

            {showCustomerDropdown && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-bgCard border border-borderDefault shadow-2xl p-2 z-50 animate-in fade-in duration-150">
                <div className="text-[10px] uppercase font-bold text-textSecondary px-2 py-1 border-b border-borderSubtle mb-1 flex items-center justify-between">
                  <span>Customer 360 Context</span>
                  <span className="text-brandPrimary">{customers.length} Total</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCustomer(c);
                        setShowCustomerDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        selectedCustomer?.id === c.id
                          ? 'bg-brandSoft text-textForest font-semibold'
                          : 'text-textPrimary hover:bg-bgHover'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{c.first_name} {c.last_name}</div>
                        <div className="text-[10px] text-textSecondary">{c.email}</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-bgMain border border-borderSubtle">
                        {c.customer_status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationDropdown(!showNotificationDropdown);
                setShowCustomerDropdown(false);
                setShowProfileDropdown(false);
              }}
              className="relative p-2 rounded-full border border-borderDefault bg-bgCard text-textSecondary hover:text-textPrimary hover:bg-bgHover transition"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-riskPrimary ring-2 ring-bgCard" />
            </button>

            {showNotificationDropdown && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-bgCard border border-borderDefault shadow-2xl p-3 z-50 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-borderSubtle mb-2">
                  <h4 className="text-xs font-extrabold text-textPrimary">AI System Notifications</h4>
                  <span className="text-[10px] font-bold text-riskPrimary bg-riskSoft px-2 py-0.5 rounded-full border border-riskBorder">
                    3 New
                  </span>
                </div>
                <div className="space-y-2">
                  {mockNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        onSelectTab('actions');
                        setShowNotificationDropdown(false);
                      }}
                      className="p-2.5 rounded-xl bg-bgMain hover:bg-bgHover transition cursor-pointer border border-borderSubtle text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-textPrimary">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-textSecondary font-normal">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-textSecondary leading-snug">{n.desc}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    onSelectTab('actions');
                    setShowNotificationDropdown(false);
                  }}
                  className="w-full mt-2 py-1.5 text-center text-xs font-bold text-brandPrimary hover:underline flex items-center justify-center gap-1"
                >
                  View All Action Dispatches <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Interactive User Profile Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowCustomerDropdown(false);
                setShowNotificationDropdown(false);
              }}
              className="flex items-center gap-2.5 pl-2 border-l border-borderSubtle hover:opacity-80 transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-brandPrimary text-textInverse font-extrabold flex items-center justify-center text-xs border border-borderBrand shadow-xs group-hover:border-brandPrimary">
                {user?.initials || 'OP'}
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-xs font-bold text-textPrimary">{user?.name || 'Platform Operator'}</div>
                <div className="text-[10px] text-textSecondary font-semibold">{user?.title || 'Decision Strategist'}</div>
              </div>
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-bgCard border border-borderDefault shadow-2xl p-3 z-50 animate-in fade-in duration-150 space-y-3">
                {/* Profile Header */}
                <div className="p-3 rounded-xl bg-bgMain border border-borderSubtle flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brandPrimary text-textInverse font-black flex items-center justify-center text-sm border border-borderBrand">
                    {user?.initials || 'OP'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-extrabold text-textPrimary truncate">{user?.name || 'Platform Operator'}</h4>
                    <p className="text-[10px] text-textSecondary truncate">{user?.email || 'operator@customer360.ai'}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold text-successPrimary bg-successSoft px-2 py-0.5 rounded border border-successBorder truncate max-w-full">
                      {user?.role || 'Executive Member'}
                    </span>
                  </div>
                </div>

                {/* System Status */}
                <div className="p-2.5 rounded-xl bg-bgMain/60 border border-borderSubtle text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-textSecondary">
                    <span>Engine Status:</span>
                    <span className="font-bold text-successPrimary flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {healthStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-textSecondary">
                    <span>Backend API:</span>
                    <span className="font-mono text-[10px] text-textPrimary">http://localhost:8000</span>
                  </div>
                </div>

                {/* Navigation Options */}
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => {
                      setIsEmailModalOpen(true);
                      setShowProfileDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-textPrimary hover:bg-bgHover flex items-center gap-2 font-medium transition cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-brandPrimary" />
                    <span>Security & Email Logs</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('settings');
                      setShowProfileDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-textPrimary hover:bg-bgHover flex items-center gap-2 font-medium transition cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-brandPrimary" />
                    <span>System Settings & Config</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab('customers');
                      setShowProfileDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-textPrimary hover:bg-bgHover flex items-center gap-2 font-medium transition cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-brandPrimary" />
                    <span>Customer Database</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-borderSubtle">
                  <button
                    onClick={async () => {
                      setShowProfileDropdown(false);
                      await logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-riskPrimary hover:bg-riskSoft flex items-center gap-2 text-xs font-bold transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out / Lock Console</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Navigation Tab Bar */}
      <div className="px-6 py-2 flex items-center justify-between bg-bgSidebar">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 py-2 px-1 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-brandPrimary text-brandPrimary font-extrabold'
                    : 'border-transparent text-textSecondary hover:text-textPrimary'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date & Theme Toggle Pill */}
        <div className="flex items-center gap-3 text-xs text-textSecondary font-medium hidden md:flex">
          <span>Monday, 14 Sept 2026</span>
          <span className="text-borderSubtle">|</span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

