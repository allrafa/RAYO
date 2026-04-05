import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Brain, 
  Sparkles, 
  Target, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Video, 
  MessageCircle, 
  Star, 
  Clock, 
  Filter, 
  Shuffle, 
  ChevronRight, 
  ThumbsUp, 
  ThumbsDown, 
  X,
  Zap,
  Lightbulb,
  ArrowRight,
  Heart,
  Share2,
  Play,
  Calendar,
  Award,
  RefreshCw
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useApp } from "./AppContext";
import { useAnalytics, useInteractionTracking } from "./AnalyticsContext";
import { enhancedToast } from "./EnhancedToast";

interface SmartRecommendation {
  id: string;
  type: 'course' | 'content' | 'action' | 'social' | 'milestone';
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  category: string;
  estimatedTime?: string;
  benefits: string[];
  prerequisites?: string[];
  relatedContent?: any[];
  actionable: boolean;
  dismissed?: boolean;
  liked?: boolean;
  metadata?: Record<string, any>;
}

interface RecommendationEngine {
  generateRecommendations: () => SmartRecommendation[];
  filterByType: (type: string) => SmartRecommendation[];
  filterByUrgency: (urgency: string) => SmartRecommendation[];
  updatePreferences: (preferences: any) => void;
  trackFeedback: (recommendationId: string, feedback: 'like' | 'dislike' | 'dismiss') => void;
}

