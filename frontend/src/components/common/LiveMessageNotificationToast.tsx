import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, Send, CheckCircle2, X, Sparkles, Smartphone, BellRing } from 'lucide-react';
import { CustomerProfile } from '../../types/api';

export interface ToastMessage {
  id: string;
  channel: 'WhatsApp' | 'Email' | 'SMS' | string;
  recipient: string;
  customerName: string;
  offer: string;
  message_body: string;
  gateway: string;
  timestamp: string;
}

interface LiveMessageNotificationToastProps {
  selectedCustomer: CustomerProfile | null;
}

export const LiveMessageNotificationToast: React.FC<LiveMessageNotificationToastProps> = ({ selectedCustomer }) => {
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(null);
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [customerOpened, setCustomerOpened] = useState<boolean>(false);

  useEffect(() => {
    const handleDispatchEvent = (event: CustomEvent<ToastMessage>) => {
      const payload = event.detail;
      // Trigger notification in 1.5s to simulate carrier/gateway delivery
      setTimeout(() => {
        setActiveToast(payload);
        setToastVisible(true);
        setCustomerOpened(false);
      }, 1200);
    };

    window.addEventListener('c360_message_dispatched' as any, handleDispatchEvent);
    return () => {
      window.removeEventListener('c360_message_dispatched' as any, handleDispatchEvent);
    };
  }, []);

  if (!toastVisible || !activeToast) return null;

  const isWhatsApp = activeToast.channel.toLowerCase().includes('whatsapp');
  const isEmail = activeToast.channel.toLowerCase().includes('email');

  return (
    <div className="fixed top-20 right-4 z-50 max-w-md w-full animate-fade-down select-none">
      <div className="bg-slate-900 text-white border border-emerald-500/40 rounded-2xl p-4 shadow-2xl space-y-3 relative overflow-hidden backdrop-blur-md">
        {/* Top Header Row */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              isWhatsApp ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              isEmail ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
              'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {isWhatsApp ? <MessageSquare className="w-4 h-4" /> : isEmail ? <Mail className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                Customer Received {activeToast.channel} Message!
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">
                Delivered via {activeToast.gateway} • Just Now
              </span>
            </div>
          </div>
          <button
            onClick={() => setToastVisible(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Phone Notification Mock */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-emerald-400 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" /> To: {activeToast.customerName} ({activeToast.recipient})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">2s ago</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200 leading-relaxed">
            "{activeToast.message_body}"
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-1">
          {customerOpened ? (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Customer Opened Message & Redeemed Offer! (+₹4,800)
            </div>
          ) : (
            <button
              onClick={() => setCustomerOpened(true)}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Simulate Customer Opening Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
