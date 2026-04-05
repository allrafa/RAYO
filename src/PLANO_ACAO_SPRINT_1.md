# 🎯 PLANO DE AÇÃO IMEDIATO - Sprint 1 Semana 2

**Data:** Janeiro 2025  
**Objetivo:** Completar os 40% restantes do Sprint 1

---

## 📊 DIVISÃO DE RESPONSABILIDADES

### 🔧 VOCÊ (Configuração Externa)
Ferramentas que precisam de conta/configuração externa

### 🤖 EU (Desenvolvimento)
Código e implementação que posso fazer

---

# 🔧 PARTE 1: VOCÊ - Configuração de Ferramentas

## A) MIXPANEL - Analytics

### ✅ O Que Já Está Pronto
- [x] SDK instalado e configurado (`/lib/analytics/mixpanel.ts`)
- [x] 60+ eventos definidos
- [x] React Hooks criados (`/hooks/useAnalytics.ts`)
- [x] ConsentBanner com LGPD
- [x] Tracking em modo DEMO (funciona sem token)

### ❌ O Que Falta (SUA PARTE)

**Passo 1: Criar Conta Mixpanel**
```
1. Ir em: https://mixpanel.com/
2. Sign Up (tem plano FREE até 100k eventos/mês)
3. Criar projeto: "RAIO - Produção"
4. Copiar o PROJECT TOKEN
```

**Passo 2: Configurar Token**
```bash
# Criar arquivo .env na raiz do projeto
touch .env

# Adicionar dentro do .env:
VITE_MIXPANEL_TOKEN=seu_token_aqui_copiado_do_mixpanel
```

**Passo 3: Criar Dashboards no Mixpanel**

Depois que o token estiver configurado e eventos começarem a chegar:

**Dashboard 1: Executive Dashboard**
- Métricas: WAPM, DAU, MAU, MRR
- Gráficos: Linha temporal (últimos 30 dias)
- Filtros: Por segmento (solteiro, casado, pais)

**Dashboard 2: Product Dashboard**
- Métricas: Course Completion Rate, Book Reading Sessions, AI Conversations
- Gráficos: Funil de onboarding, Retention curves
- Filtros: Premium vs Free

**Dashboard 3: Growth Dashboard**
- Métricas: Sign-ups, Free→Premium conversion, Churn
- Gráficos: Acquisition funnel, Activation metrics
- Filtros: Por canal de aquisição

**📋 Checklist Mixpanel:**
- [ ] Criar conta Mixpanel
- [ ] Copiar PROJECT TOKEN
- [ ] Adicionar em .env
- [ ] Testar (abrir app e ver eventos chegando)
- [ ] Criar Dashboard 1 (Executive)
- [ ] Criar Dashboard 2 (Product)
- [ ] Criar Dashboard 3 (Growth)
- [ ] Compartilhar acesso com time

**⏱️ Tempo Estimado:** 2-3 horas

**🔗 Recursos:**
- Mixpanel Docs: https://docs.mixpanel.com/
- Nosso Metrics Dictionary: `/METRICS_DICTIONARY.md`
- Nosso Analytics Guide: `/ANALYTICS_SETUP_GUIDE.md`

---

## B) GROWTHBOOK - Feature Flags & A/B Testing

### ✅ O Que Já Está Pronto
- Nada ainda (esse é o item pendente do Sprint 1)

### ❌ O Que Falta (SUA PARTE)

**Passo 1: Criar Conta GrowthBook**
```
1. Ir em: https://www.growthbook.io/
2. Sign Up (tem plano FREE)
3. Criar organização: "RAIO"
4. Copiar CLIENT KEY e API HOST
```

**Passo 2: Configurar Credenciais**
```bash
# Adicionar no .env:
VITE_GROWTHBOOK_CLIENT_KEY=seu_client_key_aqui
VITE_GROWTHBOOK_API_HOST=https://cdn.growthbook.io
```

**Passo 3: Criar Feature Flags Iniciais**

No dashboard do GrowthBook, criar:

**Feature Flags:**
1. `book-reader-immersive-mode` - ON/OFF para modo imersivo
2. `ai-voice-input` - ON/OFF para input de voz no conselheiro
3. `paywall-v2` - ON/OFF para novo design de paywall
4. `community-reactions` - ON/OFF para reações em posts
5. `smart-notifications` - ON/OFF para notificações inteligentes

