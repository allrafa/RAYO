# RAYO — Ritmo do Casal, E-mails Devocionais e Navegação Intuitiva

> Análise de 2026-07-12, pós-merge do PR #2 e publicação do app.
> Três frentes pedidas pelo Rafael: (F1) devocional do casal ligado ao
> processo diário, (F2) scheduler dos e-mails devocionais dormentes,
> (F3) auditoria e correção da navegação mobile de posts contra os
> padrões das grandes redes (Instagram/X/Threads).

## F3 — Navegação de posts no mobile (AUDITORIA FEITA — achados)

A queixa: *"quero clicar pra que o post abra e o que abre muitas vezes é
outra coisa"*. A auditoria do código confirmou e localizou a causa raiz.

### O que está certo (padrão Facebook, Task #164 — manter)

| Alvo | Comportamento atual | Padrão IG/X | Veredito |
|---|---|---|---|
| Avatar/nome do autor | abre perfil | igual | ✅ |
| `c/<slug>` | abre comunidade | igual | ✅ |
| Imagem do post | lightbox | igual | ✅ |
| Curtir (1 toque) + segurar (leque de emojis) | FB/IG-like, com PopoverAnchor e pointercancel corretos | igual | ✅ |
| Botões internos | stopPropagation em todos | igual | ✅ |
| Post dentro de CommunityDetailPage | DiscussionPage com URL `/c/<slug>/p/<id>` + back nativo | igual | ✅ |

### O que está errado (causa raiz da queixa)

1. **Duas superfícies pro mesmo conceito.** Tocar num post no Feed
   principal (e vindo de busca, notificação, perfil e trilho da Home —
   todos convergem em `openPostById` interno) abre o **CommentsPanel**,
   um sheet/modal de comentários — NÃO a página do post. Só dentro de
   uma comunidade o toque abre a `DiscussionPage` correta. No Instagram/
   X, tocar num post abre SEMPRE o detalhe do post (conteúdo em cima,
   comentários abaixo), com URL própria.
2. **Teclado sobe sem ser chamado.** `CommentsPanel` dá `focus()` no
   input ao abrir (ComunidadePage ~linha 2300). Quem toca no post pra
   LER recebe o teclado do iOS cobrindo metade da tela — exatamente o
   "abre outra coisa". Padrão IG/X: teclado só quando o usuário toca no
   botão comentar ou no campo.
3. **Gesto de voltar quebrado no sheet.** O CommentsPanel não cria
   entrada no histórico: o swipe-back do iOS (ou o botão voltar) sai da
   aba/página inteira em vez de fechar o painel. Na DiscussionPage o
   back é history-aware (correto).

### Correção (unificação IG/X)

- **Um único destino**: tocar num post — em QUALQUER origem (feed,
  busca, notificação, perfil, Home, comunidade) — abre a
  `DiscussionPage` com URL canônica `/c/<slug>/p/<id>` via pushState e
  back nativo. O `openPostById` interno do feed passa a rotear pra ela.
- **Teclado é opt-in**: botão "Comentar" abre a mesma DiscussionPage com
  `focusComposer` (rola até o campo e foca); toque no corpo NÃO foca.
- **Notificações** (`highlight_comment_id`) rolam até o comentário
  destacado dentro da DiscussionPage — sem modal.
- **CommentsPanel morre** (o composer e a lista já existem na
  DiscussionPage). Menos uma superfície pra manter.
- **Prova**: spec e2e mobile dedicada de click-targets — toque no corpo
  → URL do post SEM teclado; "Comentar" → composer focado; back →
  feed com scroll restaurado; avatar → perfil; c/slug → comunidade;
  curtir → não navega.

## F1 — Devocional do casal (o ritmo diário a dois)

Constrói sobre a Aliança + Palavra do dia. O devocional é o "momento
de qualidade" que o casal compartilha — 3 a 5 minutos, no ritmo diário:

- **Conteúdo**: ~30 devocionais curados (versículo ARC domínio público +
  reflexão original de 2 parágrafos + **1 pergunta pra conversar** +
  oração curta), com temas do persona: casamento, comunicação, perdão,
  filhos, finanças, intimidade com Deus. Rotação global determinística
  por dia (mesma do versículo) — todo casal vive o mesmo devocional no
  mesmo dia, o que habilita comunidade futura.
