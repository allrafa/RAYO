# RAYO — Plano de Retenção & Deleite (Loop 3, Iteração 1)

> Análise de 2026-07-11, continuação do UX_PLAN.md. Persona: homens e
> mulheres cristãos de 28–35 anos — família, criação de filhos,
> relacionamento saudável, espiritualidade, intimidade com Deus, educação.
> Objetivo do loop: aumentar retenção de tela tornando a plataforma
> visual e interativamente agradável PARA ESTE público (não gamificação
> genérica — hábito espiritual com leveza).

## 1. O que já existe (fundação de hábito, auditada no código)

- **Check-in diário "Hoje no RAYO"**: 1 item editorial/dia determinístico,
  "marcar como feito" dá +15 XP, bump de streak e **confetti**
  (`home/HojeNoRaio.tsx`, `/api/home/today`).
- **Missões do dia/semana** com barras de progresso e XP na Home
  (`HomePage.tsx` seção Missões; backend `gamification`).
- **Streak com calendário**: `/api/home/streak-calendar` + modal
  (`home/StatsModals.tsx`) — mas o streak só aparece como "Dia X de 7"
  discreto no aside do Hoje.
- **Celebração parcial**: confetti só no Hoje e no Lesson0; `leveledUp`/
  `newLevel` já vêm nas respostas de completion e são subaproveitados.
- **E-mails devocionais prontos e DORMENTES**: `sendMissaoDoDiaEmail`,
  `sendCartaSemanalEmail`, `sendTrilhaConcluidaEmail` (`lib/email.ts`)
  não têm NENHUM call site — falta um scheduler.
- Push notifications, loop social e "continue de onde parou" entregues
  nos loops anteriores.

## 2. Diagnóstico

O motor mecânico (XP/streak/missões) existe, mas falta o **conteúdo-âncora
espiritual diário** — a razão emocional de abrir o app todo dia para este
público — e a **visibilidade do hábito** (a chama que o usuário não quer
apagar). Também falta transformar marcos em **momentos de celebração**.

## 3. Decisões (E1–E4)

- **E1 — Palavra do dia é a âncora**: um versículo por dia (tradução
  Almeida Revista e Corrigida, domínio público no Brasil), curado por
  temas do persona (casamento, filhos, fé, constância), com **"Amém 🙏"
  de 1 toque** + contador comunitário ("você e mais N disseram amém
  hoje") + compartilhar nativo. Social proof espiritual > like genérico.
- **E2 — A chama fica visível**: streak atual como chip 🔥 no topo da
  Home; toque abre o calendário que já existe.
- **E3 — Marcos viram festa**: level-up e streaks 7/30/90 celebram com
  confetti/modal em qualquer fluxo de conclusão (Hoje, aula, missão).
- **E4 — Constância semanal visual**: linha seg→dom com os dias ativos
  preenchidos (dados do streak-calendar), no topo da Home.

## 4. Roadmap (iterações do loop)

### Iteração 2 — "A Palavra e a chama" ✅ CONSTRUÍDA
1. ✅ Backend `/api/home/verse`: rotação determinística por dia sobre lista
   curada (61 versículos ARC com tema em `server/features/home/verses.ts`);
   `POST /api/home/verse/amen` (idempotente por dia via UNIQUE(user_id,
   amen_date), +5 XP no primeiro, devolve contagem global de améns do dia;
   tabela `verse_amens`).
2. ✅ Card "Palavra do dia" no topo da Home (`PalavraDoDia.tsx`): versículo
   + referência + tema, botão Amém 🙏 (burst de emojis + haptics + contador
   comunitário otimista) e Compartilhar (`NativeShare`). O burst do Amém
   (previsto pra iteração 3) já saiu nesta.
3. ✅ Chip de streak 🔥 (`StreakChip.tsx`) ao lado do eyebrow "Hoje com
   Deus" (abre `StreakCalendarModal` que já existia).
4. ✅ Testes: `tests/integration/home/verse.test.ts` (4 cenários — 401,
   determinismo global, idempotência do XP, contador comunitário).

### Iteração 3 — "Semana viva + celebração" ✅ CONSTRUÍDA
1. ✅ Semana viva (`SemanaViva.tsx`): linha seg→dom com dias ativos
   preenchidos (dados de `/api/home/streak-calendar?days=7`, ancorada no
   "hoje" do servidor pra não divergir de fuso); toque abre o calendário.
   Agrupada com eyebrow + chip + Palavra numa section "Hoje com Deus".
2. ✅ `CelebrationOverlay` global (montado no App): react-confetti (lib
   que o Hoje já usava) + mensagem central + haptics quando uma conclusão
   retorna `leveledUp` ou streak atinge 7/30/90 (dedupe por dia em
   localStorage). Ligado ao Hoje, aula/curso (`AppContext`), resgate de
   missão (`PerfilPage`) e amém. Backend passou a propagar
   `leveledUp/newLevel` na conclusão de aula e no claim de missão (antes
   descartava o retorno do addXP).
3. ✅ Bônus: o amém agora chama `updateStreak` — o toque de menor fricção
   do app mantém a chama acesa e acende o dia na semana viva na hora
   (`onEngaged` → reload do dashboard).
4. ~~Microinteração do Amém~~ (antecipada — saiu na iteração 2).

### Iteração 4 — "Polimento e prova"
1. Revisão visual dos novos elementos (dark mode, mobile-first, tokens
   `--rayo-*`), estados vazios/erro.
2. Testes de integração (verse/amen) + suítes completas verdes.
3. Atualização final deste plano.

## 5. Estruturais parqueados (dependem de decisão/infra)

- **Scheduler de e-mails devocionais** (Missão do Dia diária, Carta
  Semanal aos domingos): templates prontos; falta job (setInterval gated
  por env ou cron externo) + opt-in/opt-out por usuário (LGPD).
- **Push diário da Palavra** (quiet hours + opt-in) — multiplicador do E1.
- **Modo Casal** (parear com cônjuge, missões a dois) — maior aposta de
  produto para o persona; épico próprio.
