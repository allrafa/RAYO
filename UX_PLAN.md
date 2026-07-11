# RAYO — Plano de Jornadas de Usuário (Loop 2, Iteração 1)

> Análise de 2026-07-10, continuação do LAUNCH_PLAN.md (bloqueadores técnicos
> já resolvidos). Persona-alvo: brasileiro de baixíssima alfabetização
> digital, fluente em Instagram/WhatsApp/TikTok. Diretriz-mãe: **quanto mais
> a experiência imitar os padrões das redes sociais, menos o usuário precisa
> aprender.** Método: 4 auditorias paralelas das jornadas reais no código
> (onboarding/auth, home/consumo, comunidade/DM, compra), com arquivo:linha.

---

## 1. Diagnóstico central

O RAYO já construiu a maioria das peças de rede social (reações multi-emoji,
swipe de WhatsApp na DM, check duplo de leitura, pull-to-refresh, bottom
sheet de comentários, realtime via Socket.IO) — **mas as alavancas de hábito
estão desligadas**:

1. **"Continue de onde parou" existe pronto e está desmontado.**
   `src/components/home/UnifiedContinue.tsx` implementa tudo (progresso,
   empty state acolhedor) e nunca é renderizado; `/api/dashboard` já devolve
   `coursesInProgress` e a Home descarta (`HomePage.tsx:41-50`).
2. **O loop social não fecha.** Comentário e reação no SEU post não geram
   NENHUMA notificação (`community/service.ts:1149,1299` não chamam
   `createNotification`) — o sino só toca para DM/turma/moderação. O motor
   nº 1 de retorno do Facebook ("fulano curtiu seu post") não existe. Push:
   zero infra (nenhum service worker/VAPID no repo).
3. **Curtir custa 2 toques.** A ação primária do post abre um popover de 6
   emojis (`EmojiReactionPicker.tsx:190-241`); não há "curtir" de 1 toque
   nem double-tap.
4. **Onboarding tem 7 telas + troca de app** (código de e-mail de 6 dígitos
   sem auto-submit, senha mín. 8, mínimo 3 interesses, nome pedido 2×,
   OAuth como botão cinza "Em breve" quando não configurado).
5. **O marketing promete o que o produto não entrega** (quebra fatal de
   confiança para quem já desconfia de pagar online): FAQ diz "Cartão, Pix
   e boleto" (`FaqPage.tsx:51`) — só há cartão; landing diz "Sem cartão de
   crédito" (`LandingPage.tsx:171,650`) — o trial exige cartão; "12x"
   (`CourseDetailPage.tsx:420`, `QuizPage.tsx:440`) — assinatura não
   parcela; planos "Free/Premium/Família R$49" (`LandingPage.tsx:400-489`)
   — o produto real é assinatura por trilha; garantia ora 7, ora 14, ora 30
   dias; links `/planos` e `/status` do FAQ estão mortos.
6. **Busca não existe no celular** (a busca global é desktop-only,
   `nav-rayo.css:148-151`; `MobileSearchPage.tsx` está pronta e morta) e o
   novo usuário cai numa Home quase vazia, num feed "Geral" sem nenhuma
   sugestão de comunidade — apesar de o onboarding JÁ perguntar o segmento
   que casa 1:1 com o `life_context` dos fóruns seed (`schema.ts:1537`).

## 2. Diretrizes (J1–J5)

- **J1 — Polegar primeiro**: toda ação principal a 1 toque (curtir, comentar
  com teclado aberto, continuar de onde parou no topo da Home).
- **J2 — Fechar o loop social**: quem interage com você, te chama de volta
  (notificações de comentário/reação agora; push real como estrutural).
- **J3 — Nunca prometer o que não entrega** (herda a D3 do LAUNCH_PLAN):
  remover Pix/boleto/12x/"sem cartão"/planos falsos até existirem.
