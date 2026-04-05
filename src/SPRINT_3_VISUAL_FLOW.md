# 🎨 SPRINT 3 - FLUXO VISUAL
## Jornada do Usuário e Gamificação - Diagramas

> **Documento visual:** Diagramas e fluxos para entendimento rápido

---

## 🗺️ JORNADA DO USUÁRIO - ANTES vs DEPOIS

### ❌ ANTES (Sem Gamificação)

```
Usuário Ativo
    ↓
Abre app → Vê conteúdo genérico
    ↓
Escolhe algo para fazer (sem direção)
    ↓
Completa ação
    ↓
Ganha XP (feedback passivo)
    ↓
Fecha app
    ↓
[Sem motivação para retornar]
    ↓
Retorna quando lembra (aleatório)
    ↓
⏱️ Sessions/week: 2.5
❌ D7 retention: 38%
```

### ✅ DEPOIS (Com Gamificação 2.0)

```
Usuário Ativo
    ↓
Abre app → Vê dashboard gamificado
├── ⚡ Energia: 5/5 corações
├── 🔥 Streak: 3 dias
└── 🎯 Missões: 2/3 completadas
    ↓
Motivação clara: "Completar missão diária"
    ↓
Escolhe ação alinhada com missão
    ↓
Completa ação
├── -1 ❤️ Energia (visual feedback)
├── +50 XP (imediato)
├── 🎯 Missão: 3/3 ✅ COMPLETADA!
└── 🔥 Streak mantido: 3→4 dias
    ↓
Celebração visual 🎉
├── "Parabéns! Missão completada!"
├── "+50 XP + Energia bônus"
└── "Amanhã alcançará 5 dias de streak!"
    ↓
[Motivação para retornar amanhã]
    ↓
Recebe notificação 20h: "🔥 Mantenha seu streak!"
    ↓
Retorna no dia seguinte (engajado)
    ↓
⚡ Sessions/week: 4.0 (+60%)
✅ D7 retention: 50% (+12%)
```

---

## ⚡ SISTEMA DE ENERGIA - LOOP COMPLETO

```
┌────────────────────────────────────────────────────────────────┐
│                    ENERGY SYSTEM LOOP                          │
└────────────────────────────────────────────────────────────────┘

INÍCIO: Usuário com 5/5 corações
         │
         ▼
    ┌─────────────────┐
    │ Abre o App      │
    │ Vê: ❤️❤️❤️❤️❤️  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────────────────┐
    │ Escolhe ação de aprendizado │
    │ Ex: "Completar lição"       │
    └────────┬────────────────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Sistema checa energia    │
    │ if (currentEnergy >= 1)  │
    └────────┬─────────────────┘
             │
         ┌───┴───┐
         │       │
    TEM  │       │  SEM
    ▼              ▼
┌─────────┐    ┌──────────────────┐
│CAMINHO A│    │CAMINHO B         │
│Com ❤️   │    │Sem ❤️            │
└─────┬───┘    └───┬──────────────┘
      │            │
      ▼            ▼
  Gasta 1❤️    Não gasta ❤️
  ❤️❤️❤️❤️⚪    ⚪⚪⚪⚪⚪
      │            │
      ▼            ▼
  Completa      Completa
  ação          ação
  NORMALMENTE   NORMALMENTE
      │            │
      ▼            ▼
  Recebe:       Recebe:
  ✓ XP normal   ✓ XP normal
  ✓ Progresso   ✓ Progresso
  ✓ Feedback+   ✓ Feedback neutro
      │            │
      └────┬───────┘
           │
           ▼
    ┌──────────────────┐
    │ Toast Feedback   │
    │                  │
    │ COM ❤️:          │
    │ "Ação completa!  │
    │  -1❤️"           │
    │                  │
    │ SEM ❤️:          │
    │ "Ação completa!  │
    │  Volte em 2h     │
    │  para energia 🔋"│
    └────────┬─────────┘
             │
             ▼
    ┌─────────────────────┐
    │ Background Process  │
    │ A cada 4 horas:     │
    │ +1 ❤️ (até 5 max)   │
    └────────┬────────────┘
             │
             ▼
    ⚪⚪⚪⚪⚪ → ❤️⚪⚪⚪⚪ → ❤️❤️⚪⚪⚪ → ... → ❤️❤️❤️❤️❤️
    0h          4h          8h               20h
             │
             ▼
    ┌──────────────────────┐
    │ Notificação opcional │
    │ "⚡ Energia cheia!"  │
    │ "Hora de aprender"   │
    └──────────────────────┘

════════════════════════════════════════════════════════════════

DIFERENCIAL vs DUOLINGO:

DUOLINGO:                    RAIO:
Sem ❤️ → BLOQUEADO          Sem ❤️ → CONTINUA
       ↓                            ↓
Paga ou espera 4h           Apenas incentivo suave
       ↓                            ↓
Frustração                   Sem frustração
       ↓                            ↓
Abandono 30%                Retenção mantida
```

