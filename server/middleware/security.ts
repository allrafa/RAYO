import helmet from "helmet";
import cors from "cors";
import type { Request, Response, NextFunction } from "express";

export const securityMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.length === 0 ||
      allowedOrigins.includes(origin) ||
      origin.endsWith(".replit.dev") ||
      origin.endsWith(".repl.co")
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const entry = requestCounts.get(key);

    if (!entry || now > entry.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({
        success: false,
        data: null,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
        },
      });
      return;
    }

    entry.count++;
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (now > entry.resetAt) {
      requestCounts.delete(key);
    }
  }
}, 60000);
