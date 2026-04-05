import type { Response } from "express";

export function success(res: Response, data: unknown, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data,
    error: null,
  });
}

export function created(res: Response, data: unknown) {
  success(res, data, 201);
}

export function error(
  res: Response,
  message: string,
  code: string,
  statusCode = 400
) {
  res.status(statusCode).json({
    success: false,
    data: null,
    error: { code, message },
  });
}
