# 🎨 SPRINT 2 - FLUXO VISUAL
## Jornada do Usuário e Implementação

> **Documento visual:** Diagramas e fluxos para entendimento rápido

---

## 🗺️ JORNADA DO USUÁRIO - ANTES vs DEPOIS

### ❌ ANTES (Sprint 1)

```
Usuário Novo
    ↓
Landing Page
    ↓
Onboarding Básico (3 steps)
    ↓
Home com conteúdo genérico
    ↓
[Usuário explora sozinho]
    ↓
⏱️ TTFV: ~12-15 minutos
❌ Taxa de conclusão: ~45%
```

### ✅ DEPOIS (Sprint 2)

```
Usuário Novo
    ↓
Landing Page (SEO otimizado + UTMs)
    ↓
Onboarding V2 (5 steps personalizados)
├── Nome
├── Segmentos múltiplos (casado + pai)
├── Goals específicos (comunicação, finanças)
├── Interesses
└── Recomendações imediatas (3-5 opções)
    ↓
[Seleciona recomendação] ← TTFV START
    ↓
Primeira ação de valor
├── Iniciar curso
├── Assistir vídeo
└── Chat IA
    ↓ [⚡ TTFV ACHIEVED: ~3-4 min]
    ↓
Welcome Flow ativa
├── Mensagem: "Ótimo começo! 🎉"
├── Sugestão: "Continue com..."
└── CTA direto
    ↓
Home personalizada
├── Continue assistindo
├── Recomendado para você
├── Popular no seu segmento
└── First Week Checklist
    ↓
[Após primeira ação de valor]
    ↓
Email Opt-in Modal
    ↓
[Progresso nos primeiros 7 dias]
    ↓
Checklist guia próximas ações
├── ✅ Completar perfil
├── ✅ Primeiro curso
├── [ ] Fazer post
├── [ ] Chat IA
└── ...
    ↓
🎯 Usuário ativado e engajado
✅ TTFV: <5 min
✅ Taxa de conclusão: >70%
```

---

## 🎯 FLUXO DE ONBOARDING V2 DETALHADO

```
┌─────────────────────────────────────────────────────────────────┐
│                        ONBOARDING V2                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  STEP 1  │────▶│  STEP 2  │────▶│  STEP 3  │────▶│  STEP 4  │────▶│  STEP 5  │
│   Nome   │     │ Segmentos│     │  Goals   │     │Interesses│     │   Recs   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                 │                │                 │
     │                │                 │                │                 │
     ▼                ▼                 ▼                ▼                 ▼
"Como te          Múltiplos        "O que você      "Escolha         "Seu próximo
 chamar?"         contextos         quer             pelo menos        passo"
                  permitidos        melhorar?"       3 tópicos"
                                                                   
                  ┌─────────┐       ┌──────────┐     ┌─────────┐   ┌──────────────┐
                  │Solteiro │       │Comunicar │     │Relacion.│   │📚 Curso 1    │
                  │Namoro   │       │Financiar │     │Comunicar│   │   "Fundamen- │
                  │Noivos   │       │Intimidade│     │Financiar│   │    tos..."   │
                  │Casados ✓│       │Conflitos │     │Intimidade│  │   5 min      │
                  │Pais     ✓│       │Educar    │     │Fé       │   └──────────────┘
                  └─────────┘       └──────────┘     │Família  │   ┌──────────────┐
                                                      │Saúde    │   │🤖 Chat IA    │
                  Pode escolher     Min: 2           └─────────┘   │   "Converse  │
                  múltiplos         Max: 5                          │    agora"    │
                  (1-3)             goals            Min: 3          │   10 min     │
                                                     interesses      └──────────────┘
                                                                    ┌──────────────┐
                                                                    │🎥 Vídeo      │
                                                                    │   "Primeira  │
                                                                    │    dica"     │
                                                                    │   3 min      │
                                                                    └──────────────┘

Progress Bar: [███████████████████░░░░░] 75%
              1    2    3    4    5

⏱️ Timer interno tracking: TTFV START

════════════════════════════════════════════════════════════════════════════

ANALYTICS TRACKING:

✓ ONBOARDING_V2_STARTED
✓ ONBOARDING_V2_STEP_COMPLETED (step: 1, name: "nome", time: 10s)
✓ ONBOARDING_V2_STEP_COMPLETED (step: 2, name: "segmentos", time: 15s)
✓ ONBOARDING_V2_STEP_COMPLETED (step: 3, name: "goals", time: 20s)
✓ ONBOARDING_V2_STEP_COMPLETED (step: 4, name: "interesses", time: 25s)
✓ FIRST_RECOMMENDATION_VIEWED (count: 3)
✓ FIRST_RECOMMENDATION_CLICKED (rec_id: "course-1", time: 80s)
✓ ONBOARDING_V2_COMPLETED (total_time: 80s, segments: ["casados", "pais"])
✓ TTFV_ACHIEVED (ttfv_minutes: 3.2, first_value: "course_start")
```

