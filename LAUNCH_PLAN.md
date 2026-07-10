# RAYO — Plano de Lançamento (Análise da Iteração 1)

> Documento produzido pela iteração 1 do loop de lançamento (2026-07-10).
> Método: 4 auditorias paralelas de código (billing/checkout, cursos/trilhas,
> prontidão de produção, inventário de features + testes) + execução real das
> suítes de teste e do build de produção. Todos os achados citam arquivo:linha
> e foram verificados no código real.

---

## 1. Veredito

**A plataforma NÃO está pronta para lançamento hoje.** A arquitetura é sólida
(thin client/fat server, gating 402, migrations idempotentes, LGPD, SEO), a
cobertura de testes das áreas críticas é boa, mas existem **5 bloqueadores P0**
— dois deles no coração do produto: o cliente que pagar **não recebe acesso**
(webhook Stripe inoperante) e o aluno que receber acesso **não consegue assistir
aula** (não existe player). Corrigindo os P0 e executando o checklist manual,
o lançamento é viável em poucas iterações.

## 2. Estado verificado (2026-07-10, container limpo)

| Verificação | Resultado |
|---|---|
| Testes unitários (`npm run test:unit`) | ✅ 33/33 passam |
| Testes de integração (`npm run test:integration`, Postgres 16 UTF8 limpo) | ⚠️ 205/244 passam; **as 39 falhas são todas ambientais** (`PUBLIC_OBJECT_SEARCH_PATHS`/Object Storage do Replit indisponível fora do Replit) — não são bugs de produto |
| Build de produção (`npm run build`) | ✅ OK em ~16s (só warnings de chunk size) |
| Bootstrap de schema em banco novo | ✅ em UTF8. ⚠️ Falha em banco `SQL_ASCII` (emoji `👨‍🎓` estoura `badges.icon VARCHAR(10)`, `server/db/schema.ts:121`) — exigir encoding UTF8 no provisionamento |

## 3. Bloqueadores P0 (sem isto, não lançar)

### B1 — Webhook Stripe nunca libera o acesso pago ✅ CORRIGIDO (iteração 2)
`processStripeWebhook` lê `result?.event` de `sync.processWebhook(...)`
(`server/features/billing/webhookHandlers.ts:158-173`), mas a lib
`stripe-replit-sync` retorna `Promise<void>` (`dist/index.d.ts:242`). `event` é
sempre `null` → `handleEvent` nunca roda → a tabela `subscriptions` (fonte da
verdade do gating 402) **nunca é populada**. Cliente paga e fica preso no
paywall para sempre. Efeitos colaterais: `ALREADY_SUBSCRIBED` nunca bloqueia
(assinaturas duplicadas), trial re-elegível infinito, refund não revoga acesso.
O bug é mascarado pelo mock de teste que retorna `{event}`
(`tests/integration/helpers/billing.ts:226,248`) e pela interface redeclarada à
mão em `server/stripeClient.ts:21-25`.
**Fix**: reconstruir o evento com `stripe.webhooks.constructEvent(payload,
signature, secret)` e chamar `handleEvent` a partir dele; corrigir o mock para
o contrato real; adicionar teste que falharia com o bug atual.

### B2 — Não existe player de aula ✅ CORRIGIDO (iteração 3)
`CourseDetailPage` descarta `video_url` (interface `DetailLesson`,
`src/components/CourseDetailPage.tsx:15-20`), o botão "Iniciar Curso" chama
`startCourse`, que é **função vazia** (`src/components/AppContext.tsx:512-513`),
e a única ação é o botão manual "Concluir". O aluno não tem como assistir o
conteúdo que comprou. `TurmaShell` herda a limitação.
**Fix**: renderizar a aula com `RayoVideoPlayer` (já existe, usado em
`VideoPage.tsx:203`), suportando `bunny://` e URL direta; progresso derivado do
tempo assistido chamando `PATCH /api/courses/lessons/:id/progress`.

### B3 — Curso criado no CMS nasce quebrado ✅ CORRIGIDO (iteração 2)
`createCourseFromCms` grava `total_lessons=0` (`server/features/cms/service.ts:1313`)
e `createCourseLesson`/`update`/`delete` (`cms/service.ts:1453-1514`) nunca
recalculam. `updateLessonProgress` divide por esse 0
(`server/features/academia/service.ts:220-234`) → progresso eterno em 0%, curso
jamais completa, XP/badge de conclusão nunca disparam. Só os cursos de seed
funcionam.
**Fix**: recalcular `total_lessons` (e `duration`) em toda mutação de lição +
migração retroativa (`UPDATE courses SET total_lessons = (SELECT COUNT(*)...)`).

### B4 — Senha do admin exposta no histórico git 🔴 (segurança)
`CREDENTIALS.md` (commitado em `fa377a4`, removido do HEAD em `ea37950`) contém
e-mail e senha em texto claro da conta admin — o mesmo e-mail configurado em
`ADMIN_EMAILS` (`.replit:97`) e promovido a admin no boot. Remover do HEAD não
remove do histórico: qualquer clone recupera com `git show fa377a4:CREDENTIALS.md`.
**Fix**: (a) **trocar a senha imediatamente** (ação manual do Rafael); (b) purgar
o histórico com `git filter-repo`/BFG ou aceitar o risco pós-rotação.

