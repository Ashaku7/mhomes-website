'use client';

// src/context/AuthContext.tsx
// Provides authentication state and actions to the entire app.

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi, setCookie, deleteCookie } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'guest' | 'admin' | 'reception';
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from cookie on mount.
  // If getMe() fails (401 = not logged in), silently set user to null.
  // AuthContext NEVER redirects — let each page decide what to do.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await authApi.getMe();
        setUser(res.data.data);
      } catch {
        setUser(null); // Not logged in — that's fine for public pages
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token, user: userData } = res.data.data;
    setCookie('mhomes_token', token, 1); // 1 day
    setUser(userData);
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => {
    const res = await authApi.register(name, email, phone, password);
    const { token, user: userData } = res.data.data;
    setCookie('mhomes_token', token, 1); // 1 day
    setUser(userData);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    deleteCookie('mhomes_token');
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