---

## 🔥 SISTEMA DE STREAKS - TIMELINE SEMANAL

```
┌────────────────────────────────────────────────────────────────┐
│                    STREAK SYSTEM - 7 DIAS                      │
└────────────────────────────────────────────────────────────────┘

DIA 1 (Segunda)
════════════════════════════════════════════════════════════════
09:00 │ Usuário faz primeira ação do dia
      │ Sistema: recordActivity('lesson_completed')
      │
      ▼ RESULTADO:
      🔥 Streak iniciado: 1 dia
      └─ Toast: "Streak começou! 🔥 Volte amanhã!"

20:00 │ Já fez ação hoje? SIM
      │ └─ Sem notificação


DIA 2 (Terça)
════════════════════════════════════════════════════════════════
10:00 │ Usuário faz ação
      │ Sistema: recordActivity('video_watched')
      │
      ▼ RESULTADO:
      🔥 Streak aumentado: 1→2 dias
      ├─ Toast: "Streak aumentado! 🔥 2 dias"
      └─ Analytics: STREAK_CONTINUED(2)

20:00 │ Já fez hoje? SIM
      │ └─ Sem notificação


DIA 3 (Quarta)
════════════════════════════════════════════════════════════════
20:00 │ Usuário NÃO fez ação ainda
      │
      ▼ NOTIFICAÇÃO:
      "🔥 Não perca seu streak de 2 dias!"
      "Faltam 4h para meia-noite"


DIA 4 (Quinta)
════════════════════════════════════════════════════════════════
00:00 │ Passou da meia-noite sem ação
      │ Streak DEVERIA quebrar...
      │
      ▼ MAS: Streak Freeze disponível!
      🛡️ Proteção automática ativada
      └─ Streak mantido: 2 dias (não aumenta)

14:00 │ Usuário faz ação
      │
      ▼ RESULTADO:
      🛡️ "Streak Freeze usado! Seu streak foi salvo!"
      🔥 Streak: 2→3 dias
      └─ Freeze: Usado (próximo reset: Dia 1 do mês que vem)


DIA 5 (Sexta)
════════════════════════════════════════════════════════════════
11:00 │ Usuário faz ação
      │
      ▼ RESULTADO:
      🔥 Streak: 3→4 dias


DIA 6 (Sábado)
════════════════════════════════════════════════════════════════
      │ Usuário NÃO faz ação (descansa)
      │
      ▼ Weekend Pass ativo!
      📅 Sábado não quebra streak
      └─ Streak mantém: 4 dias

20:00 │ Notificação: "📅 Weekend Pass ativo"
      │ "Aproveite seu descanso! Volte domingo ou segunda"


DIA 7 (Domingo)
════════════════════════════════════════════════════════════════
16:00 │ Usuário faz ação
      │
      ▼ RESULTADO:
      🔥 Streak: 4→5 dias
      
      ▼ PRÓXIMO MILESTONE:
      "🎯 Faltam 2 dias para alcançar 7 dias!"
      "Continue amanhã!"

════════════════════════════════════════════════════════════════

SEGUNDA SEMANA - DIA 8 (Segunda)
════════════════════════════════════════════════════════════════
10:00 │ Usuário faz ação
      │
      ▼ RESULTADO:
      🔥 Streak: 5→6 dias


DIA 9 (Terça)
════════════════════════════════════════════════════════════════
09:00 │ Usuário faz ação
      │
      ▼ RESULTADO:
      🔥 Streak: 6→7 dias
      
      🎉 MILESTONE ALCANÇADO!
      ┌──────────────────────────────┐
      │  🏆 PARABÉNS!                │
      │                              │
      │  Você completou 7 dias       │
      │  consecutivos!               │
      │                              │
      │  Recompensas:                │
      │  ✓ +100 XP                   │
      │  ✓ Badge "Semana Completa"   │
      │  ✓ +2 Energia bônus          │
      │                              │
      │  Próximo: 30 dias!           │
      └──────────────────────────────┘
      
      Analytics: STREAK_MILESTONE(7, 'uma_semana')
```