---

## 🧪 SISTEMA DE EXPERIMENTOS - VISUAL

```
┌─────────────────────────────────────────────────────────────────┐
│                    GROWTHBOOK EXPERIMENTS                       │
└─────────────────────────────────────────────────────────────────┘

EXPERIMENTO 1: CTA Copy
═══════════════════════════════════════════════════════════════════

Novo Usuário chega no Step 5
         │
         ├────33%────▶ Variante A (Control)
         │             Button: "Começar agora"
         │
         ├────33%────▶ Variante B (Action)
         │             Button: "Iniciar minha transformação"
         │
         └────34%────▶ Variante C (Benefit)
                       Button: "Ver meu plano personalizado"

Métricas:
- Completion Rate por variante
- Time to Click
- TTFV por variante

Winner: [A ser determinado após 100+ usuários/variante]

═══════════════════════════════════════════════════════════════════

EXPERIMENTO 2: Onboarding Sequence
═══════════════════════════════════════════════════════════════════

Novo Usuário inicia onboarding
         │
         ├────33%────▶ Control (5 steps)
         │             Nome → Segmentos → Goals → Interesses → Recs
         │             ⏱️ ~2-3 min
         │
         ├────33%────▶ Short (3 steps)
         │             Nome → Segmentos → Recs (diretas)
         │             ⏱️ ~1-2 min
         │
         └────34%────▶ Progressive (2 steps iniciais)
                       Nome → Segmentos
                       [Resto mostrado progressivamente durante uso]
                       ⏱️ ~30s inicial

Métricas:
- Completion Rate
- TTFV
- Day 7 Retention

Winner: Hipótese = Short ou Progressive

═══════════════════════════════════════════════════════════════════

EXPERIMENTO 3: Paywall Timing
═══════════════════════════════════════════════════════════════════

Usuário acessa conteúdo Premium
         │
         ├────33%────▶ Control (após 3 conteúdos)
         │             [Premium 1] → [Premium 2] → [Premium 3] → 💰
         │
         ├────33%────▶ Light (após 5 conteúdos)
         │             Mais tempo explorando → Maior qualificação
         │
         └────34%────▶ Heavy (após 1 conteúdo)
                       Paywall imediato → Urgência

Métricas:
- Premium Conversion Rate
- Total Engagement antes da conversão
- LTV dos convertidos

Winner: Hipótese = Light (mais engajamento = maior conversão)
```

---

## 🎯 MOTOR DE RECOMENDAÇÕES - ALGORITMO VISUAL

