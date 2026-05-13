# Auth (sessão, OAuth, verificação de e-mail)

Contratos consolidados de autenticação. Mexa aqui antes de tocar em
`server/features/auth/`, `server/middleware/auth.ts`,
`server/middleware/security.ts` (rate limiter de `/api/auth`),
`src/components/EmailVerificationInline.tsx` ou qualquer fluxo de OAuth /
confirmação de e-mail.

## Visão geral

- Sessão via cookie seguro (Express session). RBAC numérico:
  `client < producer < moderator < admin`.
- Verificação de e-mail vive em `email_verification_codes(email, code,
  expires_at, verified, verify_token_hash)`. Não há UNIQUE em `email` (uma
  linha por tentativa); a fonte da verdade é "existe alguma linha
  `verified=TRUE` pra esse e-mail" via `isUserEmailVerified`.
- Reset de senha sempre devolve `200` (defesa contra enumeration).
- E-mails saem via Resend. `RESEND_FROM_EMAIL` precisa apontar pra um
  domínio verificado na conta Resend, senão a API só entrega pro próprio
  dono da conta.

## OAuth = e-mail verified automaticamente (Task #205)

- `findOrCreateOAuthUser` (Google/Facebook) chama
  `markEmailVerifiedFromTrustedProvider(email)` no início — espelha o
  trust do provider gravando uma linha `verified=TRUE` em
  `email_verification_codes`. **Idempotente** via `NOT EXISTS` (não dá pra
  usar `ON CONFLICT` porque a tabela não tem UNIQUE em `email`).
- Backfill one-shot pra usuários OAuth antigos roda no fim de
  `initializeSchema()` via `backfillOAuthVerifiedEmails()`. Loga a
  contagem ("Backfilled X OAuth user(s)") — se essa contagem for `> 0`
  mas vier acompanhada de erros `markEmailVerifiedFromTrustedProvider
  falhou`, NENHUM dos backfills realmente persistiu.
- `isUserEmailVerified` continua sendo a fonte da verdade — o trust do
  provider só corrige o **input**.

### Cuidado: cast `$1::text` no INSERT/SELECT
Sem o cast, `LOWER($1)` no `WHERE NOT EXISTS` faz Postgres devolver
`inconsistent types deduced for parameter $1` (`$1` aparece como coluna
`VARCHAR` no `INSERT` E como argumento de `LOWER` no `WHERE` — sem cast,
a inferência falha e o INSERT silenciosamente quebra). Sempre `$1::text`.

## Magic link de confirmação (Task #207)

- Coluna `verify_token_hash` em `email_verification_codes` (idempotente,
  `ADD COLUMN IF NOT EXISTS` + índice).
- `generateMagicLinkToken()` cria 32 bytes cripto-aleatórios; **só o
  sha256** é gravado. O token cru vai no e-mail e nunca volta pro DB.
- `buildMagicLinkUrl()` monta `${APP_URL}/api/auth/verify-email?token=…`.
- `verifyEmailByMagicLink(token)` é idempotente: re-clicks devolvem
  `alreadyVerified` em vez de erro. Estados:
  `ok | already | expired | invalid`.
- `GET /api/auth/verify-email?token=…` (não autenticado) sempre devolve
  `302` pra `${APP_URL}/?email_verified=<estado>`. Boot do `App.tsx` lê o
  query param, mostra toast e limpa via `history.replaceState`.
- Sem rate-limiter pesado nesse GET porque o token tem 256 bits de
  entropia (brute force inviável).
- Fallback: o código de 6 dígitos continua válido lado a lado (mesma row
  no DB carrega `code` E `verify_token_hash`).

## Resend de código (fluxo inline)

- `POST /api/auth/resend-verification` (`requireAuth`, rate limiter
  `3 / 15min keyByUser`). Não exige `email` no body — pega da sessão.
  Respeita cooldown `RESEND_COOLDOWN_MS` (60s) entre envios.