---

## 🎯 SISTEMA DE MISSÕES - FLOW DIÁRIO

```
┌────────────────────────────────────────────────────────────────┐
│                    MISSIONS SYSTEM - DAILY                     │
└────────────────────────────────────────────────────────────────┘

00:00 - RESET DIÁRIO (Automático)
════════════════════════════════════════════════════════════════
    ┌────────────────────────────────┐
    │ Cronjob/Scheduled Function     │
    │ generateDailyMissions(userId)  │
    └────────┬───────────────────────┘
             │
             ▼
    Gera 3 missões para hoje:
    ┌─────────────────────────────────┐
    │ 🎯 Missão 1: APRENDIZADO        │
    │ "Complete 1 lição"              │
    │ Progresso: 0/1                  │
    │ Recompensa: +50 XP, +1 Energia  │
    │ Expira em: 24h                  │
    └─────────────────────────────────┘
    
    ┌─────────────────────────────────┐
    │ 🎯 Missão 2: SOCIAL             │
    │ "Comente em 1 post"             │
    │ Progresso: 0/1                  │
    │ Recompensa: +30 XP              │
    │ Expira em: 24h                  │
    └─────────────────────────────────┘
    
    ┌─────────────────────────────────┐
    │ 🎯 Missão 3: ENERGIA            │
    │ "Use 3 corações hoje"           │
    │ Progresso: 0/3                  │
    │ Recompensa: +75 XP, +2 Energia  │
    │ Expira em: 24h                  │
    └─────────────────────────────────┘


09:00 - USUÁRIO ABRE APP
════════════════════════════════════════════════════════════════
    Vê dashboard:
    ┌──────────────────────────────────┐
    │ 📋 Missões Diárias               │
    │                                  │
    │ 🎯 Complete 1 lição    [0/1] ○  │
    │    +50 XP, +1❤️                  │
    │                                  │
    │ 🎯 Comente em 1 post   [0/1] ○  │
    │    +30 XP                        │
    │                                  │
    │ 🎯 Use 3 corações      [0/3] ○  │
    │    +75 XP, +2❤️                  │
    │                                  │
    │ ⏱️ Renovam em: 15h               │
    └──────────────────────────────────┘


10:00 - COMPLETA PRIMEIRA LIÇÃO
════════════════════════════════════════════════════════════════
    Ação: completeLesson()
         │
         ▼
    Auto-tracking:
    missionsSystem.trackAction({
      type: 'course_lesson_completed'
    })
         │
         ▼
    Sistema detecta missão relevante:
    "Complete 1 lição" → Progresso: 0→1/1
         │
         ▼
    Missão COMPLETADA! ✅
    ┌──────────────────────────────────┐
    │ 🎉 Missão Completada!            │
    │                                  │
    │ "Complete 1 lição"               │
    │                                  │
    │ Recompensas recebidas:           │
    │ ✓ +50 XP                         │
    │ ✓ +1 Energia bônus               │
    │                                  │
    │ Missões hoje: 1/3 ✅             │
    └──────────────────────────────────┘
    
    Analytics: MISSION_COMPLETED('daily-1', time_to_complete: 3600)
    
    Dashboard atualizado:
    ┌──────────────────────────────────┐
    │ 📋 Missões Diárias               │
    │                                  │
    │ 🎯 Complete 1 lição    [1/1] ✅ │
    │    +50 XP, +1❤️                  │
    │                                  │
    │ 🎯 Comente em 1 post   [0/1] ○  │
    │    +30 XP                        │
    │                                  │
    │ 🎯 Use 3 corações      [1/3] ▓▓○│
    │    +75 XP, +2❤️                  │
    │                                  │
    │ ⏱️ Renovam em: 14h               │
    └──────────────────────────────────┘
    
    Note: Missão 3 também progrediu! (usou energia)


15:00 - COMPLETA SEGUNDA MISSÃO
════════════════════════════════════════════════════════════════
    Ação: createComment()
         │
         ▼
    Auto-tracking detecta
    "Comente em 1 post" → 1/1 ✅
         │
         ▼
    Missões hoje: 2/3 ✅


20:00 - FALTA 1 MISSÃO
════════════════════════════════════════════════════════════════
    Sistema checa: 2/3 completadas
         │
         ▼
    Notificação:
    "🎯 Falta 1 missão para hoje!"
    "Complete para ganhar +75 XP"


21:00 - COMPLETA TERCEIRA MISSÃO
════════════════════════════════════════════════════════════════
    Usuário volta, completa mais ações
    Usa energia: 3/3 ✅
         │
         ▼
    TODAS MISSÕES COMPLETADAS! 🎉
    ┌──────────────────────────────────┐
    │ 🌟 TODAS MISSÕES COMPLETADAS!   │
    │                                  │
    │ Você é incrível! 3/3 ✅          │
    │                                  │
    │ Total ganho hoje:                │
    │ ✓ +155 XP                        │
    │ ✓ +3 Energia bônus               │
    │                                  │
    │ Volte amanhã para novas missões! │
    └──────────────────────────────────┘
    
    Analytics: ALL_DAILY_MISSIONS_COMPLETED(total_xp: 155)


23:59 - QUASE MEIA-NOITE
════════════════════════════════════════════════════════════════
    Preparando reset...


00:00 - NOVO DIA
════════════════════════════════════════════════════════════════
    Gera novas 3 missões
    Ciclo recomeça...
```