```
┌─────────────────────────────────────────────────────────────────┐
│              RECOMMENDATION ENGINE v1 - SCORING                 │
└─────────────────────────────────────────────────────────────────┘

Usuário: Maria
Segmentos: [Casados, Pais]
Interests: [Comunicação, Finanças, Parentalidade]
Goals: [Melhorar comunicação, Educar filhos]

                    ┌──────────────────┐
                    │  CONTEÚDO DO     │
                    │   CATÁLOGO       │
                    │  ────────────    │
                    │  • Cursos (50)   │
                    │  • Vídeos (200)  │
                    │  • Livros (30)   │
                    │  • Posts (500)   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   FILTROS       │
                    │   ─────────     │
                    │ ✓ Não completado│
                    │ ✓ Não matriculado│
                    │ ✓ Premium check │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌─────────────────────────────┐
                    │      SCORING ENGINE         │
                    │      ──────────────         │
                    │                             │
                    │  Curso: "Comunicação CNV"   │
                    │  ─────────────────────────  │
                    │                             │
                    │  Goal Match:    30 pts ✓    │
                    │  (comunicação goal)         │
                    │                             │
                    │  Segment Match: 20 pts ✓    │
                    │  (casados tag)              │
                    │                             │
                    │  Interest Match:15 pts ✓    │
                    │  (comunicação interest)     │
                    │                             │
                    │  Popularity:    8 pts       │
                    │  (2000 students)            │
                    │                             │
                    │  Recency:       5 pts       │
                    │  (90 days old)              │
                    │                             │
                    │  ─────────────────────────  │
                    │  TOTAL SCORE:   78/100      │
                    │  CONFIDENCE:    High        │
                    └────────┬────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   RANKING       │
                    │   ─────────     │
                    │ 1. CNV (78)     │
                    │ 2. Finanças(72) │
                    │ 3. Pais (68)    │
                    │ 4. Conflitos(65)│
                    │ 5. Chat IA(100) │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  APRESENTAÇÃO    │
                    │  ────────────    │
                    │  Top 3-5 recs    │
                    │  Com reasons     │
                    │  Com time est.   │
                    └──────────────────┘

════════════════════════════════════════════════════════════════════

EXEMPLO OUTPUT:

┌────────────────────────────────────────────────────┐
│ 📚 Comunicação Não-Violenta                        │
│                                                    │
│ Porque você quer melhorar comunicação              │
│ ⏱️ 6h 15m • ⭐ 4.9 • 👥 1.923 alunos              │
│                                                    │
│ [Iniciar curso]                                    │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ 💰 Finanças para Casais                            │
│                                                    │
│ Popular entre casais como você                     │
│ ⏱️ 5h 45m • ⭐ 4.7 • 👥 3.421 alunos              │
│                                                    │
│ [Ver curso]                                        │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ 🤖 Conselheiro IA                                  │
│                                                    │
│ Tire dúvidas personalizadas agora                  │
│ ⏱️ 5-10 min • Sempre disponível                   │
│                                                    │
│ [Conversar]                                        │
└────────────────────────────────────────────────────┘
```

---

## 🔄 WELCOME FLOW - TIMELINE

```
DAY 1 - Primeiro Acesso
════════════════════════════════════════════════════════════════════
[Usuário completa onboarding]
         │
         ▼ [2 segundos depois]
    ┌─────────────────────────────────┐
    │ 🌟 Bem-vindo ao RAIO!           │
    │                                 │
    │ Sua jornada começa agora.       │
    │ Comece pelo curso               │
    │ "Fundamentos..."                │
    │                                 │
    │ [Ver curso]  [Depois]           │
    └─────────────────────────────────┘
         │
         ▼ [Usuário interage]
    [Marca como visto]
         │
         ▼
    ┌─────────────────────────────────┐
    │ ✅ TTFV Achieved                │
    │    Primeiro valor entregue!     │
    └─────────────────────────────────┘

════════════════════════════════════════════════════════════════════

DAY 2 - Segunda Sessão
════════════════════════════════════════════════════════════════════
[Usuário abre app novamente]
         │
         ▼ [Se não visitou comunidade]
    ┌─────────────────────────────────┐
    │ 💬 Explore a Comunidade         │
    │                                 │
    │ Conheça pessoas na mesma        │
    │ jornada que você!               │
    │                                 │
    │ [Ver comunidade]  [Depois]      │
    └─────────────────────────────────┘

════════════════════════════════════════════════════════════════════

DAY 3 - Engajamento
════════════════════════════════════════════════════════════════════
[Após primeira ação de valor]
         │
         ▼ [10 segundos na home]
    ┌─────────────────────────────────┐
    │ 📧 Receba dicas semanais        │
    │                                 │
    │ Conteúdo exclusivo no email     │
    │                                 │
    │ [seu@email.com]                 │
    │                                 │
    │ [Depois]  [Cadastrar]           │
    └─────────────────────────────────┘

════════════════════════════════════════════════════════════════════

DAY 4-7 - Checklist Progress
════════════════════════════════════════════════════════════════════
[Sempre visível na home]
    ┌─────────────────────────────────┐
    │ 🎯 Primeiros 7 Dias             │
    │                                 │
    │ [████████████░░░░░] 60%        │
    │ 3/5 completadas                 │
    │                                 │
    │ ✅ Complete perfil  (+50 XP)   │
    │ ✅ Primeiro curso   (+100 XP)  │
    │ ✅ Assistir vídeo   (+50 XP)   │
    │ ⏳ Fazer post      (+100 XP)   │
    │ ⏳ Chat IA         (+75 XP)    │
    │                                 │
    │ [Ver todas]                     │
    └─────────────────────────────────┘
         │
         ▼ [Usuário completa task]
    ┌─────────────────────────────────┐
    │ 🎉 Task completada!             │
    │    +100 XP ganhos               │
    └─────────────────────────────────┘
```

