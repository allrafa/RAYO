# Testes E2E (Playwright)

Testes end-to-end que rodam contra o **dev server real** (`npm run dev`) e o **banco de dev**. Os usuários de teste são criados via API REST e descartados ao final (mesmo em caso de falha) — o banco fica limpo.

## Pré-requisitos

- O dev server precisa estar rodando na porta 5000 (no Replit, isso é o workflow **`Start application`**; localmente, `npm run dev`).
- `DATABASE_URL` definida.
- **Chromium**:
  - **No Replit**: a suíte usa o binário gerenciado em `$REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` (sem download adicional). Veja "Por que CDP no Replit" abaixo.
  - **Localmente**: rode `npx playwright install chromium` uma vez. O setup detecta a ausência da env var do Replit e usa `chromium.launch()` do bundle do Playwright.

## Como rodar

```bash
# Roda toda a suíte (mobile chromium)
npx playwright test

# Um único spec
npx playwright test tests/e2e/messages.spec.ts

# UI mode (Playwright UI runner — só local; precisa de display)
npx playwright test --ui

# Headed (vê o browser de verdade — só local; precisa de display)
HEADED=1 npx playwright test
# ou
npx playwright test --headed

# Debugger (Playwright Inspector)
npx playwright test --debug
```

> **Aviso Replit**: `--ui`, `--headed` e `--debug` precisam de display gráfico. No container Replit (headless) eles não funcionam — use o ambiente local pra debugar visualmente.

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

## Por que CDP no Replit

O container do Replit não consegue rodar `chromium.launch()` direto: o Playwright força `--inspector-pipe` (FDs 3/4) e o handshake morre antes de completar. Workaround:

- `tests/e2e/global-setup.ts`: quando `$REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE` está setado, sobe o chromium com `--remote-debugging-port=0` e grava o ws endpoint em `tests/e2e/.artifacts/ws-endpoint.txt`. Quando a env var **não** está setada (ambiente local), pula esse passo.
- `tests/e2e/fixtures.ts`: se houver ws endpoint, conecta via `chromium.connectOverCDP(...)`; senão, cai no `chromium.launch()` normal (Playwright bundled).
- Specs **devem** importar `test`/`expect` de `./fixtures`, **nunca** de `@playwright/test` direto — senão o fixture custom é bypassado.

## Gotchas
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
