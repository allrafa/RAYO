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

### Iteração 2 — "O retorno e o toque" ✅ CONCLUÍDA (2026-07-11)
1. ✅ `UnifiedContinue` montado no topo da Home (após "Hoje no RAYO") —
   inclui o empty state acolhedor para conta nova.
2. ✅ Loop social fechado: `notifyCommunityActivity()` em
   `community/service.ts` dispara notificação em comentário no post
   (`post_comment`), resposta a comentário (`comment_reply`) e reação em
   post/comentário (`post_reaction`/`comment_reaction`), com dedupe por
   (destinatário, kind, alvo, ator) para reações e nunca notificando a si
   mesmo. Kinds adicionados ao badge de Comunidade. Regressão:
   `tests/integration/notifications/social-loop.test.ts` (3 specs).
3. ✅ Curtir de 1 toque no PostCard: tap = ❤️ (ou remove a reação atual);
   long-press (450ms) ou hover (550ms) abre o leque de 6 emojis; rótulo
   "Curtir" quando sem reações.
4. ✅ Input de comentário auto-focado também no mobile (teclado já aberto,
   padrão Instagram).
5. ✅ Fóruns do contexto de vida do usuário vêm primeiro no Explorar
   (`listForums` ordena por match `life_context`×`segments`, com
   `noivos`→`namoro`) e o registro auto-inscreve o novo usuário no fórum
   do seu segmento + Geral (`autoSubscribeCommunities` em
   `auth/service.ts`, best-effort).

### Iteração 3 — "Cadastro sem atrito" (J5) ✅ CONCLUÍDA (2026-07-11)
1. ✅ Código verifica sozinho ao digitar/colar o 6º dígito (com guarda de
   duplo-submit); copy do passo virou "Olha seu e-mail" com aviso de que o
   código entra sozinho.
2. ✅ Interesses: mínimo 3 → 1, com copy convidativa ("Toque em pelo menos
   1 tema que fala com você").
3. ✅ Nome vindo do onboarding não é pedido de novo — vira saudação
   "Olá, {nome}!" com link "trocar nome".
4. ✅ `EMAIL_EXISTS` no cadastro troca automaticamente para o login com o
   e-mail preenchido e mensagem gentil (AuthContext agora repassa o
   `code` do erro).
5. ✅ OAuth não configurado fica oculto (nada de botão cinza "Em breve");
   o divisor "ou ..." também some quando não há nenhum provedor.
6. ✅ Código morto `EmailVerification.tsx` removido.

### Iteração 4 — "Confiança na compra" (J3) ✅ CONCLUÍDA (2026-07-11)
1. ✅ Promessas falsas removidas: FAQ de pagamento reescrito para o produto
   real (assinatura por trilha, cartão, 7 dias grátis, "Pix em breve" como
   promessa honesta de roadmap); "Sem cartão de crédito" fora da landing;
   "12x" removido do curso e do quiz; cards Free/Premium R$49 da landing
   viraram "Conta gratuita" + "Trilhas guiadas" (CTAs levam a /trilhas).
2. ✅ Garantia unificada: 7 dias grátis + "cancele quando quiser" em todas
   as superfícies (fora o reembolso de 14 dias e a garantia de 30).
3. ✅ Data exata da 1ª cobrança + "renova todo mês/ano · cancele quando
   quiser" exibidas no card de compra ANTES do checkout.
4. ✅ Links mortos: `/planos` removido (FAQ aponta para `/trilhas`) e card
   de "/status" removido; caminho de cancelamento corrigido no FAQ
   (Perfil → Minhas assinaturas → Gerenciar).
5. ✅ WhatsApp de suporte no card de compra da trilha (aparece quando
   `VITE_SUPPORT_WHATSAPP_URL` está configurada).
6. ✅ VideoPage sem teatro: like/dislike/menu decorativos e o bloco
   "Inscrever-se"/"2.3M inscritos" saíram; entraram Salvar (favoritos) e
   Compartilhar (share nativo) funcionais.

### Iteração 5 — "Busca e linguagem" (J1/J4) ✅ CONCLUÍDA (2026-07-11)
1. ✅ Busca no celular: `MobileSearchPage` (que estava pronta e morta)
   agora abre pelo item fixo "Buscar" da bottom nav (padrão Instagram),
   montada no nível raiz do App.
2. ✅ "Turmas" → "Aprender" na bottom nav e na sidebar desktop (o
   vocabulário interno de turma/cohort permanece dentro da seção).
3. ✅ Suítes completas verdes (resultado na conclusão abaixo).

## Conclusão do roadmap (2026-07-11)

As 5 iterações do plano foram construídas e enviadas. As jornadas agora:
- **retêm** (continue de onde parou, notificações sociais, fóruns do seu
  momento de vida desde o cadastro);
- **respondem ao polegar** (curtir 1 toque, teclado direto, busca a 1 toque);
- **não mentem** (marketing alinhado ao produto, preço e cobrança
  transparentes, botões decorativos removidos);
- **custam menos pra entrar** (código auto-enviado, 1 interesse, nome 1×,
  OAuth morto oculto).

O que segue no §4 (estruturais parqueados) depende de decisão/infra do
Rafael — Pix, push real, reels vertical, OTP WhatsApp, checkout embedded.

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