---

## 📊 TRACKING EVENTS - FLUXO COMPLETO

```
USER JOURNEY                          ANALYTICS EVENTS
═══════════════════════════════════════════════════════════════════

Landing Page Load                    → LANDING_PAGE_VISITED
                                      • utm_source
                                      • utm_campaign
    ↓
Click "Começar"                      → CTA_CLICKED
                                      • cta_location: "hero"
    ↓
Onboarding Starts                    → ONBOARDING_V2_STARTED
                                      • experiment: "sequence"
                                      • variation: "control"
    ↓
Complete Step 1                      → ONBOARDING_V2_STEP_COMPLETED
                                      • step: 1, time_spent: 10s
    ↓
Complete Step 2                      → ONBOARDING_V2_STEP_COMPLETED
                                      • step: 2, segments: ["casados"]
    ↓
Complete Step 3                      → ONBOARDING_V2_STEP_COMPLETED
                                      • step: 3, goals: ["comunicacao"]
    ↓
Complete Step 4                      → ONBOARDING_V2_STEP_COMPLETED
                                      • step: 4, interests: [...]
    ↓
Recommendations Shown                → FIRST_RECOMMENDATION_VIEWED
                                      • count: 3
                                      • recommendations: [...]
    ↓
Click Recommendation                 → FIRST_RECOMMENDATION_CLICKED
                                      • rec_id: "course-1"
                                      • rec_type: "course"
                                      • position: 1
    ↓
Onboarding Complete                  → ONBOARDING_V2_COMPLETED
                                      • total_time: 80s
                                      • segments: ["casados"]
                                      • goals: ["comunicacao"]
    ↓
Start Course                         → ACADEMIA_COURSE_STARTED
                                      • course_id: 1
                                      ┌─────────────────────┐
                                      │ 🎯 TTFV ACHIEVED!   │
                                      │    3.2 minutes      │
                                      └─────────────────────┘
                                      → TTFV_ACHIEVED
                                      • ttfv_minutes: 3.2
                                      • first_value: "course_start"
    ↓
Welcome Message Shows                → WELCOME_MESSAGE_VIEWED
                                      • message_id: "welcome-1"
    ↓
Welcome Message Action               → WELCOME_MESSAGE_ACTION_CLICKED
                                      • message_id: "welcome-1"
    ↓
Checklist Viewed                     → FIRST_WEEK_CHECKLIST_VIEWED
    ↓
Complete Checklist Item              → FIRST_WEEK_CHECKLIST_ITEM_COMPLETED
                                      • item_id: "first-course"
                                      • xp_earned: 100
    ↓
Email Modal Shows                    → EMAIL_OPTIN_MODAL_VIEWED
    ↓
Enter Email                          → EMAIL_OPTIN_COMPLETED
                                      • source: "first_value_modal"
    ↓
Continue Learning...                 → [Continuous engagement tracking]

═══════════════════════════════════════════════════════════════════

TOTAL EVENTS PER USER (First Session): 10-15 events
TTFV TARGET: <5 minutes (p95)
SUCCESS RATE TARGET: >70% completion
```

---

## 🎯 MÉTRICAS DASHBOARD - VISUAL

