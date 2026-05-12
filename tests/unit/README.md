# Testes Unitários

Suite leve baseada em `node:test` (via `tsx`). Cobre helpers e serviços puros que não precisam de servidor nem banco — hoje foca no auto-fill de metadados do YouTube usado pelo CMS (`server/lib/youtubeMetadata.ts` + `server/features/cms/service.ts`).

## Como rodar

```bash
npm run test:unit
```

O comando equivale a:

```bash
tsx --test tests/unit/*.test.ts
```

Sem dependências externas: não precisa de `DATABASE_URL`, dev server, browser ou rede. Roda em segundos.

## Onde os testes vivem

- `tests/unit/*.test.ts` — cada arquivo cobre um módulo. Use `node:test` (`describe`/`it`) e `node:assert/strict`.

## CI

A suíte roda automaticamente em todo push e PR via `.github/workflows/tests.yml` (job `unit`). O job E2E (`npx playwright test`) só roda depois que o `unit` passa — assim regressões baratas explodem antes de gastar tempo de browser.

Para detalhes do E2E (Playwright), veja [`tests/e2e/README.md`](../e2e/README.md).
