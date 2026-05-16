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
  const where = `${req.method} ${req.originalUrl}`;

  // 4xx é política/validação (esperado) — log em `warn` numa linha,
  // sem stack. 5xx é bug real — mantém `error` + stack pra debug.
  if (statusCode >= 500) {
    console.error(`[ERROR] ${statusCode} ${code} ${where}:`, err.message);
    console.error(err.stack);
  } else {
    console.warn(`[WARN] ${statusCode} ${code} ${where}: ${err.message}`);
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