```
┌─────────────────────────────────────────────────────────────────┐
│                    SPRINT 2 METRICS DASHBOARD                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 📊 CORE METRICS                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TTFV (Time to First Value)                                     │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  p50: 2.8 min  ✅  [Goal: <5 min]                              │
│  p95: 4.2 min  ✅  [Goal: <5 min]                              │
│  Avg: 3.1 min  ✅                                               │
│                                                                  │
│  [██████████████████░░] 85% dentro do target                    │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Onboarding Completion Rate                                     │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  Control (5 steps):      68% ⚠��                                 │
│  Short (3 steps):        78% ✅ (+10% vs control)              │
│  Progressive (2 steps):  72% ✅ (+4% vs control)               │
│                                                                  │
│  Winner: Short variant                                          │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  First Module Completion (7 days)                               │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  Baseline: 42%                                                  │
│  Current:  59%  ✅ (+17% improvement)                           │
│                                                                  │
│  [████████████████████████░░░░░░░░░░] 59%                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 🧪 EXPERIMENTS STATUS                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Active: 3                                                    │
│  📊 Analyzing: 1                                                 │
│  🏆 Completed: 0                                                 │
│                                                                  │
│  ┌────────────────────────────────────────┐                    │
│  │ Exp 1: CTA Copy                        │                    │
│  │ ─────────────────                      │                    │
│  │ Status: Running                        │                    │
│  │ Traffic: 300 users                     │                    │
│  │ Leader: Variant B (+8% completion)     │                    │
│  └────────────────────────────────────────┘                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 💌 OPT-INS                                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Email Opt-in Rate:     28% ✅ [Goal: >25%]                     │
│  WhatsApp Opt-in Rate:  15%                                     │
│                                                                  │
│  Total Emails Captured: 420                                     │
│  Total WhatsApp:        180                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 📈 ENGAGEMENT                                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Checklist Completion:  62%                                     │
│  Welcome Flow CTR:      45%                                     │
│  Day 7 Retention:       38% (+12% vs baseline)                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Last updated: 2 minutes ago
```

---

## 🚀 IMPLEMENTAÇÃO - TIMELINE VISUAL

```
SPRINT 2 - 3 WEEKS TIMELINE
═══════════════════════════════════════════════════════════════════

WEEK 1: FOUNDATION
────────────────────────────────────────────────────────────────────
Mon  │ Setup GrowthBook                         │ ✓
     │ RecommendationEngine skeleton            │ ✓
────────────────────────────────────────────────────────────────────
Tue  │ RecommendationEngine complete            │ ✓
     │ Hook useRecommendations                  │ ✓
────────────────────────────────────────────────────────────────────
Wed  │ OnboardingV2 - Step 5                    │ ✓
     │ Recommendation cards                     │ ✓
────────────────────────────────────────────────────────────────────
Thu  │ TTFV tracking                            │ ✓
     │ Integration in components                │ ✓
────────────────────────────────────────────────────────────────────
Fri  │ Testing & Deploy                         │ ✓
────────────────────────────────────────────────────────────────────
     
     DELIVERABLE: Onboarding V2 + Recommendations + TTFV tracking


WEEK 2: EXPERIMENTS & COMMUNITY
────────────────────────────────────────────────────────────────────
Mon  │ Experiment 1: CTA Copy                   │ ✓
     │ GrowthBook config                        │ ✓
────────────────────────────────────────────────────────────────────
Tue  │ Experiment 2: Onboarding Sequence        │ ✓
     │ Variants implementation                  │ ✓
────────────────────────────────────────────────────────────────────
Wed  │ Welcome Flow                             │ ▶
     │ Message system                           │
────────────────────────────────────────────────────────────────────
Thu  │ First Week Checklist                     │
     │ Gamification                             │
────────────────────────────────────────────────────────────────────
Fri  │ Testing & Deploy                         │
────────────────────────────────────────────────────────────────────

     DELIVERABLE: 2+ Experiments Active + Welcome Flow + Checklist


WEEK 3: GROWTH & REFINEMENT
────────────────────────────────────────────────────────────────────
Mon  │ Opt-in Email Modal                       │
     │ Opt-in WhatsApp Modal                    │
────────────────────────────────────────────────────────────────────
Tue  │ Trigger logic & timing                   │
     │ Analytics integration                    │
────────────────────────────────────────────────────────────────────
Wed  │ SEO improvements                         │
     │ UTM tracking system                      │
────────────────────────────────────────────────────────────────────
Thu  │ End-to-end testing                       │
     │ Bug fixes                                │
────────────────────────────────────────────────────────────────────
Fri  │ Final deploy                             │
     │ Documentation                            │
     │ Sprint Review                            │
────────────────────────────────────────────────────────────────────

     DELIVERABLE: Complete Sprint 2 ✅

═══════════════════════════════════════════════════════════════════

MILESTONE CHECKLIST:
[✓] Week 1 Complete
[▶] Week 2 In Progress  
[ ] Week 3 Pending
[ ] Sprint Review
```

---

**Última atualização:** Outubro 2025  
**Versão:** 1.0  
**Status:** Pronto para apresentação

Este documento visual complementa a documentação técnica e serve como referência rápida para entender os fluxos do Sprint 2.
