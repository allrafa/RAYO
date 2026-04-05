import type { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  console.error(`[ERROR] ${statusCode} ${code}:`, err.message);
  if (statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message:
        statusCode === 500
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
