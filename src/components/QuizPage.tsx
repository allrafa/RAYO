import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, Circle, ArrowRight, Award, BookOpen, Star, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { enhancedToast } from "./EnhancedToast";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  category: 'communication' | 'conflict' | 'emotional' | 'behavioral';
}

interface QuizResult {
  title: string;
  description: string;
  strengths: string[];
  improvements: string[];
  recommendedCourse: {
    title: string;
    description: string;
    duration: string;
    price: string;
    image: string;
    benefits: string[];
  };
}

interface QuizPageProps {
  quizType: 'communication' | 'conflict';
  onBack: () => void;
  onComplete: () => void;
}

const quizData = {
  communication: {
    title: "Quiz de Comunicação no Relacionamento",
    subtitle: "Descubra seu estilo de comunicação e como melhorá-lo",
    questions: [
      {
        id: 1,
        question: "Quando há um mal-entendido com seu parceiro(a), você costuma:",
        options: [
          "Confrontar imediatamente para esclarecer",
          "Esperar um momento para se acalmar antes de conversar",
          "Evitar o assunto até que ele mesmo se resolva",
          "Procurar entender primeiro o ponto de vista da outra pessoa"
        ],
        category: 'communication' as const
      },
      {
        id: 2,
        question: "Como você expressa seus sentimentos quando está chateado(a)?",
        options: [
          "Falo diretamente o que estou sentindo",
          "Uso gestos e expressões para demonstrar",
          "Prefiro escrever ou enviar uma mensagem",
          "Tenho dificuldade para expressar o que sinto"
        ],
        category: 'emotional' as const
      },
      {
        id: 3,
        question: "Durante uma discussão, você tende a:",
        options: [
          "Focar em resolver o problema específico",
          "Trazer à tona questões anteriores relacionadas",
          "Tentar entender os sentimentos por trás das palavras",
          "Buscar um compromisso rapidamente"
        ],
        category: 'conflict' as const
      },
      {
        id: 4,
        question: "Quando seu parceiro(a) está falando sobre algo importante:",
        options: [
          "Escuto atentamente e faço perguntas",
          "Já penso em como vou responder",
          "Observo as expressões e linguagem corporal",
          "Às vezes me distraio com outras coisas"
        ],
        category: 'behavioral' as const
      },
      {
        id: 5,
        question: "Para você, uma comunicação eficaz em relacionamentos é:",
        options: [
          "Ser sempre honesto, mesmo que doa",
          "Equilibrar honestidade com sensibilidade",
          "Focar mais em ouvir do que em falar",
          "Evitar conflitos desnecessários"
        ],
        category: 'communication' as const
      }
    ]
  },
  conflict: {
    title: "Quiz de Gestão de Conflitos",
    subtitle: "Identifique como você lida com situações difíceis",
    questions: [
      {
        id: 1,
        question: "Quando surge um conflito no relacionamento, sua primeira reação é:",
        options: [
          "Enfrentar o problema de frente",
          "Tentar acalmar a situação primeiro",
          "Analisar as causas do conflito",
          "Evitar a confrontação inicial"
        ],
        category: 'conflict' as const
      },
      {
        id: 2,
        question: "Durante um conflito, você se sente:",
        options: [
          "Energizado(a) para resolver a situação",
          "Estressado(a) mas determinado(a)",
          "Ansioso(a) e desconfortável",
          "Sobrecarregado(a) emocionalmente"
        ],
        category: 'emotional' as const
      },
      {
        id: 3,
        question: "Como você prefere resolver conflitos?",
        options: [
          "Através de conversas diretas e francas",
          "Buscando compromissos mútuos",
          "Permitindo um tempo de reflexão primeiro",
          "Com a ajuda de uma terceira pessoa neutra"
        ],
        category: 'behavioral' as const
      },
      {
        id: 4,
        question: "Após um conflito resolvido, você:",
        options: [
          "Segue em frente rapidamente",
          "Reflete sobre o que aprendeu",
          "Fica preocupado(a) se pode acontecer novamente",
          "Procura maneiras de evitar conflitos futuros"
        ],
        category: 'behavioral' as const
      },
      {
        id: 5,
        question: "Para você, conflitos em relacionamentos são:",
        options: [
          "Oportunidades de crescimento conjunto",
          "Situações normais que precisam ser gerenciadas",
          "Momentos desafiadores mas necessários",
          "Algo que prefere evitar sempre que possível"
        ],
        category: 'conflict' as const
      }
    ]
  }
};

