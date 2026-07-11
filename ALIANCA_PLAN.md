# RAYO — Aliança (Modo Casal) · Loop 4, Iteração 1

> Análise de 2026-07-11, aprovada pelo Rafael. Continuação do
> ENGAGEMENT_PLAN.md (§5 — "Modo Casal: maior aposta de produto para o
> persona"). Objetivo: transformar o RAYO de app de hábito individual em
> plataforma relacional — o casal caminha junto, se vê e ora um pelo outro.

## 1. Princípios (decisões de produto)

- **Encorajamento, não vigilância.** O cônjuge vê apenas: esteve ativo
  hoje (sim/não), a chama do casal, améns e orações. NUNCA qual conteúdo
  consumiu, tempo de tela ou progresso detalhado. Isso é decisão de
  privacidade E de produto: a Aliança deve gerar graça, não cobrança.
- **O gesto-assinatura é "Orar pelo outro"** — 1 toque, 1x por dia por
  direção (UNIQUE por data). Envia notificação in-app + web push na hora:
  *"Fulana orou por você agora 🙏"*. Baixa fricção, alta carga emocional,
  custo zero de conteúdo.
- **Convite é aquisição.** O link de pareamento compartilhado via
  WhatsApp funciona para quem ainda não tem conta — cai no cadastro com o
  vínculo pendente e é pareado após autenticar. Cada casal é um K-factor.
- **Zero dependências novas.** Tudo sobre o que já existe: notifications
  + web push, motor de missões (via `action_type`, sem mudar o engine),
  CelebrationOverlay, NativeShare, XP/streak.

## 2. Modelo de dados (idempotente no boot, como todo o schema.ts)

```sql
CREATE TABLE IF NOT EXISTS couples (
  id SERIAL PRIMARY KEY,
  user_a INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  user_b INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (user_a < user_b)          -- ordem canônica, sem duplicata invertida
);

CREATE TABLE IF NOT EXISTS couple_invites (
  id SERIAL PRIMARY KEY,
  inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(12) NOT NULL UNIQUE,      -- curto o bastante pra ditar por telefone
  status VARCHAR(12) NOT NULL DEFAULT 'pending',  -- pending|accepted|revoked
  accepted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);

CREATE TABLE IF NOT EXISTS couple_prayers (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  from_user INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prayed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (couple_id, from_user, prayed_date)   -- 1 oração/dia/direção
);
```

- **Chama do casal**: calculada sob demanda (sem coluna): dias
  consecutivos terminando hoje/ontem em que AMBOS têm linha no `xp_log`
  (mesma fonte do streak-calendar). Uma query, cacheável depois.
- **Amém do casal**: join de `verse_amens` dos dois no dia.

## 3. API (`server/features/alianca/`, requireAuth)

- `GET  /api/alianca` — estado: `none` | `invited {code, expiresAt}` |
  `paired {partner: {id, name}, coupleStreak, partnerActiveToday,
  prayedByMeToday, prayedByPartnerToday, amensToday: {mine, partner}}`.
- `POST /api/alianca/invite` — cria (ou renova) convite pendente;
  devolve code + link `PUBLIC_SITE_URL/?convite=CODE`. 409 se já pareado.
- `POST /api/alianca/accept {code}` — valida (não expirado, não é o
  próprio, nenhum dos dois já pareado), cria `couples`, marca invite
  accepted, notifica ambos (`couple_paired`), celebra. +25 XP pra cada.
- `POST /api/alianca/pray` — INSERT ON CONFLICT DO NOTHING; se inseriu:
  +3 XP (`couple_prayer`), `createNotification` pro cônjuge (kind
  `couple_prayer`, com push). Idempotente por dia.
- `DELETE /api/alianca` — desfaz o vínculo (qualquer lado, unilateral,
  sem notificação de "fulano te desvinculou" — silencioso por dignidade).

## 4. Frontend

- **`AliancaCard.tsx`** no cluster "Hoje com Deus" (após SemanaViva),
  3 estados:
  1. *Sem vínculo*: CTA suave "Caminhem juntos" → gera convite e abre
     compartilhar (WhatsApp via NativeShare) com mensagem pronta.
  2. *Convite pendente*: código visível, recompartilhar, revogar.
  3. *Pareado*: nome do cônjuge, chama do casal 🔥, "esteve ativo hoje",
     botão **"Orar por {nome} 🙏"** (vira "Você orou por {nome} hoje ✓"),
     selo quando o cônjuge orou por você, amém do casal no dia.
- **Redenção do convite** (`/?convite=CODE`): logado → accept imediato +
  toast; deslogado → guarda em `localStorage rayo_alianca_convite`, funil
  de cadastro intocado, redime no 1º boot autenticado.
- **Notificações**: kinds `couple_prayer`, `couple_paired` (ambos com
  web push automático via createNotification).
- **Celebração**: pareamento e marcos da chama do casal (7/30/90) usam o
  CelebrationOverlay (novo kind, mensagens próprias de casal).

## 5. Missões a dois (sem mudar o engine)

Missões semanais `type='weekly'` com `action_type` exclusivos de casal,
seed no boot. O progresso continua por usuário (engine intacto) — o
truque é o TRIGGER ser conjunto e creditar os dois:

- `couple_amen_day`: quando o 2º cônjuge diz amém no dia →
  `recordMissionProgress` para AMBOS. Missão "Améns em aliança" (3x/sem).
- `couple_prayer_day`: quando as DUAS direções oraram no dia → idem.
  Missão "Oração mútua" (3x/sem).

## 6. LGPD e bordas

- Exclusão LGPD anonimiza a linha do user (não deleta) → adicionar ao
  serviço LGPD a limpeza explícita: DELETE em couples/couple_invites/
  couple_prayers do usuário (o cônjuge volta ao estado `none`).
- Bordas: aceitar o próprio código (400), qualquer lado já pareado
  (409 CONFLICT), código expirado/revogado (410), convite duplicado
  (renova o pendente em vez de acumular).

## 7. Roadmap (iterações do loop)

### Iteração 2 — "O vínculo" ✅ CONSTRUÍDA
Backend completo: tabelas, os 6 endpoints (incl. /invite/revoke), oração
com notificação+push, chama do casal, XP; limpeza LGPD (que de quebra
fechou lacunas antigas: verse_amens e push_subscriptions não eram limpos
na exclusão); 10 testes de integração (pareamento feliz, bordas
400/404/409/410, corrida de accepts, idempotência da oração, chama com
2 users ativos, unpair em cascata, LGPD liberta o cônjuge).

### Iteração 3 — "O rosto da aliança" ✅ CONSTRUÍDA
`AliancaCard` (3 estados) no cluster "Hoje com Deus"; redenção do
convite `/?convite=CODE` no boot (logado ou pós-cadastro, código some da
URL e sobrevive em localStorage); compartilhar via NativeShare ("Enviar
pro seu amor"); celebração "Aliança firmada! 🤍" no CelebrationOverlay;
missões a dois seedadas + gatilhos conjuntos no amém e na oração
(crédito pros DOIS só quando o dia do casal se completa — testado).
Fluxo validado de ponta a ponta por screenshot: convite → link → 
celebração → card pareado com chama do casal.

### Iteração 4 — "Polimento e prova"
Revisão visual (mobile/desktop), estados de erro, suítes completas,
fechamento deste plano.

## 8. Parqueados (fora deste loop)

- Devocional do casal (conteúdo dedicado a dois) — depende de conteúdo real.
- Push diário da Palavra, scheduler de e-mails (ENGAGEMENT_PLAN §5).
- Grupos/células (o próximo patamar relacional depois do casal).
