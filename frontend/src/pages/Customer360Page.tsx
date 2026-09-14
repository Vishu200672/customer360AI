import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  User,
  Mail,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  Send,
  Layers,
  History,
  Activity,
  CheckCircle2,
  DollarSign,
  Zap,
  Clock,
  ChevronRight,
  ChevronLeft,
  Phone,
  Calendar,
  ShoppingBag,
  Target,
  Eye,
  UserPlus,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { Customer360Read, CustomerProfile } from '../types/api';
import { Badge } from '../components/common/Badge';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { AddCustomerModal } from '../components/modals/AddCustomerModal';

export type Customer360SubFeature = 'directory' | 'dossier' | 'trajectory' | 'cohorts';

interface Customer360PageProps {
  selectedCustomer: CustomerProfile | null;
  selectedSubFeature?: Customer360SubFeature;
  onSelectCustomer: (customer: CustomerProfile) => void;
  onNavigateTab: (tab: string) => void;
}

const SUB_FEATURE_LABELS: Record<Customer360SubFeature, string> = {
  directory: '2.1 Unified Directory & All Customers',
  dossier: '2.2 Deep-Dive Customer Dossier',
  trajectory: '2.3 Risk & CLV Trajectory (30/60/90d)',
  cohorts: '2.4 Lookalike & Cohorts Discovery',
};