**A/B Experiments:**
1. **onboarding-headline-test**
   - Control: "Fortaleça sua família"
   - Variant A: "Transforme seus relacionamentos"
   - Variant B: "Cresça junto"
   - Traffic: 33% cada

2. **paywall-placement-test**
   - Control: Após 3º curso
   - Variant A: Após 1º curso
   - Variant B: Após 1º livro
   - Traffic: 33% cada

**📋 Checklist GrowthBook:**
- [ ] Criar conta GrowthBook
- [ ] Copiar CLIENT KEY e API HOST
- [ ] Adicionar em .env
- [ ] Criar 5 feature flags
- [ ] Criar 2 A/B experiments
- [ ] Testar toggle ON/OFF

**⏱️ Tempo Estimado:** 2-3 horas

**🔗 Recursos:**
- GrowthBook Docs: https://docs.growthbook.io/
- React SDK: https://docs.growthbook.io/lib/react

---

## C) CONSULTORES - Agendar Sessões

### ❌ Sessões Pendentes (SUA PARTE)

**1. Jorge Mazal (Ex-CPO Duolingo)** - 2h
- **Tópicos:** Review de métricas, Gamificação, Product loops
- **Quando:** Esta semana ou próxima
- **Preparar:** Métricas atuais, Roadmap de gamificação
- **Output esperado:** Validação da WAPM, Sugestões de loops de engajamento

**2. Bozoma Saint John (Ex-CMO Uber/Apple)** - 1.5h
- **Tópicos:** Posicionamento, Landing Page copy, Go-to-market
- **Quando:** Esta semana ou próxima
- **Preparar:** Landing Page mockup, Messaging atual
- **Output esperado:** Validação de copy, Estratégia de lançamento

**3. David Spinks (Fundador CMX)** - 1.5h
- **Tópicos:** Code of Conduct, Moderação, Community engagement
- **Quando:** Próxima semana
- **Preparar:** Code of Conduct draft, Plano de moderação
- **Output esperado:** Validação do CoC, Estratégia de moderação

**📋 Checklist Consultores:**
- [ ] Agendar sessão com Jorge Mazal
- [ ] Agendar sessão com Bozoma Saint John
- [ ] Agendar sessão com David Spinks
- [ ] Preparar materials para cada sessão
- [ ] Documentar insights após cada sessão

**⏱️ Tempo Estimado:** 5 horas totais de sessões + 2h de prep

---

## D) REDATOR & DESIGNER - Briefing Landing Page

### ❌ Assets Necessários (SUA PARTE)

**1. Briefing com Redator**
- **O quê:** Validar copy da Landing Page
- **Quando:** Esta semana
- **Entregar para ele:** `/LANDING_PAGE_IMPLEMENTATION_GUIDE.md` (seção de Copy)
- **Pedir:** Review + melhorias no copy atual
- **Tempo:** 1-2 dias para revisão

**Copy a Validar:**
```
Headline: "Fortaleça sua família com conteúdo transformador"
Subheadline: "Aprenda, conecte-se e cresça..."
Pain Points: 3 problemas principais
Features: 4 pilares (Academia, IA, Comunidade, Gamificação)
CTAs: "Começar Premium" vs "Experimentar Grátis"
FAQ: 8 perguntas
```

**2. Briefing com Designer**
- **O quê:** Screenshots reais para substituir placeholders
- **Quando:** Próxima semana
- **Screenshots necessários:**
  1. Academia - Grid de cursos
  2. Book Reader - Leitura sincronizada
  3. Conselheiro - Chat com IA
  4. Comunidade - Feed de posts
  5. Gamificação - Badges e níveis
  6. Perfil - Dashboard pessoal

**3. Testemunhos (Opcional)**
- Se possível, coletar 3-5 depoimentos reais de usuários beta
- Formato: Nome, foto (opcional), segmento, texto curto (2-3 linhas)

**📋 Checklist Assets:**
- [ ] Briefing com redator (copy review)
- [ ] Briefing com designer (screenshots)
- [ ] Coletar testemunhos de usuários (opcional)
- [ ] Aprovar copy final
- [ ] Aprovar screenshots finais

**⏱️ Tempo Estimado:** 1h briefing + 2-3 dias de produção

---

# 🤖 PARTE 2: EU - Desenvolvimento

## A) LANDING PAGE - Integração no App

### ✅ O Que Já Está Pronto
- [x] Componente LandingPage.tsx (completo)
- [x] LandingPageModal.tsx (wrapper)
- [x] PremiumButton.tsx (4 variantes)
- [x] Documentação completa
- [x] Analytics tracking

