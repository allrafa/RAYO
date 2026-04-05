import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

export interface User {
  id: number;
  email: string;
  name: string;
  level: number;
  xp: number;
  streak: number;
  is_premium: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  sendVerificationCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await api.get<{ user: User }>("/api/auth/me");
        if (res.success && res.data) {
          setUser(res.data.user);
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: User }>("/api/auth/login", { email, password });
    if (res.success && res.data) {
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message || "Erro ao fazer login" };
  }, []);

  const sendVerificationCode = useCallback(async (email: string) => {
    const res = await api.post<{ message: string }>("/api/auth/send-code", { email });
    if (res.success) {
      return { success: true };
    }
    return { success: false, error: res.error?.message || "Erro ao enviar código" };
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    const res = await api.post<{ verified: boolean }>("/api/auth/verify-code", { email, code });
    if (res.success) {
      return { success: true };
    }
    return { success: false, error: res.error?.message || "Erro ao verificar código" };
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.post<{ user: User }>("/api/auth/register", { email, password, name });
    if (res.success && res.data) {
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message || "Erro ao criar conta" };
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, sendVerificationCode, verifyEmailCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
