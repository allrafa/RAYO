# RAYO — Diferencial: Palavra Viva, Aliança Profunda e o Momento RAYO

> Análise de 2026-07-15, pós-merge dos PRs #3/#4. Loop 6, direto na main
> (novo fluxo pedido pelo Rafael). Três frentes: (D1) a Palavra do dia
> ganhando push e virando a conversa diária da comunidade, (D2) o Modo
> Casal expandido com Pedidos & Testemunhos, e (D3) o elemento
> DISRUPTIVO: o Momento RAYO — oração comunitária síncrona das 21h com
> presença ao vivo.

## D1 — A Palavra te encontra (push diário + thread do dia)

O versículo diário já é a âncora da Home; agora ele sai do app:

- **Push diário da Palavra** (~8h SP): título "Palavra do dia 🌿",
  corpo com o versículo + referência. Vai para quem tem push ativo
  (ter `push_subscriptions` já é o opt-in técnico; a preferência
  `notifications.push` é respeitada). Dedup no mesmo padrão do e-mail:
  `email_sends` com kind `verse_push` (a tabela é o ledger de envios
  agendados; o kind distingue o canal).
- **Thread do dia na comunidade**: o mesmo tick cria 1 post por dia em
  `c/geral` assinado pelo usuário-sistema (Equipe RAYO, que já assina o
  seed): "🌿 Palavra do dia · {ref}" + versículo + convite ("Diga amém
  e conte como essa palavra te encontra hoje"). O push pode apontar pra
  thread → o amém individual vira conversa comunitária. Dedup kind
  `verse_post` (registrado no user-sistema).
- Roda no scheduler existente (tick de 5 min) — que deixa de ser só de
  e-mail e vira o **scheduler diário** do produto.

## D2 — Aliança expandida: Pedidos & Testemunhos

A oração do casal ganha objeto e memória:

- **Pedidos de oração do casal**: lista compartilhada
  (`couple_prayer_requests`: texto ≤280, status open/answered,
  answered_note). Qualquer um dos dois adiciona; o botão "Orar por
  {nome}" passa a mostrar os pedidos abertos — vocês sabem PELO QUE
  estão orando.
- **Testemunhos (o diferencial emocional)**: marcar um pedido como
  **"Deus respondeu 🙌"** (com nota opcional) move ele pro registro de
  testemunhos do casal — a memória espiritual da aliança. Notifica o
  cônjuge e celebra. Nenhum app do mercado PT-BR guarda o diário de
  orações respondidas do casal.
- **Marcos da chama do casal**: 7/30/90 dias juntos celebram no
  CelebrationOverlay (mensagens próprias de casal, dedup por dia no
  cliente — mesmo padrão dos marcos individuais).
- UI: seção expansível "Pedidos & testemunhos" dentro do AliancaCard
  (o cluster Hoje com Deus já está denso; nada de card novo).
- API: `GET/POST /api/alianca/pedidos`, `POST /pedidos/:id/responder`,
  `DELETE /pedidos/:id`. LGPD: cascade com o casal (já existente).

## D3 — Momento RAYO (o disruptivo): às 21h, todo mundo ora junto

Mecânica de **compromisso síncrono** (o que o BeReal fez com foto, o
RAYO faz com oração) — ninguém no mercado cristão PT-BR tem presença
ao vivo:

- **Todo dia, 21h00–21h10 (SP)**: a Home entra em "modo Momento". O
  card do topo vira a sala: o versículo do dia, uma oração curta, e o
  **contador de presença ao vivo** — "🕯️ Você e mais 231 pessoas orando
  agora" — via sala Socket.IO `momento:<data>` no namespace /community
  (join ao abrir, contagem broadcast em join/leave; infra já existente,
  zero dependência nova).
- **Améns flutuantes ao vivo**: cada toque em 🙏 flutua na tela de
  TODOS os presentes (throttle 1/s por socket). Presença que se vê.
- **Selo de presença**: participar concede +5 XP 1x/dia
  (`momento_attendances UNIQUE(user_id, momento_date)`), alimenta o
  xp_log → chama individual e do casal contam a presença.
- **Lembrete push 20h50** (kind `momento_reminder`, mesmo scheduler):
  "O Momento RAYO começa em 10 minutos 🕯️".
- **Fora da janela**: o card mostra o compromisso — "Hoje às 21h, o
  Brasil ora junto" com countdown. Appointment mechanics = retenção.
- MVP sem áudio/vídeo; é presença + palavra + oração + améns. Épicos
  futuros: áudio ao vivo, momentos por comunidade.

## Roadmap (iterações do loop, direto na main)

1. **Iteração 2 — "A Palavra te encontra" (D1)** ✅ (fd35ca9, CI verde)
2. **Iteração 3 — "Pedidos & Testemunhos" (D2)** ✅ (6c33ce2, CI verde)
3. **Iteração 4 — "O Momento" (D3)** ✅ (26ede56, CI verde)
4. **Iteração 5 — "Polimento e prova"** ✅: prova visual com DOIS
   navegadores simultâneos — presença ao vivo ("Você e mais 1 orando
   agora") e amém flutuando na tela do outro em tempo real; pedidos &
   testemunhos validados; suíte de integração completa verde.

## Status final do loop (2026-07-16)

As três frentes entregues na main com CI verde em todos os commits.
Go-live: push (D1/D3 lembrete) depende de VAPID_* em produção; o
Momento abre sozinho todo dia às 21h (nenhuma config extra); a thread
do dia começa a postar quando EMAIL_SCHEDULER_ENABLED=1 (o mesmo
scheduler dos e-mails).

Próximos patamares parqueados: grupos/células, Momento com áudio ao
vivo, Momento por comunidade, Pix no checkout.

## Notas de operação

- Trabalho direto na main (fluxo novo): cada iteração commitada e
  enviada com CI verde (tests.yml roda em push na main; eu poll o
  status a cada push).
- Push depende de VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT em produção —
  sem as chaves, push jobs são no-op limpos (já é o comportamento do
  sendPushToUser) e o restante do produto segue.
