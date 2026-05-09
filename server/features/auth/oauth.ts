// Task #69 — OAuth social (Google) coexistindo com email/senha.
// Task #72 — Apple removido; Facebook adicionado seguindo o mesmo padrão do
// Google: callback URL travada no domínio canônico via env var explícita,
// só funciona em produção (`https://rayo.app.br`).
//
// Este módulo expõe três famílias de rota sob /api/auth:
//   GET  /providers              → diz ao frontend quais providers estão configurados.
//   GET  /:provider              → inicia o fluxo OAuth (redirect pro provider).
//   GET  /:provider/callback     → processa o retorno e cria a sessão local.
//
// Quando as variáveis de ambiente do provider não estão setadas, as rotas
// devolvem 503 com mensagem amigável e o frontend mostra o botão como
// "Em breve". Isso permite a UI ficar pronta antes das credenciais.
//
// As estratégias do Passport são instanciadas de forma preguiçosa
// (`initStrategies()` na primeira request) pra não quebrar o boot quando
// alguma var de ambiente está faltando.

import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import {
  findOrCreateOAuthUser,
  createSessionForUser,
  type SafeUser,
} from "./service.js";
import { logger } from "../../utils/logger.js";

const isDev = process.env.NODE_ENV !== "production";

// Task #69 — OAuth Google está travado no domínio de produção `rayo.app.br`.
// Task #72 — Mesma trava aplicada ao Facebook.
// As redirect URIs são lidas exclusivamente das envs `GOOGLE_REDIRECT_URI` e
// `FACEBOOK_REDIRECT_URI` (sem fallback para REPLIT_DEV_DOMAIN/APP_URL/host
// header) para evitar `redirect_uri_mismatch` quando o backend roda em
// previews. Em produção, cookies de sessão e de state OAuth são fixados no
// domínio `rayo.app.br` para sobreviverem ao retorno top-level dos providers.
const PROD_COOKIE_DOMAIN = "rayo.app.br";

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
    ...(isDev ? {} : { domain: PROD_COOKIE_DOMAIN }),
  });
}

function clearOAuthStateCookie(res: Response) {
  res.clearCookie(OAUTH_STATE_COOKIE, {
    path: "/",
    ...(isDev ? {} : { domain: PROD_COOKIE_DOMAIN }),
  });
}

// Comparação em tempo constante (mesmo length) pra evitar timing leak.
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export type Provider = "google" | "facebook";

export function isProviderConfigured(provider: Provider): boolean {
  if (provider === "google") {
    // Task #69 — sem GOOGLE_REDIRECT_URI o provider é considerado
    // não-configurado: o frontend mostra "Em breve" e nenhuma rota OAuth
    // é exposta.
    return !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
    );
  }
  // Task #72 — Facebook segue exatamente o mesmo contrato do Google: as 3
  // vars precisam estar presentes ou o provider fica "Em breve".
  return !!(
    process.env.FACEBOOK_CLIENT_ID &&
    process.env.FACEBOOK_CLIENT_SECRET &&
    process.env.FACEBOOK_REDIRECT_URI
  );
}

// Task #69/#72 — Validação no boot. Loga erro/aviso explícito quando as
// credenciais estão presentes mas a redirect URI canônica falta.
export function validateOAuthEnvAtBoot(): void {
  const hasGoogleCreds = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  if (hasGoogleCreds && !process.env.GOOGLE_REDIRECT_URI) {
    const msg =
      "GOOGLE_REDIRECT_URI ausente — Google OAuth NÃO será habilitado. Defina GOOGLE_REDIRECT_URI=https://rayo.app.br/api/auth/google/callback nas Secrets para destravar o login Google em produção.";
    if (isDev) logger.info("Auth", msg);
    else logger.error("Auth", msg);
  } else if (process.env.GOOGLE_REDIRECT_URI) {
    logger.info(
      "Auth",
      `Google OAuth callback URI travada em ${process.env.GOOGLE_REDIRECT_URI}`,
    );
  }

  const hasFacebookCreds = !!(
    process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
  );
  if (hasFacebookCreds && !process.env.FACEBOOK_REDIRECT_URI) {
    const msg =
      "FACEBOOK_REDIRECT_URI ausente — Facebook OAuth NÃO será habilitado. Defina FACEBOOK_REDIRECT_URI=https://rayo.app.br/api/auth/facebook/callback nas Secrets para destravar o login Facebook em produção.";
    if (isDev) logger.info("Auth", msg);
    else logger.error("Auth", msg);
  } else if (process.env.FACEBOOK_REDIRECT_URI) {
    logger.info(
      "Auth",
      `Facebook OAuth callback URI travada em ${process.env.FACEBOOK_REDIRECT_URI}`,
    );
  }
}

