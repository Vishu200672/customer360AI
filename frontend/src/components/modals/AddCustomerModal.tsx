import React, { useState } from 'react';
import { UserPlus, X, Check, Loader2, Sparkles } from 'lucide-react';
import { CreateCustomerInput, CustomerProfile } from '../../types/api';
import { api } from '../../services/api';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded: (customer: CustomerProfile) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerAdded,
}) => {
  const [formData, setFormData] = useState<CreateCustomerInput>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    age: 35,
    gender: 'Female',
    acquisition_channel: 'Paid Search',
    customer_status: 'Active',
    recency_days: 5,
    frequency_count: 8,
    monetary_value: 25000,
    cart_abandonment_count: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError('Please fill in First Name, Last Name, and Email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newCustomer = await api.createCustomer(formData);
      onCustomerAdded(newCustomer);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create customer entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200">
      <div className="bg-bgCard border border-borderSubtle rounded-2xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-borderSubtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accentPrimary/10 text-accentPrimary border border-accentPrimary/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-textPrimary flex items-center gap-2">
                Live Customer Entry
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  <Sparkles className="w-3 h-3" /> Live Inference
                </span>
              </h3>
              <p className="text-xs text-textSecondary">
                Create a persistent customer entry for real-time 360 AI prediction.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-textSecondary hover:text-textPrimary hover:bg-bgHover rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-textSecondary mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="e.g. Priya"
                className="w-full px-3 py-2 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-textSecondary mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="e.g. Mehta"
                className="w-full px-3 py-2 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-textSecondary mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="priya.mehta@enterprise.io"
                className="w-full px-3 py-2 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-textSecondary mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 987-6543"
                className="w-full px-3 py-2 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-textSecondary mb-1">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-textSecondary mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-Binary">Non-Binary</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-textSecondary mb-1">Status</label>
              <select
                value={formData.customer_status}
                onChange={(e) => setFormData({ ...formData, customer_status: e.target.value })}
                className="w-full px-3 py-2 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary"
              >
                <option value="Active">Active</option>
                <option value="At-Risk">At-Risk</option>
                <option value="VIP / Active">VIP / Active</option>
                <option value="Dormant">Dormant</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-borderSubtle">
            <h4 className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2">
              Behavioral Signals (For Live AI Inference)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-textSecondary mb-1">Recency (Days)</label>
                <input
                  type="number"
                  value={formData.recency_days}
                  onChange={(e) => setFormData({ ...formData, recency_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-textSecondary mb-1">Spend ($)</label>
                <input
                  type="number"
                  value={formData.monetary_value}
                  onChange={(e) => setFormData({ ...formData, monetary_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-textSecondary mb-1">Cart Abandonments</label>
                <input
                  type="number"
                  value={formData.cart_abandonment_count}
                  onChange={(e) => setFormData({ ...formData, cart_abandonment_count: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-bgMain border border-borderSubtle rounded-xl text-textPrimary text-xs focus:outline-none focus:border-accentPrimary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderSubtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-textSecondary hover:text-textPrimary hover:bg-bgHover rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-accentPrimary hover:bg-accentPrimary/90 disabled:opacity-50 rounded-xl shadow-md shadow-accentPrimary/20 flex items-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Live Record...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save & Trigger AI Inference
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
