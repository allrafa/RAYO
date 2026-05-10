import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useApp } from "./AppContext";

// Tipos para Analytics
interface SessionData {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: string[];
  interactions: Interaction[];
  completedActions: string[];
  engagementScore: number;
}

interface Interaction {
  type: 'click' | 'scroll' | 'hover' | 'search' | 'favorite' | 'share' | 'comment' | 'course_start' | 'course_progress' | 'video_watch';
  element: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  context: string; // página onde ocorreu
}

interface EngagementMetrics {
  dailyActiveMinutes: number;
  weeklyActiveMinutes: number;
  monthlyActiveMinutes: number;
  streakDays: number;
  totalSessions: number;
  averageSessionDuration: number;
  coursesCompleted: number;
  videosWatched: number;
  postsCreated: number;
  commentsPosted: number;
  favoritesAdded: number;
  searchesPerformed: number;
}

interface LearningProgress {
  coursesStarted: number;
  coursesCompleted: number;
  averageCompletionRate: number;
  preferredCategories: string[];
  learningStreak: number;
  weeklyLearningGoal: number;
  weeklyProgress: number;
  recommendedNextActions: string[];
}

interface BehaviorInsights {
  peakActivityHours: string[];
  preferredContentTypes: string[];
  engagementTrends: { date: string; score: number }[];
  completionPatterns: { category: string; rate: number }[];
  socialEngagement: {
    postsPerWeek: number;
    commentsPerWeek: number;
    likesGiven: number;
    sharesGiven: number;
  };
}

interface PersonalizedRecommendations {
  suggestedCourses: Array<{ id: number; reason: string; confidence: number }>;
  suggestedContent: Array<{ type: string; title: string; reason: string }>;
  suggestedActions: Array<{ action: string; reason: string; priority: number }>;
  nextMilestones: Array<{ title: string; progress: number; target: string }>;
}

interface AnalyticsContextType {
  // Session Management
  currentSession: SessionData | null;
  startSession: () => void;
  endSession: () => void;
  
  // Interaction Tracking
  trackInteraction: (interaction: Omit<Interaction, 'timestamp'>) => void;
  trackPageView: (page: string) => void;
  
  // Metrics
  engagementMetrics: EngagementMetrics;
  learningProgress: LearningProgress;
  behaviorInsights: BehaviorInsights;
  personalizedRecommendations: PersonalizedRecommendations;
  
  // Analytics Functions
  getWeeklyReport: () => WeeklyReport;
  getMonthlyReport: () => MonthlyReport;
  calculateEngagementScore: () => number;
  
  // Goals & Achievements
  setWeeklyGoal: (goal: number) => void;
  getAchievements: () => Achievement[];
  trackGoalProgress: () => void;
}

interface WeeklyReport {
  totalMinutes: number;
  coursesCompleted: number;
  videosWatched: number;
  postsCreated: number;
  socialInteractions: number;
  engagementScore: number;
  topCategories: string[];
  highlights: string[];
  nextWeekSuggestions: string[];
}

interface MonthlyReport {
  totalMinutes: number;
  coursesCompleted: number;
  skillsLearned: string[];
  engagementTrend: string;
  topAchievements: string[];
  personalGrowth: string[];
  nextMonthGoals: string[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  progress: number;
  target: number;
  category: 'learning' | 'social' | 'engagement' | 'milestone';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { userData, getFavoritesByType } = useApp();
  
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionData[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  
  // Load analytics data from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('raio-analytics-sessions');
    const savedInteractions = localStorage.getItem('raio-analytics-interactions');
    
    if (savedSessions) {
      try {
        setSessionHistory(JSON.parse(savedSessions));
      } catch (error) {
        console.error('Error loading session history:', error);
      }
    }
    
    if (savedInteractions) {
      try {
        setInteractions(JSON.parse(savedInteractions));
      } catch (error) {
        console.error('Error loading interactions:', error);
      }
    }
  }, []);

  // Save analytics data to localStorage
  useEffect(() => {
    localStorage.setItem('raio-analytics-sessions', JSON.stringify(sessionHistory));
  }, [sessionHistory]);

  useEffect(() => {
    localStorage.setItem('raio-analytics-interactions', JSON.stringify(interactions));
  }, [interactions]);

