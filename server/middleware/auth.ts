import type { Request, Response, NextFunction } from "express";
import { validateSession } from "../features/auth/service.js";
import type { SafeUser, UserRole } from "../features/auth/service.js";

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

const ROLE_RANK: Record<UserRole, number> = {
  client: 0,
  producer: 1,
  moderator: 2,
  admin: 3,
};

export function hasRole(user: SafeUser | undefined, minRole: UserRole): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[minRole];
}

export function requireRole(minRole: UserRole) {
  return async function roleGuard(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.session_token;
    if (!token) {
      res.status(401).json({
        success: false,
        data: null,
        error: { code: "UNAUTHORIZED", message: "Autenticação necessária" },
      });
      return;
    }
    const user = await validateSession(token);
    if (!user) {
      res.clearCookie("session_token");
      res.status(401).json({
        success: false,
        data: null,
        error: { code: "SESSION_EXPIRED", message: "Sessão expirada. Faça login novamente" },
      });
      return;
    }
    if (!hasRole(user, minRole)) {
      res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "Você não tem permissão para acessar este recurso",
        },
      });
      return;
    }
    req.user = user;
    next();
  };
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.session_token;
  if (token) {
    const user = await validateSession(token);
    if (user) req.user = user;
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Reuse the user populated by an earlier optionalAuth (e.g. mounted before
  // the rate limiter so it can key buckets by user id). Avoids a redundant
  // session validation per request.
  if (req.user) {
    next();
    return;
  }

  const token = req.cookies?.session_token;

  if (!token) {
    res.status(401).json({
      success: false,
      data: null,
      error: { code: "UNAUTHORIZED", message: "Autenticação necessária" },
    });
    return;
  }

  const user = await validateSession(token);

  if (!user) {
    res.clearCookie("session_token");
    res.status(401).json({
      success: false,
      data: null,
      error: { code: "SESSION_EXPIRED", message: "Sessão expirada. Faça login novamente" },
    });
    return;
  }

  req.user = user;
  next();
}
