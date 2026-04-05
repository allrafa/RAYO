# 📊 RAIO - Dicionário de Métricas

## 🎯 North Star Metric

### WAPM (Weekly Active Premium Members)

**Definição:** Número de usuários premium que realizaram pelo menos 1 ação significativa na última semana.

**Ação Significativa:**
- Completou 1 aula de curso
- Leu 1 capítulo de livro  
- Enviou 1 mensagem ao Conselheiro IA
- Criou 1 post na comunidade

**Cálculo:**
```sql
SELECT COUNT(DISTINCT user_id) as WAPM
FROM user_activity
WHERE is_premium = true
  AND activity_date >= CURRENT_DATE - INTERVAL '7 days'
  AND (
    completed_lessons > 0 OR
    chapters_read > 0 OR
    ai_messages_sent > 0 OR
    community_posts > 0
  )
```

**Metas:**
- MVP (Q2 2025): **100 WAPM**
- Growth (Q3 2025): **1,000 WAPM**
- Scale (Q4 2025): **10,000 WAPM**

**Por que WAPM?**
1. ✅ Combina **engagement** (weekly active) com **revenue** (premium)
2. ✅ Usuários premium engajados = **menor churn**
3. ✅ Correlaciona com **transformação real**
4. ✅ Métrica acionável - podemos otimizar cada parte

---

## 📈 Métricas de Aquisição

### DAU (Daily Active Users)
**Definição:** Usuários únicos que abriram o app em um dia  
**Event:** `APP_OPENED`  
**Meta:** 1,000 DAU (MVP)

### MAU (Monthly Active Users)
**Definição:** Usuários únicos ativos nos últimos 30 dias  
**Meta:** 10,000 MAU (MVP)

### Sign-up Completion Rate
**Fórmula:** `(Signups Completed / Signups Started) * 100`  
**Events:** `AUTH_SIGNUP_STARTED` → `AUTH_SIGNUP_COMPLETED`  
**Meta:** > 70%

### Onboarding Completion Rate
**Fórmula:** `(Onboarding Completed / Onboarding Started) * 100`  
**Events:** `ONBOARDING_STARTED` → `ONBOARDING_COMPLETED`  
**Meta:** > 80%  
**Benchmark Duolingo:** ~65%

---

## ⚡ Métricas de Ativação

### TTFV (Time To First Value)
**Definição:** Tempo médio do signup até a primeira "ação de valor"

**Ações de Valor:**
- ✅ Completar primeira aula
- ✅ Ler primeiro capítulo
- ✅ Primeira conversa com IA
- ✅ Primeiro post na comunidade

**Cálculo:**
```javascript
TTFV = MEDIAN(
  timestamp_first_value_action - timestamp_signup
)
```

**Meta:** < 5 minutos  
**Insight Nir Eyal:** "Quanto mais rápido o valor, maior a formação de hábito"

### First Week Actions
**Definição:** Média de ações completadas na primeira semana  
**Meta:** > 5 ações  
**Correlação:** Usuários com >5 ações na semana 1 têm 3x mais retenção

---

## 🔥 Métricas de Engajamento

### DAU/MAU Ratio
**Definição:** Proporção de usuários mensais que são ativos diariamente  
**Fórmula:** `DAU / MAU`  
**Meta:** > 0.30 (30%)  
**Benchmark:**
- Facebook: ~60%
- Instagram: ~55%
- Duolingo: ~35%

### Session Length
**Definição:** Tempo médio por sessão (mediana)  
**Event:** `APP_SESSION_ENDED` (session_duration_seconds)  
**Meta:** > 12 minutos  
**Benchmark Duolingo:** ~10 min

### Sessions per User per Week
**Fórmula:** `Total Sessions / Unique Users / Weeks`  
**Meta:** > 3 sessões/semana  
**Correlação:** Usuários com 5+ sessões/semana viram premium

### Course Completion Rate
**Fórmula:** `(Cursos Completados / Cursos Iniciados) * 100`  
**Events:** `ACADEMIA_COURSE_STARTED` → `ACADEMIA_COURSE_COMPLETED`  
**Meta:** > 40%  
**Benchmark:**
- Coursera: ~15%
- Udemy: ~10%
- Duolingo: ~15%

**Por que nossa meta é maior?**
- Conteúdo mais focado (cursos menores)
- Segmentação personalizada
- Gamificação motivadora