### B5 — E-mails silenciosamente desligados sem `resend_api_key` ✅ CÓDIGO CORRIGIDO (iteração 2; resta a config manual)
`server/lib/email.ts:42-45`: sem a env var, todo envio é **pulado sem erro** —
verificação de conta, reset de senha e digests simplesmente não chegam, e nada
alerta. Produção usa `nao-responda@rayo.app.br` (`.replit:100`), que exige
domínio verificado no Resend (SPF/DKIM/DMARC), senão vai para spam.
**Fix (código)**: log de erro/health warning quando a key está ausente em
produção. **Fix (manual)**: configurar key + DNS antes do go-live.

## 4. Riscos altos (P1 — resolver antes ou logo após o go-live)

1. **Autoscale × estado in-memory** — `deploymentTarget="autoscale"`
   (`.replit:27`) com rate limiter em `Map` local
   (`server/middleware/security.ts:92-146`) e Socket.IO **sem adapter Redis**
   (`server/realtime/io.ts`): com >1 instância, DM/notificações quebram entre
   instâncias e o rate limit vira N×. **Decisão D1 abaixo.**
2. **Billing init engole falhas** — todo o setup Stripe do boot está em
   `try/catch` que só loga warning (`server/index.ts:45-67`); app sobe
   "saudável" sem webhook registrado.
3. **Sem e-mails transacionais de compra** — nenhum recibo/confirmação no
   código; depende dos e-mails do dashboard Stripe (que precisam ser ativados).
4. **`past_due` mantém acesso** sem política de dunning
   (`billing/service.ts:47`); sem handler para `checkout.session.expired`; sem
   reconciliação periódica caso um webhook se perca.
5. **Sem upload de vídeo por aula** — editor usa campo de URL manual
   (`src/components/CourseModulesEditor.tsx:198-203`) e `prompt()`/`confirm()`
   nativos; Bunny só cobre `content_items` e episódios.
6. **Cegueira operacional** — nenhum Sentry/APM; erros 5xx só no console;
   sem graceful shutdown (`SIGTERM`); tabela `sessions` cresce sem expurgo.
7. **Promessas falsas na UI** (confiança do cliente):
   - Certificados prometidos (`CourseDetailPage.tsx:280-282,438,641-644`;
     `TrilhaDetailPage.tsx:234`) — não existem no backend.
   - Depoimentos hardcoded (Ana Carolina/João Silva,
     `CourseDetailPage.tsx:208-225`) e bio fixa "Dr. Rafael Santos… USP"
     (`:583-585`) ignorando dados reais.
   - "Turmas liberadas em sequência" (`TrilhaDetailPage.tsx:38,231`) — não há
     gating sequencial implementado.
   - **Conselheiro IA é 100% mock** — respostas prontas por keyword com
     `setTimeout` (`src/components/ConselheiroPage.tsx:266`), sem backend.
   - YouTube em modo mock com banner (`HomePage.tsx:841`); conteúdo de livros
     seed sem arquivo; dashboard com `Math.random()`
     (`src/components/AnalyticsContext.tsx:402-443`).
8. **Sem testes**: `books` (11 endpoints), `bundles`, `search`, `/api/users/*`,
   `/api/contato`. E2E não cobre consumo de aula/quiz.

## 5. Decisões de direção (diretrizes desta análise)

- **D1 — Lançar com 1 instância fixa** (min=max=1 no Replit Autoscale, ou
  Reserved VM). Adia Redis/adapter sem quebrar realtime nem rate limiting.
  Redis entra só quando houver tração.
- **D2 — Escopo do lançamento**: Auth + Trilhas pagas (Stripe) + Turmas/cursos
  + Comunidade + DM + Biblioteca (com arquivos reais). É o núcleo que gera e
  entrega valor pago.
- **D3 — Cortar/rotular o que não é real**: ocultar o Conselheiro IA do menu
  (ou rotular "em breve" sem chat fake), remover promessa de certificado até
  existir, remover depoimentos/bio hardcoded, ajustar copy de "liberadas em
  sequência", remover banner/mocks de YouTube da Home. Lançamento honesto >
  lançamento inflado.
- **D4 — Dinheiro tem prioridade absoluta**: nenhuma outra frente avança
  enquanto B1 não estiver corrigido e validado end-to-end em modo test do
  Stripe (checkout → webhook → `subscriptions` → acesso → cancelamento →
  revogação).
- **D5 — Conteúdo real é pré-requisito de go-live, não de código**: a
  plataforma lança com ao menos 1 trilha completa com vídeos reais no Bunny e
  livros com arquivo real — responsabilidade editorial (ver §7).

## 6. Roadmap de execução (próximas iterações do loop)

### Iteração 2 — "O dinheiro funciona" (P0 de código) ✅ CONCLUÍDA (2026-07-10)
1. ✅ **B1**: `processStripeWebhook` agora parseia o payload (já validado por
   assinatura pela lib) em vez de depender de um retorno que não existe;
   interface de `stripeClient.ts` corrigida para `Promise<void>`; mock de
   teste espelha o contrato real — a suíte de webhook virou regressão do bug.
