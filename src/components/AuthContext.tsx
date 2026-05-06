import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { markDeviceAsReturning } from "../lib/deviceMemory";

export type UserRole = "client" | "producer" | "moderator" | "admin";

export interface User {
  id: number;
  email: string;
  name: string;
  segments: string[];
  interests: string[];
  goals: string[];
  content_preferences: string[];
  level: number;
  xp: number;
  streak: number;
  is_premium: boolean;
  role: UserRole;
  created_at: string;
}

const ROLE_RANK: Record<UserRole, number> = {
  client: 0,
  producer: 1,
  moderator: 2,
  admin: 3,
};

export function userHasRole(user: User | null | undefined, minRole: UserRole): boolean {
  if (!user) return false;
  const role = (user.role || "client") as UserRole;
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

interface RegisterOptions {
  segments?: string[];
  interests?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, options?: RegisterOptions) => Promise<{ success: boolean; error?: string }>;
  sendVerificationCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: { segments?: string[]; interests?: string[]; goals?: string[]; content_preferences?: string[] }) => Promise<{ success: boolean; error?: string }>;
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
          markDeviceAsReturning();
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
      markDeviceAsReturning();
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

  const register = useCallback(async (email: string, password: string, name: string, options?: RegisterOptions) => {
    const res = await api.post<{ user: User }>("/api/auth/register", {
      email,
      password,
      name,
      segments: options?.segments,
      interests: options?.interests,
    });
    if (res.success && res.data) {
      setUser(res.data.user);
      markDeviceAsReturning();
      return { success: true };
    }
    return { success: false, error: res.error?.message || "Erro ao criar conta" };
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const res = await api.post<{ message: string }>("/api/auth/forgot-password", { email });
    if (res.success) {
      return { success: true, message: res.data?.message };
    }
    return { success: false, error: res.error?.message || "Erro ao solicitar redefinição de senha" };
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const res = await api.post<{ message: string }>("/api/auth/reset-password", { token, password });
    if (res.success) {
      return { success: true };
    }
    return { success: false, error: res.error?.message || "Erro ao redefinir senha" };
  }, []);

  const updateProfile = useCallback(async (updates: { segments?: string[]; interests?: string[]; goals?: string[]; content_preferences?: string[] }) => {
    const res = await api.patch<{ user: User }>("/api/users/profile", updates);
    if (res.success && res.data) {
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message || "Erro ao atualizar perfil" };
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, sendVerificationCode, verifyEmailCode, requestPasswordReset, resetPassword, updateProfile, logout }}>
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
