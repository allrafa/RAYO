import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Play, FileText, Target, ArrowRight, Mic, Volume2, VolumeX, Zap, Info, Lightbulb, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "./ui/sheet";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useApp } from "./AppContext";
import { enhancedToast } from "./EnhancedToast";
import { useScrollDirection } from "./hooks/useScrollDirection";
import agentImage from "figma:asset/a01247a496389b498a2c51cfa2a84854eb65d373.png";

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  actions?: ActionButton[];
}

interface ActionButton {
  type: 'video' | 'test' | 'course' | 'article' | 'exercise';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export function ConselheiroPage() {
  const { setCurrentTab, setActiveVideo } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationTopic, setConversationTopic] = useState("⚡ Como posso ajudar você?");
  const [showQuickChips, setShowQuickChips] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showSuggestionsMenu, setShowSuggestionsMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll direction para auto-hide
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 50 });

  // Mensagem de boas-vindas
  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      type: 'agent',
      content: '👋 Olá! Como posso ajudá-lo hoje?',
      timestamp: new Date(),
      actions: [
        {
          type: 'video',
          label: 'Ver conteúdo sugerido',
          icon: Play,
          action: () => handleWatchVideo('1')
        },
        {
          type: 'test',
          label: 'Fazer avaliação',
          icon: Target,
          action: () => handleTakeTest()
        }
      ]
    };
    setMessages([welcomeMessage]);
  }, []);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detectar tópico da conversa e atualizar título
  const detectTopic = (message: string) => {
    const lower = message.toLowerCase();
    
    if (lower.includes('casamento') || lower.includes('relacionamento') || lower.includes('parceiro') || lower.includes('esposa') || lower.includes('marido') || lower.includes('casal')) {
      setConversationTopic("💑 Melhorando seu Relacionamento");
    } else if (lower.includes('filho') || lower.includes('criança') || lower.includes('educação') || lower.includes('pais') || lower.includes('birra') || lower.includes('adolescente')) {
      setConversationTopic("👨‍👩‍👧 Educação dos Filhos");
    } else if (lower.includes('dinheiro') || lower.includes('finanças') || lower.includes('financeiro') || lower.includes('orçamento') || lower.includes('divida') || lower.includes('economizar')) {
      setConversationTopic("💰 Organizando suas Finanças");
    } else if (lower.includes('comunicação') || lower.includes('conversa') || lower.includes('falar') || lower.includes('dialogo') || lower.includes('escuta')) {
      setConversationTopic("💬 Melhorando a Comunicação");
    } else if (lower.includes('propósito') || lower.includes('objetivo') || lower.includes('meta') || lower.includes('sonho') || lower.includes('carreira')) {
      setConversationTopic("🎯 Encontrando seu Propósito");
    } else if (lower.includes('intimidade') || lower.includes('romance') || lower.includes('paixão') || lower.includes('sexo') || lower.includes('afeto')) {
      setConversationTopic("❤️ Fortalecendo a Intimidade");
    } else if (lower.includes('briga') || lower.includes('conflito') || lower.includes('discussão') || lower.includes('problema')) {
      setConversationTopic("🤝 Resolvendo Conflitos");
    } else if (lower.includes('ansiedade') || lower.includes('estresse') || lower.includes('cansado') || lower.includes('esgotado')) {
      setConversationTopic("🧘 Cuidando da Saúde Mental");
    } else if (lower.includes('tempo') || lower.includes('rotina') || lower.includes('organização') || lower.includes('produtividade')) {
      setConversationTopic("⏰ Organizando sua Rotina");
    } else if (lower.includes('sogra') || lower.includes('sogro') || lower.includes('família') && lower.includes('problema')) {
      setConversationTopic("👪 Relacionamento Familiar");
    }
  };

  // Respostas simuladas do agente com ações contextuais
  const getAgentResponse = (userMessage: string): Message => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Detectar tópico para atualizar título
    detectTopic(userMessage);
    
    // Relacionamento
    if (lowerMessage.includes('casamento') || lowerMessage.includes('relacionamento') || lowerMessage.includes('parceiro')) {
      return {
        id: Date.now().toString(),
        type: 'agent',
        content: '❤️ Entendo que você quer fortalecer seu relacionamento. Relacionamentos saudáveis são construídos com comunicação, confiança e pequenos gestos diários. Preparei alguns recursos específicos para você:',
        timestamp: new Date(),
        actions: [
          {
            type: 'video',
            label: '▶️ 5 Pilares de um Casamento Feliz',
            icon: Play,
            action: () => handleWatchVideo('1')
          },
          {
            type: 'test',
            label: '📊 Teste: Avalie seu Relacionamento',
            icon: Target,
            action: () => handleTakeTest()
          },
          {
            type: 'course',
            label: '📚 Curso: Comunicação no Casal',
            icon: FileText,
            action: () => handleViewCourse(1)
          }
        ]
      };
    }
    
    // Filhos/Parentalidade
    if (lowerMessage.includes('filho') || lowerMessage.includes('criança') || lowerMessage.includes('educação')) {
      return {
        id: Date.now().toString(),
        type: 'agent',
        content: '👶 A educação dos filhos é uma jornada desafiadora mas recompensadora. Vou te ajudar com estratégias práticas e comprovadas:',
        timestamp: new Date(),
        actions: [
          {
            type: 'video',
            label: '▶️ Disciplina Positiva na Prática',
            icon: Play,
            action: () => handleWatchVideo('3')
          },
          {
            type: 'test',
            label: '📊 Descubra seu Estilo Parental',
            icon: Target,
            action: () => handleTakeTest()
          },
          {
            type: 'article',
            label: '📖 Guia: Como Lidar com Birras',
            icon: FileText,
            action: () => enhancedToast.info({ title: 'Abrindo artigo...' })
          }
        ]
      };
    }
    
    // Finanças
    if (lowerMessage.includes('dinheiro') || lowerMessage.includes('finanças') || lowerMessage.includes('financeiro')) {
      return {
        id: Date.now().toString(),
        type: 'agent',
        content: '💰 Finanças saudáveis trazem paz para a família. Vou te mostrar como organizar e prosperar:',
        timestamp: new Date(),
        actions: [
          {
            type: 'video',
            label: '▶️ Finanças do Casal sem Brigas',
            icon: Play,
            action: () => handleWatchVideo('4')
          },
          {
            type: 'test',
            label: '📊 Perfil Financeiro do Casal',
            icon: Target,
            action: () => handleTakeTest()
          },
          {
            type: 'course',
            label: '📚 Curso: Planejamento Financeiro',
            icon: FileText,
            action: () => handleViewCourse(4)
          }
        ]
      };
    }
    
    // Comunicação
    if (lowerMessage.includes('comunicação') || lowerMessage.includes('conversa') || lowerMessage.includes('falar')) {
      return {
        id: Date.now().toString(),
        type: 'agent',
        content: '💬 A comunicação é a base de todos os relacionamentos. Vou te ensinar técnicas poderosas:',
        timestamp: new Date(),
        actions: [
          {
            type: 'video',
            label: '▶️ Comunicação Não-Violenta',
            icon: Play,
            action: () => handleWatchVideo('2')
          },
          {
            type: 'exercise',
            label: '✍️ Exercício: Escuta Ativa',
            icon: Target,
            action: () => enhancedToast.info({ title: 'Iniciando exercício...' })
          },
          {
            type: 'course',
            label: '📚 Masterclass: Conversas Difíceis',
            icon: FileText,
            action: () => handleViewCourse(2)
          }
        ]
      };
    }
    
    // Resposta genérica com opções
    return {
      id: Date.now().toString(),
      type: 'agent',
      content: '✨ Entendi sua questão. Posso ajudá-lo de várias formas. Aqui estão alguns recursos que podem ser úteis:',
      timestamp: new Date(),
      actions: [
        {
          type: 'video',
          label: '▶️ Transforme sua Família em 30 Dias',
          icon: Play,
          action: () => handleWatchVideo('1')
        },
        {
          type: 'test',
          label: '📊 Avaliação Completa de Relacionamento',
          icon: Target,
          action: () => handleTakeTest()
        },
        {
          type: 'course',
          label: '📚 Ver todos os cursos',
          icon: ArrowRight,
          action: () => setCurrentTab('academia')
        }
      ]
    };
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Marcar como interagido (esconde chips)
    if (!hasInteracted) {
      setHasInteracted(true);
      setShowQuickChips(false);
    }

    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simular delay do agente
    setTimeout(() => {
      const agentResponse = getAgentResponse(inputValue);
      setMessages(prev => [...prev, agentResponse]);
      setIsTyping(false);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }, 1500);
  };

  const handleWatchVideo = (videoId: string) => {
    enhancedToast.success({
      title: "🎬 Abrindo vídeo",
      description: "Preparando conteúdo para você...",
      haptic: true
    });
    
    setTimeout(() => {
      setActiveVideo(videoId);
      setCurrentTab('home');
    }, 500);
  };

  const handleTakeTest = () => {
    enhancedToast.success({
      title: "📊 Iniciando avaliação",
      description: "Carregando seu teste personalizado...",
      haptic: true
    });
  };

  const handleViewCourse = (courseId: number) => {
    enhancedToast.success({
      title: "📚 Abrindo curso",
      description: "Preparando material...",
      haptic: true
    });
    
    setTimeout(() => {
      setCurrentTab('academia');
    }, 500);
  };

  const handleVoiceInput = () => {
    setIsSpeaking(!isSpeaking);
    enhancedToast.info({
      title: isSpeaking ? "🎤 Desligando microfone" : "🎤 Ouvindo...",
      description: isSpeaking ? "Microfone desligado" : "Pode falar!",
      haptic: true
    });
  };

  return (
    <div 
      className="flex flex-col h-screen"
      style={{ background: 'var(--raio-bg-primary)' }}
    >
      {/* Header Fixo com Auto-hide */}
      <div 
        className={`sticky top-0 z-10 px-4 py-3 border-b transition-transform duration-300 ease-in-out ${
          scrollDirection === 'down' && !isAtTop ? '-translate-y-full' : 'translate-y-0'
        }`}
        style={{ 
          background: 'var(--raio-bg-primary)',
          borderColor: 'var(--raio-border-default)'
        }}
      >
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <Sparkles 
            className="w-5 h-5 flex-shrink-0" 
            style={{ color: 'var(--raio-accent-primary)' }}
          />
          <h1 
            className="text-lg truncate transition-all duration-300" 
            style={{ 
              fontWeight: 600,
              color: 'var(--raio-text-primary)' 
            }}
          >
            {conversationTopic}
          </h1>
        </div>
      </div>

      {/* Área de Mensagens (Scroll) */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
            >
              {/* Avatar do Agente */}
              {message.type === 'agent' && (
                <div className="flex-shrink-0">
                  <div 
                    className="w-12 h-12 rounded-full overflow-hidden shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)',
                    }}
                  >
                    <ImageWithFallback
                      src={agentImage}
                      alt="Conselheiro IA"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Mensagem */}
              <div className={`flex flex-col ${message.type === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                {/* Bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm ${
                    message.type === 'user' 
                      ? 'rounded-tr-none' 
                      : 'rounded-tl-none'
                  }`}
                  style={{
                    background: message.type === 'user' 
                      ? 'var(--raio-accent-primary)'
                      : 'var(--raio-bg-secondary)',
                    color: message.type === 'user'
                      ? '#FFFFFF'
                      : 'var(--raio-text-primary)',
                    borderWidth: message.type === 'agent' ? '1px' : '0',
                    borderColor: 'var(--raio-border-default)'
                  }}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>

                {/* Timestamp */}
                <span 
                  className="text-xs mt-1 px-2" 
                  style={{ color: 'var(--raio-text-tertiary)' }}
                >
                  {message.timestamp.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>

                {/* Action Buttons */}
                {message.actions && message.actions.length > 0 && (
                  <div className="flex flex-col gap-2 mt-3 w-full">
                    {message.actions.map((action, idx) => {
                      const Icon = action.icon;
                      const colors = {
                        video: { bg: 'var(--raio-accent-light)', text: 'var(--raio-accent-primary)', border: 'var(--raio-accent-primary)' },
                        test: { bg: 'var(--raio-bg-tertiary)', text: 'var(--raio-text-primary)', border: 'var(--raio-border-hover)' },
                        course: { bg: 'var(--raio-bg-tertiary)', text: 'var(--raio-text-primary)', border: 'var(--raio-border-hover)' },
                        article: { bg: 'var(--raio-bg-tertiary)', text: 'var(--raio-text-primary)', border: 'var(--raio-border-hover)' },
                        exercise: { bg: 'var(--raio-bg-tertiary)', text: 'var(--raio-text-primary)', border: 'var(--raio-border-hover)' }
                      };

                      const colorScheme = colors[action.type];

                      return (
                        <Button
                          key={idx}
                          variant="outline"
                          className="w-full justify-start gap-2 transition-all hover:shadow-md"
                          style={{
                            background: colorScheme.bg,
                            color: colorScheme.text,
                            borderColor: colorScheme.border,
                            borderWidth: '1.5px'
                          }}
                          onClick={action.action}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.borderColor = 'var(--raio-accent-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.borderColor = colorScheme.border;
                          }}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="flex-1 text-left">{action.label}</span>
                          <ArrowRight className="w-4 h-4 opacity-50" />
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Avatar do Usuário */}
              {message.type === 'user' && (
                <div className="flex-shrink-0">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
                      fontWeight: 600
                    }}
                  >
                    Você
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start gap-3">
              <div className="flex-shrink-0">
                <div 
                  className="w-12 h-12 rounded-full overflow-hidden shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)',
                  }}
                >
                  <ImageWithFallback
                    src={agentImage}
                    alt="Conselheiro IA"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              <div
                className="rounded-2xl rounded-tl-none px-4 py-3 shadow-sm"
                style={{
                  background: 'var(--raio-bg-secondary)',
                  borderWidth: '1px',
                  borderColor: 'var(--raio-border-default)'
                }}
              >
                <div className="flex gap-1">
                  <div 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ 
                      background: 'var(--raio-accent-primary)',
                      animationDelay: '0ms'
                    }}
                  ></div>
                  <div 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ 
                      background: 'var(--raio-accent-primary)',
                      animationDelay: '150ms'
                    }}
                  ></div>
                  <div 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ 
                      background: 'var(--raio-accent-primary)',
                      animationDelay: '300ms'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Fixo (Bottom) - Compacto */}
      <div 
        className="sticky bottom-0 px-3 py-2 border-t backdrop-blur-sm"
        style={{ 
          background: 'var(--raio-bg-primary)',
          borderColor: 'var(--raio-border-default)'
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Sugestões Rápidas - Só aparecem antes da primeira interação */}
          {showQuickChips && !hasInteracted && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
              {['💑 Melhorar casamento', '👨‍👩‍👧 Educar filhos', '💰 Organizar finanças'].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-8"
                  style={{
                    background: 'var(--raio-bg-secondary)',
                    borderColor: 'var(--raio-border-default)',
                    color: 'var(--raio-text-secondary)',
                    fontSize: '13px'
                  }}
                  onClick={() => {
                    setInputValue(suggestion.split(' ').slice(1).join(' '));
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--raio-accent-primary)';
                    e.currentTarget.style.color = 'var(--raio-accent-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--raio-border-default)';
                    e.currentTarget.style.color = 'var(--raio-text-secondary)';
                  }}
                >
                  {suggestion}
                </Button>
              ))}
              <Sheet open={showSuggestionsMenu} onOpenChange={setShowSuggestionsMenu}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 h-8"
                    style={{
                      background: 'var(--raio-accent-light)',
                      borderColor: 'var(--raio-accent-primary)',
                      color: 'var(--raio-accent-primary)',
                      fontSize: '13px'
                    }}
                  >
                    + Ver mais
                  </Button>
                </SheetTrigger>
              </Sheet>
            </div>
          )}

          {/* Input Area - Compacto */}
          <div className="flex gap-2 items-center">
            {/* Botão Sugestões (após interação) */}
            {hasInteracted && (
              <Sheet open={showSuggestionsMenu} onOpenChange={setShowSuggestionsMenu}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0 h-9 w-9"
                    style={{
                      background: 'var(--raio-bg-secondary)',
                      borderColor: 'var(--raio-border-default)',
                      color: 'var(--raio-text-secondary)'
                    }}
                  >
                    <Lightbulb className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
              </Sheet>
            )}

            {/* Botão Microfone */}
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0 h-9 w-9"
              style={{
                background: isSpeaking ? 'var(--raio-accent-light)' : 'var(--raio-bg-secondary)',
                borderColor: isSpeaking ? 'var(--raio-accent-primary)' : 'var(--raio-border-default)',
                color: isSpeaking ? 'var(--raio-accent-primary)' : 'var(--raio-text-secondary)'
              }}
              onClick={handleVoiceInput}
            >
              <Mic className="w-4 h-4" />
            </Button>

            {/* Input Compacto */}
            <Input
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 h-9"
              style={{
                background: 'var(--raio-bg-secondary)',
                borderColor: 'var(--raio-border-default)',
                color: 'var(--raio-text-primary)',
                fontSize: '14px',
                padding: '8px 12px'
              }}
            />

            {/* Botão Enviar */}
            <Button
              size="icon"
              className="flex-shrink-0 h-9 w-9"
              disabled={!inputValue.trim()}
              style={{
                background: inputValue.trim() ? 'var(--raio-accent-primary)' : 'var(--raio-bg-tertiary)',
                color: inputValue.trim() ? '#FFFFFF' : 'var(--raio-text-tertiary)',
                opacity: inputValue.trim() ? 1 : 0.5
              }}
              onClick={handleSendMessage}
              onMouseEnter={(e) => {
                if (inputValue.trim()) {
                  e.currentTarget.style.background = 'var(--raio-accent-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (inputValue.trim()) {
                  e.currentTarget.style.background = 'var(--raio-accent-primary)';
                }
              }}
            >
              <Send className="w-4 h-4" />
            </Button>

            {/* Disclaimer como Tooltip */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-9 w-9"
                style={{
                  color: 'var(--raio-text-tertiary)'
                }}
                onMouseEnter={() => setShowDisclaimer(true)}
                onMouseLeave={() => setShowDisclaimer(false)}
                onClick={() => setShowDisclaimer(!showDisclaimer)}
              >
                <Info className="w-4 h-4" />
              </Button>
              
              {showDisclaimer && (
                <div 
                  className="absolute bottom-full right-0 mb-2 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap text-xs z-50"
                  style={{
                    background: 'var(--raio-bg-elevated)',
                    color: 'var(--raio-text-secondary)',
                    borderWidth: '1px',
                    borderColor: 'var(--raio-border-default)',
                    maxWidth: '250px',
                    whiteSpace: 'normal'
                  }}
                >
                  💡 Não substitui terapia profissional
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sheet com Menu de Sugestões */}
      <Sheet open={showSuggestionsMenu} onOpenChange={setShowSuggestionsMenu}>
        <SheetContent 
          side="bottom" 
          className="h-[70vh]"
          style={{
            background: 'var(--raio-bg-primary)',
            borderColor: 'var(--raio-border-default)'
          }}
        >
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--raio-text-primary)' }}>
              💡 Tópicos de Conversa
            </SheetTitle>
            <SheetDescription style={{ color: 'var(--raio-text-secondary)' }}>
              Escolha um tópico para começar uma conversa com o Conselheiro
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-2">
            {[
              { emoji: '💑', label: 'Melhorar casamento', text: 'Melhorar casamento' },
              { emoji: '👨‍👩‍👧', label: 'Educar filhos', text: 'Educar filhos' },
              { emoji: '💰', label: 'Organizar finanças', text: 'Organizar finanças' },
              { emoji: '💬', label: 'Melhorar comunicação', text: 'Comunicação' },
              { emoji: '🎯', label: 'Encontrar propósito', text: 'Propósito' },
              { emoji: '❤️', label: 'Fortalecer intimidade', text: 'Intimidade' },
              { emoji: '🤝', label: 'Resolver conflitos', text: 'Resolver conflitos' },
              { emoji: '🧘', label: 'Cuidar da saúde mental', text: 'Ansiedade' },
              { emoji: '⏰', label: 'Organizar rotina', text: 'Organizar rotina' },
              { emoji: '👪', label: 'Relacionamento familiar', text: 'Família' }
            ].map((topic) => (
              <Button
                key={topic.text}
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                style={{
                  background: 'var(--raio-bg-secondary)',
                  borderColor: 'var(--raio-border-default)',
                  color: 'var(--raio-text-primary)'
                }}
                onClick={() => {
                  setInputValue(topic.text);
                  setShowSuggestionsMenu(false);
                  setTimeout(() => handleSendMessage(), 100);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--raio-accent-primary)';
                  e.currentTarget.style.background = 'var(--raio-accent-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--raio-border-default)';
                  e.currentTarget.style.background = 'var(--raio-bg-secondary)';
                }}
              >
                <span className="text-xl">{topic.emoji}</span>
                <span className="flex-1 text-left">{topic.label}</span>
                <ArrowRight className="w-4 h-4 opacity-50" />
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