- **Mecânica "Fizemos juntos"**: cada cônjuge confirma; quando os DOIS
  confirmam no mesmo dia → +10 XP cada, celebração leve, e credita a
  missão semanal nova "Devocional a dois" (3x/semana) — mesmo padrão de
  gatilho conjunto já testado nas missões da Aliança.
- **UI**: card "Devocional do casal" dentro do cluster Hoje com Deus,
  visível só quando pareado (senão o CTA da Aliança já ocupa o lugar).
  Expande inline (sem modal): versículo → reflexão → pergunta → oração
  → botão "Fizemos juntos 🤍" + estado do cônjuge ("Ana já fez a parte
  dela").
- **Backend**: `couple_devotional_completions (couple_id, user_id,
  devo_date, UNIQUE(couple_id, user_id, devo_date))`; endpoints
  `GET /api/alianca/devocional` (do dia + estados) e
  `POST /api/alianca/devocional/complete`.

## F2 — E-mails devocionais (acordar os templates dormentes)

`sendMissaoDoDiaEmail` e `sendCartaSemanalEmail` existem prontos em
`server/lib/email.ts` sem NENHUM call site. Plano:

- **Scheduler in-process, sem dependência nova**: `setInterval` de 5
  min no boot do servidor, gated por env `EMAIL_SCHEDULER_ENABLED=1`
  (desligado em dev/teste por padrão). Janela de envio: Missão do Dia
  ~7h (America/Sao_Paulo) diária; Carta Semanal domingo ~8h.
- **Dedup por tabela**: `email_sends (user_id, kind, send_date,
  UNIQUE(user_id, kind, send_date))` — reinício do servidor não
  reenvia; múltiplas instâncias não duplicam (INSERT ... ON CONFLICT é
  o lock).
- **Opt-in/opt-out LGPD**: preferências em
  `users.notification_preferences.emails` (`{missao_diaria: bool,
  carta_semanal: bool}`), UI de toggles no Perfil, default **opt-in
  suave** (respeitando quem tem e-mail verificado), link de descadastro
  no rodapé do e-mail (→ página de preferências).
- **Envio em lotes** respeitando o rate do Resend (chunks com pausa),
  apenas usuários com e-mail verificado; log + contadores no health.
- **Conteúdo da Missão do Dia**: reusa o item do "Hoje no RAYO" do
  usuário (determinístico por user+dia, já existe) — o e-mail é o
  mesmo gancho do app, com CTA de 1 clique.

## Roadmap (iterações do loop, mediante aprovação)

1. **Iteração 2 — "Um toque, um destino" (F3)** ✅ CONSTRUÍDA:
   navegação unificada (toda origem → DiscussionPage com URL canônica),
   teclado só no botão Comentar (com `focusComposer`), destaque de
   comentário de notificação dentro da página, back nativo,
   CommentsPanel removido, spec e2e `click-targets.spec.ts` (2 cenários)
   travando o contrato. Bugs reais achados no caminho: `mapAPIPost`
   descartava `title` (posts sem título no feed) e `reactions`
   (prova social zerada nos cards); `Textarea` sem forwardRef (focus
   programático era no-op); FK `couple_invites.accepted_by` sem
   ON DELETE (migração idempotente adicionada).
2. **Iteração 3 — "O devocional" (F1)** ✅ CONSTRUÍDA: 30 devocionais
   curados (`server/features/alianca/devotionals.ts` — versículo ARC +
   reflexão + pergunta pra conversar + oração), rotação global diária;
   `couple_devotional_completions` + GET/POST `/api/alianca/devocional`;
   1ª confirmação +10 XP e convite suave ao cônjuge; 2ª completa o dia
   (missão "Devocional a dois" creditada pros DOIS + notificação de
   ritual completo); card expandível `DevocionalCasal.tsx` no cluster
   Hoje com Deus (some quando não pareado); 3 testes de integração.
3. **Iteração 4 — "As cartas" (F2)**: scheduler + email_sends +
   preferências no Perfil + testes de integração (janela, dedup,
   opt-out).
4. **Iteração 5 — "Polimento e prova"**: revisão visual, suítes
   completas, fechamento deste plano.

## Riscos e parqueados

- Scheduler roda in-process: se o deploy escalar pra N instâncias, o
  dedup por UNIQUE segura a duplicidade (INSERT é atômico). Cron
  externo fica como evolução.
- Carta Semanal precisa de conteúdo editorial por edição — v1 usa
  redação curada minha (mesmo modelo do devocional); painel admin de
  edição fica parqueado.
- Push diário da Palavra continua parqueado (depende de VAPID em prod).
