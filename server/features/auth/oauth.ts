// Task #69 — OAuth social (Google + Apple) coexistindo com email/senha.
//
// Este módulo expõe três famílias de rota sob /api/auth:
//   GET  /providers              → diz ao frontend quais providers estão configurados.
//   GET  /:provider              → inicia o fluxo OAuth (redirect pro provider).
//   GET|POST /:provider/callback → processa o retorno e cria a sessão local.
//
// Quando as variáveis de ambiente do provider não estão setadas, as rotas
// devolvem 503 com mensagem amigável e o frontend mostra o botão como
// "Em breve". Isso permite a Etapa 1 (UI pronta, backend pronto) sem
// precisar das credenciais ainda.
//
// As estratégias do Passport são instanciadas de forma preguiçosa
// (`initStrategies()` na primeira request) pra não quebrar o boot quando
// alguma var de ambiente está faltando.

import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import {
  findOrCreateOAuthUser,
  createSessionForUser,
  type SafeUser,
} from "./service.js";
import { logger } from "../../utils/logger.js";

const isDev = process.env.NODE_ENV !== "production";

// Task #69 — Proteção CSRF (login fixation) do fluxo OAuth.
// Como não temos express-session, gravamos um nonce em cookie httpOnly
// curtinho ao iniciar o fluxo e exigimos que o `state` retornado pelo
// provider bata com o cookie. O cookie expira em 10 minutos.
const OAUTH_STATE_COOKIE = "rayo_oauth_state";
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function makeStateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function setOAuthStateCookie(res: Response, value: string) {
  res.cookie(OAUTH_STATE_COOKIE, value, {
    httpOnly: true,
    secure: !isDev,
    // OAuth callback é navegação top-level cross-site → precisa `lax` no mínimo.
    sameSite: "lax",
    maxAge: OAUTH_STATE_MAX_AGE_MS,
    path: "/",
  });
}

function clearOAuthStateCookie(res: Response) {
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
}

// Comparação em tempo constante (mesmo length) pra evitar timing leak.
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000")
  );
}

export type Provider = "google" | "apple";

export function isProviderConfigured(provider: Provider): boolean {
  if (provider === "google") {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  return !!(
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  );
}

let initialized = false;
let initInFlight: Promise<void> | null = null;
async function initStrategies(): Promise<void> {
  if (initialized) return;
  // Evita race: se múltiplas requests chegam antes do init terminar,
  // todas aguardam a mesma promise; só marca `initialized` no sucesso
  // (e em caso de falha o flag é resetado pra permitir retry).
  if (initInFlight) return initInFlight;
  initInFlight = (async () => {
    if (isProviderConfigured("google")) {
      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: `${getAppUrl()}/api/auth/google/callback`,
          },
          async (_accessToken, _refreshToken, profile, done) => {
            try {
              const email = profile.emails?.[0]?.value;
              if (!email) {
                return done(new Error("Conta Google sem email verificado."));
              }
              const user = await findOrCreateOAuthUser({
                provider: "google",
                providerId: profile.id,
                email,
                name: profile.displayName || null,
              });
              done(null, user);
            } catch (err) {
              done(err as Error);
            }
          },
        ),
      );
      logger.info("Auth", "Google OAuth strategy registered");
    }

    if (isProviderConfigured("apple")) {
      // passport-apple não publica @types — import dinâmico + cast pra evitar
      // que o boot quebre quando o pacote ainda não estiver presente.
      // @ts-expect-error - sem typings oficiais
      const appleMod = await import("passport-apple");
      const AppleStrategy = (appleMod.Strategy ?? appleMod.default) as new (
        opts: Record<string, unknown>,
        verify: (
          req: unknown,
          accessToken: string,
          refreshToken: string,
          idToken: { sub: string; email?: string },
          profile: unknown,
          done: (err: Error | null, user?: unknown) => void,
        ) => void,
      ) => unknown;

      passport.use(
        new AppleStrategy(
          {
            clientID: process.env.APPLE_CLIENT_ID!,
            teamID: process.env.APPLE_TEAM_ID!,
            keyID: process.env.APPLE_KEY_ID!,
            privateKeyString: process.env.APPLE_PRIVATE_KEY!,
            callbackURL: `${getAppUrl()}/api/auth/apple/callback`,
            scope: ["name", "email"],
            passReqToCallback: true,
          },
          async (req: Request, _at, _rt, idToken, _profile, done) => {
            try {
              const email = idToken.email;
              if (!email) {
                return done(new Error("Conta Apple sem email."));
              }
              // Apple só envia o nome no PRIMEIRO consentimento, no body do POST.
              const bodyName = (req.body as { user?: { name?: { firstName?: string; lastName?: string } } })?.user?.name;
              const fullName = bodyName
                ? [bodyName.firstName, bodyName.lastName].filter(Boolean).join(" ").trim()
                : null;
              const user = await findOrCreateOAuthUser({
                provider: "apple",
                providerId: idToken.sub,
                email,
                name: fullName || null,
              });
              done(null, user);
            } catch (err) {
              done(err as Error);
            }
          },
        ) as Parameters<typeof passport.use>[0],
      );
      logger.info("Auth", "Apple OAuth strategy registered");
    }
  })();
  try {
    await initInFlight;
    initialized = true;
  } catch (err) {
    logger.error("Auth", `OAuth strategy init failed: ${err instanceof Error ? err.message : String(err)}`);
    initInFlight = null; // permite retry numa próxima request
    throw err;
  }
}

