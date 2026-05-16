import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { markDeviceAsReturning } from "../lib/deviceMemory";

export type UserRole = "client" | "producer" | "moderator" | "admin";

export interface NotificationFlags {
  push?: boolean;
  email?: boolean;
  weekly_digest?: boolean;
  missions?: boolean;
  community?: boolean;
}

export interface NotificationPreferences {
  notifications?: NotificationFlags;
  language?: string;
  theme?: "light" | "dark";
  // legacy flat keys (lidos mas não escritos)
  push?: boolean;
  email?: boolean;
  missions?: boolean;
  community?: boolean;
}

export interface PreferencesPatch {
  notifications?: NotificationFlags;
  language?: "pt-BR" | "en";
  theme?: "light" | "dark";
}

export interface User {
  id: number;
  email: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  segments: string[];
  interests: string[];
  goals: string[];
  content_preferences: string[];
  notification_preferences: NotificationPreferences;
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

export type DmTransport = "socket" | "sse";
/** Task #223 — transporte de eventos de Comunidade (`/community` namespace
 *  do Socket.IO). `sse` aqui significa "ignore socket, use só estado local
 *  + refetch sob demanda" — a Comunidade não tem canal SSE dedicado. */
export type CommunityTransport = "socket" | "sse";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  /** Task #222 — transporte de DM escolhido pelo servidor. Default "socket". */
  dmTransport: DmTransport;
  /** Task #223 — transporte de Comunidade escolhido pelo servidor. */
  communityTransport: CommunityTransport;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, options?: RegisterOptions) => Promise<{ success: boolean; error?: string }>;
  sendVerificationCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: {
    name?: string;
    bio?: string | null;
    segments?: string[];
    interests?: string[];
    goals?: string[];
    content_preferences?: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  updatePreferences: (
    prefs: PreferencesPatch,
  ) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Task #203 — INVARIANTE DE AUTH:
  // `setUser(null)` SÓ pode ser disparado pelo `logout()` explícito abaixo.
  // Endpoints de feature (comunidade, SSE, notificações etc) que devolvem
  // 401 NÃO podem desmontar a sessão do React — isso causaria flicker /
  // "tela branca" sempre que algum endpoint protegido falhasse durante a
  // hidratação inicial. O boot de sessão (`/api/auth/me`) é o único lugar
  // que decide o estado inicial: se 200 → setUser(payload); se 401/erro
  // → user permanece null (estado inicial). Telemetria de 401 vive em
  // `src/lib/api.ts` (warn só, sem efeito colateral).
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dmTransport, setDmTransport] = useState<DmTransport>("socket");
  const [communityTransport, setCommunityTransport] = useState<CommunityTransport>("socket");

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await api.get<{
          user: User;
          realtime?: { dm_transport?: DmTransport; community_transport?: CommunityTransport };
        }>("/api/auth/me");
        if (res.success && res.data) {
          setUser(res.data.user);
          const t = res.data.realtime?.dm_transport;
          if (t === "socket" || t === "sse") setDmTransport(t);
          const ct = res.data.realtime?.community_transport;
          if (ct === "socket" || ct === "sse") setCommunityTransport(ct);
          markDeviceAsReturning();
        }
        // Importante: NUNCA chamar setUser(null) aqui — user já é null
        // por padrão. Chamar setUser(null) numa branch de erro causaria
        // re-render desnecessário e poderia cascatear pra unmount de
        // componentes que dependem de `isLoading=false && user=null`.
      } catch {
        /* erro de rede no boot — mantém user=null silenciosamente */
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{
      user: User;
      realtime?: { dm_transport?: DmTransport; community_transport?: CommunityTransport };
    }>(
      "/api/auth/login",
      { email, password },
    );
    if (res.success && res.data) {
      setUser(res.data.user);
      const t = res.data.realtime?.dm_transport;
      if (t === "socket" || t === "sse") setDmTransport(t);
      const ct = res.data.realtime?.community_transport;
      if (ct === "socket" || ct === "sse") setCommunityTransport(ct);
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
    const res = await api.post<{
      user: User;
      realtime?: { dm_transport?: DmTransport; community_transport?: CommunityTransport };
    }>(
      "/api/auth/register",
      {
        email,
        password,
        name,
        segments: options?.segments,
        interests: options?.interests,
      },
    );
    if (res.success && res.data) {
      setUser(res.data.user);
      const t = res.data.realtime?.dm_transport;
      if (t === "socket" || t === "sse") setDmTransport(t);
      const ct = res.data.realtime?.community_transport;
      if (ct === "socket" || ct === "sse") setCommunityTransport(ct);
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

  const updateProfile = useCallback(async (updates: {
    name?: string;
    bio?: string | null;
    segments?: string[];
    interests?: string[];
    goals?: string[];
    content_preferences?: string[];
  }) => {
    const res = await api.patch<{ user: User }>("/api/users/profile", updates);
    if (res.success && res.data) {
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message || "Erro ao atualizar perfil" };
  }, []);

  const updatePreferences = useCallback(async (prefs: PreferencesPatch) => {
    const res = await api.patch<{ user: User }>("/api/users/preferences", prefs);
    if (res.success && res.data) {
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message || "Erro ao salvar preferências" };
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/users/avatar", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = (await r.json()) as { success: boolean; data: { user: User } | null; error: { message: string } | null };
      if (json.success && json.data) {
        setUser(json.data.user);
        return { success: true };
      }
      return { success: false, error: json.error?.message || "Erro ao enviar avatar" };
    } catch {
      return { success: false, error: "Erro de conexão. Tente novamente." };
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await api.post<{ message: string }>("/api/auth/change-password", {
      currentPassword,
      newPassword,
    });
    if (res.success) return { success: true };
    return { success: false, error: res.error?.message || "Erro ao alterar senha" };
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, dmTransport, communityTransport, login, register, sendVerificationCode, verifyEmailCode, requestPasswordReset, resetPassword, updateProfile, updatePreferences, uploadAvatar, changePassword, logout }}>
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
