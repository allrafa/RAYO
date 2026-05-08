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

// Task #69 — OAuth Google está travado no domínio de produção `rayo.app.br`.
// A redirect URI é lida exclusivamente de `GOOGLE_REDIRECT_URI` (sem
// fallback para REPLIT_DEV_DOMAIN/APP_URL/host header) para evitar
// `redirect_uri_mismatch` no Google quando o backend roda em previews.
// Em produção, cookies de sessão e de state OAuth são fixados no
// domínio `rayo.app.br` para sobreviverem ao retorno top-level do Google.
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

export type Provider = "google" | "apple";

// Task #69 — fallback de URL APENAS para o fluxo Apple. A redirect URI do
// Google é obrigatoriamente lida de GOOGLE_REDIRECT_URI (sem fallback).
// Apple mantém o comportamento anterior — APPLE_REDIRECT_URI é opcional;
// se ausente, montamos a partir de APP_URL/REPLIT_DEV_DOMAIN como antes.
function getAppleCallbackUrl(): string {
  if (process.env.APPLE_REDIRECT_URI) return process.env.APPLE_REDIRECT_URI;
  const base =
    process.env.APP_URL ||
    (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:5000");
  return `${base}/api/auth/apple/callback`;
}

export function isProviderConfigured(provider: Provider): boolean {
  if (provider === "google") {
    // Task #69 — sem GOOGLE_REDIRECT_URI o provider é considerado
    // não-configurado: o frontend mostra "Em breve" e nenhuma rota OAuth
    // é exposta. Isso impede que tentemos rodar Google OAuth em previews
    // com URI dinâmica (que o Google rejeitaria com redirect_uri_mismatch).
    return !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
    );
  }
  return !!(
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  );
}

// Task #69 — Validação no boot (chamada por server/index.ts). Loga
// erro/aviso explícito se as credenciais Google estiverem presentes
// mas GOOGLE_REDIRECT_URI faltar — em produção isso indica misconfig
// e o login Google fica desabilitado até a env ser definida.
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
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;
      if (!googleRedirectUri) {
        // Task #69 — credenciais presentes mas sem redirect URI canônica:
        // não registramos a estratégia (qualquer tentativa de login Google
        // devolveria 503 via isProviderConfigured). Em produção isso
        // sinaliza um misconfig que precisa ser corrigido nas secrets.
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
            callbackURL: getAppleCallbackUrl(),
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
  // Task #69 — em produção o callback OAuth volta como navegação top-level
  // do Google para `rayo.app.br`; cookies `sameSite: 'strict'` seriam
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

// Task #69 — Trava de origem para o fluxo Google em produção. O Google OAuth
// só pode ser iniciado e completado a partir de `https://rayo.app.br`. Se a
// requisição trouxer um header Origin/Referer e ele não bater com o domínio
// canônico, recusamos antes mesmo de tocar no Passport. Navegação top-level
// (clique no botão e callback do Google) costuma vir sem Origin, então o
// guard só "morde" quando alguém tenta redirecionar a partir de um preview
// `.replit.dev` ou outra origem.
// Olhamos APENAS o header Origin: ele só vem em fetch/XHR cross-site
// (e não na navegação top-level que o Google faz no callback). Isso
// impede que um app rodando num preview `.replit.dev` dispare /google
// via fetch, mas não interfere no retorno legítimo do Google (que
// chega como GET top-level, sem Origin). Referer NÃO é checado porque
// no callback ele aponta pra accounts.google.com — bloquear isso
// quebraria o fluxo. A defesa real do callback continua sendo o
// `state` cookie (CSRF nonce) validado em handleCallback.
function googleOriginGuard(req: Request, res: Response, next: NextFunction) {
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
        `Google OAuth bloqueado: Origin fora de ${PROD_COOKIE_DOMAIN} (origin=${origin})`,
      );
      res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "OAUTH_ORIGIN_NOT_ALLOWED",
          message: `Login com Google só está disponível em https://${PROD_COOKIE_DOMAIN}.`,
        },
      });
      return;
    }
  }
  next();
}

router.get("/google", googleOriginGuard, startOAuth("google"));
router.get("/google/callback", googleOriginGuard, handleCallback("google"));
router.get("/apple", startOAuth("apple"));
// Apple devolve POST com form_post (response_mode); mantemos GET também
// pra compatibilidade com configurações que usam query_string.
router.post("/apple/callback", handleCallback("apple"));
router.get("/apple/callback", handleCallback("apple"));

export default router;