function setSessionCookie(res: Response, token: string) {
  res.cookie("session_token", token, {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? "lax" : "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

const router = Router();

router.get("/providers", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      google: isProviderConfigured("google"),
      apple: isProviderConfigured("apple"),
    },
    error: null,
  });
});

function startOAuth(provider: Provider) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isProviderConfigured(provider)) {
      res.status(503).json({
        success: false,
        data: null,
        error: {
          code: "PROVIDER_NOT_CONFIGURED",
          message: `Login com ${provider === "google" ? "Google" : "Apple"} ainda não está disponível.`,
        },
      });
      return;
    }
    await initStrategies();
    // CSRF: gera nonce, grava em cookie httpOnly e envia como `state` ao provider.
    const stateToken = makeStateToken();
    setOAuthStateCookie(res, stateToken);
    const scope = provider === "google" ? ["profile", "email"] : ["name", "email"];
    passport.authenticate(provider, { session: false, scope, state: stateToken })(req, res, next);
  };
}

function handleCallback(provider: Provider) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isProviderConfigured(provider)) {
      res.redirect(`/?oauth_error=not_configured`);
      return;
    }
    // Valida state ANTES de qualquer trabalho (proteção CSRF/login fixation).
    // Apple devolve via POST body; Google via query.
    const returnedState =
      (typeof req.query.state === "string" && req.query.state) ||
      ((req.body as { state?: unknown })?.state && typeof (req.body as { state?: unknown }).state === "string"
        ? ((req.body as { state: string }).state)
        : "");
    const cookieState = (req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined) || "";
    clearOAuthStateCookie(res);
    if (!returnedState || !cookieState || !safeEqual(returnedState, cookieState)) {
      logger.error("Auth", `OAuth ${provider} state mismatch — possível CSRF`);
      res.redirect(`/?oauth_error=${provider}_state_mismatch`);
      return;
    }
    await initStrategies();
    passport.authenticate(
      provider,
      { session: false },
      async (err: Error | null, user: SafeUser | false | undefined) => {
        if (err || !user) {
          logger.error(
            "Auth",
            `OAuth ${provider} callback failed: ${err instanceof Error ? err.message : String(err)}`,
          );
          res.redirect(`/?oauth_error=${provider}_failed`);
          return;
        }
        try {
          const token = await createSessionForUser(
            user.id,
            req.ip,
            (req.headers["user-agent"] as string | undefined) ?? undefined,
          );
          setSessionCookie(res, token);
          res.redirect("/");
        } catch (e) {
          logger.error(
            "Auth",
            `OAuth ${provider} session creation failed: ${e instanceof Error ? e.message : String(e)}`,
          );
          res.redirect(`/?oauth_error=${provider}_failed`);
        }
      },
    )(req, res, next);
  };
}

router.get("/google", startOAuth("google"));
router.get("/google/callback", handleCallback("google"));
router.get("/apple", startOAuth("apple"));
// Apple devolve POST com form_post (response_mode); mantemos GET também
// pra compatibilidade com configurações que usam query_string.
router.post("/apple/callback", handleCallback("apple"));
router.get("/apple/callback", handleCallback("apple"));

export default router;
