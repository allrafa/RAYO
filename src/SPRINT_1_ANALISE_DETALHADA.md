# 🚀 SPRINT 1 - Análise Detalhada e Plano de Execução

## 📋 Overview do Sprint

**Tema:** Fundação de Dados, Produto e Governança  
**Objetivo:** Alinhar RAIO 2.0 (visão Duolingo-like), solidificar WAPM e instrumentar o app para decisões rápidas  
**Time Consultivo:** Mazal (Duolingo), Nir Eyal (Hooked), Gina Gotthilf (Growth), Bozoma (Marketing), Spinks (Comunidade)

---

## 🎯 Contexto Estratégico

### Por que este Sprint é CRÍTICO?

Este não é um sprint comum. É a **fundação** de tudo que virá depois. Baseado na experiência do time:

**Jorge Mazal (Ex-CPO Duolingo)** nos ensina que:
> "Você não pode otimizar o que não mede. O Duolingo cresceu porque medimos TUDO desde o dia 1."

**Gina Gotthilf (VP Growth Duolingo)** reforça:
> "200 milhões de usuários não vieram de sorte. Vieram de dados, experimentação e iteração rápida."

**Andrew Chen (The Cold Start Problem)** alerta:
> "A maioria das plataformas de rede falha porque não entendem seus loops de crescimento ANTES de escalar."

**Nir Eyal (Hooked)** complementa:
> "Formação de hábito requer gatilhos, ações, recompensas variáveis e investimento. Você precisa medir cada etapa."

### O que estamos construindo?

Não estamos apenas "adicionando analytics". Estamos criando:

1. **Sistema Nervoso da Plataforma** - Capacidade de sentir cada interação
2. **Fundação para Growth** - Experimentação rápida e decisões baseadas em dados
3. **Governança e Confiança** - LGPD, moderação, segurança
4. **Posicionamento Claro** - Mensagem única que ressoa

---

## 📊 ENTREGA 1: Tecnologia & Produto

### 1.1 Taxonomia de Eventos

#### O que é?

Um **dicionário completo** de TODOS os eventos que queremos rastrear na plataforma, organizados por domínio.

#### Estrutura Proposta

```javascript
// ============================================
// TAXONOMIA DE EVENTOS RAIO - V1.0
// ============================================

// NOMENCLATURA PADRÃO: [Domínio]_[Objeto]_[Ação]_[Contexto?]
// Exemplo: ACADEMIA_COURSE_STARTED, USER_ONBOARDING_COMPLETED

// --------------------------------------------
// DOMÍNIO: AUTENTICAÇÃO & ONBOARDING
// --------------------------------------------

AUTH_SIGNUP_STARTED
AUTH_SIGNUP_COMPLETED
AUTH_SIGNUP_FAILED
AUTH_LOGIN_ATTEMPTED
AUTH_LOGIN_SUCCESS
AUTH_LOGIN_FAILED
AUTH_LOGOUT
AUTH_PASSWORD_RESET_REQUESTED
AUTH_PASSWORD_RESET_COMPLETED

ONBOARDING_STARTED
ONBOARDING_STEP_VIEWED (step_number, step_name)
ONBOARDING_STEP_COMPLETED (step_number, step_name)
ONBOARDING_SEGMENT_SELECTED (segments: array)
ONBOARDING_INTERESTS_SELECTED (interests: array)
ONBOARDING_GOALS_SELECTED (goals: array)
ONBOARDING_COMPLETED (time_taken_seconds)
ONBOARDING_ABANDONED (last_step_reached)

// --------------------------------------------
// DOMÍNIO: ACADEMIA (Cursos & Livros)
// --------------------------------------------

// Cursos
ACADEMIA_COURSE_VIEWED (course_id, course_title, category)
ACADEMIA_COURSE_ENROLLED (course_id, course_title, is_premium, price)
ACADEMIA_COURSE_STARTED (course_id)
ACADEMIA_LESSON_STARTED (course_id, lesson_id, lesson_number)
ACADEMIA_LESSON_COMPLETED (course_id, lesson_id, completion_time_seconds)
ACADEMIA_LESSON_PROGRESS_SAVED (course_id, lesson_id, progress_percentage)
ACADEMIA_COURSE_COMPLETED (course_id, total_time_seconds, completion_rate)
ACADEMIA_CERTIFICATE_DOWNLOADED (course_id)
ACADEMIA_COURSE_REVIEWED (course_id, rating, has_text_review)

// Livros
ACADEMIA_BOOK_VIEWED (book_id, book_title, author)
ACADEMIA_BOOK_ENROLLED (book_id, book_title, is_premium, price)
ACADEMIA_BOOK_OPENED (book_id, entry_point) // entry_point: library, recommendation, search
ACADEMIA_BOOK_READING_STARTED (book_id, chapter_id, mode) // mode: read, listen, both
ACADEMIA_BOOK_READING_SESSION (book_id, chapter_id, session_duration, pages_read, mode)
ACADEMIA_BOOK_CHAPTER_COMPLETED (book_id, chapter_id, mode)
ACADEMIA_BOOK_COMPLETED (book_id, total_time_minutes, mode_breakdown)
ACADEMIA_BOOK_BOOKMARK_ADDED (book_id, chapter_id, page_number)
ACADEMIA_BOOK_HIGHLIGHT_ADDED (book_id, chapter_id, text_length)
ACADEMIA_BOOK_NOTE_ADDED (book_id, chapter_id)
ACADEMIA_AUDIO_SPEED_CHANGED (book_id, old_speed, new_speed)
ACADEMIA_AUDIO_PLAYER_INTERACTION (book_id, action) // action: play, pause, seek, next, prev

// Navegação Academia
ACADEMIA_TAB_VIEWED
ACADEMIA_FILTER_APPLIED (filter_type, filter_value)
ACADEMIA_SEARCH_PERFORMED (query, results_count)
ACADEMIA_CATEGORY_VIEWED (category_name)

// --------------------------------------------
// DOMÍNIO: LEITOR DE LIVROS (Detalhado)
// --------------------------------------------

READER_MODE_CHANGED (book_id, new_mode, previous_mode) // read, listen, both
READER_IMMERSIVE_MODE_ENTERED (book_id)
READER_IMMERSIVE_MODE_EXITED (book_id, time_in_mode)
READER_FONT_SIZE_CHANGED (old_size, new_size)
READER_THEME_CHANGED (old_theme, new_theme) // light, dark, sepia
READER_PROGRESS_SAVED (book_id, chapter_id, page_number, percentage)
READER_SESSION_ENDED (book_id, duration_minutes, pages_read, mode)

// --------------------------------------------
// DOMÍNIO: CONSELHEIRO IA
// --------------------------------------------

AI_CONVERSATION_STARTED
AI_MESSAGE_SENT (message_length, conversation_id, is_first_message)
AI_MESSAGE_RECEIVED (response_time_ms, conversation_id)
AI_SUGGESTION_CLICKED (suggestion_type, conversation_id)
AI_PLAN_CREATED (plan_type, conversation_id)
AI_RESOURCE_RECOMMENDED (resource_type, resource_id, conversation_id)
AI_CONVERSATION_ENDED (conversation_id, message_count, duration_minutes)
AI_FEEDBACK_PROVIDED (conversation_id, rating, has_comment)

// --------------------------------------------
// DOMÍNIO: COMUNIDADE
// --------------------------------------------

COMMUNITY_TAB_VIEWED
COMMUNITY_FEED_SCROLLED (scroll_depth_percentage)
COMMUNITY_POST_VIEWED (post_id, post_category, author_id)
COMMUNITY_POST_CREATED (post_id, post_type, category, has_images, visibility)
COMMUNITY_POST_LIKED (post_id, author_id)
COMMUNITY_POST_UNLIKED (post_id, author_id)
COMMUNITY_POST_COMMENTED (post_id, comment_length)
COMMUNITY_POST_SHARED (post_id, share_method)
COMMUNITY_POST_SAVED (post_id)
COMMUNITY_POST_REPORTED (post_id, report_reason)
COMMUNITY_USER_FOLLOWED (followed_user_id)
COMMUNITY_USER_UNFOLLOWED (unfollowed_user_id)
COMMUNITY_FILTER_CHANGED (filter_type, filter_value)
COMMUNITY_GROUP_JOINED (group_id, group_name)
COMMUNITY_EVENT_VIEWED (event_id)
COMMUNITY_EVENT_RSVP (event_id, rsvp_status)

// --------------------------------------------
// DOMÍNIO: GAMIFICAÇÃO
// --------------------------------------------

GAMIFICATION_LEVEL_UP (old_level, new_level, xp_earned)
GAMIFICATION_XP_EARNED (xp_amount, source) // source: course, book, community, streak
GAMIFICATION_BADGE_EARNED (badge_id, badge_name, badge_category)
GAMIFICATION_MISSION_VIEWED (mission_id, mission_type)
GAMIFICATION_MISSION_STARTED (mission_id, mission_type)
GAMIFICATION_MISSION_COMPLETED (mission_id, reward_xp)
GAMIFICATION_STREAK_STARTED
GAMIFICATION_STREAK_CONTINUED (current_streak_days)
GAMIFICATION_STREAK_BROKEN (streak_days_lost)
GAMIFICATION_STREAK_MILESTONE (milestone_days) // 7, 30, 90, 365

// --------------------------------------------
// DOMÍNIO: PERFIL & BIBLIOTECA PESSOAL
// --------------------------------------------

PROFILE_TAB_VIEWED
PROFILE_EDITED (fields_changed: array)
PROFILE_AVATAR_CHANGED
PROFILE_SEGMENT_UPDATED (old_segments, new_segments)
LIBRARY_VIEWED
LIBRARY_FILTER_APPLIED (filter_type)
FAVORITES_ADDED (item_type, item_id)
FAVORITES_REMOVED (item_type, item_id)
PLAYLIST_CREATED (playlist_id, playlist_name, items_count)
PLAYLIST_VIEWED (playlist_id)
PLAYLIST_ITEM_ADDED (playlist_id, item_type, item_id)
PLAYLIST_SHARED (playlist_id, share_method)

// --------------------------------------------
// DOMÍNIO: MONETIZAÇÃO
// --------------------------------------------

PAYWALL_VIEWED (trigger_source, content_id)
PREMIUM_PLAN_VIEWED (plan_type) // monthly, yearly, family
PREMIUM_CHECKOUT_STARTED (plan_type, plan_price)
PREMIUM_CHECKOUT_COMPLETED (plan_type, plan_price, payment_method)
PREMIUM_CHECKOUT_ABANDONED (plan_type, step_abandoned)
COURSE_PURCHASE_STARTED (course_id, price)
COURSE_PURCHASE_COMPLETED (course_id, price, payment_method)
BOOK_PURCHASE_STARTED (book_id, price)
BOOK_PURCHASE_COMPLETED (book_id, price, payment_method)

// --------------------------------------------
// DOMÍNIO: NAVEGAÇÃO GERAL
// --------------------------------------------

APP_OPENED
APP_BACKGROUNDED (session_duration_seconds)
APP_CLOSED
TAB_CHANGED (from_tab, to_tab)
SCREEN_VIEWED (screen_name, from_screen)
DEEP_LINK_OPENED (link_source, link_destination)
PUSH_NOTIFICATION_RECEIVED (notification_type)
PUSH_NOTIFICATION_OPENED (notification_type)
SHARE_INITIATED (content_type, content_id)
SHARE_COMPLETED (content_type, platform)

// --------------------------------------------
// DOMÍNIO: BUSCA
// --------------------------------------------

SEARCH_OPENED
SEARCH_QUERY_ENTERED (query, results_count)
SEARCH_RESULT_CLICKED (query, result_position, result_type, result_id)
SEARCH_FILTER_APPLIED (filter_type, filter_value)
SEARCH_CLOSED (query, interaction_occurred)

// --------------------------------------------
// DOMÍNIO: CONFIGURAÇÕES & PREFERÊNCIAS
// --------------------------------------------

SETTINGS_OPENED
SETTINGS_THEME_CHANGED (old_theme, new_theme)
SETTINGS_NOTIFICATION_TOGGLED (notification_type, enabled)
SETTINGS_LANGUAGE_CHANGED (old_language, new_language)
SETTINGS_PRIVACY_CHANGED (setting_name, new_value)
SETTINGS_DATA_EXPORTED
SETTINGS_ACCOUNT_DELETED

// --------------------------------------------
// DOMÍNIO: ERROS & PERFORMANCE
// --------------------------------------------

ERROR_OCCURRED (error_type, error_message, screen_name)
API_ERROR (endpoint, status_code, error_message)
MEDIA_PLAYBACK_ERROR (media_type, media_id, error_code)
SLOW_LOAD_DETECTED (screen_name, load_time_ms)
```