### 🚀 O Que Vou Fazer Agora

**Tarefa 1: Integrar em HomePage**
```tsx
// Adicionar banner premium no topo
// Modal que abre ao clicar
// Analytics tracking
```

**Tarefa 2: Integrar em PerfilPage**
```tsx
// Card "Seja Premium" na seção de conta
// Link para modal da LP
```

**Tarefa 3: Integrar em TopNavbar (Desktop)**
```tsx
// Badge "Premium" no header
// Abre modal ao clicar
```

**📋 Checklist Landing Page:**
- [ ] Integrar em HomePage (banner)
- [ ] Integrar em PerfilPage (card)
- [ ] Integrar em TopNavbar (badge desktop)
- [ ] Testar em mobile
- [ ] Testar em desktop
- [ ] Validar analytics tracking
- [ ] QA completo

**⏱️ Tempo Estimado:** 2-3 horas

---

## B) GROWTHBOOK - SDK Integration

### 🚀 O Que Vou Fazer (Após Você Configurar)

**Quando você me passar o CLIENT_KEY:**

**Tarefa 1: Criar SDK do GrowthBook**
```typescript
// /lib/featureFlags/growthbook.ts
// Setup do SDK
// Feature flags constants
// React hooks
```

**Tarefa 2: Criar Provider**
```tsx
// Wrapper no App.tsx
// Context para todo o app
```

**Tarefa 3: Implementar Hooks**
```tsx
// useFeature() - para feature flags simples
// useExperiment() - para A/B tests
// Exemplos de uso
```

**Tarefa 4: Integrar em 3 Pontos**
```tsx
// 1. Onboarding - Testar headlines
// 2. Paywall - Testar placement
// 3. Book Reader - Testar modo imersivo
```

**📋 Checklist GrowthBook SDK:**
- [ ] Criar /lib/featureFlags/growthbook.ts
- [ ] Criar GrowthBookProvider
- [ ] Criar hooks (useFeature, useExperiment)
- [ ] Integrar em Onboarding (headline test)
- [ ] Integrar em Paywall (placement test)
- [ ] Integrar em BookReader (immersive mode)
- [ ] Testar toggle no dashboard
- [ ] Documentar uso

**⏱️ Tempo Estimado:** 3-4 horas

**⚠️ DEPENDE DE:** Você configurar conta GrowthBook e passar credenciais

---

## C) MIXPANEL - Instrumentação

### 🚀 O Que Vou Fazer (Após Você Configurar)

**Quando você me passar o TOKEN:**

**Tarefa 1: Instrumentar HomePage**
```tsx
// Track card clicks
// Track section views
// Track navigation
```

**Tarefa 2: Instrumentar AcademiaPage**
```tsx
// Track course views
// Track enrollments
// Track lesson starts/completions
```

**Tarefa 3: Instrumentar BookReader**
```tsx
// Track reading sessions
// Track page turns
// Track audio playback
```

**Tarefa 4: Instrumentar ConselheiroPage**
```tsx
// Track conversations started
// Track messages sent
// Track session duration
```

**Tarefa 5: Instrumentar ComunidadePage**
```tsx
// Track post views
// Track post creations
// Track reactions
```

**📋 Checklist Instrumentação:**
- [ ] Instrumentar HomePage
- [ ] Instrumentar AcademiaPage
- [ ] Instrumentar BookReader
- [ ] Instrumentar ConselheiroPage
- [ ] Instrumentar ComunidadePage
- [ ] Testar eventos no Mixpanel dashboard
- [ ] Validar propriedades dos eventos
- [ ] QA completo

**⏱️ Tempo Estimado:** 4-5 horas

**⚠️ DEPENDE DE:** Você configurar conta Mixpanel e passar token

---

## D) CODE OF CONDUCT - Publicação

### 🚀 O Que Vou Fazer (Após Validação)

**Após sessão com David Spinks:**

**Tarefa 1: Criar Página Dedicada**
```tsx
// /components/CodeOfConductPage.tsx
// Página completa com o CoC
// Navegação breadcrumb
```

**Tarefa 2: Integrar no Onboarding**
```tsx
// Adicionar step de aceite
// Checkbox obrigatório
// Link para ler completo
```

**Tarefa 3: Adicionar Links**
```tsx
// Footer da app
// Settings modal
// Comunidade page (header)
```

