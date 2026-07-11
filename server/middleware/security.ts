import helmet from "helmet";
import cors from "cors";
import type { Request, Response, NextFunction } from "express";
import { createError } from "./errorHandler.js";

const isDev = process.env.NODE_ENV !== "production";

export const securityMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: isDev ? false : { action: "sameorigin" },
});

// Task #69 — `https://rayo.app.br` é o domínio canônico da plataforma e
// precisa estar sempre na allowlist em produção (mesmo que ALLOWED_ORIGINS
// não esteja setada). Em dev mantemos a lista vazia + heurística Replit.
const PROD_CANONICAL_ORIGIN = "https://rayo.app.br";
const allowedOrigins = (() => {
  const fromEnv = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  if (!isDev && !fromEnv.includes(PROD_CANONICAL_ORIGIN)) {
    fromEnv.push(PROD_CANONICAL_ORIGIN);
  }
  return fromEnv;
})();

function isReplitOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname;
    // `.replit.app` covers published deployments (same-origin in prod),
    // `.replit.dev` / `.repl.co` cover dev/preview iframes,
    // `.replit.com` covers workspace tooling.
    return (
      hostname.endsWith(".replit.app") ||
      hostname.endsWith(".replit.dev") ||
      hostname.endsWith(".repl.co") ||
      hostname.endsWith(".replit.com")
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

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (isReplitOrigin(origin)) {
      callback(null, true);
      return;
    }

    // Bloqueio é política de cliente — 403 + code estável (não 500).
    // Mensagem inclui o origin pra ops decidirem rápido se é scanner
    // externo (ignorar) ou caller legítimo (adicionar à allowlist).
    callback(createError(`Origin ${origin} is not allowed`, 403, "CORS_NOT_ALLOWED"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export type RateLimiterOptions = {
  // When true and the request has been authenticated (req.user populated by
  // optionalAuth/requireAuth running earlier), the bucket is keyed by the
  // user id. This prevents users behind a shared proxy / NAT (e.g. the
  // Replit preview iframe) from exhausting each other's quota, and stops a
  // user with multiple sessions from multiplying their quota by N tokens.
  // Falls back to req.ip when there is no authenticated user.
  keyByUser?: boolean;
  // Predicate to exclude specific requests from counting. Returning true
  // bypasses the limiter for that request entirely.
  skip?: (req: Request) => boolean;
};

// Task #239 — registry de buckets só pra teste. Em prod nunca é lida.
// Permite zerar TODOS os limiters entre specs sem expor o Map interno.
const __allLimiterBuckets: Array<Map<string, { count: number; resetAt: number }>> = [];
export function __resetRateLimitersForTest(): void {
  for (const m of __allLimiterBuckets) m.clear();
}

export function rateLimiter(
  maxRequests: number,
  windowMs: number,
  options: RateLimiterOptions = {},
) {
  // Each limiter gets its OWN bucket map. Sharing one module-level map across
  // every limiter instance would mean one route's traffic eating another
  // route's quota — defeating the per-prefix limits configured in index.ts.
  const requestCounts = new Map<string, { count: number; resetAt: number }>();
  __allLimiterBuckets.push(requestCounts);
  const { keyByUser = false, skip } = options;

  // Periodic GC for this limiter's bucket only.
  setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of requestCounts.entries()) {
      if (now > entry.resetAt) requestCounts.delete(k);
    }
  }, 60000).unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    // Escape hatch para suítes E2E (CI roda 4 workers em paralelo contra o
    // mesmo IP e estoura o limite de /api/auth ao criar usuários de teste).
    // NUNCA setar em produção — o gate exige NODE_ENV != production.
    if (process.env.RATE_LIMIT_DISABLED === "1" && process.env.NODE_ENV !== "production") {
      return next();
    }
    if (skip && skip(req)) return next();

    let key: string;
    const userId = keyByUser ? req.user?.id : undefined;
    if (typeof userId === "number") {
      key = `user:${userId}`;
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