#### Propriedades Globais (Enviadas em TODOS os eventos)

```javascript
{
  // User Properties
  user_id: string,
  user_segment: array, // ["casado", "pai"]
  user_level: number,
  user_xp: number,
  user_is_premium: boolean,
  user_signup_date: timestamp,
  user_days_since_signup: number,
  
  // Session Properties
  session_id: string,
  session_start_time: timestamp,
  
  // Device Properties
  platform: string, // "web", "ios", "android"
  device_type: string, // "mobile", "tablet", "desktop"
  browser: string,
  os: string,
  screen_width: number,
  screen_height: number,
  
  // Context
  timestamp: timestamp,
  timezone: string,
  language: string,
  
  // App Properties
  app_version: string,
  environment: string // "production", "staging", "development"
}
```

#### Por que essa taxonomia?

**Insight de Jorge Mazal (Duolingo):**
> "No Duolingo, nossa taxonomia evoluiu de 20 eventos para 2000+. Começamos simples mas **estruturado**. Nomenclatura consistente é ESSENCIAL. `DOMAIN_OBJECT_ACTION` sempre."

**Benefícios:**
1. ✅ Consistência - Fácil de entender e buscar
2. ✅ Escalabilidade - Adicionar novos eventos sem confusão
3. ✅ Colaboração - Produto, Eng e Data falam a mesma língua
4. ✅ Análise - Fácil agrupar por domínio ou ação

---

### 1.2 SDK de Analytics (Mixpanel/Amplitude)

#### Decisão: Mixpanel vs Amplitude

**Recomendação: Mixpanel**

**Por quê?**

| Critério | Mixpanel | Amplitude |
|----------|----------|-----------|
| **Facilidade de uso** | ⭐⭐⭐⭐⭐ Mais intuitivo | ⭐⭐⭐⭐ Mais técnico |
| **Análise de funil** | ⭐⭐⭐⭐⭐ Excelente | ⭐⭐⭐⭐ Bom |
| **Retenção** | ⭐⭐⭐⭐⭐ Melhor visualização | ⭐⭐⭐⭐ Bom |
| **A/B Testing** | ⭐⭐⭐⭐ Nativo | ⭐⭐⭐ Via integração |
| **Preço (startup)** | ⭐⭐⭐⭐ $0-89/mês até 100k MTU | ⭐⭐⭐⭐⭐ Mais generoso free tier |
| **Comunidade** | ⭐⭐⭐⭐⭐ Maior | ⭐⭐⭐⭐ Boa |

**Conselho de Gina Gotthilf (Duolingo):**
> "Usamos Mixpanel porque nos permite mover RÁPIDO. Interface intuitiva = mais pessoas podem analisar dados = mais experimentos."

#### Implementação do SDK