**Tarefa 4: Modal de Aceite**
```tsx
// Primeira vez que usuário vai postar
// Scroll obrigatório + checkbox
```

**📋 Checklist Code of Conduct:**
- [ ] Criar CodeOfConductPage.tsx
- [ ] Integrar no Onboarding (aceite)
- [ ] Adicionar link no Footer
- [ ] Adicionar link em Settings
- [ ] Criar modal de aceite (primeira vez)
- [ ] Salvar aceite no localStorage
- [ ] Testar fluxo completo

**⏱️ Tempo Estimado:** 2-3 horas

**⚠️ DEPENDE DE:** Validação com David Spinks

---

## E) FLUXO DE DENÚNCIA - MVP

### 🚀 O Que Vou Fazer

**Tarefa 1: Criar ReportModal**
```tsx
// /components/ReportModal.tsx
// Formulário de denúncia
// 7 motivos categorizados
// Campo de detalhes
```

**Tarefa 2: Integrar em Posts**
```tsx
// Botão "..." em cada post
// Opção "Denunciar"
// Abre modal
```

**Tarefa 3: Mock API (Por Enquanto)**
```typescript
// Simular envio de denúncia
// Salvar em localStorage
// Toast de confirmação
```

**Tarefa 4: Analytics**
```typescript
// Track denúncias enviadas
// Track motivos
// Track taxa de denúncia
```

**📋 Checklist Denúncia:**
- [ ] Criar ReportModal.tsx
- [ ] Integrar em ComunidadePage (posts)
- [ ] Mock API de denúncia
- [ ] Analytics tracking
- [ ] Toast de confirmação
- [ ] Testar fluxo completo

**⏱️ Tempo Estimado:** 2-3 horas

---

# 📅 TIMELINE PROPOSTA

## Esta Semana (5 dias úteis)

### Dia 1 - Segunda
**VOCÊ:**
- [ ] Criar conta Mixpanel (30min)
- [ ] Configurar token em .env (10min)
- [ ] Criar conta GrowthBook (30min)
- [ ] Configurar credenciais (10min)
- [ ] Briefing com redator - LP copy (1h)

**EU:**
- [ ] Integrar Landing Page em HomePage (1h)
- [ ] Integrar Landing Page em PerfilPage (1h)
- [ ] Integrar Landing Page em TopNavbar (30min)
- [ ] Testar em mobile/desktop (30min)

---

### Dia 2 - Terça
**VOCÊ:**
- [ ] Criar feature flags no GrowthBook (1h)
- [ ] Criar A/B experiments (1h)
- [ ] Testar toggle ON/OFF (30min)
- [ ] Me passar credenciais do GrowthBook ✉️

**EU:**
- [ ] Implementar SDK GrowthBook (2h)
- [ ] Criar hooks useFeature/useExperiment (1h)
- [ ] Integrar primeiro A/B test (Onboarding) (1h)

---

### Dia 3 - Quarta
**VOCÊ:**
- [ ] Criar Dashboard 1 no Mixpanel (Executive) (1h)
- [ ] Criar Dashboard 2 no Mixpanel (Product) (1h)
- [ ] Criar Dashboard 3 no Mixpanel (Growth) (1h)

**EU:**
- [ ] Instrumentar HomePage com Mixpanel (1h)
- [ ] Instrumentar AcademiaPage (1.5h)
- [ ] Instrumentar BookReader (1.5h)

---

### Dia 4 - Quinta
**VOCÊ:**
- [ ] Agendar sessão Jorge Mazal 📅
- [ ] Agendar sessão Bozoma Saint John 📅
- [ ] Agendar sessão David Spinks 📅
- [ ] Preparar materials para sessões (2h)

**EU:**
- [ ] Instrumentar ConselheiroPage (1h)
- [ ] Instrumentar ComunidadePage (1h)
- [ ] Criar ReportModal (denúncias) (2h)

---

### Dia 5 - Sexta
**VOCÊ:**
- [ ] Validar eventos no Mixpanel (1h)
- [ ] Testar A/B experiments no GrowthBook (1h)
- [ ] Briefing com designer - screenshots (1h)

**EU:**
- [ ] QA completo de analytics (1h)
- [ ] QA completo de feature flags (1h)
- [ ] QA completo de Landing Page (1h)
- [ ] Documentar tudo (1h)

---

## Próxima Semana (Semana 3)

