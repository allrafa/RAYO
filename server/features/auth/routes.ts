import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { validateRegister, validateLogin } from "./validation.js";
import { registerUser, loginUser, logoutUser, sendVerificationCode, verifyCode } from "./service.js";
import { success, created, error } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const isDev = process.env.NODE_ENV !== "production";

function setSessionCookie(res: Response, token: string) {
  res.cookie("session_token", token, {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? "lax" : "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

router.post("/send-code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== "string") {
      error(res, "Email é obrigatório", "VALIDATION_ERROR", 400);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      error(res, "Formato de email inválido", "VALIDATION_ERROR", 400);
      return;
    }

    await sendVerificationCode(email.trim().toLowerCase());
    success(res, { message: "Código enviado com sucesso" });
  } catch (err) {
    next(err);
  }
});

router.post("/verify-code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code } = req.body || {};

    if (!email || typeof email !== "string") {
      error(res, "Email é obrigatório", "VALIDATION_ERROR", 400);
      return;
    }

    if (!code || typeof code !== "string" || code.length !== 6) {
      error(res, "Código deve ter 6 dígitos", "VALIDATION_ERROR", 400);
      return;
    }

    const result = await verifyCode(email.trim().toLowerCase(), code.trim());
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateRegister(req.body);
    if (!validation.valid) {
      error(res, validation.message, "VALIDATION_ERROR", 400);
      return;
    }

    const { user, token } = await registerUser(validation.data);
    setSessionCookie(res, token);
    created(res, { user });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      error(res, validation.message, "VALIDATION_ERROR", 400);
      return;
    }

    const { user, token } = await loginUser(
      validation.data,
      req.ip,
      req.headers["user-agent"]
    );
    setSessionCookie(res, token);
    success(res, { user });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.session_token;
    if (token) {
      await logoutUser(token);
    }
    res.clearCookie("session_token", { path: "/" });
    success(res, { message: "Logout realizado com sucesso" });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  success(res, { user: req.user });
});

export default router;