- `<EmailVerificationInline/>` (em `src/components/`) é o painel
  reutilizável. Quando montado com a prop `autoSend`, dispara
  `sendCode()` uma única vez no mount via `useRef` (Task #209) — usado
  pelo diálogo global de "link expirou".
- Polling: enquanto `stage="code"`, o componente bate em
  `GET /api/auth/verification-status` (`requireAuth`,
  `120 / 15min keyByUser`) a cada 4s + on focus/visibility change.
  Quando vê `verified=true`, dispara `onVerified()` automaticamente — é
  isso que faz "confirmou no celular, desktop avança sozinho" funcionar.
- `CreateCommunityModal` mostra esse painel quando `POST /forums`
  devolve `403 EMAIL_NOT_VERIFIED`, sem perder os campos do form, e
  retoma o submit ao confirmar. Reusar o componente em outros gates de
  e-mail no futuro.

### Re-envio automático em link expirado (Task #209)
Boot do `App.tsx` detecta `?email_verified=expired|invalid` e, se houver
sessão, abre um `<Dialog>` global montando
`<EmailVerificationInline autoSend />`. Anônimo recebe só um toast
pedindo login (sem sessão não dá pra reenviar). O toast de erro tem
ação "Reenviar agora" que reabre o diálogo se foi dispensado.

## Rate limiter `/api/auth`

`rateLimiter(max, windowMs, opts)` em
`server/middleware/security.ts` — bucket **in-memory por instância**
(reiniciar workflow zera buckets).

- POSTs sensíveis em `/api/auth`: **20 / 15min por IP**
  (login, register, forgot, reset, verify).
- Resto autenticado em `/api/auth`: **60 / 15min keyByUser**.
- `optionalAuth` hidrata `req.user` antes de cada limiter autenticado
  pra que `keyByUser` funcione (cai pra IP quando anônimo).
- `app.set("trust proxy", 1)` é obrigatório — sem isso o IP fica errado
  no Replit.

## Rotas principais

| método | rota | auth | descrição |
|---|---|---|---|
| POST | `/api/auth/register` | público | Cria user + envia código + magic link. |
| POST | `/api/auth/login` | público | Sessão. |
| POST | `/api/auth/logout` | requireAuth | |
| GET | `/api/auth/me` | público | Devolve user da sessão (ou null). |
| POST | `/api/auth/forgot-password` | público | Sempre 200 (anti-enumeration). |
| POST | `/api/auth/reset-password` | público (com token) | |
| POST | `/api/auth/verify-code` | público | Código de 6 dígitos. |
| POST | `/api/auth/resend-verification` | requireAuth | Cooldown 60s. |
| GET | `/api/auth/verify-email?token=` | público | 302 pro app. |
| GET | `/api/auth/verification-status` | requireAuth | Polling do painel inline. |
| GET | `/api/auth/google/callback` | público | OAuth — auto-verified. |
| GET | `/api/auth/facebook/callback` | público | OAuth — auto-verified. |

OAuth só é exposto em prod (`https://rayo.app.br`) — sem
`*_REDIRECT_URI` exato, o botão renderiza "Em breve". Configure
`GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` e
`FACEBOOK_CLIENT_ID/SECRET/REDIRECT_URI`.

## Env vars

| var | obrigatória | nota |
|---|---|---|
| `resend_api_key` (ou `RESEND_API_KEY`) | sim em prod | API key da Resend. |
| `RESEND_FROM_EMAIL` | sim em prod | Ex: `RAYO <nao-responda@rayo.app.br>`. **Domínio precisa estar verificado** em resend.com/domains, senão a API só entrega pro dono da conta. |
| `APP_URL` | sim | Base usada nos magic links. |
| `ADMIN_EMAILS` | não | Lista CSV — usuários listados são promovidos a admin no boot via `AdminBootstrap`. |
| `RESEND_COOLDOWN_MS` | não | Default `60000`. Cooldown entre re-envios de código. |