let initialized = false;
let initInFlight: Promise<void> | null = null;
async function initStrategies(): Promise<void> {
  if (initialized) return;
  if (initInFlight) return initInFlight;
  initInFlight = (async () => {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (!googleRedirectUri) {
        logger.error(
          "Auth",
          "GOOGLE_REDIRECT_URI ausente — estratégia Google OAuth NÃO registrada. Defina a env apontando para https://rayo.app.br/api/auth/google/callback.",
        );
      } else {
        passport.use(
          new GoogleStrategy(
            {
              clientID: process.env.GOOGLE_CLIENT_ID!,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
              callbackURL: googleRedirectUri,
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
        logger.info("Auth", `Google OAuth strategy registered (callback=${googleRedirectUri})`);
      }
    }

    if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
      const facebookRedirectUri = process.env.FACEBOOK_REDIRECT_URI;
      if (!facebookRedirectUri) {
        logger.error(
          "Auth",
          "FACEBOOK_REDIRECT_URI ausente — estratégia Facebook OAuth NÃO registrada. Defina a env apontando para https://rayo.app.br/api/auth/facebook/callback.",
        );
      } else {
        passport.use(
          new FacebookStrategy(
            {
              clientID: process.env.FACEBOOK_CLIENT_ID!,
              clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
              callbackURL: facebookRedirectUri,
              profileFields: ["id", "displayName", "emails"],
            },
            async (_accessToken, _refreshToken, profile, done) => {
              try {
                const email = profile.emails?.[0]?.value;
                if (!email) {
                  return done(new Error("Conta Facebook sem email verificado."));
                }
                const user = await findOrCreateOAuthUser({
                  provider: "facebook",
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
        logger.info("Auth", `Facebook OAuth strategy registered (callback=${facebookRedirectUri})`);
      }
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
  // Task #69 — em produção o callback OAuth volta como navegação top-level
  // do provider para `rayo.app.br`; cookies `sameSite: 'strict'` seriam
  // dropados nesse retorno cross-site. Usamos `lax` (suficiente pra
  // navegação top-level) e fixamos `domain: rayo.app.br` para que o
  // mesmo cookie sirva o app em prod.
  res.cookie("session_token", token, {
    httpOnly: true,
    secure: !isDev,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
    ...(isDev ? {} : { domain: PROD_COOKIE_DOMAIN }),
  });
}

const router = Router();

router.get("/providers", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      google: isProviderConfigured("google"),
      facebook: isProviderConfigured("facebook"),
    },
    error: null,
  });
});

function providerLabel(provider: Provider): string {
  return provider === "google" ? "Google" : "Facebook";
}

function startOAuth(provider: Provider) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isProviderConfigured(provider)) {
      res.status(503).json({
        success: false,
        data: null,
        error: {
          code: "PROVIDER_NOT_CONFIGURED",
          message: `Login com ${providerLabel(provider)} ainda não está disponível.`,
        },
      });
      return;
    }
    await initStrategies();
    const stateToken = makeStateToken();
    setOAuthStateCookie(res, stateToken);
    // Google: profile+email. Facebook: email+public_profile (necessário pra
    // displayName e id).
    const scope = provider === "google"
      ? ["profile", "email"]
      : ["email", "public_profile"];
    passport.authenticate(provider, { session: false, scope, state: stateToken })(req, res, next);
  };
}

function handleCallback(provider: Provider) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!isProviderConfigured(provider)) {
      res.redirect(`/?oauth_error=not_configured`);
      return;
    }
    const returnedState =
      (typeof req.query.state === "string" && req.query.state) || "";
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

// Task #69 — Trava de origem para o fluxo OAuth em produção. O OAuth só pode
// ser iniciado e completado a partir de `https://rayo.app.br`. Se a
// requisição trouxer um header Origin/Referer e ele não bater com o domínio
// canônico, recusamos antes mesmo de tocar no Passport. Navegação top-level
// (clique no botão e callback do provider) costuma vir sem Origin, então o
// guard só "morde" quando alguém tenta redirecionar a partir de um preview
// `.replit.dev` ou outra origem.
function makeOriginGuard(providerName: Provider) {
  return function originGuard(req: Request, res: Response, next: NextFunction) {
    if (isDev) return next();
    const origin = req.headers.origin as string | undefined;
    if (origin) {
      let ok = false;
      try {
        ok = new URL(origin).hostname === PROD_COOKIE_DOMAIN;
      } catch {
        ok = false;
      }
      if (!ok) {
        logger.error(
          "Auth",
          `${providerLabel(providerName)} OAuth bloqueado: Origin fora de ${PROD_COOKIE_DOMAIN} (origin=${origin})`,
        );
        res.status(403).json({
          success: false,
          data: null,
          error: {
            code: "OAUTH_ORIGIN_NOT_ALLOWED",
            message: `Login com ${providerLabel(providerName)} só está disponível em https://${PROD_COOKIE_DOMAIN}.`,
          },
        });
        return;
      }
    }
    next();
  };
}

const googleOriginGuard = makeOriginGuard("google");
const facebookOriginGuard = makeOriginGuard("facebook");

router.get("/google", googleOriginGuard, startOAuth("google"));
router.get("/google/callback", googleOriginGuard, handleCallback("google"));
router.get("/facebook", facebookOriginGuard, startOAuth("facebook"));
router.get("/facebook/callback", facebookOriginGuard, handleCallback("facebook"));

export default router;