export function SmartRecommendations() {
  const { 
    userData, 
    courses, 
    posts,
    products,
    setCurrentCourseId,
    setIsInCourseDetail,
    setCurrentVideoId,
    setIsInVideoPage,
    addToFavorites
  } = useApp();
  
  const { 
    engagementMetrics, 
    learningProgress, 
    behaviorInsights, 
    personalizedRecommendations 
  } = useAnalytics();
  
  const { trackClick, trackPageView } = useInteractionTracking();
  
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedUrgency, setSelectedUrgency] = useState("all");
  const [showExplanations, setShowExplanations] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // AI-powered recommendation engine
  const recommendationEngine: RecommendationEngine = {
    generateRecommendations: () => {
      const recs: SmartRecommendation[] = [];
      
      // 1. Learning Path Recommendations
      if (learningProgress.coursesStarted > learningProgress.coursesCompleted) {
        recs.push({
          id: "complete-current-course",
          type: "action",
          title: "Finalize o curso em andamento",
          description: "Você tem cursos quase concluídos. Complete-os para desbloquear novos conteúdos!",
          reasoning: `Baseado na análise dos seus ${learningProgress.coursesStarted} cursos iniciados vs ${learningProgress.coursesCompleted} concluídos`,
          confidence: 95,
          urgency: "high",
          category: "Aprendizado",
          estimatedTime: "30 min",
          benefits: [
            "Ganhar pontos de experiência",
            "Desbloquear próximo nível",
            "Receber certificado de conclusão"
          ],
          actionable: true
        });
      }

      // 2. Social Engagement Recommendations
      if (behaviorInsights.socialEngagement.postsPerWeek < 2) {
        recs.push({
          id: "increase-social-engagement",
          type: "social",
          title: "Compartilhe sua jornada",
          description: "Criando mais posts, você ajuda outros e fortalece sua rede de apoio",
          reasoning: "Sua atividade social está abaixo da média da comunidade",
          confidence: 80,
          urgency: "medium",
          category: "Comunidade",
          estimatedTime: "10 min",
          benefits: [
            "Inspirar outros membros",
            "Receber feedback valioso",
            "Construir sua reputação na comunidade"
          ],
          actionable: true
        });
      }

      // 3. Streak Maintenance
      if (engagementMetrics.streakDays >= 3 && engagementMetrics.streakDays < 7) {
        recs.push({
          id: "maintain-streak",
          type: "action",
          title: "Mantenha seu streak de engajamento",
          description: `Você está há ${engagementMetrics.streakDays} dias consecutivos! Continue para desbloquear conquistas especiais.`,
          reasoning: "Streak consistente indica formação de hábito positivo",
          confidence: 90,
          urgency: "high",
          category: "Motivação",
          estimatedTime: "15 min",
          benefits: [
            "Desbloquear badge exclusivo",
            "Manter momentum de aprendizado",
            "Inspirar outros membros"
          ],
          actionable: true
        });
      }

      // 4. Personalized Course Recommendations
      const preferredCategory = learningProgress.preferredCategories[0];
      const relatedCourses = courses.filter(course => 
        course.category === preferredCategory && 
        !userData.enrolledCourses.includes(course.id) &&
        !userData.completedCourses.includes(course.id)
      );

      if (relatedCourses.length > 0) {
        const recommendedCourse = relatedCourses[0];
        recs.push({
          id: `course-${recommendedCourse.id}`,
          type: "course",
          title: `Curso: ${recommendedCourse.title}`,
          description: recommendedCourse.description,
          reasoning: `Baseado no seu interesse em ${preferredCategory} e padrões de aprendizado similares`,
          confidence: 85,
          urgency: "medium",
          category: preferredCategory,
          estimatedTime: recommendedCourse.duration,
          benefits: [
            `Aprofundar conhecimento em ${preferredCategory}`,
            "Progredir em sua jornada de aprendizado",
            "Conectar com outros estudantes"
          ],
          metadata: { courseId: recommendedCourse.id, course: recommendedCourse },
          actionable: true
        });
      }

      // 5. Peak Time Optimization
      const peakHour = behaviorInsights.peakActivityHours[0];
      if (peakHour && new Date().getHours().toString().padStart(2, '0') + ':00' !== peakHour) {
        recs.push({
          id: "optimize-schedule",
          type: "action",
          title: "Otimize seu horário de estudos",
          description: `Você é mais produtivo às ${peakHour}. Que tal agendar suas próximas sessões neste horário?`,
          reasoning: "Análise de padrões de atividade mostra maior eficiência neste período",
          confidence: 70,
          urgency: "low",
          category: "Produtividade",
          estimatedTime: "5 min",
          benefits: [
            "Maior retenção de conhecimento",
            "Melhor experiência de aprendizado",
            "Otimização do tempo disponível"
          ],
          actionable: true
        });
      }

      // 6. Weekly Goal Progress
      if (learningProgress.weeklyProgress < 50) {
        recs.push({
          id: "weekly-goal-boost",
          type: "action",
          title: "Acelere rumo à sua meta semanal",
          description: `Você está a ${Math.round(100 - learningProgress.weeklyProgress)}% da sua meta. Uma sessão rápida pode fazer a diferença!`,
          reasoning: "Meta semanal ainda alcançável com esforço adicional",
          confidence: 88,
          urgency: "medium",
          category: "Metas",
          estimatedTime: `${Math.round((100 - learningProgress.weeklyProgress) * 1.8)} min`,
          benefits: [
            "Alcançar meta semanal",
            "Manter disciplina",
            "Sentimento de conquista"
          ],
          actionable: true
        });
      }

      // 7. Community Contribution
      if (behaviorInsights.socialEngagement.commentsPerWeek < 5) {
        recs.push({
          id: "community-participation",
          type: "social",
          title: "Participe mais das discussões",
          description: "Seus insights podem ajudar outros membros da comunidade",
          reasoning: "Baixa participação em discussões vs. alto potencial de contribuição",
          confidence: 75,
          urgency: "low",
          category: "Comunidade",
          estimatedTime: "5 min",
          benefits: [
            "Ajudar outros membros",
            "Construir relacionamentos",
            "Melhorar habilidades de comunicação"
          ],
          actionable: true
        });
      }

      // 8. Milestone Achievement
      const nextMilestone = getNextMilestone();
      if (nextMilestone) {
        recs.push({
          id: "milestone-focus",
          type: "milestone",
          title: `Próxima conquista: ${nextMilestone.title}`,
          description: `Você está a ${100 - nextMilestone.progress}% de alcançar esta conquista importante!`,
          reasoning: "Milestone próximo de ser alcançado",
          confidence: 85,
          urgency: "medium",
          category: "Conquistas",
          estimatedTime: "Varia",
          benefits: [
            "Desbloquear conquista especial",
            "Ganhar pontos de experiência",
            "Reconhecimento da comunidade"
          ],
          actionable: true
        });
      }

      // 9. Content Discovery
      const trendingPosts = posts
        .filter(post => post.likes > 15)
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 3);

      if (trendingPosts.length > 0) {
        recs.push({
          id: "trending-content",
          type: "content",
          title: "Explore conteúdo em alta",
          description: "Descobra discussões populares que podem interessar você",
          reasoning: "Baseado em tendências da comunidade e seus interesses",
          confidence: 60,
          urgency: "low",
          category: "Descoberta",
          estimatedTime: "10 min",
          benefits: [
            "Descobrir novas perspectivas",
            "Participar de discussões ativas",
            "Expandir conhecimento"
          ],
          metadata: { posts: trendingPosts },
          actionable: true
        });
      }

      return recs.sort((a, b) => {
        // Sort by urgency first, then confidence
        const urgencyScore = { high: 3, medium: 2, low: 1 };
        if (urgencyScore[a.urgency] !== urgencyScore[b.urgency]) {
          return urgencyScore[b.urgency] - urgencyScore[a.urgency];
        }
        return b.confidence - a.confidence;
      });
    },

    filterByType: (type: string) => {
      if (type === "all") return recommendations;
      return recommendations.filter(rec => rec.type === type);
    },

    filterByUrgency: (urgency: string) => {
      if (urgency === "all") return recommendations;
      return recommendations.filter(rec => rec.urgency === urgency);
    },

    updatePreferences: (preferences: any) => {
      // Update user preferences based on interactions
      console.log("Updating preferences:", preferences);
    },

    trackFeedback: (recommendationId: string, feedback: 'like' | 'dislike' | 'dismiss') => {
      setRecommendations(prev => prev.map(rec => {
        if (rec.id === recommendationId) {
          return {
            ...rec,
            liked: feedback === 'like' ? true : undefined,
            dismissed: feedback === 'dismiss'
          };
        }
        return rec;
      }));

      trackClick("recommendation-feedback", "smart-recommendations", {
        recommendationId,
        feedback
      });

      if (feedback === 'like') {
        enhancedToast.success({
          title: "Obrigado pelo feedback! 👍",
          description: "Vamos melhorar nossas recomendações com base no seu gosto",
          haptic: true
        });
      }
    }
  };

  const getNextMilestone = () => {
    // Mock milestone calculation
    if (learningProgress.coursesCompleted < 5) {
      return {
        title: "5 Cursos Completos",
        progress: (learningProgress.coursesCompleted / 5) * 100
      };
    }
    if (engagementMetrics.streakDays < 10) {
      return {
        title: "Streak de 10 Dias",
        progress: (engagementMetrics.streakDays / 10) * 100
      };
    }
    return null;
  };

  const refreshRecommendations = () => {
    setIsLoading(true);
    setTimeout(() => {
      const newRecs = recommendationEngine.generateRecommendations();
      setRecommendations(newRecs);
      setIsLoading(false);
      enhancedToast.success({
        title: "Recomendações atualizadas! ✨",
        description: `${newRecs.length} novas sugestões personalizadas`,
        haptic: true
      });
    }, 1000);
  };

  const handleRecommendationAction = (recommendation: SmartRecommendation) => {
    trackClick("execute-recommendation", "smart-recommendations", {
      recommendationId: recommendation.id,
      type: recommendation.type
    });

    switch (recommendation.type) {
      case "course":
        if (recommendation.metadata?.courseId) {
          setCurrentCourseId(recommendation.metadata.courseId);
          setIsInCourseDetail(true);
        }
        break;
      
      case "action":
        if (recommendation.id.includes("course")) {
          // Navigate to courses page
          enhancedToast.info({
            title: "Navegando para cursos...",
            description: "Vamos te ajudar a continuar seu aprendizado",
            haptic: true
          });
        } else if (recommendation.id.includes("social")) {
          // Navigate to community
          enhancedToast.info({
            title: "Vamos à comunidade!",
            description: "Hora de compartilhar e conectar",
            haptic: true
          });
        }
        break;
      
      case "social":
        enhancedToast.success({
          title: "Ótima ideia! 🌟",
          description: "Sua participação faz toda a diferença na comunidade",
          haptic: true
        });
        break;
      
      case "content":
        enhancedToast.info({
          title: "Explorando conteúdo...",
          description: "Preparamos algumas sugestões interessantes",
          haptic: true
        });
        break;
      
      default:
        enhancedToast.success({
          title: "Ação iniciada! 🚀",
          description: recommendation.title,
          haptic: true
        });
    }
  };

  useEffect(() => {
    trackPageView("smart-recommendations");
    const initialRecs = recommendationEngine.generateRecommendations();
    setRecommendations(initialRecs);
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        const newRecs = recommendationEngine.generateRecommendations();
        setRecommendations(newRecs);
      }, 300000); // Refresh every 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const filteredRecommendations = recommendations
    .filter(rec => !rec.dismissed)
    .filter(rec => selectedType === "all" || rec.type === selectedType)
    .filter(rec => selectedUrgency === "all" || rec.urgency === selectedUrgency);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "course": return BookOpen;
      case "content": return Video;
      case "action": return Target;
      case "social": return Users;
      case "milestone": return Award;
      default: return Sparkles;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Recomendações Inteligentes</h2>
            <p className="text-sm text-muted-foreground">
              Sugestões personalizadas baseadas na sua jornada
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshRecommendations}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="course">Cursos</SelectItem>
              <SelectItem value="action">Ações</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="content">Conteúdo</SelectItem>
              <SelectItem value="milestone">Marcos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="show-explanations">Mostrar explicações</Label>
              <p className="text-xs text-muted-foreground">
                Exibir o raciocínio por trás das recomendações
              </p>
            </div>
            <Switch
              id="show-explanations"
              checked={showExplanations}
              onCheckedChange={setShowExplanations}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-refresh">Atualização automática</Label>
              <p className="text-xs text-muted-foreground">
                Atualizar recomendações automaticamente
              </p>
            </div>
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Suas Recomendações ({filteredRecommendations.length})
          </h3>
          
          <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredRecommendations.map((recommendation, index) => {
            const TypeIcon = getTypeIcon(recommendation.type);
            
            return (
              <motion.div
                key={recommendation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-base">{recommendation.title}</CardTitle>
                            <Badge 
                              variant="outline" 
                              className={getUrgencyColor(recommendation.urgency)}
                            >
                              {recommendation.urgency === "high" ? "Alta" : 
                               recommendation.urgency === "medium" ? "Média" : "Baixa"}
                            </Badge>
                          </div>
                          <CardDescription>{recommendation.description}</CardDescription>
                          
                          {showExplanations && (
                            <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                              <Lightbulb className="w-3 h-3 inline mr-1" />
                              {recommendation.reasoning}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {recommendation.confidence}% confiança
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => recommendationEngine.trackFeedback(recommendation.id, 'dismiss')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Benefits */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Benefícios:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {recommendation.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {recommendation.estimatedTime}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {recommendation.category}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => recommendationEngine.trackFeedback(recommendation.id, 'like')}
                          className={recommendation.liked ? 'text-green-600' : ''}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => recommendationEngine.trackFeedback(recommendation.id, 'dislike')}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {recommendation.actionable && (
                        <Button 
                          onClick={() => handleRecommendationAction(recommendation)}
                          className="group"
                        >
                          Fazer agora
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {filteredRecommendations.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">Nenhuma recomendação no momento</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Continue usando a plataforma para receber sugestões personalizadas
              </p>
              <Button onClick={refreshRecommendations}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar novamente
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}