export const Customer360Page: React.FC<Customer360PageProps> = ({
  selectedCustomer,
  selectedSubFeature = 'directory',
  onSelectCustomer,
  onNavigateTab,
}) => {
  const [subFeature, setSubFeature] = useState<Customer360SubFeature>(selectedSubFeature);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [c360Data, setC360Data] = useState<Customer360Read | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Advanced Table Controls from View All Customers
  const [sortBy, setSortBy] = useState<'recency' | 'name' | 'status' | 'channel'>('recency');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const customerId = selectedCustomer?.id || 'c101';

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (customerId) {
      api.getCustomer360(customerId).then(setC360Data).catch(() => {});
    }
  }, [customerId]);

  // Reset pagination on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  // Priority count badges
  const atRiskCount = customers.filter((c) => (c.customer_status || '').toLowerCase().includes('risk')).length;
  const activeVipCount = customers.filter((c) => (c.customer_status || '').toLowerCase().includes('vip') || (c.customer_status || '').toLowerCase().includes('active')).length;

  // Search & Filter Logic
  const filteredCustomers = customers.filter((c) => {
    const firstName = c.first_name || '';
    const lastName = c.last_name || '';
    const extId = c.external_customer_id || '';
    const email = c.email || '';
    const phone = c.phone || '';

    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      `${firstName} ${lastName}`.toLowerCase().includes(q) ||
      extId.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      phone.toLowerCase().includes(q);

    const statusLower = (c.customer_status || '').toLowerCase();
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'At-Risk' && (statusLower.includes('risk') || statusLower.includes('churn'))) ||
      (statusFilter === 'VIP' && statusLower.includes('vip')) ||
      (statusFilter === 'Dormant' && statusLower.includes('dormant')) ||
      (statusFilter === 'Active' && statusLower.includes('active'));

    return matchesSearch && matchesStatus;
  });

  // Sorting Logic
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let result = 0;
    if (sortBy === 'recency') {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      result = timeA - timeB;
    } else if (sortBy === 'name') {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      result = nameA.localeCompare(nameB);
    } else if (sortBy === 'status') {
      const statA = (a.customer_status || '').toLowerCase();
      const statB = (b.customer_status || '').toLowerCase();
      result = statA.localeCompare(statB);
    } else if (sortBy === 'channel') {
      const chanA = (a.acquisition_channel || '').toLowerCase();
      const chanB = (b.acquisition_channel || '').toLowerCase();
      result = chanA.localeCompare(chanB);
    }
    return sortOrder === 'desc' ? -result : result;
  });

  // Pagination calculation
  const totalRecords = sortedCustomers.length;
  const effectivePageSize = pageSize === 99999 ? Math.max(1, totalRecords) : pageSize;
  const totalPages = Math.ceil(totalRecords / effectivePageSize);
  const startIndex = (currentPage - 1) * effectivePageSize;
  const paginatedCustomers = sortedCustomers.slice(startIndex, startIndex + effectivePageSize);

  const handleSort = (key: 'recency' | 'name' | 'status' | 'channel') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation Trail */}
      <Breadcrumb
        mainFeature="Customer 360 Intelligence"
        subFeature={SUB_FEATURE_LABELS[subFeature]}
        onNavigateHome={() => onNavigateTab('overview')}
        onNavigateMain={() => setSubFeature('dossier')}
      />

      {/* Active Scoped Customer Context Banner */}
      <div className="bg-bgCard border border-borderSubtle rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 font-extrabold flex items-center justify-center text-sm border border-indigo-500/30 shadow-inner">
            {selectedCustomer?.first_name ? selectedCustomer.first_name[0] : 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wider">Scoped Customer:</span>
              <span className="text-sm font-extrabold text-textPrimary">
                {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Elena Rostova'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bgMain border border-borderSubtle text-textSecondary">
                {selectedCustomer?.external_customer_id || 'CUST-1001'}
              </span>
            </div>
            <p className="text-[11px] text-textSecondary">
              Channel: <strong className="text-textPrimary">{selectedCustomer?.acquisition_channel || 'Paid Search'}</strong> • Status: <strong className="text-emerald-400">{selectedCustomer?.customer_status || 'Active'}</strong> • Email: <strong className="text-textPrimary">{selectedCustomer?.email}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubFeature('dossier')}
            className="px-3 py-1.5 rounded-xl bg-accentPrimary hover:bg-accentPrimary/90 text-white text-xs font-bold transition shadow-xs flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" /> View Dossier
          </button>
        </div>
      </div>

      {/* Sub-Feature Navigation Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-borderSubtle pb-3 overflow-x-auto">
        <button
          onClick={() => setSubFeature('directory')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'directory'
              ? 'bg-accentPrimary text-white shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          2.1 Unified Directory & All Customers ({customers.length})
        </button>
        <button
          onClick={() => setSubFeature('dossier')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'dossier'
              ? 'bg-accentPrimary text-white shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          2.2 Deep-Dive Customer Dossier
        </button>
        <button
          onClick={() => setSubFeature('trajectory')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'trajectory'
              ? 'bg-accentPrimary text-white shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          2.3 Risk & CLV Trajectory (30/60/90d)
        </button>
        <button
          onClick={() => setSubFeature('cohorts')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subFeature === 'cohorts'
              ? 'bg-accentPrimary text-white shadow-md'
              : 'bg-bgCard text-textSecondary hover:text-textPrimary border border-borderSubtle'
          }`}
        >
          2.4 Lookalike & Cohorts Discovery
        </button>
      </div>

      {/* Sub-Feature 2.1: Unified Customer Directory & All Customers */}
      {subFeature === 'directory' && (
        <div className="space-y-4 animate-fade-up">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] font-bold uppercase text-textSecondary">Connected Profiles</span>
              <div className="text-2xl font-black text-textPrimary flex items-center justify-between">
                <span>{customers.length} Accounts</span>
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-[10px] text-textSecondary">Synced with SQLite & REST backend</p>
            </div>

            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] font-bold uppercase text-textSecondary">At-Risk Segment</span>
              <div className="text-2xl font-black text-rose-400 flex items-center justify-between">
                <span>{atRiskCount} Accounts</span>
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
              <p className="text-[10px] text-textSecondary">Propensity churn risk &gt; 50%</p>
            </div>

            <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
              <span className="text-[10px] font-bold uppercase text-textSecondary">Active Champions</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center justify-between">
                <span>{activeVipCount} Accounts</span>
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-[10px] text-textSecondary">High LTV and frequent buyers</p>
            </div>
          </div>

          {/* Search, Filter & Action Toolbar */}
          <div className="bg-bgCard border border-borderSubtle rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-borderSubtle bg-bgMain text-textPrimary focus:outline-none focus:border-accentPrimary font-medium"
                />
              </div>
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20 shrink-0">
                {totalRecords} Accounts Found
              </span>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto justify-between md:justify-end">
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-4 h-4 text-textSecondary" />
                {['ALL', 'At-Risk', 'VIP', 'Dormant', 'Active'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      statusFilter === st
                        ? 'bg-accentPrimary text-white shadow-xs'
                        : 'bg-bgMain border border-borderSubtle text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Shifted Page Controls Upward */}
              <div className="flex items-center gap-2 shrink-0 border-l border-borderSubtle pl-2">
                <div className="flex items-center gap-1 text-xs text-textSecondary">
                  <span className="text-[11px] font-medium">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-bgMain border border-borderSubtle rounded-lg px-2 py-1 text-xs text-textPrimary font-bold focus:outline-none focus:border-accentPrimary"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                    <option value={99999}>Show All</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-bgMain border border-borderSubtle hover:bg-bgHover text-textPrimary disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 py-0.5 font-mono font-bold text-xs text-textPrimary">
                    {currentPage} / {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg bg-bgMain border border-borderSubtle hover:bg-bgHover text-textPrimary disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={loadCustomers}
                  className="p-2 rounded-xl bg-bgMain border border-borderSubtle hover:bg-bgHover text-textSecondary hover:text-textPrimary transition"
                  title="Refresh Customer Directory"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Directory Data Table with Sorting */}
          <div className="bg-bgCard border border-borderSubtle rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-borderSubtle bg-bgMain/50 text-textSecondary font-bold uppercase text-[10px]">
                    <th className="py-3 px-4 cursor-pointer hover:text-textPrimary transition" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">
                        Customer Identity <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4">External ID</th>
                    <th className="py-3 px-4 cursor-pointer hover:text-textPrimary transition" onClick={() => handleSort('channel')}>
                      <div className="flex items-center gap-1">
                        Acquisition Channel <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 cursor-pointer hover:text-textPrimary transition" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">
                        Status <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 cursor-pointer hover:text-textPrimary transition" onClick={() => handleSort('recency')}>
                      <div className="flex items-center gap-1">
                        Recency <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderSubtle">
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-textSecondary">
                        No customer accounts match search or status filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((c) => {
                      const isSelected = selectedCustomer?.id === c.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => {
                            onSelectCustomer(c);
                            setSubFeature('dossier');
                          }}
                          className={`hover:bg-bgHover transition cursor-pointer ${isSelected ? 'bg-indigo-500/10 font-medium' : ''}`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-accentPrimary/10 border border-accentPrimary/30 text-accentPrimary'
                              }`}>
                                {c.first_name[0]}{c.last_name[0]}
                              </div>
                              <div>
                                <div className="font-bold text-textPrimary">{c.first_name} {c.last_name}</div>
                                <div className="text-[10px] text-textSecondary">{c.email} • {c.phone || 'Phone verified'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-textSecondary">{c.external_customer_id}</td>
                          <td className="py-3.5 px-4 font-medium text-textPrimary">{c.acquisition_channel}</td>
                          <td className="py-3.5 px-4">
                            <Badge variant={(c.customer_status || '').toLowerCase().includes('risk') ? 'error' : 'success'}>
                              {c.customer_status || 'Active'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-textSecondary font-mono text-[11px]">
                            {c.recency_days !== undefined ? `${c.recency_days}d ago` : 'Recent'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectCustomer(c);
                                  setSubFeature('dossier');
                                }}
                                className="px-3 py-1 rounded-xl bg-accentPrimary text-white text-xs font-bold hover:bg-accentPrimary/90 transition"
                              >
                                Inspect Dossier
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectCustomer(c);
                                  onNavigateTab('actions');
                                }}
                                className="px-2.5 py-1 rounded-xl bg-bgMain border border-borderSubtle hover:border-accentPrimary text-textPrimary text-xs font-semibold transition"
                              >
                                Dispatch ⚡
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Page Size Toolbar */}
            <div className="p-4 border-t border-borderSubtle bg-bgMain/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-textSecondary text-[11px] font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Showing <strong className="text-textPrimary font-bold">{totalRecords === 0 ? 0 : startIndex + 1}</strong> to{' '}
                <strong className="text-textPrimary font-bold">{Math.min(startIndex + effectivePageSize, totalRecords)}</strong> of{' '}
                <strong className="text-textPrimary font-bold">{totalRecords}</strong> Accounts
              </div>

              <div className="flex items-center gap-3">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 text-xs text-textSecondary">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-bgMain border border-borderSubtle rounded-lg px-2 py-1 text-xs text-textPrimary font-bold focus:outline-none focus:border-accentPrimary"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                    <option value={99999}>Show All</option>
                  </select>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-bgMain border border-borderSubtle hover:bg-bgHover text-textPrimary disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-mono font-bold text-xs text-textPrimary">
                    {currentPage} / {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg bg-bgMain border border-borderSubtle hover:bg-bgHover text-textPrimary disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Add Customer Modal */}
          <AddCustomerModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onCustomerAdded={(newCust) => {
              onSelectCustomer(newCust);
              loadCustomers();
            }}
          />
        </div>
      )}

      {/* Sub-Feature 2.2: Deep-Dive Customer Dossier Workspace */}
      {subFeature === 'dossier' && (
        <div className="space-y-6 animate-fade-up">
          {loading || !c360Data ? (
            <div className="p-8 text-center animate-pulse text-textSecondary">Loading Customer 360 Dossier...</div>
          ) : (
            <div className="space-y-6">
              {/* Executive Dossier Header Card */}
              <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 font-black text-indigo-400 text-2xl flex items-center justify-center shadow-inner">
                    {c360Data.profile.first_name[0]}{c360Data.profile.last_name[0]}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-textPrimary">
                        {c360Data.profile.first_name} {c360Data.profile.last_name}
                      </h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-bgMain border border-borderSubtle text-textSecondary">
                        {c360Data.profile.external_customer_id}
                      </span>
                    </div>
                    <p className="text-xs text-textSecondary flex items-center gap-3">
                      <span>{c360Data.profile.email}</span>
                      <span>•</span>
                      <span>{c360Data.profile.phone || '+1 (555) 928-1002'}</span>
                      <span>•</span>
                      <span>Age {c360Data.profile.age || 35} ({c360Data.profile.gender || 'Male'})</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={(c360Data.profile.customer_status || '').toLowerCase().includes('risk') ? 'error' : 'success'}>
                    {c360Data.profile.customer_status}
                  </Badge>
                  <button
                    onClick={() => onNavigateTab('actions')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" /> Execute NBA
                  </button>
                </div>
              </div>

              {/* 6 RFM & Predictive Behavioral Features Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
                  <span className="text-[10px] font-bold uppercase text-textSecondary block">Recency</span>
                  <div className="text-xl font-black text-textPrimary">{c360Data.features?.recency_days || 5} Days</div>
                  <span className="text-[9px] text-amber-500 block">Inactivity Counter</span>
                </div>
                <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
                  <span className="text-[10px] font-bold uppercase text-textSecondary block">Frequency</span>
                  <div className="text-xl font-black text-textPrimary">{c360Data.features?.frequency_count || 8} Orders</div>
                  <span className="text-[9px] text-emerald-400 block">Lifetime Purchases</span>
                </div>
                <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
                  <span className="text-[10px] font-bold uppercase text-textSecondary block">Total Spend</span>
                  <div className="text-xl font-black text-textPrimary">₹{(c360Data.features?.monetary_value || 25000).toLocaleString()}</div>
                  <span className="text-[9px] text-emerald-400 block">Monetary Value</span>
                </div>
                <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
                  <span className="text-[10px] font-bold uppercase text-textSecondary block">Estimated CLV</span>
                  <div className="text-xl font-black text-indigo-400">₹{(c360Data.features?.estimated_clv || 45000).toLocaleString()}</div>
                  <span className="text-[9px] text-indigo-400 block">Projected Value</span>
                </div>
                <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
                  <span className="text-[10px] font-bold uppercase text-textSecondary block">Cart Abandons</span>
                  <div className="text-xl font-black text-rose-400">{c360Data.features?.cart_abandonment_count || 2} Carts</div>
                  <span className="text-[9px] text-rose-400 block">High Intent Signals</span>
                </div>
                <div className="p-4 rounded-2xl bg-bgCard border border-borderSubtle space-y-1">
                  <span className="text-[10px] font-bold uppercase text-textSecondary block">Churn Risk</span>
                  <div className="text-xl font-black text-rose-500">
                    {Math.round((c360Data.predictions?.churn?.score || 0.042) * 100)}%
                  </div>
                  <span className="text-[9px] text-emerald-400 block">Propensity Score</span>
                </div>
              </div>

              {/* Transactions History Table */}
              <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
                  <h3 className="text-xs font-bold uppercase text-textSecondary tracking-wider flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" /> Recent Transactions History
                  </h3>
                  <span className="text-xs font-mono text-textSecondary">{c360Data.recent_transactions.length} Records</span>
                </div>
                <div className="space-y-2">
                  {c360Data.recent_transactions.map((tx) => (
                    <div key={tx.id} className="p-3.5 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between text-xs hover:border-emerald-500/30 transition">
                      <div>
                        <div className="font-bold text-textPrimary">{tx.product_name}</div>
                        <div className="text-[10px] text-textSecondary font-mono">{tx.reference_id || 'REF-889021'} • {tx.category} • {tx.channel}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-textPrimary">₹{tx.amount.toLocaleString()}</div>
                        <span className="text-[10px] text-emerald-400 font-semibold">{tx.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Interactions Feed */}
              {c360Data.recent_interactions && c360Data.recent_interactions.length > 0 && (
                <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold uppercase text-textSecondary tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" /> Digital Touchpoints & Session Log
                  </h3>
                  <div className="space-y-2 text-xs">
                    {c360Data.recent_interactions.map((int) => (
                      <div key={int.id} className="p-3 rounded-xl bg-bgMain border border-borderSubtle flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                          <span className="font-bold text-textPrimary">{int.event_type}</span>
                          <span className="text-textSecondary">• {int.event_value}</span>
                        </div>
                        <span className="text-[10px] font-mono text-textSecondary">
                          {new Date(int.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sub-Feature 2.3: Risk & CLV Trajectory (30/60/90 days) */}
      {subFeature === 'trajectory' && (
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-6 animate-fade-up">
          <div className="flex items-center justify-between border-b border-borderSubtle pb-4">
            <div>
              <h3 className="text-base font-extrabold text-textPrimary flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accentPrimary" /> Risk & CLV Trajectory Forecast ({selectedCustomer?.first_name || 'Customer'})
              </h3>
              <p className="text-xs text-textSecondary mt-0.5">30-day churn risk, 60-day projected CLV, and 90-day purchase propensity forecast</p>
            </div>
            <span className="text-xs text-textSecondary font-mono px-3 py-1 bg-bgMain rounded-xl border border-borderSubtle">
              {selectedCustomer?.external_customer_id}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-5 rounded-2xl bg-bgMain border border-borderSubtle space-y-2">
              <span className="text-xs text-textSecondary uppercase font-bold block">30-Day Risk Trajectory</span>
              <span className="text-2xl font-black text-rose-400 block">
                {c360Data?.predictions?.churn ? `${(c360Data.predictions.churn.score * 100).toFixed(1)}% (${c360Data.predictions.churn.predicted_class})` : '78.4% (High Risk)'}
              </span>
              <p className="text-[10px] text-textSecondary">Evaluated via trained XGBoost ML pipeline</p>
            </div>

            <div className="p-5 rounded-2xl bg-bgMain border border-borderSubtle space-y-2">
              <span className="text-xs text-textSecondary uppercase font-bold block">60-Day Projected CLV</span>
              <span className="text-2xl font-black text-indigo-400 block">
                ₹{(c360Data?.features?.estimated_clv || 68500).toLocaleString()}
              </span>
              <p className="text-[10px] text-textSecondary">Calculated from order frequency & avg order value</p>
            </div>

            <div className="p-5 rounded-2xl bg-bgMain border border-borderSubtle space-y-2">
              <span className="text-xs text-textSecondary uppercase font-bold block">90-Day Purchase Intent</span>
              <span className="text-2xl font-black text-emerald-400 block">
                {c360Data?.predictions?.purchase_propensity ? `${(c360Data.predictions.purchase_propensity.score * 100).toFixed(1)}% High Intent` : '92.5% High Intent'}
              </span>
              <p className="text-[10px] text-textSecondary">High intent to upgrade / purchase next category</p>
            </div>
          </div>

          {/* AI Trajectory Insights */}
          <div className="p-4 rounded-2xl bg-bgMain border border-borderSubtle space-y-2 text-xs">
            <div className="font-bold text-textPrimary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accentCyan" /> Executive Trajectory Summary
            </div>
            <p className="text-textSecondary leading-relaxed">
              Customer <strong className="text-textPrimary">{selectedCustomer?.first_name} {selectedCustomer?.last_name}</strong> maintains a positive lifetime value projection of ₹{(c360Data?.features?.estimated_clv || 45000).toLocaleString()} with high purchase intent ({Math.round((c360Data?.predictions?.purchase_propensity?.score || 0.925) * 100)}%). Executing the recommended Next Best Action within 72 hours will optimize account retention and mitigate risk drift.
            </p>
          </div>
        </div>
      )}

      {/* Sub-Feature 2.4: Lookalike & Cohorts Discovery */}
      {subFeature === 'cohorts' && (
        <div className="bg-bgCard border border-borderSubtle rounded-2xl p-6 shadow-sm space-y-6 animate-fade-up">
          <div className="flex items-center justify-between border-b border-borderSubtle pb-4">
            <div>
              <h3 className="text-base font-extrabold text-textPrimary flex items-center gap-2">
                <Layers className="w-5 h-5 text-accentCyan" /> Lookalike & Cohort Discovery
              </h3>
              <p className="text-xs text-textSecondary mt-0.5">Automated customer segmentation based on RFM features, purchase frequency, and cart abandonment behavior</p>
            </div>
          </div>

          {/* Lookalike Match Pill for Selected Customer */}
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-textPrimary flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="font-bold text-indigo-400">Current Customer Lookalike Match:</span>
                <span className="ml-2 font-semibold">{selectedCustomer?.first_name || 'Customer'} matches <strong className="text-emerald-400">Cohort B (VIP Champions / High Intent)</strong> with 94.2% confidence score.</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('actions')}
              className="px-3 py-1.5 rounded-xl bg-accentPrimary hover:bg-accentPrimary/90 text-white font-bold text-xs shadow-xs transition shrink-0"
            >
              Target Cohort ⚡
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-bgMain border border-borderSubtle space-y-2 hover:border-accentPrimary/40 transition">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-rose-400 text-sm">Cohort A: High Value At-Risk</span>
                <Badge variant="error">1,240 Accounts</Badge>
              </div>
              <p className="text-textSecondary">Avg Spend ₹45,000 • Inactivity Recency &gt; 35 Days • Churn Risk &gt; 65%</p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-textSecondary">Primary Driver: <strong className="text-textPrimary">Prolonged Inactivity</strong></span>
                <span className="text-indigo-400 font-semibold">Action: VIP Concierge Pass</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bgMain border border-borderSubtle space-y-2 hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-400 text-sm">Cohort B: VIP Champions</span>
                <Badge variant="success">620 Accounts</Badge>
              </div>
              <p className="text-textSecondary">Avg Spend ₹1,20,000 • Inactivity Recency &lt; 5 Days • High Loyalty</p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-textSecondary">Primary Driver: <strong className="text-textPrimary">High Order Frequency</strong></span>
                <span className="text-emerald-400 font-semibold">Action: Early Access Preview</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bgMain border border-borderSubtle space-y-2 hover:border-amber-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-400 text-sm">Cohort C: High-Intent Cart Abandoners</span>
                <Badge variant="warning">480 Accounts</Badge>
              </div>
              <p className="text-textSecondary">Avg Spend ₹28,000 • Abandoned &gt; 2 Carts • Recency &lt; 14 Days</p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-textSecondary">Primary Driver: <strong className="text-textPrimary">Cart Abandonment</strong></span>
                <span className="text-amber-400 font-semibold">Action: 20% Cart Recovery Discount</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bgMain border border-borderSubtle space-y-2 hover:border-accentPrimary/40 transition">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-400 text-sm">Cohort D: Dormant Winback Candidates</span>
                <Badge variant="info">890 Accounts</Badge>
              </div>
              <p className="text-textSecondary">Avg Spend ₹18,000 • Inactivity Recency &gt; 60 Days • Low Touch</p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-textSecondary">Primary Driver: <strong className="text-textPrimary">Dormancy</strong></span>
                <span className="text-indigo-400 font-semibold">Action: Re-activation Campaign</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