const quizResults = {
  communication: {
    'assertive': {
      title: "Comunicador Assertivo",
      description: "Você tem um estilo direto e claro de comunicação, mas pode precisar desenvolver mais sensibilidade emocional.",
      strengths: [
        "Expressa suas necessidades claramente",
        "Não tem medo de abordar temas difíceis",
        "É objetivo e direto nas conversas"
      ],
      improvements: [
        "Desenvolver mais empatia nas conversas",
        "Aprender a ler sinais não-verbais",
        "Praticar escuta ativa"
      ],
      recommendedCourse: {
        title: "Comunicação Empática para Relacionamentos",
        description: "Aprenda a equilibrar assertividade com sensibilidade emocional",
        duration: "6 semanas",
        price: "R$ 197,00",
        image: "https://images.unsplash.com/photo-1571771894806-9668f47e6666?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBjb21tdW5pY2F0aW9uJTIwdGhlcmFweXxlbnwxfHx8fDE3NTk3NzM3NzR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        benefits: [
          "Técnicas de escuta empática",
          "Como expressar sentimentos sem ferir",
          "Exercícios práticos para o dia a dia",
          "Certificado de conclusão"
        ]
      }
    },
    'empathetic': {
      title: "Comunicador Empático",
      description: "Você é excelente em entender os outros, mas pode precisar ser mais assertivo com suas próprias necessidades.",
      strengths: [
        "Tem alta capacidade de empatia",
        "É um excelente ouvinte",
        "Considera os sentimentos do parceiro"
      ],
      improvements: [
        "Aprender a expressar suas necessidades",
        "Desenvolver mais assertividade",
        "Estabelecer limites saudáveis"
      ],
      recommendedCourse: {
        title: "Assertividade com Amor: Encontrando seu Equilíbrio",
        description: "Mantenha sua empatia natural enquanto desenvolve assertividade",
        duration: "4 semanas", 
        price: "R$ 147,00",
        image: "https://images.unsplash.com/photo-1645815287365-1a090d94c373?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhc3NlcnRpdmUlMjBjb21tdW5pY2F0aW9uJTIwbG92ZXxlbnwxfHx8fDE3NTk3NzM3ODB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        benefits: [
          "Técnicas de assertividade gentil",
          "Como estabelecer limites com amor",
          "Exercícios de autoconfiança",
          "Suporte em grupo"
        ]
      }
    }
  },
  conflict: {
    'proactive': {
      title: "Gestor Proativo de Conflitos",
      description: "Você enfrenta conflitos de frente, mas pode se beneficiar de estratégias mais colaborativas.",
      strengths: [
        "Não evita problemas difíceis",
        "Age rapidamente para resolver questões",
        "Tem coragem para abordar temas sensíveis"
      ],
      improvements: [
        "Desenvolver estratégias colaborativas",
        "Aprender técnicas de de-escalação",
        "Praticar paciência em conflitos"
      ],
      recommendedCourse: {
        title: "Conflitos Construtivos: Transformando Brigas em Crescimento",
        description: "Aprenda a usar conflitos como oportunidades de fortalecimento",
        duration: "5 semanas",
        price: "R$ 247,00",
        image: "https://images.unsplash.com/photo-1758524944783-0ec215baf777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25mbGljdCUyMHJlc29sdXRpb24lMjByZWxhdGlvbnNoaXB8ZW58MXx8fHwxNzU5NzczNzc3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        benefits: [
          "Técnicas de mediação para casais",
          "Como transformar críticas em pedidos",
          "Estratégias de win-win",
          "Plano de ação personalizado"
        ]
      }
    },
    'collaborative': {
      title: "Mediador Natural",
      description: "Você busca harmonia e compromissos, mas pode precisar ser mais direto quando necessário.",
      strengths: [
        "Busca soluções que beneficiem ambos",
        "Mantém a calma em situações tensas",
        "Valoriza a harmonia no relacionamento"
      ],
      improvements: [
        "Desenvolver coragem para conflitos necessários",
        "Aprender quando ser mais direto",
        "Fortalecer a autoadvocacia"
      ],
      recommendedCourse: {
        title: "Equilíbrio Perfeito: Harmonia e Assertividade",
        description: "Mantenha a paz enquanto defende suas necessidades importantes",
        duration: "4 semanas",
        price: "R$ 197,00", 
        image: "https://images.unsplash.com/photo-1758599880303-ab61dfc33586?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWFjZWZ1bCUyMGNvdXBsZSUyMGhhcm1vbnl8ZW58MXx8fHwxNzU5NzczNzg0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
        benefits: [
          "Quando escolher suas batalhas",
          "Técnicas de negociação amorosa",
          "Como expressar necessidades importantes",
          "Exercícios de autoconfiança"
        ]
      }
    }
  }
};