```typescript
// ============================================
// /lib/analytics/mixpanel.ts
// ============================================

import mixpanel from 'mixpanel-browser';

// Inicialização
const MIXPANEL_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
const IS_PRODUCTION = import.meta.env.VITE_ENVIRONMENT === 'production';

mixpanel.init(MIXPANEL_TOKEN, {
  debug: !IS_PRODUCTION,
  track_pageview: true,
  persistence: 'localStorage',
  ignore_dnt: false, // Respeita Do Not Track
});

// ============================================
// ANALYTICS SERVICE
// ============================================

interface UserProperties {
  user_id: string;
  email?: string;
  name?: string;
  segments: string[];
  level: number;
  xp: number;
  is_premium: boolean;
  signup_date: Date;
  days_since_signup: number;
}

interface EventProperties {
  [key: string]: any;
}

class AnalyticsService {
  private userId: string | null = null;
  private sessionId: string | null = null;

  // ============================================
  // IDENTIFICAÇÃO DE USUÁRIO
  // ============================================

  identifyUser(userId: string, properties: UserProperties) {
    this.userId = userId;
    mixpanel.identify(userId);
    mixpanel.people.set({
      $email: properties.email,
      $name: properties.name,
      segments: properties.segments,
      level: properties.level,
      xp: properties.xp,
      is_premium: properties.is_premium,
      signup_date: properties.signup_date,
      days_since_signup: properties.days_since_signup,
    });
  }

  // ============================================
  // TRACKING DE EVENTOS
  // ============================================

  track(eventName: string, properties?: EventProperties) {
    const enrichedProperties = this.enrichProperties(properties);
    
    mixpanel.track(eventName, enrichedProperties);
    
    // Log em dev
    if (!IS_PRODUCTION) {
      console.log('📊 Analytics Event:', eventName, enrichedProperties);
    }
  }

  // ============================================
  // ENRIQUECIMENTO AUTOMÁTICO
  // ============================================

  private enrichProperties(properties?: EventProperties): EventProperties {
    return {
      ...properties,
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      platform: this.getPlatform(),
      device_type: this.getDeviceType(),
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.VITE_ENVIRONMENT,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private getSessionId(): string {
    if (this.sessionId) return this.sessionId;
    
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return this.sessionId;
  }

  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    return 'web';
  }

  private getDeviceType(): string {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  // ============================================
  // MÉTRICAS ESPECÍFICAS DO RAIO
  // ============================================

  // Onboarding
  trackOnboardingStarted() {
    this.track('ONBOARDING_STARTED');
  }

  trackOnboardingStepCompleted(step: number, stepName: string) {
    this.track('ONBOARDING_STEP_COMPLETED', {
      step_number: step,
      step_name: stepName,
    });
  }

  trackOnboardingCompleted(timeTakenSeconds: number, segments: string[]) {
    this.track('ONBOARDING_COMPLETED', {
      time_taken_seconds: timeTakenSeconds,
      segments_selected: segments,
    });
  }

  // Academia - Cursos
  trackCourseEnrolled(courseId: number, courseTitle: string, isPremium: boolean, price?: number) {
    this.track('ACADEMIA_COURSE_ENROLLED', {
      course_id: courseId,
      course_title: courseTitle,
      is_premium: isPremium,
      price: price || 0,
    });
  }

  trackLessonCompleted(courseId: number, lessonId: number, completionTimeSeconds: number) {
    this.track('ACADEMIA_LESSON_COMPLETED', {
      course_id: courseId,
      lesson_id: lessonId,
      completion_time_seconds: completionTimeSeconds,
    });
  }

  trackCourseCompleted(courseId: number, totalTimeSeconds: number) {
    this.track('ACADEMIA_COURSE_COMPLETED', {
      course_id: courseId,
      total_time_seconds: totalTimeSeconds,
    });
  }

  // Academia - Livros
  trackBookReadingStarted(bookId: string, chapterId: number, mode: 'read' | 'listen' | 'both') {
    this.track('ACADEMIA_BOOK_READING_STARTED', {
      book_id: bookId,
      chapter_id: chapterId,
      mode: mode,
    });
  }

  trackBookReadingSession(
    bookId: string,
    chapterId: number,
    sessionDuration: number,
    pagesRead: number,
    mode: string
  ) {
    this.track('ACADEMIA_BOOK_READING_SESSION', {
      book_id: bookId,
      chapter_id: chapterId,
      session_duration: sessionDuration,
      pages_read: pagesRead,
      mode: mode,
    });
  }

  trackReaderModeChanged(bookId: string, newMode: string, previousMode: string) {
    this.track('READER_MODE_CHANGED', {
      book_id: bookId,
      new_mode: newMode,
      previous_mode: previousMode,
    });
  }

  trackImmersiveModeEntered(bookId: string) {
    this.track('READER_IMMERSIVE_MODE_ENTERED', {
      book_id: bookId,
    });
  }

  trackImmersiveModeExited(bookId: string, timeInMode: number) {
    this.track('READER_IMMERSIVE_MODE_EXITED', {
      book_id: bookId,
      time_in_mode: timeInMode,
    });
  }

  // Conselheiro IA
  trackAIConversationStarted() {
    const conversationId = `conv_${Date.now()}`;
    this.track('AI_CONVERSATION_STARTED', { conversation_id: conversationId });
    return conversationId;
  }

  trackAIMessageSent(conversationId: string, messageLength: number, isFirstMessage: boolean) {
    this.track('AI_MESSAGE_SENT', {
      conversation_id: conversationId,
      message_length: messageLength,
      is_first_message: isFirstMessage,
    });
  }

  // Comunidade
  trackPostCreated(postId: number, postType: string, category: string, hasImages: boolean) {
    this.track('COMMUNITY_POST_CREATED', {
      post_id: postId,
      post_type: postType,
      category: category,
      has_images: hasImages,
    });
  }

  // Gamificação
  trackLevelUp(oldLevel: number, newLevel: number, xpEarned: number) {
    this.track('GAMIFICATION_LEVEL_UP', {
      old_level: oldLevel,
      new_level: newLevel,
      xp_earned: xpEarned,
    });
  }

  trackBadgeEarned(badgeId: string, badgeName: string, badgeCategory: string) {
    this.track('GAMIFICATION_BADGE_EARNED', {
      badge_id: badgeId,
      badge_name: badgeName,
      badge_category: badgeCategory,
    });
  }

  trackStreakContinued(currentStreakDays: number) {
    this.track('GAMIFICATION_STREAK_CONTINUED', {
      current_streak_days: currentStreakDays,
    });
  }

  // Premium
  trackPaywallViewed(triggerSource: string, contentId?: string) {
    this.track('PAYWALL_VIEWED', {
      trigger_source: triggerSource,
      content_id: contentId,
    });
  }

  trackPremiumCheckoutCompleted(planType: string, planPrice: number, paymentMethod: string) {
    this.track('PREMIUM_CHECKOUT_COMPLETED', {
      plan_type: planType,
      plan_price: planPrice,
      payment_method: paymentMethod,
    });
  }

  // Navegação
  trackTabChanged(fromTab: string, toTab: string) {
    this.track('TAB_CHANGED', {
      from_tab: fromTab,
      to_tab: toTab,
    });
  }

  trackScreenViewed(screenName: string, fromScreen?: string) {
    this.track('SCREEN_VIEWED', {
      screen_name: screenName,
      from_screen: fromScreen,
    });
  }
}

// Export singleton
export const analytics = new AnalyticsService();
```

#### Wrapper React Hook

```typescript
// ============================================
// /hooks/useAnalytics.ts
// ============================================

import { useEffect, useRef } from 'react';
import { analytics } from '../lib/analytics/mixpanel';

export function useAnalytics() {
  return analytics;
}

// Hook para track automático de page views
export function usePageView(pageName: string, properties?: any) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      analytics.trackScreenViewed(pageName, properties);
      hasTracked.current = true;
    }
  }, [pageName, properties]);
}

// Hook para track de tempo na página
export function useTimeTracking(eventName: string, properties?: any) {
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    return () => {
      const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
      analytics.track(eventName, {
        ...properties,
        time_spent_seconds: timeSpent,
      });
    };
  }, [eventName, properties]);
}
```

