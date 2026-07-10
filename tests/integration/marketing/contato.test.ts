// LAUNCH_PLAN.md iteração 5 — primeira cobertura de POST /api/contato
// (formulário público: validação, comportamento sem Resend e rate limit).
//
// ATENÇÃO: o rate limiter (3/h por IP) é um Map em módulo — compartilhado
// entre apps do mesmo processo. Por isso todo o fluxo vive em UM único
// teste sequencial: 1 inválida + 2 válidas consomem o budget e a 4ª
// requisição prova o 429.
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
after(async () => { await truncateAll(); await closeDbPool(); });

describe("Marketing / POST /api/contato", () => {
  it("valida payload, aceita mensagem sem Resend configurado e aplica rate limit 3/h", async () => {
    await withServer(createTestApp(), async (base) => {
      // 1ª req (conta no limiter): nome inválido → 400
      const invalid = await request<{ success: boolean; error: { code: string } }>(base, {
        method: "POST",
        path: "/api/contato",
        body: { nome: "A", email: "x@rayo.test", assunto: "Oi", mensagem: "mensagem válida de teste" },
      });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.body.error.code, "INVALID_NOME");

      // 2ª e 3ª: válidas. Sem resend_api_key no ambiente de teste, a rota
      // responde 200 com delivered=false (mensagem aceita, e-mail pulado).
      for (let i = 0; i < 2; i++) {
        const ok = await request<{ success: boolean; data: { ok: boolean; delivered: boolean } }>(base, {
          method: "POST",
          path: "/api/contato",
          body: {
            nome: "Visitante Teste",
            email: "visitante@rayo.test",
            assunto: "Dúvida",
            mensagem: "Uma mensagem suficientemente longa para passar na validação.",
          },
        });
        assert.equal(ok.status, 200, ok.rawBody);
        assert.equal(ok.body.data.ok, true);
        assert.equal(ok.body.data.delivered, false, "sem Resend configurado, delivered deve ser false");
      }

      // 4ª: estoura o limite de 3/h por IP.
      const limited = await request(base, {
        method: "POST",
        path: "/api/contato",
        body: {
          nome: "Visitante Teste",
          email: "visitante@rayo.test",
          assunto: "Dúvida",
          mensagem: "Uma mensagem suficientemente longa para passar na validação.",
        },
      });
      assert.equal(limited.status, 429, `4ª requisição deveria ser rate-limited: ${limited.status}`);
    });
  });
});
