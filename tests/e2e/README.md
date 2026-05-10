# Testes E2E (Playwright)

Testes end-to-end que rodam contra o **dev server real** (`npm run dev`) e o **banco de dev**. Os usuários de teste são criados via API REST e descartados ao final (mesmo em caso de falha) — o banco fica limpo.

## Pré-requisitos

- O workflow **`Start application`** precisa estar rodando (porta 5000).
- `DATABASE_URL` definida (já vem do Replit).
- Chromium do Playwright: este projeto usa o binário gerenciado do Replit em `$REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` — sem download adicional.

## Como rodar

```bash
# Roda toda a suíte (mobile chromium)
npx playwright test

# Um único spec
npx playwright test tests/e2e/messages.spec.ts

# Debugger
npx playwright test --debug
```

## Onde olhar artefatos

- HTML report: `tests/e2e/.artifacts/report/index.html`
- Traces / screenshots / vídeos (só em falha): `tests/e2e/.artifacts/test-results/`

Pra abrir o report depois:

```bash
npx playwright show-report tests/e2e/.artifacts/report
```

## Variáveis de ambiente

| Var | Default | Descrição |
| --- | --- | --- |
| `REPLIT_DEV_DOMAIN` | (auto) | Usa `https://$REPLIT_DEV_DOMAIN` como `baseURL`. |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:5000` | Override manual fora do Replit. |
| `DATABASE_URL` | (auto) | Conexão Postgres — usada pelo cleanup em `helpers/api.ts`. |
| `REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` | (auto) | Binário do Chromium gerenciado pelo Replit. |

## Como criar um novo spec

1. Use `tests/e2e/helpers/api.ts` pra registrar usuários (`registerUser`) e logar (`loginViaApi`).
2. Use `test.afterEach` pra chamar `deleteUsersById([...])` — sempre limpe o que criou.
3. Prefira selectors por `aria-label` / `getByRole` / `placeholder` em vez de classes CSS (que mudam com refactor).

## Gotchas

- **Chromium via CDP**: o container do Replit não consegue rodar `chromium.launch()` (o `--inspector-pipe` morre antes do handshake). Por isso `tests/e2e/global-setup.ts` lança o chromium com `--remote-debugging-port=0` e o fixture em `tests/e2e/fixtures.ts` conecta com `chromium.connectOverCDP(...)`. Não use `import { test } from "@playwright/test"` — sempre `import { test, expect } from "./fixtures"`.
- **`networkidle` nunca dispara**: a app mantém SSE aberto. Use `waitFor` num elemento âncora (ex.: a aba "Comunidade" da bottom nav) em vez de `page.waitForLoadState("networkidle")`.
- **Banner de cookies cobre a bottom nav**: chame `dismissCookieBanner(page)` logo após carregar `/`.
- **Email verification**: registro exige código verificado. `registerUser` insere uma linha "verified" em `email_verification_codes` antes do POST — não chama Resend.
- **Rate limit `/api/auth`**: 20 POSTs / 15min por IP. Se rodar a suíte muitas vezes seguidas, restart o workflow `Start application` (bucket é in-memory).
- **Bottom nav usa `<button>`, não `<a>`**: `getByRole("button", { name: /^Comunidade(,|$)/ })` (o aria-label tem sufixo dinâmico quando há badge).
- **Strict mode em `getByText(messageText)`**: a mensagem aparece duas vezes (preview da lista + bubble). Filtre com `locator(".ra-chat-bubble", { hasText: ... })`.

## Convenções de cleanup

- Emails de teste seguem o padrão `test-*@rayo.test`. O `beforeAll` da suíte de mensagens dispara um safety-net (`deleteAllTestUsersByEmailPrefix`) pra varrer restos de execuções anteriores.
- Se um teste crashar muito feio, rode manualmente:
  ```bash
  psql "$DATABASE_URL" -c "DELETE FROM users WHERE email LIKE 'test-%@rayo.test';"
  ```
