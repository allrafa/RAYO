import { useState, useEffect } from "react";
import { Play, Clock, BookOpen, Star, Users, Award, CheckCircle, ArrowLeft, Heart, Share2, Download, Target, Zap, Gift } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useApp } from "./AppContext";
import { enhancedToast } from "./EnhancedToast";

interface DetailLesson {
  id: number;
  title: string;
  duration: string;
  duration_seconds: number;
}

interface DetailModule {
  id: number;
  title: string;
  lessons: number;
  duration: number;
  lessonList: DetailLesson[];
}

interface DetailLessonProgress {
  lesson_id: number;
  status: string;
}

interface APIDetailCourseModule {
  id: number;
  title: string;
  lessons: DetailLesson[];
}

interface CourseDetailPageProps {
  courseId: number;
  onBack: () => void;
}

export function CourseDetailPage({ courseId, onBack }: CourseDetailPageProps) {
  const { getCourseById, enrollInCourse, startCourse, completeLessonOnServer, userData } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [completingLessonId, setCompletingLessonId] = useState<number | null>(null);
  
  const course = getCourseById(courseId);
  
  if (!course) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="text-center p-8">
          <CardContent>
            <h2 className="font-display text-xl font-bold mb-2">Curso não encontrado</h2>
            <p className="text-muted-foreground mb-4">O curso que você está procurando não existe.</p>
            <Button onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      await enrollInCourse(courseId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () => {
    startCourse(courseId);
    enhancedToast.success({
      title: "Curso iniciado!",
      description: "Vamos começar sua jornada de aprendizado",
      haptic: true
    });
  };

  const handleCompleteLesson = async (lessonId: number) => {
    if (completingLessonId) return;
    setCompletingLessonId(lessonId);
    try {
      const result = await completeLessonOnServer(lessonId);
      if (result.success) {
        setLessonProgressMap(prev => ({ ...prev, [lessonId]: 'completed' }));
        enhancedToast.success({
          title: "Aula concluída!",
          description: "Progresso salvo com sucesso.",
          haptic: true
        });
      }
    } finally {
      setCompletingLessonId(null);
    }
  };

  const displayPrice = course.price;

  const [modules, setModules] = useState<DetailModule[]>([]);
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detailRes = await api.get<{ course: { modules: APIDetailCourseModule[] } }>(`/api/courses/${courseId}`);
        if (cancelled || !detailRes.success || !detailRes.data) return;
        const mods = detailRes.data.course.modules || [];
        setModules(mods.map((m) => ({
          id: m.id,
          title: m.title,
          lessons: m.lessons?.length || 0,
          duration: m.lessons?.reduce((acc: number, l) => acc + (l.duration_seconds || 0), 0) || 0,
          lessonList: m.lessons || [],
        })));

        if (course.isEnrolled) {
          const progressRes = await api.get<{ progress: { lessonProgress: DetailLessonProgress[] } | null }>(`/api/courses/${courseId}/progress`);
          if (!cancelled && progressRes.success && progressRes.data?.progress?.lessonProgress) {
            const map: Record<number, string> = {};
            progressRes.data.progress.lessonProgress.forEach((lp) => {
              map[lp.lesson_id] = lp.status;
            });
            setLessonProgressMap(map);
          }
        }
      } catch (err) {
        console.error("[CourseDetail] Failed to load:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId, course.isEnrolled]);

  const instructor = {
    name: course.instructor || "RAYO Academy",
    title: "Especialista",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    experience: "15+ anos",
    students: `${course.students?.toLocaleString() || '0'}+`,
    rating: course.rating || 4.9
  };

  const testimonials = [
    {
      id: 1,
      name: "Ana Carolina",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b5c7d113?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      comment: "Este curso transformou completamente nosso relacionamento. As técnicas são práticas e realmente funcionam!",
      time: "há 2 semanas"
    },
    {
      id: 2,
      name: "João Silva",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face",
      rating: 5,
      comment: "Conteúdo incrível e apresentação clara. Recomendo para todos os casais.",
      time: "há 1 mês"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header com botão voltar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-4 p-4 max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onBack}
            className="hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-semibold truncate">{course.title}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Heart className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-8">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video/Image */}
          <div className="lg:col-span-2">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-[var(--rayo-forest-700)] to-[var(--rayo-forest-900)]">
              <ImageWithFallback
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Button 
                  size="lg"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  variant="outline"
                >
                  <Play className="w-6 h-6 mr-2" />
                  Preview do Curso
                </Button>
              </div>
              
              {/* Course badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <Badge className="bg-[var(--rayo-forest-700)] text-white">
                  <Award className="w-3 h-3 mr-1" />
                  Certificado
                </Badge>
                {course.isPremium && (
                  <Badge className="bg-[var(--rayo-ochre-500)] text-white">
                    ⭐ Premium
                  </Badge>
                )}
              </div>

            </div>
          </div>

          {/* Course Info & CTA */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {course.category}
                    </Badge>
                    <h2 className="font-display text-2xl font-bold leading-tight">
                      {course.title}
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      {course.description}
                    </p>
                  </div>

                  {/* Course Stats */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[var(--rayo-ochre-500)] mb-1">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-semibold">{course.rating}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Avaliação</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{course.students.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Alunos</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{course.duration}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Duração</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{course.lessons}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Aulas</div>
                    </div>
                  </div>

                  {/* Progress (if enrolled) */}
                  {course.isEnrolled && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Seu Progresso</span>
                        <span className="font-medium">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="space-y-3">
                    {course.price > 0 ? (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[var(--rayo-forest-700)]">
                          R$ {displayPrice.toFixed(2).replace('.', ',')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ou 12x de R$ {(displayPrice / 12).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[var(--rayo-forest-700)]">
                          Gratuito
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    {course.isEnrolled ? (
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleStart}
                      >
                        {course.progress > 0 ? (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Continuar Curso
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Iniciar Curso
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button 
                          className="w-full bg-gradient-to-r from-[var(--rayo-forest-700)] to-[var(--rayo-forest-900)] hover:from-[var(--rayo-forest-900)] hover:to-[var(--rayo-ink-900)] text-white" 
                          size="lg"
                          onClick={handleEnroll}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            "Matriculando..."
                          ) : course.price > 0 ? (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Comprar Agora
                            </>
                          ) : (
                            <>
                              <Gift className="w-4 h-4 mr-2" />
                              Matricular-se Grátis
                            </>
                          )}
                        </Button>
                        
                        {course.price > 0 && (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                              30 dias de garantia
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Course Features */}
                  <div className="space-y-2 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-[var(--rayo-forest-700)]" />
                      <span>Acesso vitalício</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-[var(--rayo-forest-700)]" />
                      <span>Certificado de conclusão</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-[var(--rayo-forest-700)]" />
                      <span>Suporte da comunidade</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-[var(--rayo-forest-700)]" />
                      <span>Atualizações gratuitas</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Course Content Tabs */}
        <Tabs defaultValue="curriculum" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="curriculum">Conteúdo</TabsTrigger>
            <TabsTrigger value="instructor">Instrutor</TabsTrigger>
            <TabsTrigger value="reviews">Avaliações</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          <TabsContent value="curriculum" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Currículo do Curso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Carregando módulos...</p>
                ) : modules.map((module, index) => {
                  const modLessons = module.lessonList || [];
                  const allCompleted = modLessons.length > 0 && modLessons.every((l: DetailLesson) => lessonProgressMap[l.id] === 'completed');
                  const durationMin = Math.round(module.duration / 60);
                  const durationStr = durationMin >= 60 ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}min` : `${durationMin}min`;
                  return (
                  <div key={module.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                          allCompleted ? 'bg-[var(--rayo-forest-700)] text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {allCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium">{module.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {module.lessons} aulas
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {durationStr}
                            </span>
                          </div>
                        </div>
                      </div>
                      {course.isEnrolled && (
                        <Button variant="ghost" size="sm">
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {course.isEnrolled && modLessons.length > 0 && (
                      <div className="mt-3 space-y-2 pl-11">
                        {modLessons.map((lesson: DetailLesson) => {
                          const lessonStatus = lessonProgressMap[lesson.id];
                          const isLessonCompleted = lessonStatus === 'completed';
                          const isCompleting = completingLessonId === lesson.id;
                          return (
                            <div key={lesson.id} className="flex items-center justify-between text-sm py-1.5">
                              <div className="flex items-center gap-2 flex-1">
                                {isLessonCompleted ? (
                                  <CheckCircle className="w-4 h-4 text-[var(--rayo-forest-700)] shrink-0" />
                                ) : (
                                  <Play className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <span className={isLessonCompleted ? 'text-muted-foreground line-through' : ''}>
                                  {lesson.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-muted-foreground">{lesson.duration}</span>
                                {!isLessonCompleted && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isCompleting}
                                    onClick={() => handleCompleteLesson(lesson.id)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    {isCompleting ? "..." : "Concluir"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instructor" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={instructor.avatar} alt={instructor.name} />
                    <AvatarFallback>{instructor.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-semibold">{instructor.name}</h3>
                    <p className="text-muted-foreground">{instructor.title}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-[var(--rayo-ochre-500)] fill-current" />
                        <span>{instructor.rating} avaliação</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{instructor.students} alunos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-muted-foreground" />
                        <span>{instructor.experience} experiência</span>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed">
                      Dr. Rafael Santos é um terapeuta especializado em relacionamentos com mais de 15 anos de experiência. 
                      Formado em Psicologia pela USP e pós-graduado em Terapia de Casais, já ajudou milhares de famílias 
                      a construírem relacionamentos mais saudáveis e duradouros.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Avaliações dos Alunos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {testimonials.map((testimonial) => (
                  <div key={testimonial.id} className="border-b border-border pb-4 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                        <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{testimonial.name}</h4>
                          <div className="flex">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 text-[var(--rayo-ochre-500)] fill-current" />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{testimonial.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {testimonial.comment}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Perguntas Frequentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Por quanto tempo tenho acesso ao curso?</h4>
                    <p className="text-sm text-muted-foreground">
                      Você tem acesso vitalício ao curso, podendo assistir quantas vezes quiser, no seu ritmo.
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Existe certificado de conclusão?</h4>
                    <p className="text-sm text-muted-foreground">
                      Sim! Ao completar 100% do curso, você receberá um certificado digital de conclusão.
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Posso fazer perguntas durante o curso?</h4>
                    <p className="text-sm text-muted-foreground">
                      Claro! Você pode participar da comunidade exclusiva e fazer perguntas diretamente aos instrutores.
                    </p>
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