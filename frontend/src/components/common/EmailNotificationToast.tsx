import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, ExternalLink, X, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthEmailNotification } from '../../types/api';

export const EmailNotificationToast: React.FC = () => {
  const { lastDispatchedEmail, clearLastDispatchedEmail, setIsEmailModalOpen } = useAuth();
  const [notification, setNotification] = useState<AuthEmailNotification | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastDispatchedEmail) {
      setNotification(lastDispatchedEmail);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 9000);

      return () => clearTimeout(timer);
    }
  }, [lastDispatchedEmail]);

  useEffect(() => {
    const handleCustomEvent = (e: any) => {
      if (e.detail) {
        setNotification(e.detail);
        setVisible(true);
      }
    };

    window.addEventListener('c360_security_email_sent', handleCustomEvent);
    return () => window.removeEventListener('c360_security_email_sent', handleCustomEvent);
  }, []);

  if (!visible || !notification) return null;

  const isEthereal = !!notification.previewUrl;

  return (
    <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="rounded-2xl bg-bgCard border border-borderDefault shadow-2xl p-4.5 text-textPrimary relative overflow-hidden group">
        {/* Glow border line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brandPrimary via-aiAccent to-brandPrimary" />

        <div className="flex items-start gap-3.5">
          {/* Animated Icon Avatar */}
          <div className="w-10 h-10 rounded-xl bg-brandPrimary/10 border border-brandPrimary/20 flex items-center justify-center shrink-0 text-brandPrimary">
            <Mail className="w-5 h-5" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-brandPrimary dark:text-aiAccent flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Post-Login Security Alert
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-successSoft text-successPrimary border border-successBorder">
                  Sent
                </span>
              </div>
              <button
                onClick={() => {
                  setVisible(false);
                  clearLastDispatchedEmail();
                }}
                className="text-textTertiary hover:text-textPrimary p-1 rounded-lg transition"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-textSecondary mt-1 leading-relaxed">
              Security notification email dispatched to{' '}
              <strong className="text-textPrimary font-semibold">{notification.recipient}</strong>.
            </p>

            {/* Quick Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEmailModalOpen(true);
                  setVisible(false);
                }}
                className="text-[11px] font-bold bg-brandPrimary text-textInverse hover:bg-brandHover px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
              >
                <Eye className="w-3 h-3" /> Inspect Email & Logs
              </button>

              {isEthereal && (
                <a
                  href={notification.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold bg-aiSoft dark:bg-aiSoft/30 text-aiText border border-aiBorder px-2.5 py-1.5 rounded-lg flex items-center gap-1 hover:opacity-90 transition"
                >
                  <ExternalLink className="w-3 h-3" /> Live Inbox
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
