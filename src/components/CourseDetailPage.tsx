import { useState } from "react";
import { Play, Clock, BookOpen, Star, Users, Award, CheckCircle, ArrowLeft, Heart, Share2, Download, Target, Zap, Gift } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useApp } from "./AppContext";
import { enhancedToast } from "./EnhancedToast";

interface CourseDetailPageProps {
  courseId: number;
  onBack: () => void;
}

export function CourseDetailPage({ courseId, onBack }: CourseDetailPageProps) {
  const { getCourseById, enrollInCourse, startCourse, userData } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      enrollInCourse(courseId);
      enhancedToast.success({
        title: "🎉 Matriculado com sucesso!",
        description: `Bem-vindo(a) ao curso "${course.title}"`,
        haptic: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () => {
    startCourse(courseId);
    enhancedToast.success({
      title: "📚 Curso iniciado!",
      description: "Vamos começar sua jornada de aprendizado",
      haptic: true
    });
  };

  const discountedPrice = course.price * 0.5;
  const modules = [
    { id: 1, title: "Introdução e Fundamentos", lessons: 3, duration: "45min", completed: course.isEnrolled },
    { id: 2, title: "Comunicação Efetiva", lessons: 4, duration: "1h 20min", completed: false },
    { id: 3, title: "Resolvendo Conflitos", lessons: 3, duration: "55min", completed: false },
    { id: 4, title: "Construindo Intimidade", lessons: 2, duration: "40min", completed: false }
  ];

  const instructor = {
    name: "Dr. Rafael Santos",
    title: "Terapeuta de Casais",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    experience: "15+ anos",
    students: "10.000+",
    rating: 4.9
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
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-green-600 to-green-700">
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
                <Badge className="bg-green-600 text-white">
                  <Award className="w-3 h-3 mr-1" />
                  Certificado
                </Badge>
                {course.isPremium && (
                  <Badge className="bg-yellow-500 text-white">
                    ⭐ Premium
                  </Badge>
                )}
              </div>

              {/* Discount badge */}
              {course.price > 0 && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-red-500 text-white font-bold">
                    50% OFF
                  </Badge>
                </div>
              )}
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
                      <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
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
                        <div className="text-sm text-muted-foreground line-through">
                          De R$ {course.price}
                        </div>
                        <div className="text-3xl font-bold text-green-600">
                          R$ {discountedPrice.toFixed(0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ou 12x de R$ {(discountedPrice / 12).toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
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
                          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white" 
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
                              ⚡ Oferta por tempo limitado • 30 dias de garantia
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Course Features */}
                  <div className="space-y-2 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Acesso vitalício</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Certificado de conclusão</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Suporte da comunidade</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
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
                {modules.map((module, index) => (
                  <div key={module.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                          module.completed ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {module.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
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
                              {module.duration}
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
                  </div>
                ))}
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
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
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
                              <Star key={i} className="w-3 h-3 text-yellow-500 fill-current" />
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