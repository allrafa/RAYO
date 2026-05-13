export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

// Task #203 — endpoints que TÊM permissão de receber 401 silenciosamente
// (ex: boot de sessão, polling). Qualquer outro endpoint que devolver 401
// é logado pra termos sinal de regressão (sessão expirando inesperadamente,
// rota mal-protegida etc). NUNCA disparamos logout/setUser(null) por causa
// de 401: a única fonte de mudança de auth state é AuthContext.
const SILENT_401_PATHS = [
  "/api/auth/me",
];

function isSilent401(path: string): boolean {
  return SILENT_401_PATHS.some((p) => path === p || path.startsWith(`${p}?`));
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
  } catch {
    return {
      success: false,
      data: null,
      error: { code: "NETWORK_ERROR", message: "Erro de conexão. Verifique sua internet." },
    };
  }

  // Task #203 — telemetria leve pra 401 fora do path de auth boot.
  // Não muda comportamento (não desloga, não redireciona) — só ajuda
  // a diagnosticar "minha sessão sumiu sem motivo" em produção.
  if (res.status === 401 && !isSilent401(path)) {
    try {
      console.warn(`[api] 401 em ${path} — sessão pode ter expirado. Nenhum logout automático será disparado.`);
    } catch { /* noop */ }
  }

  try {
    const json: ApiResponse<T> = await res.json();
    return json;
  } catch {
    return {
      success: false,
      data: null,
      error: { code: "PARSE_ERROR", message: "Resposta inesperada do servidor." },
    };
  }
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },

  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
};