---

## 👥 MISSÕES COLABORATIVAS - FLOW EM CASAL

```
┌────────────────────────────────────────────────────────────────┐
│              COLLABORATIVE MISSIONS - COUPLE                   │
└────────────────────────────────────────────────────────────────┘

SETUP - Criar Time
════════════════════════════════════════════════════════════════
MARIA (Usuário A)                   JOÃO (Usuário B)
      │                                    │
      ▼                                    │
  Vai em Perfil                            │
  Clica "Criar Time"                       │
      │                                    │
      ▼                                    │
  Escolhe: "Casal"                         │
  Gera convite: CODE-1234                  │
      │                                    │
      └────── Compartilha código ─────────▶│
                                           │
                                           ▼
                                     Recebe convite
                                     Aceita CODE-1234
                                           │
      ┌────────────────────────────────────┘
      ▼
  Time criado! 👫
  Team ID: team-abc123
  Membros: [Maria, João]


MISSÃO COLABORATIVA ATIVA
════════════════════════════════════════════════════════════════
Sistema gera missão semanal:

┌─────────────────────────────────────────────┐
│ 👫 DESAFIO EM CASAL                         │
│                                             │
│ "Completem juntos 6 lições esta semana"    │
│                                             │
│ Progresso do time:                          │
│ ▓▓▓▓░░ 4/6                                  │
│                                             │
│ Contribuição:                               │
│ Maria: ▓▓ 2 lições                         │
│ João:  ▓▓ 2 lições                         │
│                                             │
│ Recompensa (para cada):                    │
│ ✓ +300 XP (dobro do normal)                │
│ ✓ Badge "Casal Unido"                      │
│ ✓ +5 Energia bônus                         │
│                                             │
│ ⏱️ Expira em: 3 dias                        │
└─────────────────────────────────────────────┘


MARIA COMPLETA LIÇÃO
════════════════════════════════════════════════════════════════
Maria completa lição
      │
      ▼
Sistema atualiza:
  Team progress: 4→5/6
  Maria: 2→3 lições
      │
      ▼
Notificação para JOÃO:
"👫 Maria completou mais 1 lição!"
"Faltam 1 para completar o desafio!"


JOÃO COMPLETA LIÇÃO
════════════════════════════════════════════════════════════════
João completa lição
      │
      ▼
Sistema atualiza:
  Team progress: 5→6/6 ✅
  João: 2→3 lições
      │
      ▼
MISSÃO COMPLETADA! (ambos recebem)

┌─────────────────────────────────────────────┐
│ 🎉 DESAFIO EM CASAL COMPLETADO!            │
│                                             │
│ Parabéns Maria e João! 👫                   │
│                                             │
│ Vocês completaram:                          │
│ ✓ 6 lições juntos                          │
│ ✓ Maria: 3 lições                          │
│ ✓ João: 3 lições                           │
│                                             │
│ Recompensas para cada:                     │
│ ✓ +300 XP                                  │
│ ✓ Badge "Casal Unido" 💑                   │
│ ✓ +5 Energia bônus                         │
│                                             │
│ Próximo desafio disponível segunda!        │
└─────────────────────────────────────────────┘

Analytics (para ambos):
TEAM_MISSION_COMPLETED(
  team_id: 'team-abc123',
  mission_id: 'collab-week-1',
  total_contributions: 6,
  completion_time: 4_days
)
```