### Book Completion Rate
**Fórmula:** `(Livros Completados / Livros Iniciados) * 100`  
**Events:** `ACADEMIA_BOOK_OPENED` → `ACADEMIA_BOOK_COMPLETED`  
**Meta:** > 30%  
**Benchmark:**
- Audible: ~40%
- Kindle Unlimited: ~25%
- Blinkist: ~35%

### Community Engagement Rate
**Definição:** % de usuários que postaram ou comentaram no mês  
**Fórmula:** `(Usuários Ativos Comunidade / MAU) * 100`  
**Meta:** > 10%  
**Benchmark:** Comunidades saudáveis têm 10-30%

---

## 🔁 Métricas de Retenção

### Day 1 Retention (D1)
**Definição:** % de usuários que voltam 1 dia após signup  
**Fórmula:** `(Usuários Ativos D1 / Novos Usuários D0) * 100`  
**Meta:** > 60%  
**Benchmark Duolingo:** ~55%

### Week 1 Retention (W1)
**Definição:** % de usuários que voltam 7 dias após signup  
**Meta:** > 50%  
**Benchmark Duolingo:** ~40%

### Month 1 Retention (M1)
**Meta:** > 35%  
**Benchmark Duolingo:** ~25%

### Month 3 Retention (M3)
**Meta:** > 20%  
**Importância:** M3 > 20% indica product-market fit

### Churn Rate (Premium)
**Definição:** % de usuários premium que cancelaram no mês  
**Fórmula:** `(Cancelamentos / Premium Members início mês) * 100`  
**Meta:** < 10% mensal (< 2.5% semanal)  
**Benchmark:**
- Netflix: ~5% mensal
- Spotify: ~6% mensal
- Duolingo: ~8% mensal

---

## 💰 Métricas de Monetização

### Free to Premium Conversion
**Definição:** % de usuários free que viraram premium  
**Fórmula:** `(Novos Premium / Total Free Início Período) * 100`  
**Meta:** > 5%  
**Benchmark:**
- Duolingo: ~7%
- Headway: ~8%
- Blinkist: ~6%
- Spotify: ~46% (muito alto, modelo diferente)

### Premium Conversion Funnel
```
100 Free Users
  ↓ 30% veem paywall → 30
  ↓ 20% clicam CTA → 6
  ↓ 50% completam checkout → 3
  = 3% conversion
```

**Meta:** Otimizar cada etapa
- Paywall View Rate: > 30%
- Click-through Rate: > 20%
- Checkout Completion: > 50%

### LTV (Lifetime Value)
**Fórmula:** `ARPU * Average Lifetime (months)`  

**Exemplo:**
- ARPU: R$ 49/mês
- Average Lifetime: 12 meses
- **LTV = R$ 588**

**Meta:** > R$ 500

### CAC (Customer Acquisition Cost)
**Definição:** Custo médio para adquirir 1 usuário  
**Fórmula:** `Total Marketing Spend / New Users`  
**Meta:** < R$ 50

### LTV:CAC Ratio
**Fórmula:** `LTV / CAC`  
**Meta:** > 5:1  
**Benchmark:**
- SaaS B2B: 3:1 a 5:1
- Consumer Apps: 2:1 a 4:1
- RAIO Target: 5:1 (R$ 500 / R$ 100 = 5x)

### MRR (Monthly Recurring Revenue)
**Fórmula:** `SUM(active_subscriptions * monthly_price)`  

**Breakdown:**
```
1000 premium users * R$ 49 = R$ 49.000 MRR
```

### MRR Growth Rate
**Meta:** > 20% mês a mês (early stage)  
**Fórmula:** `((MRR Mês Atual - MRR Mês Anterior) / MRR Mês Anterior) * 100`

### ARR (Annual Recurring Revenue)
**Fórmula:** `MRR * 12`

---

## 📚 Métricas de Produto - Academia

### Average Lessons per Course Enrollment
**Meta:** > 3 aulas assistidas por curso

### Video Completion Rate
**Definição:** % do vídeo assistido  
**Meta:** > 70%

### Course Rating Average
**Meta:** > 4.5/5.0

### Book Reading Sessions per Week
**Meta:** > 2 sessões/semana

### Average Reading Session Duration
**Meta:** > 20 minutos