- **J4 — Linguagem de gente**: sem jargão ("inbox", "Turmas", "código de
  verificação") — palavras que o persona usa no WhatsApp.
- **J5 — Entrar vale mais que cadastrar perfeito**: cada tela a menos no
  onboarding é retenção; personalização pode ser progressiva.

## 3. Roadmap de construção (iterações do loop)

### Iteração 2 — "O retorno e o toque" (maior alavanca / menor esforço)
1. Montar `UnifiedContinue` no topo da Home (após "Hoje no RAYO") — também
   resolve o estado vazio de conta nova (`HomePage.tsx:~343`).
2. Notificar comentário e reação no servidor: `createNotification` em
   `addComment` e `togglePostReaction`/`toggleCommentReaction`
   (`community/service.ts:1149,1224,1299`) + kinds em
   `notifications/service.ts:90-94`. Com dedupe básico anti-spam.
3. Curtir de 1 toque: tap = ❤️; long-press/hover abre o picker
   (`EmojiReactionPicker.tsx`, handler em `ComunidadePage.tsx:1972`).
4. Auto-focar o input de comentário no mobile
   (`ComunidadePage.tsx:2299-2304`).
5. Sugerir fóruns pelo segmento do usuário: ordenar `listForums` com match
   de `life_context`×`user.segments` + destacar no empty state; auto-
   inscrever no fórum do segmento + Geral no registro.

### Iteração 3 — "Cadastro sem atrito" (J5)
1. Auto-submit do código ao 6º dígito (`AuthPage.tsx:438-453`); copy
   "Cheque seu inbox" → "Olha seu e-mail" e revisão de jargões.
2. Interesses: mínimo 3 → 1 (`Onboarding.tsx:247-248,513-533`).
3. Não repetir o campo Nome no cadastro quando veio do onboarding
   (`AuthPage.tsx:877-893`).
4. `EMAIL_EXISTS` (409) → trocar automaticamente para login com e-mail
   preenchido (`AuthPage.tsx:306-323`).
5. OAuth não configurado → esconder botão em vez de "Em breve" cinza
   (`AuthPage.tsx:104-106`); quando ativo, SocialRow no topo.
6. Remover código morto `EmailVerification.tsx`.

### Iteração 4 — "Confiança na compra" (J3)
1. Remover promessas falsas: "Pix e boleto" (`FaqPage.tsx:51`), "Sem cartão
   de crédito" (`LandingPage.tsx:171,650`), "12x" (`CourseDetailPage.tsx:420`,
   `QuizPage.tsx:440`), planos Free/Premium/Família
   (`LandingPage.tsx:400-489`, `FaqPage.tsx:48`).
2. Unificar a garantia em UM número (7 dias grátis) em todas as superfícies.
3. Mostrar data da 1ª cobrança + "renova automaticamente — cancele quando
   quiser" ANTES de pagar (`TrilhaDetailPage.tsx:376-401`).
4. Consertar links mortos `/planos`/`/status` e o caminho de cancelamento
   descrito no FAQ (real: Perfil → Minhas assinaturas → Gerenciar).
5. WhatsApp de suporte no card de compra (env `VITE_SUPPORT_WHATSAPP_URL`).
6. VideoPage: remover like/dislike/"Inscrever-se"/"2.3M" decorativos
   (`VideoPage.tsx:233-262`) e colocar Salvar (`FavoriteButton`) +
   Compartilhar (`NativeShare`) funcionais.

### Iteração 5 — "Busca e linguagem" (J1/J4)
1. Busca no celular: ressuscitar `MobileSearchPage.tsx` com entrada na Home.
2. Renomear "Turmas" → "Aprender" (bottom nav, sidebar, headers).
3. Suítes completas + revisão final do plano.

## 4. Estruturais parqueados (exigem decisão/infra do Rafael)

- **Pix**: o bloqueio não é flag — `mode:"subscription"` não suporta Pix.
  Caminho recomendado: plano anual à vista via `mode:"payment"` +
  concessão de acesso por 12 meses no webhook. Decisão de negócio.
- **Push real** (service worker + VAPID + tabela de subscriptions) — o
  maior multiplicador do J2 depois das notificações in-app.
- **Reels vertical 9:16 com swipe** (hoje reels abrem em player 16:9).
- **Hold-to-record no áudio da DM + reply/quote** estilo WhatsApp.
- **Cadastro por magic link (sem senha) ou OTP por WhatsApp** — a infra de
  magic link já existe; OTP por WhatsApp é o padrão mental do persona.
- **Checkout embedded** (sem redirect para checkout.stripe.com).
- **Entrada mobile para o Conselheiro**: adiada de propósito — a página é
  "Em breve" honesto (LAUNCH_PLAN D3); dar destaque a uma promessa vazia
  contraria a J3. Voltar quando houver backend de IA.

## 5. Higiene de código encontrada (aproveitar nas iterações)

- Mortos: `EmailVerification.tsx` (verificação simulada), `SearchModal.tsx`,
  `NotificationModal.tsx`/`NotificationManager.tsx` (não montados),
  `MobileSearchPage.tsx` (ressuscitar na iteração 5, não deletar).
- Dados buscados e descartados: `coursesInProgress`/`enrolledNotStarted`
  na Home (`HomePage.tsx:41-50`).
- Backend pronto sem UI: `parent_id` de comentários (respostas aninhadas).