---

## 📊 DASHBOARD GAMIFICADO - MOCKUP

```
┌────────────────────────────────────────────────────────────────┐
│                    🎮 SEU PROGRESSO HOJE                       │
└────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ ⚡ ENERGIA                                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ❤️ ❤️ ❤️ ❤️ ⚪  (4/5)                                     │
│                                                              │
│   Próxima em 2h 15m                                         │
│   Você pode continuar estudando mesmo sem energia           │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 🔥 STREAK                                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   🔥 12 dias consecutivos                                   │
│   🏆 Seu recorde: 15 dias                                   │
│                                                              │
│   🛡️ Streak Freeze disponível                               │
│   🎯 Próximo milestone: 30 dias (faltam 18)                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 🎯 MISSÕES DIÁRIAS                                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ Complete 1 lição                            +50 XP, +1❤️  │
│    [████████████████████████] 1/1                           │
│                                                              │
│ ○ Comente em 1 post                                  +30 XP │
│    [░░░░░░░░░░░░░░░░░░░░░░░░] 0/1                          │
│                                                              │
│ ▒ Use 3 corações                               +75 XP, +2❤️ │
│    [████████░░░░░░░░░░░░░░░░] 1/3                          │
│                                                              │
│ ⏱️ Renovam em: 14h 30m                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 👫 DESAFIO EM CASAL                                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ "Completem 6 lições juntos esta semana"                     │
│                                                              │
│ [████████████░░░░░░░░░░░░] 4/6                              │
│                                                              │
│ Você: 2 lições │ Parceiro: 2 lições                         │
│                                                              │
│ Recompensa: +300 XP, Badge "Casal Unido"                    │
│ ⏱️ Expira em: 3 dias                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎉 CELEBRAÇÕES E FEEDBACK VISUAL

### Milestone de Streak (7 dias)

```
┌────────────────────────────────────────────┐
│                                            │
│            🎉 PARABÉNS! 🎉                 │
│                                            │
│                   🏆                       │
│                                            │
│         Você completou 7 dias              │
│         consecutivos de streak!            │
│                                            │
│            [Animação de fogo]              │
│         🔥 🔥 🔥 🔥 🔥 🔥 🔥                │
│                                            │
│         ════════════════════               │
│                                            │
│         Recompensas desbloqueadas:         │
│         ✓ +100 XP                          │
│         ✓ Badge "Semana Completa"          │
│         ✓ +2 Energia bônus                 │
│                                            │
│         ════════════════════               │
│                                            │
│         🎯 Próximo: 30 dias!               │
│         Continue assim! 💪                 │
│                                            │
│         [Confetti animation]               │
│                                            │
└────────────────────────────────────────────┘
```

### Todas Missões Completadas

```
┌────────────────────────────────────────────┐
│                                            │
│         ⭐ MISSÕES COMPLETADAS! ⭐          │
│                                            │
│              3/3 ✅ ✅ ✅                   │
│                                            │
│         ┌──────────────────┐               │
│         │   Você arrasou!  │               │
│         │                  │               │
│         │  Total de hoje:  │               │
│         │  • +155 XP       │               │
│         │  • +3 Energia    │               │
│         │                  │               │
│         │  Keep it up! 💪  │               │
│         └──────────────────┘               │
│                                            │
│         Volte amanhã para novas            │
│         missões e recompensas!             │
│                                            │
│         [Sparkles animation]               │
│                                            │
└────────────────────────────────────────────┘
```

### Energia Regenerada

```
┌──────────────────────────────┐
│  ⚡ ENERGIA REGENERADA! ⚡    │
│                              │
│  Você ganhou +1 coração      │
│                              │
│  ⚪ ⚪ ⚪ → ❤️ ⚪ ⚪            │
│                              │
│  Hora de aprender algo novo! │
│                              │
│  [Pulse animation]           │
└──────────────────────────────┘
```

---

## ⏱️ TIMELINE DE IMPLEMENTAÇÃO - BURN DOWN

```
SPRINT 3 - 3 SEMANAS (15 DIAS ÚTEIS)

