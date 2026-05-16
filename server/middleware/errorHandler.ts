import type { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  // Log em key=value (consistente com `dm_email_gate` do #230) pra
  // parser de ingestão extrair campos sem regex frágil.
  const fields = `status=${statusCode} code=${code} method=${req.method} path=${req.originalUrl}`;

  // 4xx é política/validação (esperado) — log em `warn` numa linha,
  // sem stack. 5xx é bug real — mantém `error` + stack pra debug.
  if (statusCode >= 500) {
    console.error(`[ERROR] ${fields} message="${err.message}"`);
    console.error(err.stack);
  } else {
    console.warn(`[WARN] ${fields} message="${err.message}"`);
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message:
        statusCode >= 500
          ? "An internal error occurred. Please try again later."
          : err.message,
    },
  });
}

export function createError(
  message: string,
  statusCode: number,
  code: string
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
