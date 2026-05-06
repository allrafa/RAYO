import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Calendar, 
  Clock, 
  Trophy, 
  Flame, 
  BookOpen, 
  Users, 
  Heart, 
  MessageCircle, 
  Share2, 
  Star, 
  ChevronRight, 
  Settings, 
  Download,
  Filter,
  RefreshCw,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  Zap,
  Award,
  Brain,
  Smile
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar } from "recharts";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { BackButton } from "./BackButton";
import { useApp } from "./AppContext";
import { useAnalytics, useInteractionTracking } from "./AnalyticsContext";
import { enhancedToast } from "./EnhancedToast";

interface PersonalDashboardProps {
  onBack: () => void;
}

export function PersonalDashboard({ onBack }: PersonalDashboardProps) {
  const { userData } = useApp();
  const { 
    engagementMetrics, 
    learningProgress, 
    behaviorInsights, 
    personalizedRecommendations,
    getWeeklyReport,
    getMonthlyReport,
    calculateEngagementScore,
    getAchievements,
    setWeeklyGoal
  } = useAnalytics();
  
  const { trackClick, trackPageView } = useInteractionTracking();
  
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [showInsights, setShowInsights] = useState(true);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState("all");

  useEffect(() => {
    trackPageView("personal-dashboard");
  }, []);

  const weeklyReport = getWeeklyReport();
  const monthlyReport = getMonthlyReport();
  const achievements = getAchievements();
  const currentEngagementScore = calculateEngagementScore();

  // Chart colors matching our design system
  const chartColors = {
    primary: "var(--rayo-forest-700)",
    secondary: "var(--rayo-sage-500)",
    accent: "hsl(var(--rayo-ochre-500))",
    coral: "hsl(var(--rayo-terra-500))",
    muted: "hsl(var(--muted-foreground))"
  };

  // Mock data for charts (would come from analytics)
  const engagementData = behaviorInsights.engagementTrends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    score: trend.score,
    minutes: Math.floor(Math.random() * 120) + 20
  }));

  const categoryData = behaviorInsights.completionPatterns.map(pattern => ({
    name: pattern.category,
    value: pattern.rate,
    color: chartColors.primary
  }));

  const goalProgressData = [
    { name: "Meta Semanal", value: learningProgress.weeklyProgress, max: 100 },
    { name: "Streak Atual", value: (engagementMetrics.streakDays / 30) * 100, max: 100 },
    { name: "Cursos", value: (learningProgress.coursesCompleted / 10) * 100, max: 100 }
  ];

  const recentActivityData = [
    { time: "08:00", activity: "Curso iniciado", intensity: 80 },
    { time: "10:30", activity: "Post criado", intensity: 60 },
    { time: "14:15", activity: "Vídeo assistido", intensity: 90 },
    { time: "19:20", activity: "Discussão na comunidade", intensity: 70 },
    { time: "21:45", activity: "Curso concluído", intensity: 100 }
  ];

  const getEngagementLevel = (score: number) => {
    if (score >= 80) return { label: "Excepcional", color: "text-green-600", icon: Flame };
    if (score >= 60) return { label: "Alto", color: "text-lime-600", icon: TrendingUp };
    if (score >= 40) return { label: "Médio", color: "text-yellow-600", icon: Target };
    return { label: "Baixo", color: "text-orange-600", icon: Clock };
  };

  const engagementLevel = getEngagementLevel(currentEngagementScore);
  const EngagementIcon = engagementLevel.icon;

  const handleSetGoal = (minutes: number) => {
    setWeeklyGoal(minutes);
    trackClick("set-weekly-goal", "personal-dashboard", { goal: minutes });
    enhancedToast.success({
      title: "Meta atualizada! 🎯",
      description: `Nova meta semanal: ${minutes} minutos`,
      haptic: true
    });
    setGoalModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <BackButton onClick={onBack} />
            <div>
              <h1 className="font-display text-xl font-bold">Dashboard Pessoal</h1>
              <p className="text-sm text-muted-foreground">
                Seu progresso e insights personalizados
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 dias</SelectItem>
                <SelectItem value="month">30 dias</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <BreadcrumbNav 
          items={[
            { label: "Home", href: "#" },
            { label: "Dashboard Pessoal" }
          ]}
        />
      </div>

      <div className="p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Engajamento
                  </CardTitle>
                  <EngagementIcon className={`w-4 h-4 ${engagementLevel.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{currentEngagementScore}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={engagementLevel.color}>
                      {engagementLevel.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      +12% vs. semana passada
                    </span>
                  </div>
                  <Progress value={currentEngagementScore} className="h-1" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tempo Ativo
                  </CardTitle>
                  <Clock className="w-4 h-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {Math.round(engagementMetrics.weeklyActiveMinutes)}m
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Esta semana
                  </div>
                  <Progress 
                    value={learningProgress.weeklyProgress} 
                    className="h-1" 
                  />
                  <div className="text-xs text-muted-foreground">
                    {Math.round(learningProgress.weeklyProgress)}% da meta semanal
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Streak Atual
                  </CardTitle>
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {engagementMetrics.streakDays} dias
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Recorde: 15 dias
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < engagementMetrics.streakDays % 7 
                            ? 'bg-orange-500' 
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cursos Concluídos
                  </CardTitle>
                  <Trophy className="w-4 h-4 text-yellow-500" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {learningProgress.coursesCompleted}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {learningProgress.coursesStarted} iniciados
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <ArrowUp className="w-3 h-3 text-green-500" />
                    <span className="text-green-500">+2 este mês</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="learning">Aprendizado</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Engagement Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Engajamento Semanal</CardTitle>
                      <CardDescription>
                        Seu nível de atividade nos últimos 7 dias
                      </CardDescription>
                    </div>
                    <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="courses">Cursos</SelectItem>
                        <SelectItem value="community">Comunidade</SelectItem>
                        <SelectItem value="videos">Vídeos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={engagementData}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="score" 
                          stroke={chartColors.primary}
                          fillOpacity={1} 
                          fill="url(#colorScore)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Goals Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Metas da Semana
                      </CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setGoalModalOpen(true)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {goalProgressData.map((goal, index) => (
                      <div key={goal.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{goal.name}</span>
                          <span className="text-muted-foreground">
                            {Math.round(goal.value)}%
                          </span>
                        </div>
                        <Progress value={goal.value} className="h-2" />
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          trackClick("set-new-goal", "personal-dashboard");
                          enhancedToast.info({
                            title: "Definir nova meta",
                            description: "Funcionalidade em desenvolvimento",
                            haptic: true
                          });
                        }}
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Adicionar Meta
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Conquistas Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {achievements.slice(0, 3).map((achievement) => (
                      <div 
                        key={achievement.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          achievement.earned 
                            ? 'bg-primary/5 border-primary/20' 
                            : 'opacity-60'
                        }`}
                      >
                        <div className={`text-2xl ${achievement.earned ? '' : 'grayscale'}`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{achievement.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">
                            {achievement.description}
                          </p>
                          {!achievement.earned && (
                            <div className="mt-2">
                              <Progress 
                                value={(achievement.progress / achievement.target) * 100} 
                                className="h-1" 
                              />
                              <span className="text-xs text-muted-foreground">
                                {achievement.progress}/{achievement.target}
                              </span>
                            </div>
                          )}
                        </div>
                        {achievement.earned && (
                          <Badge variant="secondary">
                            Conquistado
                          </Badge>
                        )}
                      </div>
                    ))}
                    
                    <Button variant="outline" className="w-full mt-4">
                      Ver Todas as Conquistas
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="learning" className="space-y-6">
            {/* Learning Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Progresso por Categoria</CardTitle>
                  <CardDescription>
                    Taxa de conclusão por área de conhecimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill={chartColors.primary}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recomendações Personalizadas</CardTitle>
                  <CardDescription>
                    Próximos passos baseados no seu progresso
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {personalizedRecommendations.suggestedActions.slice(0, 4).map((action, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        trackClick("follow-recommendation", "personal-dashboard", { action: action.action });
                        enhancedToast.info({
                          title: "Ação recomendada",
                          description: action.reason,
                          haptic: true
                        });
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        action.priority === 1 ? 'bg-red-500' :
                        action.priority === 2 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1">
                        <h4 className="font-medium">{action.action}</h4>
                        <p className="text-sm text-muted-foreground">{action.reason}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            {/* Social Engagement */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Posts Criados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{behaviorInsights.socialEngagement.postsPerWeek}</div>
                  <p className="text-sm text-muted-foreground">Esta semana</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Comentários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{behaviorInsights.socialEngagement.commentsPerWeek}</div>
                  <p className="text-sm text-muted-foreground">Esta semana</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Interações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {behaviorInsights.socialEngagement.likesGiven + behaviorInsights.socialEngagement.sharesGiven}
                  </div>
                  <p className="text-sm text-muted-foreground">Likes + Shares</p>
                </CardContent>
              </Card>
            </div>

            {/* Community Impact */}
            <Card>
              <CardHeader>
                <CardTitle>Impacto na Comunidade</CardTitle>
                <CardDescription>
                  Como suas interações contribuem para a comunidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Helpfulness Score</span>
                      <Badge variant="secondary">Alto</Badge>
                    </div>
                    <Progress value={85} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Engagement Rate</span>
                      <Badge variant="secondary">Médio</Badge>
                    </div>
                    <Progress value={67} className="h-2" />
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Conquistas Sociais</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Heart className="w-4 h-4 text-red-500" />
                        <span>Post mais curtido: 24 likes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MessageCircle className="w-4 h-4 text-blue-500" />
                        <span>Melhor discussão: 15 comentários</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-green-500" />
                        <span>Pessoas ajudadas: 8</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {/* Personalized Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Insights Personalizados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">
                          Horário de Pico
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Você é mais ativo entre {behaviorInsights.peakActivityHours[0]}. 
                          Considere agendar estudos neste período.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-900 dark:text-green-100">
                          Padrão de Crescimento
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Seu engajamento aumentou 23% nas últimas 2 semanas. 
                          Continue assim!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                          Área de Interesse
                        </h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Você demonstra maior interesse em "{learningProgress.preferredCategories[0]}". 
                          Que tal explorar cursos avançados?
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smile className="w-5 h-5" />
                    Bem-estar & Motivação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6">
                    <div className="text-4xl mb-2">😊</div>
                    <h3 className="font-semibold">Estado Positivo</h3>
                    <p className="text-sm text-muted-foreground">
                      Baseado na sua atividade recente
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Motivação</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < 4 ? 'text-yellow-500 fill-current' : 'text-muted'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Consistência</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < 3 ? 'text-yellow-500 fill-current' : 'text-muted'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Engajamento</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < 4 ? 'text-yellow-500 fill-current' : 'text-muted'}`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Agendar Pausa Motivacional
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Weekly/Monthly Reports */}
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Personalizados</CardTitle>
                <CardDescription>
                  Resumos detalhados do seu progresso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Relatório Semanal</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Tempo total:</span>
                        <span className="font-medium">{Math.round(weeklyReport.totalMinutes)}min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cursos concluídos:</span>
                        <span className="font-medium">{weeklyReport.coursesCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Score de engajamento:</span>
                        <span className="font-medium">{weeklyReport.engagementScore}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Relatório
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Relatório Mensal</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Tempo total:</span>
                        <span className="font-medium">{Math.round(monthlyReport.totalMinutes)}min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Habilidades aprendidas:</span>
                        <span className="font-medium">{monthlyReport.skillsLearned.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tendência:</span>
                        <span className="font-medium capitalize">{monthlyReport.engagementTrend}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Relatório
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}