---

### 1.3 Dicionário de Métricas

#### Métricas North Star e Primárias

```markdown
# DICIONÁRIO DE MÉTRICAS RAIO

## North Star Metric

### WAPM (Weekly Active Premium Members)
**Definição:** Número de usuários premium que realizaram pelo menos 1 ação significativa na semana.

**Ação Significativa:** 
- Completou 1 aula
- Leu 1 capítulo
- Enviou 1 mensagem ao Conselheiro
- Criou 1 post na comunidade

**Fórmula:**
```
WAPM = COUNT(DISTINCT user_id) 
WHERE is_premium = true 
AND last_7_days_activity > 0
```

**Meta:**
- MVP (Q2 2025): 100 WAPM
- Growth (Q3 2025): 1,000 WAPM
- Scale (Q4 2025): 10,000 WAPM

**Por que WAPM?**
- Combina engagement (weekly active) com revenue (premium)
- Usuários premium engajados = menor churn
- Correlaciona com transformação real

---

## Métricas de Aquisição

### DAU (Daily Active Users)
**Definição:** Usuários únicos que abriram o app em um dia.
**Trigger Event:** `APP_OPENED`

### MAU (Monthly Active Users)
**Definição:** Usuários únicos que abriram o app em 30 dias.

### Sign-up Rate
**Fórmula:** (Completaram signup / Iniciaram signup) * 100

### Onboarding Completion Rate
**Fórmula:** (Completaram onboarding / Iniciaram onboarding) * 100
**Meta:** > 80%

---

## Métricas de Ativação

### TTFV (Time To First Value)
**Definição:** Tempo do signup até primeira "ação de valor".

**Ações de Valor:**
- Completar primeira aula
- Ler primeiro capítulo
- Primeira conversa com IA
- Primeiro post na comunidade

**Fórmula:**
```
TTFV = MEDIAN(time_of_first_value_action - signup_timestamp)
```

**Meta:** < 5 minutos

**Insight de Nir Eyal:**
> "Quanto mais rápido o usuário experimenta valor, maior a probabilidade de formar hábito."

---

## Métricas de Engajamento

### DAU/MAU Ratio
**Definição:** Proporção de usuários mensais que são ativos diariamente.
**Fórmula:** DAU / MAU
**Meta:** > 0.30 (30% dos usuários mensais voltam diariamente)

### Session Length
**Definição:** Tempo médio por sessão.
**Fórmula:** MEDIAN(session_duration_seconds)
**Meta:** > 12 minutos

### Sessions per User per Week
**Fórmula:** COUNT(sessions) / COUNT(DISTINCT users) / weeks
**Meta:** > 3 sessões/semana

### Completion Rate - Cursos
**Fórmula:** (Cursos completados / Cursos iniciados) * 100
**Meta:** > 40%

**Benchmark Duolingo:** ~15% de completion
**Por que nossa meta é maior?** Conteúdo mais focado, menor, segmentado

### Completion Rate - Livros
**Fórmula:** (Livros completados / Livros iniciados) * 100
**Meta:** > 30%

### Community Engagement Rate
**Fórmula:** (Usuários que postaram ou comentaram / MAU) * 100
**Meta:** > 10%

---

## Métricas de Retenção

### Day 1 Retention
**Definição:** % de usuários que voltam 1 dia após signup.
**Fórmula:** (Usuários ativos D1 / Novos usuários D0) * 100
**Meta:** > 60%

### Week 1 Retention
**Definição:** % de usuários que voltam 7 dias após signup.
**Meta:** > 50%

### Month 1 Retention
**Meta:** > 35%

### Month 3 Retention
**Meta:** > 20%

### Churn Rate (Premium)
**Definição:** % de usuários premium que cancelaram no mês.
**Fórmula:** (Cancelamentos mês / Premium members início do mês) * 100
**Meta:** < 10% mensal

---

## Métricas de Monetização

### Free to Premium Conversion
**Definição:** % de usuários free que viraram premium.
**Fórmula:** (Novos premium / Total free users início do período) * 100
**Meta:** > 5%

**Benchmark:**
- Duolingo: ~7%
- Headway: ~8%
- Blinkist: ~6%

### LTV (Lifetime Value)
**Fórmula:** Average Revenue per User * Average Lifetime (months)
**Meta:** > R$ 500

### CAC (Customer Acquisition Cost)
**Definição:** Custo médio para adquirir 1 usuário.
**Meta:** < R$ 50

### LTV:CAC Ratio
**Fórmula:** LTV / CAC
**Meta:** > 5:1 (para cada R$1 gasto, ganhar R$5)

### MRR (Monthly Recurring Revenue)
**Fórmula:** SUM(active_subscriptions * monthly_price)

### MRR Growth Rate
**Meta:** > 20% mês a mês (early stage)

---

## Métricas de Produto

### Feature Adoption Rate
**Exemplo:** % de usuários que usaram leitor de livros sincronizado
**Fórmula:** (Usuários que usaram feature / MAU) * 100

### Time in Immersive Mode
**Definição:** Tempo médio em modo de leitura imersivo.
**Meta:** > 20 minutos por sessão

### AI Conversations per Premium User
**Meta:** > 5 conversas/semana

### Community Posts per Active User
**Meta:** > 2 posts/mês

---

## Métricas de Gamificação

### Streak Retention
**Definição:** % de usuários que mantêm streak ativo.
**Fórmula:** (Usuários com streak > 0 / MAU) * 100
**Meta:** > 30%

### Badge Completion Rate
**Definição:** Média de badges ganhos por usuário.

### Daily Mission Completion
**Meta:** > 40% dos usuários completam missão diária

---

## Métricas de Comunidade

### Posts per Day
**Meta:** > 100 posts/dia (Scale)

### Comments per Post
**Meta:** > 3 comentários/post

### Active Community Members
**Definição:** Usuários que postaram ou comentaram no mês.
**Meta:** > 30% de MAU
```

---

### 1.4 Feature Flags (GrowthBook/Statsig)

#### O que são Feature Flags?

Permitem **ligar/desligar funcionalidades** sem deploy, fazer **A/B tests** e **rollout gradual**.

**Conselho de Gina Gotthilf:**
> "Feature flags nos permitiram testar 100+ experimentos por trimestre no Duolingo. É a diferença entre 'achar' e 'saber'."

#### Decisão: GrowthBook vs Statsig vs LaunchDarkly

**Recomendação: GrowthBook**

**Por qu��?**
- ✅ Open source (self-hosted = dados no nosso controle)
- ✅ Integração nativa com Mixpanel/Amplitude
- ✅ A/B testing visual e estatístico
- ✅ Grátis para self-hosted
- ✅ Boa documentação

#### Implementação

