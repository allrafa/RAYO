# Testes de integração (backend)

Camada intermediária entre `tests/unit/` (lógica pura) e `tests/e2e/` (browser
real). Batem em `app` Express **real** (via `createTestApp()` que reusa
`server/app.ts:createApp()`) contra o **banco de dev** — sem browser, sem
Vite, sem Socket.IO listener, sem rede externa.

> **CI**: roda automaticamente em todo push/PR via `.github/workflows/tests.yml`
> (job `integration`, entre `unit` e `e2e`). Sobe o mesmo Postgres como service.

## Como rodar

```bash
# Toda a suíte
npm run test:integration

# Um único spec
npx tsx --test tests/integration/health.test.ts

# Vários
npx tsx --test tests/integration/auth/*.test.ts
```

## Quando criar um spec aqui (vs unit ou e2e)

- **Unit** (`tests/unit/`): função pura, sem DB, sem Express. Ex: validação
  de YouTube ID, gate de CORS isolado, helpers de string.
- **Integration** (este diretório): rota REST real exercitada via `fetch`,
  com DB real, middleware real (auth, rate limit, CORS). Ex: POST
  `/api/auth/register` cria user + retorna sessão; admin gating de 403.
- **E2E** (`tests/e2e/`): fluxo de usuário via browser real. Ex: usuário
  clica em "Entrar", digita credenciais, vê o feed.

Regra prática: se dá pra testar sem subir browser e a falha viria de
contrato de API, é integration.

## Padrões

### Estrutura básica de um spec

```ts
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, makeUser, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Minha feature", () => {
  it("faz a coisa certa", async () => {
    const app = createTestApp();
    const user = await makeUser();
    await withServer(app, async (base) => {
      const r = await request(base, { path: "/api/foo", cookie: user.sessionCookie });
      assert.equal(r.status, 200);
    });
  });
});
```

### Helpers

| Helper | O que faz |
| --- | --- |
| `createTestApp()` | Monta o Express com todas as rotas reais (sem Vite/SEO/Socket.IO) + errorHandler. |
| `withServer(app, fn)` | `app.listen(0)` → invoca `fn(baseUrl)` → fecha no `finally`. Sem handles vazados. |
| `request(base, opts)` | Wrapper de `fetch` que parseia JSON e devolve `{ status, headers, body, rawBody }`. |
| `ensureSchema()` | Roda `initializeSchema()` 1× por processo (idempotente). |
| `truncateAll()` | `TRUNCATE ... RESTART IDENTITY CASCADE` em todas as tabelas de dados. Não toca em seeds. |
| `makeUser({ role })` | Cria user com email verificado + sessão ativa. Retorna `{ id, email, sessionCookie }`. |
| `getPool()` | Pool `pg` compartilhado pra queries diretas (assertions/cleanup). |

## Variáveis de ambiente

| Var | Descrição |
| --- | --- |
| `DATABASE_URL` | Conexão Postgres — obrigatório. |
| `NODE_ENV` | Default `development` (importa pra rate limiter dev-vs-prod). |

## Gotchas

- **Isolamento**: `truncateAll()` esvazia **toda** a base. Não rodar specs de
  integration ao mesmo tempo que dev real está populando dados que importam.
  Local: usa o banco de dev, single-worker. CI: Postgres efêmero por job.
- **Rate limiter in-memory**: cada `createTestApp()` cria buckets novos.
  Específicas que estouram limite (ex.: `POST /api/auth/login` >20×) precisam
  de app novo por iteração ou helper de reset (não exposto ainda).
- **Schema**: `ensureSchema()` é idempotente (todos os `CREATE TABLE IF NOT
  EXISTS`). Se o spec depende de migration adicional (billing, etc.), chamar
  o `migrate*` específico no `before`.
- **Logs verbosos**: `createTestApp()` desliga `validateAuthEnv` e
  `logBunnyStatus`. Outros módulos que loguem no boot (Stripe sync) ainda
  podem aparecer — não bloqueia, mas se incomodar, gate com env.
- **Object Storage sidecar (Task #236)**: `cms/sentinels.test.ts` valida
  resolução do sentinel `objstore://` chamando o sidecar real do Replit
  (`http://127.0.0.1:1106/object-storage/signed-object-url`). Funciona
  porque o integration `javascript_object_storage` está INSTALLED no
  workspace. Se rodar fora do Replit, esse teste falha — mockar o
  sidecar ou pular o spec via env é caminho de hardening futuro.
- **`createTestAppWithPublicSeo()` (Task #236)**: variante async que
  monta `mountPublicSitemapAndRobots` + `mountPublicSeoHtml` com um
  shell HTML stub. Usar em specs que testam sitemap/robots/HTML public
  SEO. `createTestApp()` sync continua sem essas rotas.
