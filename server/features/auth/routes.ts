import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { validateRegister, validateLogin } from "./validation.js";
import { registerUser, loginUser, logoutUser, sendVerificationCode, verifyCode, requestPasswordReset, resetPassword, changePassword, resendVerificationCodeForUser, verifyEmailByMagicLink, isEmailVerifiedForUser } from "./service.js";
import { success, created, error } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimiter } from "../../middleware/security.js";
import oauthRouter from "./oauth.js";

const router = Router();

// Task #69 + #72 — Rotas OAuth (Google/Facebook). Montadas antes das outras pra
// que /providers e /:provider/callback não conflitem com handlers
// específicos. Coexistem com email/senha; quando o provider não está
// configurado por env, o próprio router devolve 503.
router.use("/", oauthRouter);

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

// Task #205 — reenvio de código pra usuário JÁ logado (não exige `email` no
// body; usa o e-mail da sessão). Serve fluxos inline tipo "Confirme seu
// e-mail" sem sair do contexto (modal de criar comunidade etc). Cooldown
// de 60s reaproveitado via `resendVerificationCodeForUser`. Rate limit
// dedicado: 3 reqs / 15min keyByUser — alinhado ao spec da task #205,
// muito mais apertado que os 20/IP globais do `/api/auth`. `requireAuth`
// roda antes pra que `req.user.id` esteja disponível pro `keyByUser`.
router.post(
  "/resend-verification",
  requireAuth,
  rateLimiter(3, 15 * 60 * 1000, { keyByUser: true }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await resendVerificationCodeForUser(userId);
    success(res, {
      email: result.email,
      alreadyVerified: result.alreadyVerified === true,
      message: result.alreadyVerified ? "E-mail já confirmado" : "Código enviado",
    });
  } catch (err) {
    next(err);
  }
  },
);

// Task #207 — endpoint pro magic link de confirmação. GET (clicável
// direto do e-mail), single-use por linha (idempotente em re-clicks),
// SEM rate-limiter pesado: o token é cripto-aleatório (32 bytes) e a
// chance de brute-force é zero. Sempre redireciona pro app pra que o
// usuário caia de volta no contexto que abandonou (ex: criar comunidade
// no celular). Status query param permite o app mostrar toast certo.
router.get("/verify-email", async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const appUrl =
    process.env.APP_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
  const baseRedirect = appUrl || "/";
  const result = await verifyEmailByMagicLink(token);
  const status = result.ok
    ? result.alreadyVerified
      ? "already"
      : "ok"
    : result.reason === "EXPIRED"
    ? "expired"
    : "invalid";
  // Sempre 302 pra origem do app — `email_verified=ok|already|expired|invalid`.
  res.redirect(302, `${baseRedirect}/?email_verified=${status}`);
});

// Task #207 — polling endpoint usado pelo `EmailVerificationInline` pra
// auto-detectar quando o usuário confirmou via deep-link em outra aba
// ou no celular. Rate limit generoso porque o painel chama a cada poucos
// segundos enquanto o modal está aberto.
router.get(
  "/verification-status",
  requireAuth,
  rateLimiter(120, 15 * 60 * 1000, { keyByUser: true }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const verified = await isEmailVerifiedForUser(req.user!.id);
      success(res, { verified });
    } catch (err) {
      next(err);
    }
  },
);

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
    const { getDmTransport } = await import("../../realtime/io.js");
    created(res, { user, realtime: { dm_transport: getDmTransport() } });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password", async (req: Request, res: Response, next: NextFunction) => {
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

    await requestPasswordReset(email.trim().toLowerCase(), req.ip);
    success(res, {
      message: "Se o e-mail informado estiver cadastrado, você receberá um link para redefinir a sua senha em instantes.",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body || {};

    if (!token || typeof token !== "string") {
      error(res, "Token é obrigatório", "VALIDATION_ERROR", 400);
      return;
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      error(res, "A nova senha deve ter pelo menos 8 caracteres", "VALIDATION_ERROR", 400);
      return;
    }

    await resetPassword(token, password);
    success(res, { message: "Senha redefinida com sucesso. Faça login com sua nova senha." });
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
    const { getDmTransport } = await import("../../realtime/io.js");
    success(res, { user, realtime: { dm_transport: getDmTransport() } });
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
  // Task #222 — expõe a flag de transporte de DM pro cliente. Servidor
  // sempre faz dual-write; o cliente usa esta flag pra escolher se
  // ouve SSE ou Socket.IO.
  const { getDmTransport } = await import("../../realtime/io.js");
  success(res, {
    user: req.user,
    realtime: { dm_transport: getDmTransport() },
  });
});

// Task #45 — troca de senha do usuário logado.
router.post("/change-password", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || typeof currentPassword !== "string") {
      error(res, "Senha atual é obrigatória", "VALIDATION_ERROR", 400);
      return;
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      error(res, "A nova senha deve ter pelo menos 8 caracteres", "VALIDATION_ERROR", 400);
      return;
    }
    await changePassword(req.user!.id, currentPassword, newPassword);
    success(res, { message: "Senha alterada com sucesso" });
  } catch (err) {
    next(err);
  }
});

export default router;
