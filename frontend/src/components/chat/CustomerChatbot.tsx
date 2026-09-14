import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Phone,
  RefreshCw,
  User,
  Bot,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  api,
  ChatResponse,
  ChatMessagePreview,
  ChatbotStatusResponse,
} from '../../services/api';
import { CustomerProfile } from '../../types/api';

// ============================================================================
// Types
// ============================================================================

export interface CustomerChatbotProps {
  selectedCustomer?: CustomerProfile | null;
}

interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  intent?: string;
  key_metrics?: Record<string, any>;
  decision?: any;
  message_preview?: ChatMessagePreview;
  requires_confirmation?: boolean;
  suggested_actions?: Array<{ label: string; action: string; prompt?: string }>;
  dispatch_receipt?: any;
  llm_used?: boolean;
  timestamp: string;
}

export const CustomerChatbot: React.FC<CustomerChatbotProps> = ({ selectedCustomer }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<ChatbotStatusResponse | null>(null);
  const [botName, setBotName] = useState<string>('Customer Intelligence');

  // Draggable Floating Button Position State
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState<boolean>(false);

  useEffect(() => {
    const initPos = () => {
      if (!position) {
        setPosition({
          x: Math.max(16, window.innerWidth - 80),
          y: Math.max(16, window.innerHeight - 80),
        });
      }
    };
    initPos();
    window.addEventListener('resize', initPos);
    return () => window.removeEventListener('resize', initPos);
  }, [position]);

  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setHasMoved(false);
    const currX = position?.x ?? (window.innerWidth - 80);
    const currY = position?.y ?? (window.innerHeight - 80);
    setDragStartOffset({
      x: clientX - currX,
      y: clientY - currY,
    });
  };

  useEffect(() => {
    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      setHasMoved(true);
      const newX = Math.min(Math.max(16, clientX - dragStartOffset.x), window.innerWidth - 72);
      const newY = Math.min(Math.max(16, clientY - dragStartOffset.y), window.innerHeight - 72);
      setPosition({ x: newX, y: newY });
    };

    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onPointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onPointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [isDragging, dragStartOffset]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: 'Hello! I am your Customer Intelligence Assistant. Ask me anything about customer churn, lifetime value, risk drivers, or automated retention actions.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Load chatbot operational status on open
  useEffect(() => {
    if (isOpen && !botStatus) {
      api.getChatbotStatus()
        .then((status) => {
          setBotStatus(status);
          if (status.bot_name) {
            setBotName(status.bot_name);
          }
        })
        .catch(() => {
          // Non-blocking fallback
        });
    }
  }, [isOpen, botStatus]);

  // Scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opening panel
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || isLoading) return;

    const userMessageItem: ChatMessageItem = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessageItem]);
    if (!customPrompt) setInputMessage('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response: ChatResponse = await api.sendChatMessage(
        textToSend,
        selectedCustomer?.id,
        {
          customer_id: selectedCustomer?.id,
          customer_name: selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : undefined,
        }
      );

      if (response.bot_name) {
        setBotName(response.bot_name);
      }

      const botMessageItem: ChatMessageItem = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: response.answer || 'Analysis complete.',
        intent: response.intent,
        key_metrics: response.key_metrics,
        decision: response.decision,
        message_preview: response.message_preview,
        requires_confirmation: response.requires_confirmation,
        suggested_actions: response.suggested_actions,
        dispatch_receipt: response.dispatch_receipt,
        llm_used: response.llm_used,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessageItem]);
    } catch (err: any) {
      console.error('Chatbot API error:', err);
      setErrorMessage(err.message || 'Unable to communicate with the intelligence service. Please check your session and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDispatch = async (preview: ChatMessagePreview) => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response: ChatResponse = await api.sendChatMessage(
        `Confirm and dispatch ${preview.channel} offer to ${preview.recipient}`,
        selectedCustomer?.id,
        undefined,
        {
          confirmed: true,
          channel: preview.channel,
          recipient: preview.recipient,
          offer: preview.offer,
          message_body: preview.message_body,
        }
      );

      const assistantMessageItem: ChatMessageItem = {
        id: `msg_asst_receipt_${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        intent: response.intent,
        dispatch_receipt: response.dispatch_receipt,
        key_metrics: response.key_metrics,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessageItem]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Contextual starter prompts
  const starterPrompts = selectedCustomer
    ? [
        `Analyze ${selectedCustomer.first_name}'s 360 profile`,
        `Why is ${selectedCustomer.first_name} at risk?`,
        `What is the revenue at risk for ${selectedCustomer.first_name}?`,
        `What is the recommended Next Best Action?`,
        `Draft a retention WhatsApp message for ${selectedCustomer.first_name}`,
      ]
    : [
        'Who are the top at-risk customer accounts?',
        'What is the total portfolio revenue at risk?',
        'Show customers with churn above 70%',
        'Which customers should we prioritize for retention?',
        'Show omnichannel dispatch status',
      ];

  return (
    <aside aria-label="Customer Intelligence Chatbot" className="select-none">
      {/* 1. Floating Launcher Button */}
      <button
        onMouseDown={(e) => {
          if (e.button === 0) handlePointerDown(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          if (e.touches.length > 0) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }}
        onClick={() => {
          if (!hasMoved) {
            setIsOpen(!isOpen);
          }
        }}
        style={position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
        aria-label={isOpen ? 'Close Customer Intelligence Chatbot' : 'Open Customer Intelligence Chatbot'}
        title="Click to open chatbot, Drag to move anywhere on screen"
        className={`fixed z-50 p-3.5 rounded-full shadow-2xl transition-shadow duration-300 flex items-center justify-center border cursor-grab active:cursor-grabbing ${
          !position ? 'bottom-6 right-6' : ''
        } ${
          isOpen
            ? 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
            : 'bg-brandPrimary text-white border-brandHover hover:bg-brandHover hover:scale-105 active:scale-95 shadow-brandPrimary/30'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          </div>
        )}
      </button>

      {/* 2. Floating Chatbot Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Customer Intelligence Assistant Panel"
          style={position ? {
            left: position.x > window.innerWidth / 2 ? `${Math.max(16, position.x - 380)}px` : `${Math.min(window.innerWidth - 440, position.x)}px`,
            top: position.y > window.innerHeight / 2 ? `${Math.max(16, position.y - 630)}px` : `${Math.min(window.innerHeight - 630, position.y + 60)}px`,
          } : undefined}
          className={`fixed z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-6.5rem)] bg-bgCard text-textPrimary rounded-3xl shadow-2xl border border-slate-700/60 flex flex-col overflow-hidden backdrop-blur-xl animate-fade-up ${
            !position ? 'bottom-20 right-4 sm:right-6' : ''
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-bgCanvas/90 border-b border-borderBorder/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brandPrimary/20 text-brandPrimary dark:text-aiAccent flex items-center justify-center border border-brandPrimary/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-textPrimary">{botName}</h2>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                  {botStatus?.whatsapp_mode === 'demo' && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Demo Mode
                    </span>
                  )}
                </div>
                {/* Active Customer Context Pill */}
                {selectedCustomer ? (
                  <div className="text-[11px] text-textSecondary flex items-center gap-1 mt-0.5">
                    <span>Context:</span>
                    <span className="font-semibold text-textPrimary">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </span>
                    <span className="text-[10px] text-textTertiary">({selectedCustomer.external_customer_id})</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-textSecondary mt-0.5">
                    Portfolio Mode (No customer selected)
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="p-1.5 rounded-lg text-textSecondary hover:text-textPrimary hover:bg-bgHover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-normal">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-brandPrimary/20 text-brandPrimary dark:text-aiAccent flex items-center justify-center shrink-0 mt-1 border border-brandPrimary/30">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Text Bubble */}
                  <div
                    className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-brandPrimary text-white rounded-tr-sm shadow-md'
                        : 'bg-bgHover/80 text-textPrimary border border-borderBorder/60 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Key Metrics Chips (Assistant Only) */}
                  {msg.key_metrics && Object.keys(msg.key_metrics).length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-bgCanvas/80 border border-borderBorder/60">
                      {Object.entries(msg.key_metrics).map(([key, val]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-[10px] text-textSecondary font-medium">{key}</span>
                          <span className="text-xs font-bold text-textPrimary truncate">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Decision NBA Card (Assistant Only) */}
                  {msg.decision && (
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Next Best Action</span>
                        {msg.decision.priority && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20">
                            {msg.decision.priority}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-xs text-textPrimary">{msg.decision.action}</div>
                      {msg.decision.offer && (
                        <div className="text-[11px] text-textSecondary">Offer: <span className="font-medium text-emerald-600 dark:text-emerald-400">{msg.decision.offer}</span></div>
                      )}
                    </div>
                  )}

                  {/* WhatsApp Interactive Preview Card */}
                  {msg.message_preview && msg.requires_confirmation && (
                    <div className="p-3 rounded-2xl bg-emerald-950/20 dark:bg-emerald-950/40 border border-emerald-500/40 text-textPrimary space-y-2.5">
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                          <Phone className="w-3.5 h-3.5" />
                          <span>WhatsApp Preview</span>
                        </div>
                        <span className="text-[10px] text-textSecondary">{msg.message_preview.recipient}</span>
                      </div>

                      {/* Mocked WhatsApp Bubble */}
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-900/30 border border-emerald-500/20 text-[11px] text-textPrimary leading-relaxed">
                        {msg.message_preview.message_body}
                      </div>

                      {msg.message_preview.simulated_notice && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          {msg.message_preview.simulated_notice}
                        </div>
                      )}

                      {/* Explicit Confirmation Action */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => msg.message_preview && handleConfirmDispatch(msg.message_preview)}
                          disabled={isLoading}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm & Dispatch</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dispatch Receipt Banner */}
                  {msg.dispatch_receipt && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <div className="text-[10px] space-y-0.5">
                        <div className="font-bold">Message Dispatched Successfully</div>
                        <div>ID: <span className="font-mono">{msg.dispatch_receipt.dispatch_id}</span> ({msg.dispatch_receipt.gateway})</div>
                      </div>
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggested_actions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(act.prompt || act.label)}
                          className="py-1 px-2.5 rounded-full bg-bgCanvas hover:bg-bgHover border border-borderBorder/80 text-[11px] font-medium text-textSecondary hover:text-textPrimary transition-colors flex items-center gap-1"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[9px] text-textTertiary px-1 block">{msg.timestamp}</span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-textSecondary text-[11px] p-2 bg-bgHover/40 rounded-xl w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brandPrimary dark:text-aiAccent" />
                <span>Analyzing intelligence signals...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-4 mb-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="p-0.5 hover:opacity-75">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Quick Starter Prompts (When conversation is fresh) */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 border-t border-borderBorder/40 bg-bgCanvas/40">
              <div className="text-[10px] uppercase font-bold tracking-wider text-textTertiary mb-1.5">
                Suggested Prompts
              </div>
              <div className="flex flex-wrap gap-1.5">
                {starterPrompts.map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(promptText)}
                    className="py-1 px-2 rounded-lg bg-bgHover/70 hover:bg-bgHover border border-borderBorder/60 text-[10px] text-textSecondary hover:text-textPrimary transition-colors text-left"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-bgCanvas/90 border-t border-borderBorder/60 shrink-0">
            <div className="flex items-end gap-2 bg-bgCard border border-borderBorder/80 rounded-2xl p-1.5 focus-within:border-brandPrimary/80 transition-colors">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedCustomer ? `Ask about ${selectedCustomer.first_name}...` : "Ask a customer intelligence question..."}
                rows={1}
                aria-label="Chat input message"
                className="flex-1 bg-transparent border-none text-xs text-textPrimary placeholder:text-textTertiary resize-none outline-none max-h-24 p-1.5"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                aria-label="Send message"
                className="p-2 rounded-xl bg-brandPrimary hover:bg-brandHover text-white disabled:opacity-40 disabled:hover:bg-brandPrimary transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-textTertiary px-1 pt-1.5">
              <span>Press <kbd className="px-1 py-0.5 rounded bg-bgHover border border-borderBorder font-mono text-[9px]">Enter</kbd> to send</span>
              <span>0 LLM Credits for Analytics</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default CustomerChatbot;