Features:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sistema Energia     ████████░░░░░░░░░░░░░░░░░░░░░░ Semana 1
Sistema Streaks     ░░░░░░░░████████░░░░░░░░░░░░░░ Semana 1
UI Components       ░░░░░░░░░░░░░░░░████████░░░░░░ Semana 1-2
Sistema Missões     ░░░░░░░░░░░░░░░░░░░░░░░░████░░ Semana 2
Auto-tracking       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Semana 2
Missões Collab      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░██ Semana 2-3
Trilha Hábitos      ░░░░░░░░░░░░░░░░░░░░░░░░░░████ Semana 3
Experimentos AB     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░██ Semana 3
Deploy & Polish     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░██ Semana 3

Progress:
Week 1: ████████████████░░░░░░░░░░░░░░░░░░░░ 40%
Week 2: ████████████████████████████░░░░░░░░ 70%
Week 3: ████████████████████████████████████ 100%

Milestones:
✓ Dia 5:  Energy + Streaks funcionando
✓ Dia 10: Missões com auto-tracking
✓ Dia 15: Deploy completo + experimentos ativos
```

---

**Última atualização:** Outubro 2025  
**Versão:** 1.0  
**Status:** Pronto para apresentação

Este documento visual complementa a documentação técnica e serve como referência rápida para entender os fluxos da gamificação 2.0.