### Immersive Mode Usage Rate
**Definição:** % de leitores que usam modo imersivo  
**Meta:** > 60%

### Audio vs Read vs Both
**Distribuição esperada:**
- Read: 30%
- Listen: 40%
- Both: 30%

---

## 🤖 Métricas de Produto - Conselheiro IA

### AI Conversations per Premium User
**Meta:** > 5 conversas/semana

### Average Messages per Conversation
**Meta:** > 8 mensagens

### AI Response Time
**Meta:** < 2 segundos (p95)

### Conversation Rating
**Meta:** > 4.0/5.0

### Resource Click-through Rate
**Definição:** % de recursos recomendados pela IA que foram clicados  
**Meta:** > 30%

---

## 👥 Métricas de Produto - Comunidade

### Posts per Day
**Meta:**
- MVP: > 10 posts/dia
- Growth: > 50 posts/dia
- Scale: > 100 posts/dia

### Comments per Post
**Meta:** > 3 comentários/post  
**Benchmark:** Comunidades saudáveis têm 2-5 comentários/post

### Active Community Members
**Definição:** Usuários que postaram ou comentaram no mês  
**Meta:** > 30% de MAU

### Community NPS (Net Promoter Score)
**Meta:** > 50

### Report Rate
**Definição:** % de posts reportados  
**Meta:** < 1% (indica comunidade saudável)

### Moderator Response Time
**Meta:** < 24 horas para revisar denúncias

---

## 🎯 Métricas de Produto - Gamificação

### Streak Retention
**Definição:** % de usuários que mantêm streak ativo  
**Meta:** > 30%  
**Benchmark Duolingo:** ~20%

### Average Streak Length
**Meta:** > 7 dias

### Badges per User
**Meta:** > 3 badges/usuário

### Daily Mission Completion Rate
**Meta:** > 40%

### XP per User per Week
**Meta:** > 500 XP

---

## 🔍 Métricas de Busca

### Search Usage Rate
**Definição:** % de usuários que usam busca  
**Meta:** > 40%

### Search Success Rate
**Definição:** % de buscas que resultam em click  
**Meta:** > 60%

### Average Results per Search
**Meta:** 10-20 resultados

---

## 📱 Métricas de UX

### Page Load Time
**Meta:** < 2 segundos (p95)

### Error Rate
**Meta:** < 1% das sessões

### Crash-free Sessions
**Meta:** > 99.5%

---

## 📧 Métricas de Marketing

### Email Open Rate
**Meta:** > 25%  
**Benchmark:** 15-25% para apps

### Email Click-through Rate
**Meta:** > 5%

### Push Notification Opt-in Rate
**Meta:** > 50%

### Push Notification Open Rate
**Meta:** > 15%

---

## 🎨 Métricas de Experimentos

### A/B Test Velocity
**Meta:** > 10 experimentos/mês (Growth fase)

### Winning Test Rate
**Benchmark:** 20-30% dos testes são winners

### Average Lift per Winning Test
**Meta:** > 5% improvement

---

## 📊 Dashboard Principais

### Executive Dashboard
- WAPM (North Star)
- MRR
- MAU
- Churn Rate
- LTV:CAC

### Product Dashboard
- DAU/MAU
- Session Length
- Completion Rates
- Feature Adoption

### Growth Dashboard
- Sign-up Funnel
- Onboarding Funnel
- Premium Conversion
- Retention Cohorts

### Community Dashboard
- Posts per Day
- Engagement Rate
- Active Members
- Report Rate

---

## 🎯 OKRs Exemplo - Q2 2025

**Objective:** Estabelecer fundação sólida para crescimento

**Key Results:**
1. Atingir 100 WAPM
2. Alcançar 80% de onboarding completion
3. TTFV < 5 minutos
4. W1 Retention > 50%

---

## 📝 Como Usar Este Dicionário

### Para Product:
- Definir metas de features
- Priorizar melhorias
- Medir impacto

### Para Growth:
- Otimizar funis
- Rodar experimentos
- Prever crescimento

### Para Executivos:
- Monitorar saúde do negócio
- Tomar decisões estratégicas
- Comunicar com investidores

---

**Atualização:** Semanal  
**Owner:** Head of Product + Head of Growth  
**Última Atualização:** Janeiro 2025