```typescript
// ============================================
// /lib/featureFlags/growthbook.ts
// ============================================

import { GrowthBook } from '@growthbook/growthbook-react';

// Inicializar GrowthBook
export const growthbook = new GrowthBook({
  apiHost: import.meta.env.VITE_GROWTHBOOK_API_HOST,
  clientKey: import.meta.env.VITE_GROWTHBOOK_CLIENT_KEY,
  enableDevMode: import.meta.env.VITE_ENVIRONMENT !== 'production',
  trackingCallback: (experiment, result) => {
    // Track experiment exposure no Mixpanel
    analytics.track('EXPERIMENT_VIEWED', {
      experiment_id: experiment.key,
      variation_id: result.variationId,
      variation_name: result.value,
    });
  },
});

// ============================================
// FEATURE FLAGS DEFINIDAS
// ============================================

export const FEATURES = {
  // Leitor de Livros
  BOOK_READER_IMMERSIVE_MODE: 'book-reader-immersive-mode',
  BOOK_AUDIO_SYNC: 'book-audio-sync',
  BOOK_HIGHLIGHTS: 'book-highlights',
  
  // Academia
  COURSE_CERTIFICATES: 'course-certificates',
  COURSE_LIVE_CLASSES: 'course-live-classes',
  COURSE_COMMUNITY_NOTES: 'course-community-notes',
  
  // Conselheiro IA
  AI_VOICE_INPUT: 'ai-voice-input',
  AI_PLAN_CREATION: 'ai-plan-creation',
  AI_ADVANCED_SUGGESTIONS: 'ai-advanced-suggestions',
  
  // Comunidade
  COMMUNITY_GROUPS: 'community-groups',
  COMMUNITY_EVENTS: 'community-events',
  COMMUNITY_DIRECT_MESSAGES: 'community-direct-messages',
  
  // Gamificação
  GAMIFICATION_LEADERBOARDS: 'gamification-leaderboards',
  GAMIFICATION_TOURNAMENTS: 'gamification-tournaments',
  GAMIFICATION_PREMIUM_BADGES: 'gamification-premium-badges',
  
  // Monetização
  PAYWALL_V2: 'paywall-v2',
  FAMILY_PLAN: 'family-plan',
  GIFT_SUBSCRIPTIONS: 'gift-subscriptions',
  
  // UX
  ONBOARDING_V2: 'onboarding-v2',
  NEW_HOME_LAYOUT: 'new-home-layout',
  DARK_MODE_AUTO: 'dark-mode-auto',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export function useFeature(featureName: string): boolean {
  return growthbook.isOn(featureName);
}

export function getFeatureValue<T>(featureName: string, fallback: T): T {
  return growthbook.getFeatureValue(featureName, fallback);
}

// ============================================
// EXPERIMENTOS A/B ATIVOS
// ============================================

export const EXPERIMENTS = {
  // Teste: Qual headline do onboarding converte mais?
  ONBOARDING_HEADLINE: {
    key: 'onboarding-headline-test',
    variations: {
      control: 'Fortaleça sua família',
      variant_a: 'Transforme seus relacionamentos',
      variant_b: 'Construa uma família forte',
    },
  },
  
  // Teste: Posição do paywall
  PAYWALL_TIMING: {
    key: 'paywall-timing-test',
    variations: {
      control: 'after_course_1', // Depois do 1º curso
      variant_a: 'after_day_3', // Depois de 3 dias
      variant_b: 'after_book_1', // Depois do 1º livro
    },
  },
  
  // Teste: Formato de gamificação
  GAMIFICATION_STYLE: {
    key: 'gamification-style-test',
    variations: {
      control: 'duolingo_style', // Streaks + XP
      variant_a: 'habit_tracker', // Habit tracker
      variant_b: 'journey_map', // Journey map
    },
  },
};
```

#### React Integration

```typescript
// ============================================
// Exemplo de uso nos componentes
// ============================================

import { useFeature, getFeatureValue, FEATURES, EXPERIMENTS } from '@/lib/featureFlags';

function BookReaderPage() {
  // Feature flag simples
  const isImmersiveModeEnabled = useFeature(FEATURES.BOOK_READER_IMMERSIVE_MODE);
  
  // A/B Test com variações
  const onboardingHeadline = getFeatureValue(
    EXPERIMENTS.ONBOARDING_HEADLINE.key,
    EXPERIMENTS.ONBOARDING_HEADLINE.variations.control
  );
  
  return (
    <div>
      {isImmersiveModeEnabled && (
        <ImmersiveModeButton />
      )}
      <h1>{onboardingHeadline}</h1>
    </div>
  );
}
```

---

### 1.5 Guardrails de LGPD

#### Por que isso é crítico?

**Conselho de Bozoma Saint John:**
> "Confiança é a moeda mais valiosa. LGPD não é checkbox legal, é compromisso com usuários."

#### Implementação

```typescript
// ============================================
// /lib/privacy/consent.ts
// ============================================

export interface ConsentPreferences {
  essential: boolean; // Sempre true (necessário para app funcionar)
  analytics: boolean; // Mixpanel, etc
  marketing: boolean; // Emails promocionais
  personalization: boolean; // Recomendações personalizadas
  thirdParty: boolean; // Compartilhamento com parceiros
}

export class ConsentManager {
  private static STORAGE_KEY = 'raio_consent_preferences';
  
  // Obter preferências atuais
  static getPreferences(): ConsentPreferences {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Default: apenas essencial
    return {
      essential: true,
      analytics: false,
      marketing: false,
      personalization: false,
      thirdParty: false,
    };
  }
  
  // Salvar preferências
  static savePreferences(preferences: ConsentPreferences) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    
    // Aplicar mudanças
    this.applyPreferences(preferences);
    
    // Track mudança de consentimento
    analytics.track('CONSENT_UPDATED', {
      analytics_enabled: preferences.analytics,
      marketing_enabled: preferences.marketing,
      personalization_enabled: preferences.personalization,
    });
  }
  
  // Aplicar preferências
  private static applyPreferences(prefs: ConsentPreferences) {
    // Analytics
    if (!prefs.analytics) {
      mixpanel.opt_out_tracking();
    } else {
      mixpanel.opt_in_tracking();
    }
    
    // Marketing (email)
    // ... integração com serviço de email
    
    // Personalização
    if (!prefs.personalization) {
      // Desabilitar algoritmo de recomendação
    }
  }
  
  // Verificar se usuário já deu consentimento
  static hasConsented(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
  
  // Opt-out completo (direito LGPD)
  static optOutAll() {
    this.savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      personalization: false,
      thirdParty: false,
    });
  }
  
  // Exportar dados do usuário (direito LGPD)
  static async exportUserData(userId: string) {
    // Coletar todos os dados do usuário
    const data = {
      profile: await fetchUserProfile(userId),
      courses: await fetchUserCourses(userId),
      books: await fetchUserBooks(userId),
      community: await fetchUserPosts(userId),
      analytics: await fetchUserAnalytics(userId),
    };
    
    // Converter para JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    
    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raio_data_${userId}_${Date.now()}.json`;
    a.click();
    
    analytics.track('USER_DATA_EXPORTED');
  }
  
  // Deletar conta (direito LGPD)
  static async deleteUserAccount(userId: string) {
    // Confirmação dupla
    const confirmed = confirm(
      'Tem certeza que deseja deletar sua conta? Esta ação é irreversível.'
    );
    
    if (!confirmed) return;
    
    // Deletar dados
    await api.deleteUser(userId);
    
    // Limpar localStorage
    localStorage.clear();
    
    // Opt-out de analytics
    mixpanel.opt_out_tracking();
    mixpanel.reset();
    
    analytics.track('USER_ACCOUNT_DELETED');
    
    // Redirect para página de confirmação
    window.location.href = '/account-deleted';
  }
}
```

#### UI de Consentimento

```typescript
// ============================================
// /components/ConsentBanner.tsx
// ============================================

