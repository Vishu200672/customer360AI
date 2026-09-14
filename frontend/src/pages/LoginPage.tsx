import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Zap,
  Database,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@customer360.ai');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-bgMain text-textPrimary selection:bg-brandPrimary selection:text-textInverse">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-brandPrimary/10 dark:bg-brandPrimary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-aiAccent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-lg">
        {/* Centered Minimalist Login Card */}
        <div className="bg-bgCard border border-borderDefault shadow-2xl rounded-3xl p-7 sm:p-10 text-textPrimary animate-in fade-in zoom-in-95 duration-200">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-brandPrimary text-textInverse shadow-md border border-borderBrand">
              <ShieldCheck className="w-8 h-8 text-aiAccent" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-textPrimary">
              Customer360 <span className="text-brandPrimary dark:text-aiAccent">AI</span>
            </h1>
            <p className="text-xs sm:text-sm text-textSecondary mt-1 font-medium">
              Enterprise Customer Churn & Risk Intelligence Platform
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-riskSoft border border-riskBorder text-riskPrimary text-xs font-bold mb-6 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Clean Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-textTertiary" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@customer360.ai"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-bgMain border border-borderDefault text-textPrimary text-xs sm:text-sm focus:outline-none focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary transition font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-textPrimary uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-textTertiary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3.5 rounded-xl bg-bgMain border border-borderDefault text-textPrimary text-xs sm:text-sm focus:outline-none focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary transition font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textTertiary hover:text-textPrimary transition p-1"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Alert Status Banner */}
            <div className="p-3.5 rounded-2xl bg-bgMain border border-borderSubtle flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-brandPrimary/10 text-brandPrimary dark:text-aiAccent flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-textPrimary">Automated Email Security Alert</p>
                  <p className="text-[11px] text-textTertiary truncate">Instant notification dispatched on sign in</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-successSoft text-successPrimary border border-successBorder shrink-0">
                Active
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-brandPrimary hover:bg-brandHover text-textInverse text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition shadow-lg hover:shadow-xl disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-textInverse border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fills */}
          <div className="mt-8 pt-6 border-t border-borderSubtle">
            <div className="text-xs text-textSecondary font-bold mb-3 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-aiText" /> Demo Persona Quick-Fill:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@customer360.ai', 'password123')}
                className="p-2.5 rounded-xl bg-bgMain hover:bg-bgHover border border-borderSubtle text-left transition cursor-pointer group"
              >
                <div className="text-[11px] font-black text-textPrimary group-hover:text-brandPrimary transition">Admin</div>
                <div className="text-[10px] text-textTertiary truncate">admin@customer360.ai</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('anmol@customer360.ai', 'password123')}
                className="p-2.5 rounded-xl bg-bgMain hover:bg-bgHover border border-borderSubtle text-left transition cursor-pointer group"
              >
                <div className="text-[11px] font-black text-textPrimary group-hover:text-brandPrimary transition">Analyst</div>
                <div className="text-[10px] text-textTertiary truncate">anmol@customer360.ai</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('executive@customer360.ai', 'password123')}
                className="p-2.5 rounded-xl bg-bgMain hover:bg-bgHover border border-borderSubtle text-left transition cursor-pointer group col-span-2 sm:col-span-1"
              >
                <div className="text-[11px] font-black text-textPrimary group-hover:text-brandPrimary transition">Executive</div>
                <div className="text-[10px] text-textTertiary truncate">executive@...</div>
              </button>
            </div>
          </div>

          {/* Platform Capability Badges */}
          <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-textTertiary font-semibold pt-4 border-t border-borderSubtle/60">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-brandPrimary" /> ML Risk Engine
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-brandPrimary" /> Multi-Format Ingestion
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-brandPrimary" /> Real-time Analytics
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
