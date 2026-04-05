import type { Request, Response, NextFunction } from "express";
import { validateSession } from "../features/auth/service.js";
import type { SafeUser } from "../features/auth/service.js";

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
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
