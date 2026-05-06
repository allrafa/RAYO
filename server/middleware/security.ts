import helmet from "helmet";
import cors from "cors";
import type { Request, Response, NextFunction } from "express";

export const securityMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

function isReplitOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.hostname.endsWith(".replit.dev") ||
      url.hostname.endsWith(".repl.co") ||
      url.hostname.endsWith(".replit.app") ||
      url.hostname.endsWith(".replit.com")
    );
  } catch {
    return false;
  }
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isReplitOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export type RateLimiterOptions = {
  // When true and a session_token cookie is present, the bucket is keyed by
  // the session token instead of the client IP. This prevents users behind a
  // shared proxy / NAT (e.g. the Replit preview iframe) from exhausting each
  // other's quota, and avoids one user's tabs piling onto a single IP bucket.
  keyByCookie?: boolean;
  // Predicate to exclude specific requests from counting. Returning true
  // bypasses the limiter for that request entirely.
  skip?: (req: Request) => boolean;
};

export function rateLimiter(
  maxRequests: number,
  windowMs: number,
  options: RateLimiterOptions = {},
) {
  // Each limiter gets its OWN bucket map. Sharing one module-level map across
  // every limiter instance would mean one route's traffic eating another
  // route's quota — defeating the per-prefix limits configured in index.ts.
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  const { keyByCookie = false, skip } = options;

  // Periodic GC for this limiter's bucket only.
  setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of requestCounts.entries()) {
      if (now > entry.resetAt) requestCounts.delete(k);
    }
  }, 60000).unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    if (skip && skip(req)) return next();

    let key: string;
    const sessionToken = keyByCookie ? req.cookies?.session_token : undefined;
    if (sessionToken && typeof sessionToken === "string") {
      key = `sess:${sessionToken}`;
    } else {
      key = `ip:${req.ip || "unknown"}`;
    }

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