import { useState, useEffect } from 'react';
import { ConsentManager } from '@/lib/privacy/consent';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState(ConsentManager.getPreferences());
  
  useEffect(() => {
    // Mostrar banner se ainda não deu consentimento
    if (!ConsentManager.hasConsented()) {
      setShowBanner(true);
    }
  }, []);
  
  const handleAcceptAll = () => {
    ConsentManager.savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
      personalization: true,
      thirdParty: false,
    });
    setShowBanner(false);
  };
  
  const handleRejectAll = () => {
    ConsentManager.optOutAll();
    setShowBanner(false);
  };
  
  const handleSavePreferences = () => {
    ConsentManager.savePreferences(preferences);
    setShowBanner(false);
  };
  
  if (!showBanner) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-6 z-50">
      <div className="max-w-4xl mx-auto">
        {!showDetails ? (
          // Banner simples
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">🍪 Cookies e Privacidade</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Usamos cookies para melhorar sua experiência, analisar uso da plataforma e personalizar conteúdo.
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-primary underline ml-1"
                >
                  Personalizar preferências
                </button>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRejectAll}>
                Rejeitar
              </Button>
              <Button onClick={handleAcceptAll}>
                Aceitar Todos
              </Button>
            </div>
          </div>
        ) : (
          // Detalhes e personalização
          <div>
            <h3 className="font-semibold mb-4">Suas Preferências de Privacidade</h3>
            
            <div className="space-y-4 mb-6">
              {/* Essencial */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Cookies Essenciais</h4>
                  <p className="text-sm text-gray-600">
                    Necessários para o funcionamento básico da plataforma
                  </p>
                </div>
                <Switch checked disabled />
              </div>
              
              {/* Analytics */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Analytics</h4>
                  <p className="text-sm text-gray-600">
                    Nos ajudam a entender como você usa a plataforma
                  </p>
                </div>
                <Switch
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                />
              </div>
              
              {/* Marketing */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Marketing</h4>
                  <p className="text-sm text-gray-600">
                    Emails sobre novos conteúdos e ofertas
                  </p>
                </div>
                <Switch
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                />
              </div>
              
              {/* Personalização */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Personalização</h4>
                  <p className="text-sm text-gray-600">
                    Recomendações de conteúdo baseadas no seu perfil
                  </p>
                </div>
                <Switch
                  checked={preferences.personalization}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, personalization: checked })
                  }
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Voltar
              </Button>
              <Button onClick={handleSavePreferences}>
                Salvar Preferências
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🚀 ENTREGA 2: Growth & Marketing

### 2.1 Proposta de Posicionamento

#### Workshop com Bozoma Saint John

**Conselho de Bozoma:**
> "Seu posicionamento não é o que VOCÊ diz sobre seu produto. É o que seus USUÁRIOS sentem quando o usam."

#### Framework: Proposta de Valor Única

```markdown
# PROPOSTA DE POSICIONAMENTO RAIO

## Para quem?
Pessoas que querem **fortalecer suas famílias** e **construir relacionamentos saudáveis**, mas estão sobrecarregadas com conteúdo genérico e falta de comunidade de apoio.

## O que é RAIO?
Uma **plataforma de transformação familiar** que combina educação de qualidade, mentoria por IA e comunidade engajada.

## Benefício Principal
Aprenda habilidades práticas, receba orientação personalizada e conecte-se com pessoas que compartilham seus valores - tudo em um só lugar.

## Diferencial
Ao contrário de cursos online genéricos ou apps de hábitos, RAIO é **personalizado para seu contexto de vida** (solteiro, namoro, casamento, parentalidade) e oferece **suporte contínuo** através de IA e comunidade.

## Prova
Milhares de famílias já transformaram seus relacionamentos com RAIO, com taxa de completion 3x maior que plataformas similares.

---

## MENSAGEM ÚNICA (Elevator Pitch)

### 30 segundos:
"RAIO é onde famílias vêm para crescer. Combinamos cursos práticos, livros transformadores, um conselheiro de IA 24/7 e uma comunidade de apoio - tudo personalizado para onde você está na vida. Se você está solteiro, namorando, casado ou criando filhos, temos conteúdo e suporte específico para você."

### 10 segundos:
"Fortaleça sua família com conteúdo transformador, mentoria por IA e comunidade engajada."

### 1 palavra:
"Transformação."

---

## TOM DE MARCA

### Somos:
✅ Autênticos (não perfeitos)
✅ Encorajadores (não julgadores)
✅ Práticos (não teóricos)
✅ Esperançosos (não ingênuos)
✅ Inclusivos (não excludentes)

### Não somos:
❌ Religiosos pregadores
❌ Perfeicionistas irreais
❌ Acadêmicos distantes
❌ Motivacionais vazios
❌ Julgadores moralistas

---

## PILARES DE MENSAGEM

### 1. Conteúdo que Transforma
"Não é mais um curso. É um caminho de transformação com suporte contínuo."

### 2. Personalização Real
"Sua jornada é única. Seu conteúdo também deveria ser."

### 3. Comunidade que Apoia
"Você não está sozinho nessa jornada. Milhares de pessoas como você estão crescendo juntas."

### 4. Tecnologia que Cuida
"Um conselheiro sempre disponível, que te entende e cresce com você."

---

## SLOGAN OPTIONS (para teste A/B)

1. "Fortaleça sua família" (atual)
2. "Transforme seus relacionamentos"
3. "Família forte começa aqui"
4. "Cresça junto"
5. "Amor que cresce"
```

### 2.2 Site Público (LP + Blog)

#### Estrutura da Landing Page

```markdown
# RAIO LANDING PAGE - Estrutura

## Hero Section
### Headline: "Fortaleça sua família com conteúdo transformador"
### Subheadline: "Aprenda, conecte-se e cresça com uma plataforma feita para sua jornada familiar"
### CTA: "Começar Grátis" | "Ver como funciona"
### Visual: Famílias reais usando a plataforma (fotos/vídeo)

## Social Proof
- "Junte-se a 10.000+ famílias em transformação"
- Logos de parceiros (se houver)
- Testemunhos em vídeo

## Problema → Solução
### "Você se identifica?"
- ☐ Quer fortalecer seu casamento mas não sabe por onde começar
- ☐ Busca ser melhor pai/mãe mas está sobrecarregado
- ☐ Quer crescer pessoalmente mas falta direção
- ☐ Precisa de apoio mas não tem comunidade

### "RAIO é a solução"
Apresentar os 4 pilares (Academia, Conselheiro, Comunidade, Gamificação)

## Como Funciona (3 passos)
1. **Conte sua história** - Onboarding personalizado
2. **Receba seu plano** - Conteúdo curado para você
3. **Transforme sua família** - Com suporte contínuo

## Features (com screenshots)
- 📚 Academia com 100+ cursos e livros
- 🤖 Conselheiro IA 24/7
- 👥 Comunidade ativa de 10k+ membros
- 🎯 Gamificação que motiva
- 📖 Leitor sincronizado (áudio + texto)

## Testemunhos
3-5 histórias reais de transformação

## Pricing
Comparação Free vs Premium

## FAQ
Top 10 perguntas

## Final CTA
"Pronto para transformar sua família?"
[Começar Grátis - 7 dias premium grátis]

## Footer
- Links importantes
- Política de privacidade
- Termos de uso
- Redes sociais
```

#### Tech Stack para Site

**Recomendação: Astro + MDX**

```bash
# Astro é PERFEITO para sites de conteúdo
# - Super rápido (0 JS por padrão)
# - SEO excelente
# - Blog integrado
# - Deploy fácil (Vercel/Netlify)

npm create astro@latest raio-website
cd raio-website
npm install

# Estrutura:
# /pages/index.astro (landing page)
# /pages/blog/[...slug].astro (blog posts)
# /content/blog/*.mdx (posts em Markdown)
```

---

## 👥 ENTREGA 3: Comunidade

### 3.1 Diretrizes (Code of Conduct)

**Consultor: David Spinks (CMX)**

```markdown
# CÓDIGO DE CONDUTA - COMUNIDADE RAIO

## Nossa Missão
Criar um espaço seguro, respeitoso e encorajador onde famílias podem crescer juntas.

## Nossos Valores

### 1. Respeito
Tratamos todos com dignidade, independente de diferenças.

### 2. Autenticidade
Encorajamos vulnerabilidade real, não perfeição falsa.

### 3. Suporte
Estamos aqui para apoiar, não julgar.

### 4. Crescimento
Celebramos progresso, não perfeição.

## Comportamentos Esperados

✅ Seja gentil e respeitoso
✅ Compartilhe experiências reais
✅ Ofereça apoio construtivo
✅ Mantenha confidencialidade do grupo
✅ Respeite perspectivas diferentes
✅ Pergunte antes de dar conselhos
✅ Assuma boa intenção

## Comportamentos Proibidos

❌ Discurso de ódio ou discriminação
❌ Assédio ou bullying
❌ Conteúdo sexual inapropriado
❌ Spam ou autopromoção excessiva
❌ Compartilhar informações privadas de outros
❌ Conteúdo violento ou perturbador
❌ Desinformação prejudicial
❌ Ataques pessoais

## Sistema de Moderação

### Nível 1: Warning
Primeira ofensa menor → Aviso privado

### Nível 2: Timeout
Ofensa repetida → Suspensão temporária (7 dias)

### Nível 3: Ban
Ofensa grave ou repetida → Ban permanente

## Como Denunciar

1. Clique no menu do post (...)
2. Selecione "Denunciar"
3. Escolha o motivo
4. Nossa equipe revisará em até 24h

## Perguntas?
Entre em contato: comunidade@raio.com.br
```

### 3.2 Fluxos de Denúncia

```typescript
// ============================================
// /components/ReportModal.tsx
// ============================================

interface ReportModalProps {
  contentType: 'post' | 'comment' | 'user';
  contentId: number;
  onClose: () => void;
}

export function ReportModal({ contentType, contentId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const REPORT_REASONS = {
    post: [
      { value: 'hate_speech', label: 'Discurso de ódio' },
      { value: 'harassment', label: 'Assédio ou bullying' },
      { value: 'inappropriate_content', label: 'Conteúdo inapropriado' },
      { value: 'spam', label: 'Spam ou autopromoção' },
      { value: 'misinformation', label: 'Desinformação' },
      { value: 'privacy_violation', label: 'Violação de privacidade' },
      { value: 'other', label: 'Outro' },
    ],
    // Similar para comment e user
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      await api.post('/reports', {
        content_type: contentType,
        content_id: contentId,
        reason: reason,
        details: details,
      });
      
      analytics.track('COMMUNITY_CONTENT_REPORTED', {
        content_type: contentType,
        content_id: contentId,
        reason: reason,
      });
      
      toast.success('Denúncia enviada. Nossa equipe revisará em breve.');
      onClose();
    } catch (error) {
      toast.error('Erro ao enviar denúncia. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Denunciar {contentType === 'post' ? 'Post' : 'Comentário'}</DialogTitle>
          <DialogDescription>
            Sua denúncia nos ajuda a manter a comunidade segura.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Motivo da denúncia</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS[contentType].map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Detalhes (opcional)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Forneça mais contexto se desejar..."
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Denúncia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 3.3 Sistema de Moderação

```typescript
// ============================================
// Dashboard de Moderação (Admin)
// ============================================

interface ModerationQueue {
  id: number;
  type: 'report' | 'auto_flagged';
  content_type: 'post' | 'comment' | 'user';
  content_id: number;
  reason: string;
  reporter_id: number;
  created_at: Date;
  status: 'pending' | 'reviewing' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Auto-flagging com IA
async function autoModerate(content: string) {
  // Palavras-chave de alerta
  const HATE_KEYWORDS = ['...'];
  const SPAM_PATTERNS = ['...'];
  
  // Check simples
  let flags: string[] = [];
  
  if (HATE_KEYWORDS.some(word => content.toLowerCase().includes(word))) {
    flags.push('hate_speech');
  }
  
  // Em produção: usar serviço de moderação de conteúdo
  // Ex: OpenAI Moderation API, Perspective API, etc
  
  if (flags.length > 0) {
    await addToModerationQueue({
      type: 'auto_flagged',
      flags: flags,
      priority: 'high',
    });
  }
}
```

---

## 📚 ENTREGA 4: Conteúdo & Parcerias

### 4.1 Matriz de Trilhas por Segmento

```markdown
# MATRIZ DE CONTEÚDO - RAIO

## SOLTEIRO 🧑

### Trilha 1: Autoconhecimento
**Cursos:**
1. Quem Sou Eu? Descobrindo sua Identidade
2. Propósito e Vocação
3. Valores que Guiam sua Vida
4. Desenvolvendo Inteligência Emocional

**Livros:**
1. "Você é Insubstituível" - Max Lucado
2. "Propósito" - Rick Warren
3. "Inteligência Emocional" - Daniel Goleman

### Trilha 2: Preparação para Relacionamentos
**Cursos:**
1. Relacionamentos Saudáveis 101
2. Comunicação Eficaz
3. Limites e Vulnerabilidade
4. Preparando-se para o Namoro

**Livros:**
1. "Namoro com Propósito" - Rebecca St. James
2. "Limites" - Henry Cloud

---

## NAMORO 💑

### Trilha 1: Construindo Fundação
**Cursos:**
1. Comunicação no Namoro
2. Resolução de Conflitos
3. Alinhamento de Valores
4. Intimidade Emocional

**Livros:**
1. "Os 5 Linguagens do Amor" - Gary Chapman
2. "Casamento Blindado" - Renato e Cristiane Cardoso

### Trilha 2: Preparação para Compromisso
**Cursos:**
1. Planejamento Financeiro a Dois
2. Família Estendida e Relacionamentos
3. Preparação para o Casamento

---

## NOIVOS 💍

### Trilha 1: Preparação Matrimonial
**Cursos:**
1. Curso Pré-Matrimonial Completo (8 módulos)
   - Comunicação
   - Finanças
   - Intimidade
   - Família estendida
   - Resolução de conflitos
   - Expectativas realistas
   - Papéis e responsabilidades
   - Propósito do casamento

**Livros:**
1. "Antes de Dizer Sim" - John Thomas
2. "Preparados para Casar" - Dennis Rainey

---

## CASADOS 👫

### Trilha 1: Fortalecimento Matrimonial
**Cursos:**
1. Comunicação no Casamento
2. Intimidade e Romance
3. Resolução de Conflitos
4. Finanças no Casamento
5. Propósito Conjugal

**Livros:**
1. "Casamento Blindado"
2. "Os 7 Hábitos dos Casais Felizes"
3. "Amor e Respeito" - Emerson Eggerichs

### Trilha 2: Casamento Avançado
**Cursos:**
1. Mantendo a Chama Acesa (anos 5+)
2. Reinventando o Casamento
3. Superando Crises

---

## PAIS 👨‍👩‍👧‍👦

### Trilha 1: Parentalidade Intencional
**Cursos:**
1. Parentalidade Baseada em Valores
2. Disciplina Positiva
3. Comunicação com Filhos
4. Educação por Faixa Etária
   - 0-3 anos
   - 4-6 anos
   - 7-12 anos
   - 13-18 anos

**Livros:**
1. "Pais Intencionais" - Natasha Crain
2. "Como Falar para seu Filho Ouvir"
3. "Disciplina Positiva" - Jane Nelsen

### Trilha 2: Equilíbrio Familiar
**Cursos:**
1. Casamento + Parentalidade
2. Autocuidado para Pais
3. Finanças Familiares
4. Propósito Familiar

---

## LACUNAS DE CONTEÚDO IDENTIFICADAS

### Prioritário (P0 - Sprint 2-3)
- [ ] Curso: Preparação Matrimonial Completo
- [ ] Curso: Parentalidade 0-3 anos
- [ ] Livro: Casamento Blindado (áudio + texto)
- [ ] Livro: 5 Linguagens do Amor (áudio + texto)

### Importante (P1 - Sprint 4-5)
- [ ] Curso: Comunicação no Casamento
- [ ] Curso: Resolução de Conflitos
- [ ] 10 livros adicionais com áudio

### Desejável (P2 - Sprint 6+)
- [ ] Masterclasses ao vivo
- [ ] Workshops por segmento
- [ ] Conteúdo de parceiros (Esther Perel, etc)
```

---

## 🎯 TOUCHPOINTS (Validação com Especialistas)

### Jorge Mazal (Duolingo) - Produto & Gamificação

**O que pedimos:**
1. Revisão do modelo de progresso e trilhas
2. Validação de completion metrics (40% é realista?)
3. Estrutura de gamificação (streaks, XP, badges)

**Como nos adaptamos:**
- Sessão de 2h via Zoom
- Compartilhar wireframes e fluxos
- Mostrar dados de testes iniciais

**Output esperado:**
- Recomendações de ajustes no progression system
- Benchmarks realistas baseados em Duolingo
- Insights sobre features mais engajadoras

---

### Bozoma Saint John - Marketing

**O que pedimos:**
1. Revisão de mensagem e posicionamento
2. Validação do tom de marca
3. Feedback sobre LP

**Como nos adaptamos:**
- Apresentar proposta de posicionamento
- Mostrar mockups da LP
- Discutir público-alvo

**Output esperado:**
- Refinamento de mensagem única
- Recomendações de copy
- Estratégia de go-to-market inicial

---

### David Spinks - Comunidade

**O que pedimos:**
1. Validação das diretrizes da comunidade
2. Estrutura de moderação adequada?
3. Métricas de community health

**Como nos adaptamos:**
- Compartilhar Code of Conduct
- Mostrar fluxos de denúncia
- Discutir estrutura de fóruns

**Output esperado:**
- Refinamento do CoC
- Benchmarks de métricas comunitárias
- Estratégia de seed community (primeiros 100 membros)

---

## ✅ CRITÉRIOS DE ACEITAÇÃO

### 1. Event Tracking ≥ 90% dos fluxos críticos

**Fluxos críticos:**
- [ ] Signup e onboarding
- [ ] Enrollment em curso
- [ ] Início e completion de aula
- [ ] Enrollment em livro
- [ ] Sessões de leitura (read/listen/both)
- [ ] Conversas com IA
- [ ] Posts na comunidade
- [ ] Premium checkout

**Validação:**
- [ ] Todos os eventos definidos na taxonomia
- [ ] Mixpanel recebendo eventos corretamente
- [ ] Propriedades globais presentes
- [ ] Dashboard funcionando

---

### 2. Dashboard Mínimo com WAPM, TTFV e Completion

**Visualizações necessárias:**

```markdown
# DASHBOARD RAIO - V1

## Overview (última semana)
- WAPM: [número]
- DAU: [número]
- MAU: [número]
- DAU/MAU: [%]

## Aquisição
- Novos signups: [número]
- Onboarding completion: [%]
- TTFV médio: [minutos]

## Engagement
- Session length média: [minutos]
- Sessions/user/week: [número]
- Completion rate cursos: [%]
- Completion rate livros: [%]

## Retenção
- D1 retention: [%]
- W1 retention: [%]
- M1 retention: [%]

## Monetização
- Free → Premium conversion: [%]
- Churn rate: [%]
- MRR: [R$]

## Top Content
1. Curso/Livro mais popular
2. Curso/Livro maior completion
3. Tópico mais engajado (comunidade)
```

---

### 3. Code of Conduct Publicado

**Checklist:**
- [ ] CoC escrito e revisado
- [ ] Validado por David Spinks
- [ ] Página dedicada no site
- [ ] Link no footer e signup
- [ ] Mencionado no onboarding
- [ ] Aceite obrigatório antes de postar

---

### 4. LP no Ar (Conteúdo Inicial)

**Checklist:**
- [ ] Hero section com headline testada
- [ ] Seção de problema/solução
- [ ] Features principais
- [ ] Pricing
- [ ] FAQ básico
- [ ] CTAs funcionando
- [ ] SEO básico (meta tags, sitemap)
- [ ] Performance > 90 (Lighthouse)
- [ ] Mobile responsive
- [ ] Deploy em raio.com.br

---

## 📅 TIMELINE SUGERIDA

### Semana 1: Setup & Infraestrutura
**Dias 1-2:**
- Setup Mixpanel
- Setup GrowthBook
- Definir taxonomia final

**Dias 3-5:**
- Implementar SDK de analytics
- Implementar feature flags
- Implementar LGPD compliance

### Semana 2: Tracking & Dashboard
**Dias 6-8:**
- Instrumentar fluxos críticos
- Validar eventos no Mixpanel
- Criar dashboard v1

**Dias 9-10:**
- QA de analytics
- Documentação

### Semana 3: Marketing & Comunidade
**Dias 11-13:**
- Finalizar posicionamento
- Escrever copy da LP
- Design da LP

**Dias 14-15:**
- Escrever Code of Conduct
- Implementar fluxo de denúncia

### Semana 4: Conteúdo & Validação
**Dias 16-18:**
- Matriz de conteúdo
- Identificar lacunas
- Priorização

**Dias 19-20:**
- Sessões com consultores
- Refinamentos finais

### Semana 5: Polish & Deploy
**Dias 21-23:**
- LP development
- QA completo
- Performance optimization

**Dias 24-25:**
- Deploy LP
- Ativação de analytics
- Retrospectiva e documentação

---

## 🎯 RISCOS E MITIGAÇÕES

### Risco 1: Analytics overhead
**Probabilidade:** Alta  
**Impacto:** Médio  
**Mitigação:** Começar com eventos core, expandir gradualmente

### Risco 2: Posicionamento não ressoar
**Probabilidade:** Média  
**Impacto:** Alto  
**Mitigação:** A/B testing de mensagens, feedback de beta testers

### Risco 3: Code of Conduct muito restritivo
**Probabilidade:** Baixa  
**Impacto:** Alto  
**Mitigação:** Validação com comunidade beta, iteração baseada em feedback

### Risco 4: Escopo demais para 1 sprint
**Probabilidade:** Média  
**Impacto:** Médio  
**Mitigação:** Priorizar MVP em cada entrega, documentar backlog

---

## 📊 MÉTRICAS DE SUCESSO DO SPRINT

Ao final do Sprint 1, teremos sucesso se:

✅ **Instrumentation Coverage:** ≥ 90% dos fluxos críticos
✅ **Dashboard Functional:** Mostrando dados reais
✅ **WAPM Baseline:** Estabelecida (mesmo que seja 0 no MVP)
✅ **LP Live:** Com pelo menos 1000 visitantes únicos
✅ **CoC Approved:** Por consultores e time
✅ **Content Matrix:** Completa com priorização clara
✅ **Feature Flags:** ≥ 3 experimentos ativos

---

## 🚀 PRÓXIMOS PASSOS

Após conclusão do Sprint 1, estaremos prontos para:

**Sprint 2:** Growth Loops e Viralização
- Implementar referral program
- Otimizar onboarding baseado em dados
- Primeiros experimentos A/B
- Ativação de early adopters

**Sprint 3:** Premium Conversion
- Otimizar paywall
- Implementar trial 7 dias
- Email sequences
- In-app messaging

---

## ❓ PERGUNTAS PARA DISCUSSÃO

Antes de começar a execução, precisamos alinhar:

1. **Budget:** Qual orçamento para ferramentas? (Mixpanel, GrowthBook, hosting)
2. **Timeline:** 5 semanas é viável? Podemos estender para 6?
3. **Recursos:** Precisamos contratar designer para LP?
4. **Conteúdo:** Quem criará os primeiros cursos/livros?
5. **Beta:** Quantos usuários na primeira onda? 50? 100?
6. **Parceiros:** Esther Perel já confirmou participação?
7. **Legal:** Precisamos advogado para revisar Termos/Privacidade?
8. **Priorização:** Alguma entrega pode ser movida para Sprint 2?

---

**Status:** 📋 Pronto para Discussão  
**Próximo Passo:** Alinhamento com stakeholders → Início de Execução  
**Estimativa:** Sprint de 5 semanas (25 dias úteis)