### Segunda a Quarta
**VOCÊ:**
- [ ] Sessão com Jorge Mazal (2h)
- [ ] Sessão com Bozoma Saint John (1.5h)
- [ ] Sessão com David Spinks (1.5h)
- [ ] Documentar insights de cada sessão (3h)

**EU:**
- [ ] Implementar feedback das sessões
- [ ] Criar CodeOfConductPage
- [ ] Integrar CoC no Onboarding
- [ ] Substituir imagens da LP por screenshots reais

---

# 📊 MÉTRICAS DE SUCESSO

Ao final desta semana, devemos ter:

### ✅ Mixpanel
- [ ] Token configurado
- [ ] 5+ páginas instrumentadas
- [ ] 3 dashboards criados
- [ ] Eventos chegando em real-time

### ✅ GrowthBook
- [ ] Credenciais configuradas
- [ ] 5 feature flags ativos
- [ ] 2 A/B experiments rodando
- [ ] Integrado em 3 pontos do app

### ✅ Landing Page
- [ ] Visível em 3 pontos (Home, Perfil, Navbar)
- [ ] Responsiva (mobile/desktop)
- [ ] Analytics tracking funcionando
- [ ] Copy validado por redator

### ✅ Comunidade
- [ ] Code of Conduct escrito
- [ ] Fluxo de denúncia funcionando
- [ ] Sessão com David Spinks agendada

### ✅ Consultoria
- [ ] 3 sessões agendadas
- [ ] Materials preparados
- [ ] Primeiro round de feedback coletado

---

# 🎯 PRIORIZAÇÃO

## CRÍTICO (Fazer Primeiro) 🔴
1. **Mixpanel Token** - Sem isso, não temos dados
2. **Landing Page Integração** - Conversão Free→Premium
3. **GrowthBook Setup** - Experimentação rápida

## IMPORTANTE (Fazer Esta Semana) 🟡
4. **Dashboards Mixpanel** - Visualização de dados
5. **Instrumentação** - Coletar dados completos
6. **Sessões com Consultores** - Agendar ASAP

## DESEJÁVEL (Pode Esperar Sprint 2) 🟢
7. **Code of Conduct Publicado** - Aguardar validação Spinks
8. **Screenshots Reais** - Melhorar LP depois
9. **Moderação Avançada** - MVP manual serve por ora

---

# 📞 COMUNICAÇÃO

### Quando Você Completar Cada Item:
✉️ **Me avise via mensagem:**

```
✅ Mixpanel configurado
Token: [cole aqui]
Dashboard criado: [link]
```

```
✅ GrowthBook configurado
Client Key: [cole aqui]
API Host: [cole aqui]
Feature flags criados: ✅
```

```
✅ Sessões agendadas
Jorge Mazal: [data/hora]
Bozoma Saint John: [data/hora]
David Spinks: [data/hora]
```

### Quando EU Completar Cada Item:
📢 **Vou informar:**

```
✅ Landing Page integrada
Locais: HomePage, Perfil, Navbar
Teste: [instruções]
```

```
✅ GrowthBook SDK implementado
Hooks disponíveis: useFeature, useExperiment
Teste: [instruções]
```

```
✅ Instrumentação completa
Páginas: 5/5
Eventos testados: ✅
```

---

# 🎉 RESULTADO ESPERADO

**Ao final desta semana:**

1. ✅ Analytics rodando em produção (Mixpanel)
2. ✅ Experimentação ativa (GrowthBook)
3. ✅ Landing Page convertendo (3 pontos integrados)
4. ✅ Dashboards visualizando dados reais
5. ✅ Sessões com consultores agendadas
6. ✅ Sprint 1 → **95% COMPLETO** (de 60% atual)

**E na próxima semana:**

7. ✅ Feedback dos consultores implementado
8. ✅ Code of Conduct validado e publicado
9. ✅ Screenshots reais na Landing Page
10. ✅ Sprint 1 → **100% COMPLETO** 🎊

---

# 📋 QUICK START - AGORA MESMO

### VOCÊ - Próximos 30 minutos:
1. Abrir https://mixpanel.com/
2. Criar conta
3. Criar projeto "RAIO - Produção"
4. Copiar PROJECT TOKEN
5. Me enviar o token ✉️

### EU - Assim que receber:
1. Configurar token no código
2. Fazer push
3. Testar eventos
4. Te enviar confirmação ✅

---

**Vamos fazer isso acontecer! 🚀**

**Primeiro passo:** Me envie o Mixpanel token assim que criar a conta!