2. ✅ **B3**: `recalculateCourseTotals()` em `cms/service.ts` chamado em
   create/update/delete de lição e delete de módulo (atualiza também
   `duration` e o snapshot de matrículas); backfill retroativo idempotente
   no boot (`schema.ts`); novo spec
   `tests/integration/cms/course-totals.test.ts` cobre o fluxo completo
   (autoria CMS → matrícula → conclusão 100%).
3. ✅ **B5 (código)**: `logger.error` em produção quando `resend_api_key`
   ausente (por envio e no boot); `GET /api/health` expõe
   `email: configured|not_configured`.
4. ✅ Init de billing: erro alto em produção (antes: warning silencioso),
   alerta quando o managed webhook não pode ser registrado, e status
   `billing: initialized|error|not_initialized` no health check
   (`server/lib/runtimeStatus.ts`).
5. ✅ Suítes completas executadas — resultados na seção 2.

### Iteração 3 — "O aluno consome" (P0 de produto) ✅ CONCLUÍDA (2026-07-10)
1. ✅ **B2**: novo `src/components/LessonPlayer.tsx` integrado ao
   `CourseDetailPage` (e ao `TurmaShell`, que o reusa): o herói vira player
   quando matriculado, aulas são clicáveis, "Iniciar/Continuar Curso" abre a
   primeira aula não concluída, deep-link de aula abre no player. O servidor
   resolve sentinels `bunny://` das lições em embed URLs
   (`academia/service.ts getCourseDetail`). Progresso: `in_progress` ao abrir
   a aula, `progress_seconds` a cada 30s e auto-conclusão a ≥90%/fim para
   arquivos diretos (mp4/mp3/…); embeds (Bunny/YouTube/Vimeo) mantêm o botão
   "Concluir aula" (iframes não expõem tempo sem SDK — melhoria futura).
   De quebra: badge/promessa de "Certificado" removida do herói (D3).
2. ⏭️ Seletor de vídeo por aula a partir de `content_items` do Bunny —
   ADIADO para a iteração 4. Workaround já funcional: colar o sentinel
   `bunny://<lib>/<guid>` ou URL direta no campo de vídeo da lição.
3. ✅ UX de sucesso do checkout: polling estendido para ~30s com estado de
   timeout ("Pagamento em processamento") + CTAs de recarregar e
   `/contato` (`TrilhaSucessoPage.tsx`).

### Iteração 4 — "Lançamento honesto e operável"
1. D3 completo (certificados, depoimentos, conselheiro, copy, mocks da Home).
2. E-mails transacionais de compra (confirmação/falha) via Resend.
3. Graceful shutdown (SIGTERM), expurgo de `sessions`/códigos expirados,
   `.env.example` completo (Bunny, Socket.IO, INTERNAL_API_KEY, contatos).
4. Error monitoring (Sentry ou similar) no `errorHandler` + unhandled.

### Iteração 5 — "Prova final"
1. Testes de integração para `books`, `bundles`, `search`, `/api/users`,
   `/api/contato`.
2. E2E de consumo: matricular → assistir → progresso → concluir.
3. Dedupe de webhook por `event.id` + reconciliação periódica.
4. Execução completa do checklist de go-live (§7) e smoke em produção.

## 7. Checklist manual do go-live (ações do Rafael, fora do código)

- [ ] **Trocar a senha do admin AGORA** (exposta no histórico git — B4).
- [ ] Resend: criar/confirmar API key de produção + verificar domínio
      `rayo.app.br` (SPF/DKIM/DMARC) + testar recebimento real.
- [ ] Stripe: ativar modo live no connector do Replit, conferir webhook
      gerenciado, **ativar e-mails de recibo no dashboard**, definir preços
      reais das trilhas.
- [ ] Deploy: fixar 1 instância (D1); confirmar backup automático do Postgres
      do Replit; conferir todas as env vars de produção (`.replit [userenv]`).
- [ ] OAuth: registrar redirect URIs exatas no Google Cloud Console e
      Facebook Developers (produção `https://rayo.app.br`).
- [ ] Conteúdo (D5): subir vídeos reais das aulas da 1ª trilha no Bunny,
      arquivos reais (PDF/EPUB) dos livros, revisar textos/preços.
- [ ] Compra-teste real de ponta a ponta com cartão de teste antes de anunciar.

## 8. Critérios de "pronto para lançar"

1. Compra em modo test do Stripe libera acesso em <60s e o cancelamento revoga.
2. Aluno assiste uma aula real e o progresso/conclusão/XP registram sozinhos.
3. Curso criado do zero pelo CMS é consumível e completável.
4. E-mail de verificação e reset chegam na caixa de entrada (não spam).
5. Suítes unit + integration 100% verdes no ambiente Replit; e2e crítico verde.
6. Nenhuma promessa falsa visível na UI (certificado, depoimento, IA).
7. Senha admin rotacionada e monitoramento de erros ativo.
