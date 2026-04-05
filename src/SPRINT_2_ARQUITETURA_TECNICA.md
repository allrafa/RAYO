# 🏗️ SPRINT 2 - ARQUITETURA TÉCNICA DETALHADA
## Guia de Implementação com Exemplos de Código

> **Complemento ao:** SPRINT_2_PLANO_EXECUCAO.md  
> **Foco:** Detalhes técnicos, código de exemplo, integrações

---

## 📋 ÍNDICE

1. [Motor de Recomendações](#motor-de-recomendações)
2. [Sistema de Experimentos A/B](#sistema-de-experimentos-ab)
3. [Onboarding V2](#onboarding-v2)
4. [Sistema de UTMs](#sistema-de-utms)
5. [Opt-in System](#opt-in-system)
6. [Trilhas Personalizadas](#trilhas-personalizadas)
7. [Tracking TTFV](#tracking-ttfv)

---

## 1. MOTOR DE RECOMENDAÇÕES

### 1.1 Arquivo Principal: `/lib/recommendations/RecommendationEngine.ts`

```typescript
import { Course, Book, Post } from '../types';
import { analytics } from '../analytics/mixpanel';

// ============================================================================
// TIPOS
// ============================================================================

export interface RecommendationContext {
  userId: string;
  segments: string[];      // ["casados", "pais"]
  interests: string[];     // ["comunicacao", "financas"]
  goals: string[];         // ["melhorar_intimidade", "resolver_conflitos"]
  completedCourses: number[];
  completedBooks: string[];
  enrolledCourses: number[];
  enrolledBooks: string[];
  recentActivity: Activity[];
  level: number;
  isPremium: boolean;
  createdAt: Date;
}

export interface Activity {
  type: 'course_view' | 'video_watch' | 'post_view' | 'ai_chat' | 'book_read';
  itemId: string;
  timestamp: Date;
  duration?: number;
}

export interface Recommendation {
  id: string;
  type: 'course' | 'video' | 'book' | 'post' | 'ai-chat' | 'playlist';
  title: string;
  description?: string;
  thumbnail?: string;
  reason: string;           // "Porque você está interessado em Comunicação"
  confidence: number;       // 0-100
  estimatedTime: string;    // "5 min", "30 min", "2h"
  priority: number;         // 1-5 (1 = highest)
  category: string;
  isPremium: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// WEIGHTS & CONFIG
// ============================================================================

const WEIGHTS = {
  GOAL_MATCH: 30,
  SEGMENT_MATCH: 20,
  INTEREST_MATCH: 15,
  POPULARITY: 10,
  RECENCY: 10,
  COMPLETION_RATE: 10,
  SIMILAR_USERS: 5,
};

const CATEGORY_TO_GOAL_MAP: Record<string, string[]> = {
  'Comunicação': ['melhorar_comunicacao', 'resolver_conflitos'],
  'Relacionamento': ['fortalecer_relacionamento', 'melhorar_intimidade'],
  'Finanças': ['organizar_financas', 'planejamento_futuro'],
  'Parentalidade': ['educar_filhos', 'ser_melhor_pai'],
  'Fé': ['crescer_espiritualmente', 'familia_crista'],
  'Auto-conhecimento': ['desenvolver_autoconhecimento', 'crescimento_pessoal'],
};

const CATEGORY_TO_INTEREST_MAP: Record<string, string[]> = {
  'Comunicação': ['comunicacao'],
  'Relacionamento': ['relacionamento'],
  'Finanças': ['financas'],
  'Intimidade': ['intimidade'],
  'Fé': ['fe'],
  'Família': ['familia'],
  'Saúde': ['saude'],
  'Carreira': ['carreira'],
  'Educação': ['educacao'],
  'Parentalidade': ['parentalidade'],
  'Liderança': ['lideranca'],
  'Auto-conhecimento': ['auto-conhecimento'],
  'Propósito': ['proposito'],
  'Crescimento': ['crescimento'],
};

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================

export class RecommendationEngine {
  private context: RecommendationContext;
  private allCourses: Course[];
  private allBooks: Book[];
  private allPosts: Post[];
  
  constructor(
    context: RecommendationContext,
    courses: Course[],
    books: Book[],
    posts: Post[]
  ) {
    this.context = context;
    this.allCourses = courses;
    this.allBooks = books;
    this.allPosts = posts;
  }
  
  // ============================================
  // RECOMENDAÇÕES PARA ONBOARDING
  // ============================================
  
  /**
   * Recomendações imediatas após onboarding
   * Critério: valor rápido (<5 min)
   */
  getOnboardingRecommendations(limit: number = 5): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // 1. Primeira recomendação: sempre uma ação rápida
    const quickAction = this.getQuickWinRecommendation();
    if (quickAction) recommendations.push(quickAction);
    
    // 2. Curso introdutório baseado no segmento principal
    const introCourse = this.getIntroCourseBySegment();
    if (introCourse) recommendations.push(introCourse);
    
    // 3. Chat IA como fallback sempre disponível
    recommendations.push(this.getAIChatRecommendation());
    
    // 4. Completar com conteúdo baseado em goals
    const goalBasedContent = this.getGoalBasedRecommendations(limit - recommendations.length);
    recommendations.push(...goalBasedContent);
    
    // Ordenar por prioridade
    const sorted = recommendations
      .sort((a, b) => a.priority - b.priority)
      .slice(0, limit);
    
    // Track
    analytics.track('RECOMMENDATIONS_GENERATED', {
      context: 'onboarding',
      count: sorted.length,
      types: sorted.map(r => r.type)
    });
    
    return sorted;
  }
  
  // ============================================
  // RECOMENDAÇÕES PARA HOME FEED
  // ============================================
  
  getHomeFeedRecommendations(limit: number = 10): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // 1. Continue assistindo (se houver)
    const continueWatching = this.getContinueWatching();
    recommendations.push(...continueWatching);
    
    // 2. Próximo passo sugerido
    const nextStep = this.getNextStepRecommendation();
    if (nextStep) recommendations.push(nextStep);
    
    // 3. Baseado em goals
    const goalBased = this.getGoalBasedRecommendations(3);
    recommendations.push(...goalBased);
    
    // 4. Baseado em interesses
    const interestBased = this.getInterestBasedRecommendations(3);
    recommendations.push(...interestBased);
    
    // 5. Popular no seu segmento
    const popularInSegment = this.getPopularInSegment(3);
    recommendations.push(...popularInSegment);
    
    // Remover duplicatas e limitar
    const unique = this.removeDuplicates(recommendations);
    return unique.slice(0, limit);
  }
  
  // ============================================
  // CONTINUE DE ONDE PAROU
  // ============================================
  
  getContinueWatching(): Recommendation[] {
    const inProgress: Recommendation[] = [];
    
    // Cursos em andamento
    this.allCourses
      .filter(course => 
        this.context.enrolledCourses.includes(course.id) &&
        course.progress > 0 &&
        course.progress < 100
      )
      .forEach(course => {
        inProgress.push({
          id: `course-${course.id}`,
          type: 'course',
          title: course.title,
          description: course.description,
          thumbnail: course.thumbnail,
          reason: `Você está ${course.progress}% completo`,
          confidence: 100,
          estimatedTime: this.estimateRemainingTime(course),
          priority: 1,
          category: course.category,
          isPremium: course.isPremium,
          metadata: { courseId: course.id, progress: course.progress }
        });
      });
    
    // Livros em andamento
    this.allBooks
      .filter(book =>
        this.context.enrolledBooks.includes(book.id) &&
        book.currentPage > 0 &&
        !book.isCompleted
      )
      .forEach(book => {
        inProgress.push({
          id: `book-${book.id}`,
          type: 'book',
          title: book.title,
          description: `Por ${book.author}`,
          thumbnail: book.cover,
          reason: `Continue lendo (página ${book.currentPage} de ${book.pages})`,
          confidence: 100,
          estimatedTime: this.estimateBookRemainingTime(book),
          priority: 1,
          category: book.category,
          isPremium: book.isPremium,
          metadata: { bookId: book.id, currentPage: book.currentPage }
        });
      });
    
    return inProgress;
  }
  
  // ============================================
  // PRÓXIMO PASSO SUGERIDO
  // ============================================
  
  getNextStepRecommendation(): Recommendation | null {
    // Se completou um curso recentemente, sugerir o próximo na trilha
    const lastCompleted = this.getLastCompletedCourse();
    if (lastCompleted) {
      const nextInPath = this.getNextInLearningPath(lastCompleted);
      if (nextInPath) return nextInPath;
    }
    
    // Se está em uma sequência, sugerir o próximo
    const currentSequence = this.getCurrentSequence();
    if (currentSequence) return currentSequence;
    
    // Sugerir baseado em goals não atingidos
    return this.getGoalProgressRecommendation();
  }
  
  // ============================================
  // SCORING & RANKING
  // ============================================
  
  private scoreRecommendation(
    item: Course | Book | Post,
    itemType: 'course' | 'book' | 'post'
  ): number {
    let score = 0;
    
    // Goal match
    const goalMatch = this.calculateGoalMatch(item);
    score += goalMatch * WEIGHTS.GOAL_MATCH;
    
    // Segment match
    const segmentMatch = this.calculateSegmentMatch(item);
    score += segmentMatch * WEIGHTS.SEGMENT_MATCH;
    
    // Interest match
    const interestMatch = this.calculateInterestMatch(item);
    score += interestMatch * WEIGHTS.INTEREST_MATCH;
    
    // Popularity
    const popularity = this.calculatePopularity(item, itemType);
    score += popularity * WEIGHTS.POPULARITY;
    
    // Recency (newer content gets boost)
    const recency = this.calculateRecency(item);
    score += recency * WEIGHTS.RECENCY;
    
    return Math.round(score);
  }
  
  private calculateGoalMatch(item: any): number {
    const itemCategory = item.category || '';
    const matchingGoals = CATEGORY_TO_GOAL_MAP[itemCategory] || [];
    
    const matchCount = this.context.goals.filter(goal =>
      matchingGoals.includes(goal)
    ).length;
    
    return matchCount > 0 ? 1 : 0;
  }
  
  private calculateSegmentMatch(item: any): number {
    // Check if item has segment tags
    if (item.segments) {
      const matchCount = this.context.segments.filter(segment =>
        item.segments.includes(segment)
      ).length;
      return matchCount > 0 ? 1 : 0;
    }
    
    // Fallback: infer from category
    const segmentCategories: Record<string, string[]> = {
      'solteiro': ['Auto-conhecimento', 'Crescimento'],
      'namoro': ['Relacionamento', 'Comunicação'],
      'noivos': ['Relacionamento', 'Finanças', 'Planejamento'],
      'casados': ['Relacionamento', 'Intimidade', 'Finanças'],
      'pais': ['Parentalidade', 'Família', 'Educação']
    };
    
    for (const segment of this.context.segments) {
      const categories = segmentCategories[segment] || [];
      if (categories.includes(item.category)) {
        return 1;
      }
    }
    
    return 0;
  }
  
  private calculateInterestMatch(item: any): number {
    const itemCategory = item.category || '';
    const matchingInterests = CATEGORY_TO_INTEREST_MAP[itemCategory] || [];
    
    const matchCount = this.context.interests.filter(interest =>
      matchingInterests.includes(interest)
    ).length;
    
    return matchCount > 0 ? 1 : 0;
  }
  
  private calculatePopularity(item: any, type: string): number {
    if (type === 'course') {
      const course = item as Course;
      // Normalize students count to 0-1
      return Math.min(course.students / 5000, 1);
    }
    
    if (type === 'post') {
      const post = item as Post;
      // Normalize engagement to 0-1
      const engagement = post.likes + post.comments * 2 + post.shares * 3;
      return Math.min(engagement / 100, 1);
    }
    
    return 0.5; // Default
  }
  
  private calculateRecency(item: any): number {
    // Boost for content created in last 30 days
    if (item.createdAt) {
      const daysSinceCreation = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation <= 30) return 1;
      if (daysSinceCreation <= 90) return 0.5;
    }
    return 0;
  }
  
  // ============================================
  // HELPER METHODS
  // ============================================
  
  private getQuickWinRecommendation(): Recommendation | null {
    // Sempre recomendar um vídeo curto ou post como quick win
    // TODO: implementar quando tivermos vídeos
    return {
      id: 'video-quick-1',
      type: 'video',
      title: 'Sua Primeira Dica RAIO',
      description: 'Um conselho rápido para começar sua jornada',
      reason: 'Comece com algo rápido',
      confidence: 100,
      estimatedTime: '3 min',
      priority: 1,
      category: 'Introdução',
      isPremium: false,
    };
  }
  
  private getIntroCourseBySegment(): Recommendation | null {
    const primarySegment = this.context.segments[0];
    
    // Map segment to intro course
    const introCourseMap: Record<string, number> = {
      'solteiro': 1,
      'namoro': 1,
      'noivos': 1,
      'casados': 1,
      'pais': 3, // Different intro for parents
    };
    
    const courseId = introCourseMap[primarySegment] || 1;
    const course = this.allCourses.find(c => c.id === courseId);
    
    if (!course) return null;
    
    return {
      id: `course-${course.id}`,
      type: 'course',
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      reason: `Perfeito para ${this.getSegmentLabel(primarySegment)}`,
      confidence: 95,
      estimatedTime: course.duration,
      priority: 2,
      category: course.category,
      isPremium: course.isPremium,
      metadata: { courseId: course.id }
    };
  }
  
  private getAIChatRecommendation(): Recommendation {
    return {
      id: 'ai-chat',
      type: 'ai-chat',
      title: 'Converse com o Conselheiro IA',
      description: 'Tire suas dúvidas e receba orientação personalizada',
      reason: 'Sempre disponível para ajudar',
      confidence: 100,
      estimatedTime: '5-10 min',
      priority: 3,
      category: 'Conselheiro',
      isPremium: false,
    };
  }
  
  private getGoalBasedRecommendations(limit: number): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    for (const goal of this.context.goals) {
      const matchingCategories = Object.entries(CATEGORY_TO_GOAL_MAP)
        .filter(([_, goals]) => goals.includes(goal))
        .map(([category]) => category);
      
      const relevantCourses = this.allCourses
        .filter(course => 
          matchingCategories.includes(course.category) &&
          !this.context.completedCourses.includes(course.id) &&
          !this.context.enrolledCourses.includes(course.id) &&
          (!course.isPremium || this.context.isPremium)
        )
        .slice(0, 1);
      
      relevantCourses.forEach(course => {
        recommendations.push({
          id: `course-${course.id}`,
          type: 'course',
          title: course.title,
          description: course.description,
          thumbnail: course.thumbnail,
          reason: `Para seu objetivo: ${this.getGoalLabel(goal)}`,
          confidence: this.scoreRecommendation(course, 'course'),
          estimatedTime: course.duration,
          priority: 2,
          category: course.category,
          isPremium: course.isPremium,
          metadata: { courseId: course.id, goal }
        });
      });
      
      if (recommendations.length >= limit) break;
    }
    
    return recommendations.slice(0, limit);
  }
  
  private getInterestBasedRecommendations(limit: number): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    for (const interest of this.context.interests) {
      const matchingCategories = Object.entries(CATEGORY_TO_INTEREST_MAP)
        .filter(([_, interests]) => interests.includes(interest))
        .map(([category]) => category);
      
      const relevantContent = this.allCourses
        .filter(course =>
          matchingCategories.includes(course.category) &&
          !this.context.completedCourses.includes(course.id) &&
          (!course.isPremium || this.context.isPremium)
        )
        .slice(0, 1);
      
      relevantContent.forEach(course => {
        recommendations.push({
          id: `course-${course.id}`,
          type: 'course',
          title: course.title,
          description: course.description,
          thumbnail: course.thumbnail,
          reason: `Baseado no seu interesse em ${this.getInterestLabel(interest)}`,
          confidence: this.scoreRecommendation(course, 'course'),
          estimatedTime: course.duration,
          priority: 3,
          category: course.category,
          isPremium: course.isPremium,
          metadata: { courseId: course.id, interest }
        });
      });
    }
    
    return recommendations.slice(0, limit);
  }
  
  private getPopularInSegment(limit: number): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    const popularCourses = this.allCourses
      .filter(course => !this.context.completedCourses.includes(course.id))
      .sort((a, b) => b.students - a.students)
      .slice(0, limit);
    
    popularCourses.forEach(course => {
      recommendations.push({
        id: `course-${course.id}`,
        type: 'course',
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        reason: `Popular entre pessoas como você`,
        confidence: this.scoreRecommendation(course, 'course'),
        estimatedTime: course.duration,
        priority: 4,
        category: course.category,
        isPremium: course.isPremium,
        metadata: { courseId: course.id }
      });
    });
    
    return recommendations;
  }
  
  // ============================================
  // UTILITIES
  // ============================================
  
  private removeDuplicates(recommendations: Recommendation[]): Recommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      if (seen.has(rec.id)) return false;
      seen.add(rec.id);
      return true;
    });
  }
  
  private estimateRemainingTime(course: Course): string {
    const totalMinutes = this.parseDuration(course.duration);
    const remainingMinutes = Math.round(totalMinutes * (100 - course.progress) / 100);
    
    if (remainingMinutes < 60) return `${remainingMinutes} min`;
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return `${hours}h ${minutes}min`;
  }
  
  private estimateBookRemainingTime(book: Book): string {
    const pagesRemaining = book.pages - book.currentPage;
    const minutesRemaining = Math.round(pagesRemaining * 2); // ~2 min per page
    
    if (minutesRemaining < 60) return `~${minutesRemaining} min`;
    const hours = Math.floor(minutesRemaining / 60);
    return `~${hours}h`;
  }
  
  private parseDuration(duration: string): number {
    // Parse "4h 30m" to minutes
    const hours = duration.match(/(\d+)h/)?.[1] || '0';
    const minutes = duration.match(/(\d+)m/)?.[1] || '0';
    return parseInt(hours) * 60 + parseInt(minutes);
  }
  
  private getSegmentLabel(segment: string): string {
    const labels: Record<string, string> = {
      'solteiro': 'solteiros',
      'namoro': 'casais namorando',
      'noivos': 'noivos',
      'casados': 'casados',
      'pais': 'pais'
    };
    return labels[segment] || segment;
  }
  
  private getGoalLabel(goal: string): string {
    const labels: Record<string, string> = {
      'melhorar_comunicacao': 'Melhorar comunicação',
      'resolver_conflitos': 'Resolver conflitos',
      'fortalecer_relacionamento': 'Fortalecer relacionamento',
      'melhorar_intimidade': 'Melhorar intimidade',
      'organizar_financas': 'Organizar finanças',
      'planejamento_futuro': 'Planejar o futuro',
      'educar_filhos': 'Educar filhos',
      'ser_melhor_pai': 'Ser melhor pai/mãe',
      'crescer_espiritualmente': 'Crescer espiritualmente',
      'familia_crista': 'Família cristã',
      'desenvolver_autoconhecimento': 'Autoconhecimento',
      'crescimento_pessoal': 'Crescimento pessoal'
    };
    return labels[goal] || goal;
  }
  
  private getInterestLabel(interest: string): string {
    const labels: Record<string, string> = {
      'relacionamento': 'Relacionamento',
      'comunicacao': 'Comunicação',
      'financas': 'Finanças',
      'intimidade': 'Intimidade',
      'fe': 'Fé & Espiritualidade',
      'familia': 'Família',
      'saude': 'Saúde & Bem-estar',
      'carreira': 'Carreira',
      'educacao': 'Educação',
      'parentalidade': 'Parentalidade',
      'lideranca': 'Liderança',
      'auto-conhecimento': 'Auto-conhecimento',
      'proposito': 'Propósito',
      'crescimento': 'Crescimento Pessoal'
    };
    return labels[interest] || interest;
  }
  
  // Placeholder methods (to be implemented)
  private getLastCompletedCourse(): Course | null { return null; }
  private getNextInLearningPath(course: Course): Recommendation | null { return null; }
  private getCurrentSequence(): Recommendation | null { return null; }
  private getGoalProgressRecommendation(): Recommendation | null { return null; }
}

// ============================================================================
// FACTORY & EXPORTS
// ============================================================================

export function createRecommendationEngine(
  context: RecommendationContext,
  courses: Course[],
  books: Book[],
  posts: Post[]
): RecommendationEngine {
  return new RecommendationEngine(context, courses, books, posts);
}
```

### 1.2 Hook: `/hooks/useRecommendations.ts`

```typescript
import { useApp } from '../components/AppContext';
import { useMemo } from 'react';
import { createRecommendationEngine, RecommendationContext } from '../lib/recommendations/RecommendationEngine';

export function useRecommendations() {
  const { userData, courses, books, posts } = useApp();
  
  const context: RecommendationContext = useMemo(() => ({
    userId: userData.name, // TODO: use proper user ID
    segments: userData.segments,
    interests: userData.interests,
    goals: userData.goals || [],
    completedCourses: userData.completedCourses || [],
    completedBooks: [], // TODO: track completed books
    enrolledCourses: userData.enrolledCourses || [],
    enrolledBooks: userData.enrolledBooks || [],
    recentActivity: [], // TODO: track recent activity
    level: userData.level,
    isPremium: userData.segments.includes('premium'),
    createdAt: new Date(localStorage.getItem('raio_signup_date') || Date.now()),
  }), [userData]);
  
  const engine = useMemo(
    () => createRecommendationEngine(context, courses, books, posts),
    [context, courses, books, posts]
  );
  
  return {
    getOnboardingRecommendations: (limit?: number) => 
      engine.getOnboardingRecommendations(limit),
    getHomeFeedRecommendations: (limit?: number) =>
      engine.getHomeFeedRecommendations(limit),
    getContinueWatching: () =>
      engine.getContinueWatching(),
    getNextStepRecommendation: () =>
      engine.getNextStepRecommendation(),
  };
}
```

---

## 2. SISTEMA DE EXPERIMENTOS A/B

### 2.1 Setup GrowthBook

```bash
npm install @growthbook/growthbook-react
```

### 2.2 Provider: `/lib/experiments/GrowthBookProvider.tsx`

```typescript
import { GrowthBook, GrowthBookProvider as GB Provider } from '@growthbook/growthbook-react';
import { ReactNode, useEffect, useState } from 'react';
import { analytics } from '../analytics/mixpanel';
import { useApp } from '../../components/AppContext';

const GROWTHBOOK_CLIENT_KEY = import.meta.env.VITE_GROWTHBOOK_CLIENT_KEY || 'sdk-demo-key';
const IS_PRODUCTION = import.meta.env.VITE_ENVIRONMENT === 'production';

export function GrowthBookProvider({ children }: { children: ReactNode }) {
  const { userData } = useApp();
  const [growthbook] = useState(
    () =>
      new GrowthBook({
        apiHost: 'https://cdn.growthbook.io',
        clientKey: GROWTHBOOK_CLIENT_KEY,
        enableDevMode: !IS_PRODUCTION,
        trackingCallback: (experiment, result) => {
          // Track experiment view
          analytics.track('EXPERIMENT_VIEWED', {
            experiment_id: experiment.key,
            experiment_name: experiment.key,
            variation_id: result.variationId,
            variation_name: result.key,
            in_experiment: result.inExperiment,
          });
          
          console.log('🧪 Experiment:', {
            key: experiment.key,
            variation: result.key,
            value: result.value,
          });
        },
        
        // Atributos do usuário para segmentação
        attributes: {
          id: userData?.name || 'anonymous',
          segments: userData?.segments || [],
          level: userData?.level || 1,
          isPremium: userData?.segments?.includes('premium') || false,
          daysSinceSignup: calculateDaysSinceSignup(),
        },
      })
  );
  
  useEffect(() => {
    // Load features from GrowthBook API
    growthbook.loadFeatures();
  }, [growthbook]);
  
  // Update attributes when user data changes
  useEffect(() => {
    growthbook.setAttributes({
      id: userData?.name || 'anonymous',
      segments: userData?.segments || [],
      level: userData?.level || 1,
      isPremium: userData?.segments?.includes('premium') || false,
      daysSinceSignup: calculateDaysSinceSignup(),
    });
  }, [userData, growthbook]);
  
  return <GBProvider growthbook={growthbook}>{children}</GBProvider>;
}

function calculateDaysSinceSignup(): number {
  const signupDate = localStorage.getItem('raio_signup_date');
  if (!signupDate) return 0;
  
  const days = Math.floor(
    (Date.now() - new Date(signupDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  return days;
}
```

### 2.3 Hook: `/hooks/useExperiments.ts`

```typescript
import { useFeatureValue, useFeature } from '@growthbook/growthbook-react';

export function useExperiments() {
  // Experiment 1: Onboarding Sequence
  const onboardingSequence = useFeatureValue('onboarding-sequence', 'control');
  
  // Experiment 2: CTA Copy
  const ctaCopy = useFeatureValue('onboarding-cta-copy', 'control');
  
  // Experiment 3: Paywall Timing
  const paywallTiming = useFeatureValue('paywall-trigger-timing', 'control');
  
  // Helper functions
  const getCTAText = () => {
    const ctaMap: Record<string, string> = {
      control: 'Começar agora',
      action: 'Iniciar minha transformação',
      benefit: 'Ver meu plano personalizado',
    };
    return ctaMap[ctaCopy as string] || 'Começar agora';
  };
  
  const getPaywallThreshold = () => {
    const thresholdMap: Record<string, number> = {
      control: 3,
      light: 5,
      heavy: 1,
    };
    return thresholdMap[paywallTiming as string] || 3;
  };
  
  const getOnboardingSteps = () => {
    if (onboardingSequence === 'short') {
      return ['name', 'segment', 'recommendations'];
    }
    if (onboardingSequence === 'progressive') {
      return ['name', 'segment']; // Rest shown progressively
    }
    return ['name', 'segment', 'goals', 'interests', 'recommendations']; // control
  };
  
  return {
    onboardingSequence,
    ctaCopy,
    paywallTiming,
    getCTAText,
    getPaywallThreshold,
    getOnboardingSteps,
  };
}
```

---

## 3. TRACKING TTFV (Time to First Value)

### 3.1 Hook: `/hooks/useTTFVTracking.ts`

```typescript
import { useEffect, useRef } from 'react';
import { analytics } from '../lib/analytics/mixpanel';

export interface TTFVEvent {
  eventType: 'course_start' | 'video_watch' | 'ai_chat_start' | 'book_open' | 'post_view';
  itemId: string;
  timestamp: number;
}

export function useTTFVTracking() {
  const onboardingStartTimeRef = useRef<number | null>(null);
  const firstValueAchievedRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Check if user just completed onboarding
    const justCompletedOnboarding = localStorage.getItem('raio_just_completed_onboarding');
    
    if (justCompletedOnboarding === 'true') {
      const onboardingStartTime = localStorage.getItem('raio_onboarding_start_time');
      if (onboardingStartTime) {
        onboardingStartTimeRef.current = parseInt(onboardingStartTime);
      }
    }
  }, []);
  
  const trackFirstValue = (event: TTFVEvent) => {
    if (firstValueAchievedRef.current) return; // Already tracked
    if (!onboardingStartTimeRef.current) return; // No onboarding start time
    
    const ttfvMs = event.timestamp - onboardingStartTimeRef.current;
    const ttfvSeconds = Math.floor(ttfvMs / 1000);
    const ttfvMinutes = ttfvSeconds / 60;
    
    analytics.track('TTFV_ACHIEVED', {
      ttfv_ms: ttfvMs,
      ttfv_seconds: ttfvSeconds,
      ttfv_minutes: ttfvMinutes.toFixed(2),
      first_value_type: event.eventType,
      first_value_id: event.itemId,
    });
    
    firstValueAchievedRef.current = true;
    
    // Cleanup
    localStorage.removeItem('raio_just_completed_onboarding');
    localStorage.removeItem('raio_onboarding_start_time');
    
    console.log(`⚡ TTFV Achieved: ${ttfvMinutes.toFixed(2)} minutes`);
  };
  
  return { trackFirstValue };
}
```

### 3.2 Integração em componentes:

```typescript
// Em CourseDetailPage.tsx
import { useTTFVTracking } from '../hooks/useTTFVTracking';

export function CourseDetailPage() {
  const { trackFirstValue } = useTTFVTracking();
  
  const handleStartCourse = (courseId: number) => {
    // ... existing logic
    
    // Track TTFV
    trackFirstValue({
      eventType: 'course_start',
      itemId: courseId.toString(),
      timestamp: Date.now(),
    });
  };
  
  // ...
}

// Em VideoPage.tsx
export function VideoPage() {
  const { trackFirstValue } = useTTFVTracking();
  
  useEffect(() => {
    if (videoStarted) {
      trackFirstValue({
        eventType: 'video_watch',
        itemId: videoId,
        timestamp: Date.now(),
      });
    }
  }, [videoStarted]);
  
  // ...
}
```

---

## 4. RESUMO DE INTEGRAÇÃO NO APP.TSX

```typescript
// App.tsx
import { GrowthBookProvider } from './lib/experiments/GrowthBookProvider';

function App() {
  return (
    <GrowthBookProvider>
      <AppProvider>
        <AnalyticsProvider>
          <ThemeProvider>
            {/* ... rest of app */}
          </ThemeProvider>
        </AnalyticsProvider>
      </AppProvider>
    </GrowthBookProvider>
  );
}
```

---

## 📊 PRÓXIMAS SEÇÕES

Este documento continuará com:
- SEO & Landing Page optimization
- Sistema completo de opt-ins
- Trilhas personalizadas implementation
- Welcome flow & checklist detalhado

---

**Versão:** 1.0  
**Status:** Pronto para implementação  
**Próximo:** Começar com RecommendationEngine.ts
