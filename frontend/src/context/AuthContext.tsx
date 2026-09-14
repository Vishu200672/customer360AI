import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthResponse, AuthEmailNotification } from '../types/api';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastDispatchedEmail: AuthEmailNotification | null;
  isEmailModalOpen: boolean;
  setIsEmailModalOpen: (open: boolean) => void;
  clearLastDispatchedEmail: () => void;
  login: (email: string, pass: string) => Promise<AuthResponse>;
  register: (payload: { name: string; email: string; password: string; role?: string; title?: string; department?: string }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'c360_auth_token';
const USER_CACHE_KEY = 'c360_cached_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastDispatchedEmail, setLastDispatchedEmail] = useState<AuthEmailNotification | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);

  // Validate session on mount
  useEffect(() => {
    let isMounted = true;
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    api.getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(currentUser));
        }
      })
      .catch((err) => {
        console.warn('[AuthContext] Session expired or invalid:', err.message);
        if (isMounted) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_CACHE_KEY);
          setUser(null);
          setToken(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, pass: string): Promise<AuthResponse> => {
    const res = await api.login(email, pass);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);

    if (res.emailNotification) {
      setLastDispatchedEmail(res.emailNotification);
      // Trigger live notification event for global toasts
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('c360_security_email_sent', {
            detail: res.emailNotification,
          })
        );
      }
    }

    return res;
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    role?: string;
    title?: string;
    department?: string;
  }): Promise<AuthResponse> => {
    const res = await api.register(payload);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);

    if (res.emailNotification) {
      setLastDispatchedEmail(res.emailNotification);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('c360_security_email_sent', {
            detail: res.emailNotification,
          })
        );
      }
    }

    return res;
  };

  const logout = async (): Promise<void> => {
    await api.logout();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    setToken(null);
    setUser(null);
    setLastDispatchedEmail(null);
  };

  const clearLastDispatchedEmail = () => {
    setLastDispatchedEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        lastDispatchedEmail,
        isEmailModalOpen,
        setIsEmailModalOpen,
        clearLastDispatchedEmail,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
