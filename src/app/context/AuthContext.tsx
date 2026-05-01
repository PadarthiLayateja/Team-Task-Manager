import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "../lib/types";
import * as api from "../lib/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, adminCode?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("ttm_token");
    if (!token) { setIsLoading(false); return; }
    try {
      const { user } = await api.getMe();
      setUser(user);
    } catch {
      localStorage.removeItem("ttm_token");
      localStorage.removeItem("ttm_user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem("ttm_token", res.access_token);
    localStorage.setItem("ttm_user", JSON.stringify(res.user));
    setUser(res.user);
  };

  const signup = async (name: string, email: string, password: string, adminCode?: string) => {
    const res = await api.signup(name, email, password, adminCode);
    localStorage.setItem("ttm_token", res.access_token);
    localStorage.setItem("ttm_user", JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem("ttm_token");
    localStorage.removeItem("ttm_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      isLoading,
      login,
      signup,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
