import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  ShieldCheck,
  Send,
  ExternalLink,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Laptop,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { EmailLog } from '../../types/api';
import { useAuth } from '../../context/AuthContext';

interface EmailLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailLogsModal: React.FC<EmailLogsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'logs' | 'preview' | 'test'>('logs');
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Test email form state
  const [testEmail, setTestEmail] = useState(user?.email || '');
  const [testSubject, setTestSubject] = useState('🛡️ Manual Security Dispatch Test');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getEmailLogs();
      setLogs(data);
      if (data.length > 0 && !selectedLog) {
        setSelectedLog(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load email logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      if (user?.email) {
        setTestEmail(user.email);
      }
    }
  }, [isOpen, user]);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      setTestError('Please enter a valid email address.');
      return;
    }

    setIsSendingTest(true);
    setTestError(null);
    setTestSuccessMessage(null);

    try {
      const newLog = await api.sendTestEmail(testEmail, testSubject);
      setTestSuccessMessage(`Security notification email successfully dispatched to ${testEmail}!`);
      await fetchLogs();
      setSelectedLog(newLog);
    } catch (err: any) {
      setTestError(err.message || 'Failed to dispatch test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-bgCard rounded-3xl border border-borderDefault shadow-2xl flex flex-col overflow-hidden text-textPrimary">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-bgMain border-b border-borderSubtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brandPrimary/10 dark:bg-brandPrimary/25 border border-brandPrimary/30 flex items-center justify-center text-brandPrimary">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-textPrimary">Email Dispatcher & Security Audit</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-aiSoft text-aiText border border-aiBorder">
                  Live Notifications
                </span>
              </div>
              <p className="text-xs text-textSecondary">
                Automated security emails dispatched upon authentication & account activity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-2 rounded-xl border border-borderSubtle text-textSecondary hover:text-textPrimary hover:bg-bgHover transition"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-borderSubtle text-textSecondary hover:text-textPrimary hover:bg-bgHover transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-borderSubtle bg-bgSidebar gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'logs'
                ? 'border-brandPrimary text-brandPrimary font-bold'
                : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Dispatched Email Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'preview'
                ? 'border-brandPrimary text-brandPrimary font-bold'
                : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> HTML Email Preview
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'test'
                ? 'border-brandPrimary text-brandPrimary font-bold'
                : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Test Email Sender
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* TAB 1: LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-textTertiary">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-semibold">No emails dispatched yet</p>
                  <p className="text-xs mt-1">Log in or use the Test tab to trigger a security notification email.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-brandPrimary/5 dark:bg-brandPrimary/15 border-brandPrimary shadow-sm'
                            : 'bg-bgMain/60 border-borderSubtle hover:border-borderDefault hover:bg-bgHover'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brandPrimary/10 border border-brandPrimary/20 flex items-center justify-center shrink-0 text-brandPrimary">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-textPrimary">{log.subject}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-successSoft text-successPrimary border border-successBorder">
                                {log.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-textSecondary mt-1">
                              <span>Recipient: <strong className="text-textPrimary">{log.to}</strong></span>
                              <span>&bull;</span>
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                              {log.meta?.ip && (
                                <>
                                  <span>&bull;</span>
                                  <span className="font-mono text-[10px] text-aiText">IP: {log.meta.ip}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {log.previewUrl && (
                            <a
                              href={log.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] font-bold text-aiText bg-aiSoft border border-aiBorder px-2.5 py-1 rounded-lg flex items-center gap-1 hover:opacity-90"
                            >
                              <ExternalLink className="w-3 h-3" /> View In Inbox
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setActiveTab('preview');
                            }}
                            className="text-[11px] font-bold text-textPrimary bg-bgCard border border-borderSubtle hover:bg-bgHover px-2.5 py-1 rounded-lg flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Preview
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HTML PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {selectedLog ? (
                <div>
                  <div className="p-3 bg-bgMain rounded-xl border border-borderSubtle mb-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-textSecondary">Subject: </span>
                      <strong className="text-textPrimary">{selectedLog.subject}</strong>
                      <div className="text-textSecondary text-[11px] mt-0.5">
                        To: {selectedLog.to} &bull; Sent: {new Date(selectedLog.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {selectedLog.previewUrl && (
                      <a
                        href={selectedLog.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-aiText bg-aiSoft border border-aiBorder px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Ethereal Inbox
                      </a>
                    )}
                  </div>

                  <div className="rounded-2xl border border-borderDefault overflow-hidden bg-bgMain shadow-inner">
                    <iframe
                      srcDoc={selectedLog.htmlPreview || '<p>No preview available</p>'}
                      title="Email Preview"
                      className="w-full h-[500px] border-0"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-textTertiary">
                  <p className="text-sm">Select an email from the Logs tab to preview its rendered HTML.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEST EMAIL SENDER */}
          {activeTab === 'test' && (
            <div className="max-w-xl mx-auto py-4">
              <div className="p-4 rounded-2xl bg-brandPrimary/5 border border-brandPrimary/20 mb-6 flex items-start gap-3">
                <Laptop className="w-5 h-5 text-brandPrimary shrink-0 mt-0.5" />
                <div className="text-xs text-textSecondary leading-relaxed">
                  <strong className="text-textPrimary block mb-0.5">Live Notification Testing Engine</strong>
                  Send an authentic login notification security alert directly to any recipient email address. If SMTP
                  is configured in <code className="font-mono text-aiText">.env</code>, it delivers to real inboxes.
                  Otherwise, it generates a full sandbox preview link.
                </div>
              </div>

              {testSuccessMessage && (
                <div className="p-4 rounded-2xl bg-successSoft border border-successBorder text-successPrimary text-xs font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {testSuccessMessage}
                </div>
              )}

              {testError && (
                <div className="p-4 rounded-2xl bg-riskSoft border border-riskBorder text-riskPrimary text-xs font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {testError}
                </div>
              )}

              <form onSubmit={handleSendTestEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-textPrimary mb-1.5">Recipient Email Address</label>
                  <input
                    type="email"
                    required
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="youremail@domain.com"
                    className="w-full px-4 py-3 rounded-xl bg-bgMain border border-borderDefault text-textPrimary text-xs focus:outline-none focus:border-brandPrimary transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textPrimary mb-1.5">Notification Subject</label>
                  <input
                    type="text"
                    required
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-bgMain border border-borderDefault text-textPrimary text-xs focus:outline-none focus:border-brandPrimary transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="w-full py-3.5 rounded-xl bg-brandPrimary hover:bg-brandHover text-textInverse text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Send className={`w-4 h-4 ${isSendingTest ? 'animate-spin' : ''}`} />
                  {isSendingTest ? 'Dispatching Notification...' : 'Dispatch Security Alert Email'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