  // Auto start session on app load
  useEffect(() => {
    startSession();
    
    // End session on page unload
    const handleBeforeUnload = () => {
      endSession();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
  }, []);

  const startSession = () => {
    const newSession: SessionData = {
      id: `session-${Date.now()}`,
      startTime: new Date(),
      pageViews: [],
      interactions: [],
      completedActions: [],
      engagementScore: 0
    };
    
    setCurrentSession(newSession);
  };

  const endSession = () => {
    if (currentSession) {
      const endedSession: SessionData = {
        ...currentSession,
        endTime: new Date(),
        duration: Date.now() - currentSession.startTime.getTime(),
        engagementScore: calculateSessionEngagementScore(currentSession)
      };
      
      setSessionHistory(prev => [...prev, endedSession]);
      setCurrentSession(null);
    }
  };

  const trackInteraction = (interaction: Omit<Interaction, 'timestamp'>) => {
    const fullInteraction: Interaction = {
      ...interaction,
      timestamp: new Date()
    };
    
    setInteractions(prev => [...prev, fullInteraction]);
    
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        interactions: [...prev.interactions, fullInteraction]
      } : prev);
    }
  };

  const trackPageView = (page: string) => {
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        pageViews: [...prev.pageViews, page]
      } : prev);
    }
    
    trackInteraction({
      type: 'click',
      element: 'page-navigation',
      context: page,
      metadata: { page }
    });
  };

  const calculateSessionEngagementScore = (session: SessionData): number => {
    let score = 0;
    
    // Pontos por duração (máximo 30 pontos)
    const durationMinutes = session.duration ? session.duration / 60000 : 0;
    score += Math.min(durationMinutes * 2, 30);
    
    // Pontos por interações (máximo 40 pontos)
    score += Math.min(session.interactions.length * 2, 40);
    
    // Pontos por variedade de páginas (máximo 20 pontos)
    const uniquePages = new Set(session.pageViews).size;
    score += Math.min(uniquePages * 5, 20);
    
    // Pontos por ações concluídas (máximo 10 pontos)
    score += Math.min(session.completedActions.length * 5, 10);
    
    return Math.round(score);
  };

  const calculateEngagementScore = (): number => {
    const last7Days = sessionHistory.filter(session => {
      const sessionDate = new Date(session.startTime);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return sessionDate > weekAgo;
    });
    
    const totalScore = last7Days.reduce((sum, session) => sum + session.engagementScore, 0);
    return Math.round(totalScore / Math.max(last7Days.length, 1));
  };

  // Calculated metrics
  const engagementMetrics: EngagementMetrics = {
    dailyActiveMinutes: calculateDailyActiveMinutes(),
    weeklyActiveMinutes: calculateWeeklyActiveMinutes(),
    monthlyActiveMinutes: calculateMonthlyActiveMinutes(),
    streakDays: calculateStreakDays(),
    totalSessions: sessionHistory.length,
    averageSessionDuration: calculateAverageSessionDuration(),
    coursesCompleted: userData.completedCourses?.length || 0,
    videosWatched: getInteractionCount('video_watch'),
    postsCreated: getInteractionCount('click', 'create-post'),
    commentsPosted: getInteractionCount('comment'),
    favoritesAdded: getFavoritesByType().length,
    searchesPerformed: getInteractionCount('search')
  };

  const learningProgress: LearningProgress = {
    coursesStarted: userData.enrolledCourses?.length || 0,
    coursesCompleted: userData.completedCourses?.length || 0,
    averageCompletionRate: calculateAverageCompletionRate(),
    preferredCategories: getPreferredCategories(),
    learningStreak: calculateLearningStreak(),
    weeklyLearningGoal: 180, // 3 horas por semana
    weeklyProgress: calculateWeeklyLearningProgress(),
    recommendedNextActions: getRecommendedNextActions()
  };

  const behaviorInsights: BehaviorInsights = {
    peakActivityHours: calculatePeakActivityHours(),
    preferredContentTypes: getPreferredContentTypes(),
    engagementTrends: calculateEngagementTrends(),
    completionPatterns: calculateCompletionPatterns(),
    socialEngagement: calculateSocialEngagement()
  };

  const personalizedRecommendations: PersonalizedRecommendations = {
    suggestedCourses: getSuggestedCourses(),
    suggestedContent: getSuggestedContent(),
    suggestedActions: getSuggestedActions(),
    nextMilestones: getNextMilestones()
  };

  // Helper functions
  function calculateDailyActiveMinutes(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = sessionHistory.filter(session => {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
    
    return todaySessions.reduce((total, session) => {
      return total + (session.duration ? session.duration / 60000 : 0);
    }, 0);
  }

  function calculateWeeklyActiveMinutes(): number {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentSessions = sessionHistory.filter(session => {
      return new Date(session.startTime) > weekAgo;
    });
    
    return recentSessions.reduce((total, session) => {
      return total + (session.duration ? session.duration / 60000 : 0);
    }, 0);
  }

  function calculateMonthlyActiveMinutes(): number {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentSessions = sessionHistory.filter(session => {
      return new Date(session.startTime) > monthAgo;
    });
    
    return recentSessions.reduce((total, session) => {
      return total + (session.duration ? session.duration / 60000 : 0);
    }, 0);
  }

  function calculateStreakDays(): number {
    const sortedSessions = sessionHistory
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const hasActivity = sortedSessions.some(session => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === currentDate.getTime();
      });
      
      if (hasActivity) {
        streak++;
      } else if (streak > 0) {
        break;
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  }

  function calculateAverageSessionDuration(): number {
    const sessionsWithDuration = sessionHistory.filter(s => s.duration);
    if (sessionsWithDuration.length === 0) return 0;
    
    const totalDuration = sessionsWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0);
    return Math.round(totalDuration / sessionsWithDuration.length / 60000); // em minutos
  }

  function getInteractionCount(type: string, element?: string): number {
    return interactions.filter(interaction => {
      return interaction.type === type && (!element || interaction.element === element);
    }).length;
  }

  function calculateAverageCompletionRate(): number {
    // Mock calculation - in real app would be based on actual course progress
    return 85; // 85% completion rate
  }

  function getPreferredCategories(): string[] {
    // Mock data - would analyze actual interaction patterns
    return ['Relacionamento', 'Comunicação', 'Finanças'];
  }

  function calculateLearningStreak(): number {
    // Mock calculation - would track consecutive days of learning activity
    return 5;
  }

  function calculateWeeklyLearningProgress(): number {
    const weeklyMinutes = calculateWeeklyActiveMinutes();
    return Math.min((weeklyMinutes / 180) * 100, 100); // percentage of 3-hour goal
  }

  function getRecommendedNextActions(): string[] {
    return [
      'Complete o curso "Comunicação no Casamento"',
      'Participe de uma discussão na comunidade',
      'Assista 2 vídeos sobre finanças',
      'Crie um post compartilhando sua experiência'
    ];
  }

  function calculatePeakActivityHours(): string[] {
    // Mock data - would analyze actual usage patterns
    return ['19:00-21:00', '07:00-09:00'];
  }

  function getPreferredContentTypes(): string[] {
    return ['Vídeos', 'Cursos', 'Posts da Comunidade'];
  }

  function calculateEngagementTrends(): { date: string; score: number }[] {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayScore = Math.random() * 100; // Mock score
      last7Days.push({
        date: date.toISOString().split('T')[0],
        score: Math.round(dayScore)
      });
    }
    return last7Days;
  }

  function calculateCompletionPatterns(): { category: string; rate: number }[] {
    return [
      { category: 'Relacionamento', rate: 92 },
      { category: 'Comunicação', rate: 85 },
      { category: 'Finanças', rate: 78 },
      { category: 'Parentalidade', rate: 71 }
    ];
  }

  function calculateSocialEngagement() {
    return {
      postsPerWeek: 2,
      commentsPerWeek: 8,
      likesGiven: 15,
      sharesGiven: 3
    };
  }

  function getSuggestedCourses() {
    return [
      { id: 1, reason: 'Baseado no seu interesse em comunicação', confidence: 95 },
      { id: 2, reason: 'Continuação natural do seu progresso', confidence: 87 },
      { id: 3, reason: 'Popular entre usuários similares', confidence: 72 }
    ];
  }

  function getSuggestedContent() {
    return [
      { type: 'video', title: 'Como resolver conflitos', reason: 'Baseado em suas pesquisas recentes' },
      { type: 'post', title: 'Dicas de organização financeira', reason: 'Complementa seus estudos' }
    ];
  }

  function getSuggestedActions() {
    return [
      { action: 'Completar curso em andamento', reason: 'Você está a 75% do fim', priority: 1 },
      { action: 'Participar da discussão semanal', reason: 'Aumenta engajamento social', priority: 2 },
      { action: 'Revisar progresso mensal', reason: 'Momento ideal para reflexão', priority: 3 }
    ];
  }

  function getNextMilestones() {
    return [
      { title: 'Primeiro curso completo', progress: 75, target: '100%' },
      { title: 'Streak de 7 dias', progress: 71, target: '7 dias' },
      { title: '10 posts na comunidade', progress: 40, target: '10 posts' }
    ];
  }

  const getWeeklyReport = (): WeeklyReport => {
    return {
      totalMinutes: calculateWeeklyActiveMinutes(),
      coursesCompleted: 1,
      videosWatched: 8,
      postsCreated: 2,
      socialInteractions: 25,
      engagementScore: calculateEngagementScore(),
      topCategories: ['Relacionamento', 'Comunicação'],
      highlights: [
        'Completou o curso "Comunicação no Casamento"',
        'Atingiu streak de 5 dias consecutivos',
        'Criou 2 posts inspiradores na comunidade'
      ],
      nextWeekSuggestions: [
        'Iniciar curso sobre finanças',
        'Participar de mais discussões',
        'Assistir vídeos sobre parentalidade'
      ]
    };
  };

  const getMonthlyReport = (): MonthlyReport => {
    return {
      totalMinutes: calculateMonthlyActiveMinutes(),
      coursesCompleted: 3,
      skillsLearned: ['Comunicação não-violenta', 'Gestão financeira', 'Resolução de conflitos'],
      engagementTrend: 'crescente',
      topAchievements: [
        'Completou 3 cursos',
        'Manteve streak de 15 dias',
        'Ajudou 5 pessoas na comunidade'
      ],
      personalGrowth: [
        'Melhoria na comunicação do casal',
        'Maior organização financeira',
        'Participação ativa na comunidade'
      ],
      nextMonthGoals: [
        'Completar 2 novos cursos',
        'Mentorear um novo membro',
        'Criar conteúdo próprio'
      ]
    };
  };

  const setWeeklyGoal = (goal: number) => {
    // Implementation for setting weekly learning goal
    localStorage.setItem('rayo-weekly-goal', goal.toString());
  };

  const getAchievements = (): Achievement[] => {
    return [
      {
        id: 'first-course',
        title: 'Primeiro Passo',
        description: 'Complete seu primeiro curso',
        icon: '🎓',
        earned: true,
        progress: 100,
        target: 1,
        category: 'learning',
        rarity: 'common'
      },
      {
        id: 'week-streak',
        title: 'Dedicação Semanal',
        description: 'Mantenha um streak de 7 dias',
        icon: '🔥',
        earned: false,
        progress: 71,
        target: 7,
        category: 'engagement',
        rarity: 'rare'
      },
      {
        id: 'community-helper',
        title: 'Ajudante da Comunidade',
        description: 'Ajude 10 pessoas na comunidade',
        icon: '🤝',
        earned: false,
        progress: 50,
        target: 10,
        category: 'social',
        rarity: 'epic'
      }
    ];
  };

  const trackGoalProgress = () => {
    // Implementation for tracking progress towards goals
    // This would update achievement progress and unlock new milestones
  };

  return (
    <AnalyticsContext.Provider value={{
      currentSession,
      startSession,
      endSession,
      trackInteraction,
      trackPageView,
      engagementMetrics,
      learningProgress,
      behaviorInsights,
      personalizedRecommendations,
      getWeeklyReport,
      getMonthlyReport,
      calculateEngagementScore,
      setWeeklyGoal,
      getAchievements,
      trackGoalProgress
    }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

// Hook para tracking automático de interações
export function useInteractionTracking() {
  const { trackInteraction, trackPageView } = useAnalytics();
  
  const trackClick = (element: string, context: string, metadata?: Record<string, any>) => {
    trackInteraction({
      type: 'click',
      element,
      context,
      metadata
    });
  };
  
  const trackSearch = (query: string, context: string) => {
    trackInteraction({
      type: 'search',
      element: 'search-input',
      context,
      metadata: { query }
    });
  };
  
  const trackVideoWatch = (videoId: string, duration: number, context: string) => {
    trackInteraction({
      type: 'video_watch',
      element: `video-${videoId}`,
      context,
      metadata: { videoId, duration }
    });
  };
  
  const trackCourseProgress = (courseId: number, progress: number, context: string) => {
    trackInteraction({
      type: 'course_progress',
      element: `course-${courseId}`,
      context,
      metadata: { courseId, progress }
    });
  };

  return {
    trackClick,
    trackSearch,
    trackVideoWatch,
    trackCourseProgress,
    trackPageView
  };
}