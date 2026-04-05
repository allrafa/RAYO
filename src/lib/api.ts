export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
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

  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },
};
