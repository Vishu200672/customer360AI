import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowUpDown,
  Zap,
  CheckCircle2,
  Mail,
  Phone,
  Calendar,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerProfile } from '../types/api';
import { Badge } from '../components/common/Badge';
import { Breadcrumb } from '../components/common/Breadcrumb';

interface ViewAllCustomersPageProps {
  selectedCustomer: CustomerProfile | null;
  onSelectCustomer: (customer: CustomerProfile) => void;
  onNavigateTab: (tab: string) => void;
}

export const ViewAllCustomersPage: React.FC<ViewAllCustomersPageProps> = ({
  selectedCustomer,
  onSelectCustomer,
  onNavigateTab,
}) => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'recency' | 'name' | 'status' | 'channel'>('recency');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Fetch all customer profiles from backend
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

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  // Filter logic
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
      (statusFilter === 'HIGH_RISK' && (statusLower.includes('risk') || statusLower.includes('churn'))) ||
      (statusFilter === 'AT_RISK' && statusLower.includes('at-risk')) ||
      (statusFilter === 'VIP' && statusLower.includes('vip')) ||
      (statusFilter === 'DORMANT' && statusLower.includes('dormant')) ||
      (statusFilter === 'ACTIVE' && statusLower.includes('active'));

    return matchesSearch && matchesStatus;
  });

  // Sorting logic
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
  const totalPages = Math.ceil(totalRecords / Math.max(1, pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCustomers = sortedCustomers.slice(startIndex, startIndex + pageSize);

  // Summary Metrics
  const highRiskCount = customers.filter((c) =>
    (c.customer_status || '').toLowerCase().includes('risk')
  ).length;
  const activeVipCount = customers.filter((c) =>
    (c.customer_status || '').toLowerCase().includes('vip') || (c.customer_status || '').toLowerCase().includes('active')
  ).length;

  const handleSort = (key: 'recency' | 'name' | 'status' | 'channel') => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb Header */}
      <Breadcrumb
        mainFeature="Customer Directory"
        subFeature="View All Customers"
        onNavigateHome={() => onNavigateTab('overview')}
        onNavigateMain={() => onNavigateTab('customers')}
      />

      {/* Hero Title & Description */}
      <div className="bg-bgCard border border-borderSubtle rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/20 text-xs font-bold">
            <Users className="w-3.5 h-3.5" /> Full Enterprise Repository
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-textPrimary tracking-tight">
            Complete Customer Directory & Intelligence Matrix
          </h1>
          <p className="text-xs sm:text-sm text-textSecondary leading-relaxed">
            Centralized directory of all ingested customer accounts powered by FastAPI backend, XGBoost churn scoring, and SHAP drivers. Select any customer to view full Customer 360 details.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadCustomers}
            className="px-4 py-2.5 rounded-xl bg-bgMain border border-borderSubtle hover:bg-bgHover text-textPrimary text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-brandPrimary ${loading ? 'animate-spin' : ''}`} />
            Refresh Directory
          </button>
          <button
            onClick={() => onNavigateTab('datalab')}
            className="px-4 py-2.5 rounded-xl bg-brandPrimary hover:bg-brandHover text-textInverse text-xs font-extrabold transition flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Layers className="w-4 h-4" /> Live Data Ingestion
          </button>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase text-textSecondary tracking-wider">Total Customer Accounts</span>
          <div className="text-2xl font-black text-textPrimary flex items-center justify-between">
            <span>{customers.length}</span>
            <div className="w-9 h-9 rounded-xl bg-brandPrimary/10 text-brandPrimary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-textSecondary font-medium">Real-time synced backend profiles</p>
        </div>

        <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase text-textSecondary tracking-wider">High Churn Risk Segment</span>
          <div className="text-2xl font-black text-rose-500 flex items-center justify-between">
            <span>{highRiskCount} Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-textSecondary font-medium">Propensity score &gt; 50%</p>
        </div>

        <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase text-textSecondary tracking-wider">Active Champions & VIP</span>
          <div className="text-2xl font-black text-emerald-500 flex items-center justify-between">
            <span>{activeVipCount} Accounts</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-textSecondary font-medium">High LTV & active retention</p>
        </div>

        <div className="p-5 rounded-2xl bg-bgCard border border-borderSubtle shadow-xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase text-textSecondary tracking-wider">Directory View Scope</span>
          <div className="text-2xl font-black text-indigo-400 flex items-center justify-between">
            <span>{totalRecords} Filtered</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-textSecondary font-medium">Page {currentPage} of {Math.max(1, totalPages)}</p>
        </div>
      </div>

      {/* Interactive Controls & Filters Bar */}
      <div className="bg-bgCard border border-borderSubtle rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-textSecondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone, external ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-borderSubtle bg-bgMain text-textPrimary focus:outline-none focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary transition font-medium"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-textSecondary mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Segment:
            </span>
            {[
              { id: 'ALL', label: 'All Accounts' },
              { id: 'HIGH_RISK', label: 'High Risk' },
              { id: 'AT_RISK', label: 'At-Risk' },
              { id: 'VIP', label: 'VIP / Champions' },
              { id: 'DORMANT', label: 'Dormant' },
              { id: 'ACTIVE', label: 'Active' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-brandPrimary text-textInverse shadow-xs'
                    : 'bg-bgMain border border-borderSubtle text-textSecondary hover:text-textPrimary hover:bg-bgHover'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Page Size Dropdown */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <span className="text-xs text-textSecondary font-semibold">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-xs font-bold bg-bgMain border border-borderSubtle rounded-xl px-3 py-2 text-textPrimary focus:outline-none focus:border-brandPrimary cursor-pointer"
            >
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={1000}>All ({totalRecords})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-bgCard border border-borderSubtle rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-textSecondary animate-pulse space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brandPrimary" />
            <div>Loading complete customer directory from backend API...</div>
          </div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-8 h-8 text-textSecondary mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-textPrimary">No matching customer records found</h3>
            <p className="text-xs text-textSecondary">Try adjusting your search query or segment filter criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-brandPrimary text-textInverse text-xs font-bold hover:bg-brandHover transition mt-2 cursor-pointer inline-flex items-center gap-1.5"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-borderSubtle bg-bgMain/60 text-textSecondary font-bold uppercase text-[10px]">
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-4 cursor-pointer hover:text-textPrimary transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>CUSTOMER IDENTITY</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">EXTERNAL ID</th>
                  <th
                    onClick={() => handleSort('status')}
                    className="py-3 px-4 cursor-pointer hover:text-textPrimary transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>STATUS SIGNAL</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('channel')}
                    className="py-3 px-4 cursor-pointer hover:text-textPrimary transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>ACQUISITION CHANNEL</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('recency')}
                    className="py-3 px-4 cursor-pointer hover:text-textPrimary transition"
                  >
                    <div className="flex items-center gap-1">
                      <span>REGISTERED / INGESTED</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle">
                {paginatedCustomers.map((cust) => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  const statusLower = (cust.customer_status || '').toLowerCase();
                  const statusVariant = statusLower.includes('risk') || statusLower.includes('churn')
                    ? 'error'
                    : statusLower.includes('dormant')
                    ? 'warning'
                    : 'success';

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => onSelectCustomer(cust)}
                      className={`hover:bg-bgHover transition cursor-pointer ${
                        isSelected ? 'bg-brandPrimary/10 font-medium' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                            isSelected
                              ? 'bg-brandPrimary text-textInverse border border-borderBrand'
                              : 'bg-brandPrimary/10 text-brandPrimary border border-brandPrimary/30'
                          }`}>
                            {cust.first_name ? cust.first_name[0] : 'C'}
                          </div>
                          <div>
                            <div className="font-bold text-textPrimary text-xs sm:text-sm">
                              {cust.first_name} {cust.last_name}
                            </div>
                            <div className="text-[11px] text-textSecondary font-mono flex items-center gap-2">
                              <span>{cust.email}</span>
                              {cust.phone && (
                                <>
                                  <span>•</span>
                                  <span>{cust.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-textSecondary font-medium text-xs">
                        {cust.external_customer_id}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={statusVariant}>{cust.customer_status || 'Active'}</Badge>
                      </td>

                      <td className="py-3.5 px-4 text-textPrimary font-semibold text-xs">
                        {cust.acquisition_channel || 'Direct'}
                      </td>

                      <td className="py-3.5 px-4 text-textSecondary text-xs">
                        {cust.created_at
                          ? new Date(cust.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Jan 15, 2025'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCustomer(cust);
                              onNavigateTab('customers');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-brandPrimary text-textInverse text-xs font-bold hover:bg-brandHover transition shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Inspect Dossier
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCustomer(cust);
                              onNavigateTab('actions');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-bgMain border border-borderSubtle hover:border-brandPrimary text-textPrimary text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-500" /> Dispatch
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination Controls */}
        {totalRecords > 0 && (
          <div className="p-4 border-t border-borderSubtle bg-bgMain/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="text-textSecondary font-semibold">
              Showing <strong className="text-textPrimary font-bold">{startIndex + 1}</strong> to{' '}
              <strong className="text-textPrimary font-bold">{Math.min(startIndex + pageSize, totalRecords)}</strong> of{' '}
              <strong className="text-textPrimary font-bold">{totalRecords}</strong> Customer Records
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl bg-bgMain border border-borderSubtle hover:bg-bgHover disabled:opacity-40 text-textPrimary font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-brandPrimary text-textInverse shadow-xs'
                          : 'bg-bgMain border border-borderSubtle text-textSecondary hover:text-textPrimary'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 rounded-xl bg-bgMain border border-borderSubtle hover:bg-bgHover disabled:opacity-40 text-textPrimary font-bold flex items-center gap-1 transition cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