export function QuizPage({ quizType, onBack, onComplete }: QuizPageProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const quiz = quizData[quizType];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResult();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateResult = () => {
    // Lógica simples para determinar resultado baseado nas respostas
    const results = quizResults[quizType];
    const resultKeys = Object.keys(results);
    
    // Para simplicidade, vamos alternar entre os resultados baseado na maioria das respostas
    const averageAnswer = answers.reduce((sum, answer) => sum + answer, 0) / answers.length;
    const resultKey = averageAnswer < 2 ? resultKeys[0] : resultKeys[1];
    
    setResult(results[resultKey as keyof typeof results]);
    setShowResult(true);
  };

  const handleCourseClick = () => {
    enhancedToast.success({
      title: "🎓 Redirecionando para página de vendas",
      description: "Prepare-se para transformar seu relacionamento!",
      haptic: true
    });
    
    // Aqui seria o redirecionamento para a página de vendas
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  if (showResult && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rayo-forest-50 to-rayo-lime-50 py-4">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="font-display text-xl font-semibold">Resultado do Quiz</h1>
          </div>

          {/* Result Card */}
          <Card className="mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-rayo-forest-600 to-rayo-lime-600 p-6 text-white">
              <div className="flex items-center mb-4">
                <Award className="w-8 h-8 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold">{result.title}</h2>
                  <p className="opacity-90">{result.description}</p>
                </div>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-rayo-forest-700">✅ Seus Pontos Fortes</h3>
                  <ul className="space-y-2">
                    {result.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-rayo-forest-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-rayo-coral-600">🎯 Áreas de Melhoria</h3>
                  <ul className="space-y-2">
                    {result.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start">
                        <Star className="w-5 h-5 text-rayo-coral-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Course */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg mb-4 text-rayo-gold-700">📚 Curso Recomendado Para Você</h3>
                
                <div className="bg-gradient-to-r from-rayo-gold-50 to-rayo-coral-50 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3">
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <ImageWithFallback
                          src={result.recommendedCourse.image}
                          alt={result.recommendedCourse.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="md:w-2/3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-xl text-rayo-forest-800">{result.recommendedCourse.title}</h4>
                        <Badge variant="secondary" className="bg-rayo-gold-500 text-white border-0">
                          <Star className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      </div>
                      
                      <p className="text-rayo-forest-700 mb-4">{result.recommendedCourse.description}</p>
                      
                      <div className="flex items-center gap-4 mb-4 text-sm text-rayo-forest-600">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {result.recommendedCourse.duration}
                        </div>
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1" />
                          Acesso vitalício
                        </div>
                      </div>
                      
                      <ul className="space-y-1 mb-6">
                        {result.recommendedCourse.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-center text-sm text-rayo-forest-700">
                            <CheckCircle className="w-4 h-4 text-rayo-forest-600 mr-2 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-rayo-coral-600">{result.recommendedCourse.price}</span>
                        </div>
                        
                        <Button
                          onClick={handleCourseClick}
                          className="bg-gradient-to-r from-rayo-coral-500 to-rayo-coral-600 hover:from-rayo-coral-600 hover:to-rayo-coral-700 text-white px-6"
                        >
                          Garantir Minha Vaga
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rayo-forest-50 to-rayo-lime-50 py-4">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center">
            <h1 className="font-display text-xl font-semibold">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground">{quiz.subtitle}</p>
          </div>
          <div className="w-16"></div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Pergunta {currentQuestion + 1} de {quiz.questions.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-6 leading-relaxed">
              {quiz.questions[currentQuestion].question}
            </h2>
            
            <div className="space-y-3">
              {quiz.questions[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                    answers[currentQuestion] === index
                      ? 'border-rayo-forest-500 bg-rayo-forest-50 text-rayo-forest-800'
                      : 'border-gray-200 hover:border-rayo-forest-300 hover:bg-rayo-forest-25'
                  }`}
                >
                  <div className="flex items-center">
                    {answers[currentQuestion] === index ? (
                      <CheckCircle className="w-5 h-5 text-rayo-forest-600 mr-3 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                    )}
                    <span className="text-sm leading-relaxed">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={answers[currentQuestion] === undefined}
            className="bg-rayo-forest-600 hover:bg-rayo-forest-700"
          >
            {currentQuestion === quiz.questions.length - 1 ? 'Ver Resultado' : 'Próxima'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}