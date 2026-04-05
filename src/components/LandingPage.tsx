import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  BookOpen, 
  MessageCircle, 
  Users, 
  Trophy,
  Check,
  ChevronDown,
  Sparkles,
  Heart,
  TrendingUp,
  Shield,
  Star,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { analytics } from '../lib/analytics/mixpanel';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface LandingPageProps {
  onStartFree?: () => void;
  onStartPremium?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  onOpenPrivacyPolicy?: () => void;
}

export function LandingPage({ 
  onStartFree, 
  onStartPremium,
  onOpenPrivacyPolicy, 
  onClose,
  showCloseButton = false 
}: LandingPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('premium');

  // Analytics tracking
  const trackCTAClick = (location: string, planType: string) => {
    analytics.track('LANDING_CTA_CLICKED', {
      location,
      plan_type: planType,
      timestamp: new Date().toISOString()
    });
  };

  const trackSectionView = (sectionName: string) => {
    analytics.track('LANDING_SECTION_VIEWED', {
      section: sectionName,
      timestamp: new Date().toISOString()
    });
  };

  const handleStartFree = () => {
    trackCTAClick('hero', 'free');
    onStartFree?.();
  };

  const handleStartPremium = () => {
    trackCTAClick('hero', 'premium');
    onStartPremium?.();
  };

  return (
    <div className="min-h-screen bg-[var(--raio-bg-primary)]">
      {/* Close Button - se necessário */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 p-2 rounded-full bg-[var(--raio-bg-secondary)] border border-[var(--raio-border-default)] shadow-lg hover:bg-[var(--raio-bg-tertiary)] transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-[var(--raio-text-secondary)]" />
        </button>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          {/* Badge de destaque */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <Badge 
              variant="outline" 
              className="bg-[var(--raio-accent-subtle)] border-[var(--raio-accent-primary)] text-[var(--raio-accent-primary)] px-4 py-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Junte-se a 10.000+ famílias
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-6"
          >
            <h1 className="text-[var(--raio-text-primary)] mb-4 max-w-3xl mx-auto">
              Fortaleça sua família com conteúdo transformador
            </h1>
            <p className="text-[var(--raio-text-secondary)] max-w-2xl mx-auto">
              Aprenda, conecte-se e cresça com uma plataforma feita para sua jornada familiar. 
              Cursos especializados, comunidade engajada e suporte contínuo.
            </p>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative rounded-2xl overflow-hidden shadow-[var(--raio-shadow-xl)] mb-8 max-w-4xl mx-auto"
          >
            <div className="aspect-[16/10] lg:aspect-[16/9]">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1624448445915-97154f5e688c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGZhbWlseSUyMHRvZ2V0aGVyfGVufDF8fHx8MTc2MTMwNDExNXww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Família feliz utilizando a plataforma RAIO"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Gradient overlay para melhor legibilidade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--raio-bg-primary)] via-transparent to-transparent opacity-60" />
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              size="lg"
              onClick={handleStartPremium}
              className="w-full sm:w-auto bg-[var(--raio-accent-primary)] hover:bg-[var(--raio-accent-hover)] text-[var(--raio-text-inverse)] shadow-[var(--raio-shadow-md)] min-w-[200px]"
            >
              <Zap className="w-5 h-5 mr-2" />
              Começar Premium
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleStartFree}
              className="w-full sm:w-auto min-w-[200px]"
            >
              Experimentar Grátis
            </Button>
          </motion.div>

          {/* Trust indicator */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-[var(--raio-text-tertiary)] mt-4 text-sm"
          >
            7 dias grátis • Cancele quando quiser • Sem compromisso
          </motion.p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center mt-8"
        >
          <ChevronDown className="w-6 h-6 text-[var(--raio-text-tertiary)] animate-bounce" />
        </motion.div>
      </section>

      {/* Social Proof */}
      <section className="py-8 px-4 bg-[var(--raio-bg-secondary)] border-y border-[var(--raio-border-default)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { value: '10k+', label: 'Famílias Ativas' },
              { value: '100+', label: 'Cursos e Livros' },
              { value: '4.9★', label: 'Avaliação Média' },
              { value: '95%', label: 'Satisfação' }
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="text-[var(--raio-accent-primary)] mb-1">{stat.value}</div>
                <div className="text-[var(--raio-text-tertiary)] text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Problema → Solução */}
      <section className="py-16 px-4 lg:py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-[var(--raio-text-primary)] mb-4">
              Você se identifica?
            </h2>
            <p className="text-[var(--raio-text-secondary)] max-w-2xl mx-auto">
              Sabemos que a jornada familiar tem seus desafios. O RAIO está aqui para apoiar você.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Heart,
                title: 'Quer fortalecer relacionamentos',
                description: 'Mas não sabe por onde começar ou falta tempo para buscar recursos de qualidade'
              },
              {
                icon: TrendingUp,
                title: 'Busca crescimento pessoal',
                description: 'Mas está sobrecarregado e precisa de direção clara e suporte contínuo'
              },
              {
                icon: Users,
                title: 'Precisa de comunidade',
                description: 'Mas se sente sozinho na jornada e quer conectar com pessoas que entendem você'
              }
            ].map((problem, idx) => (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full hover:shadow-[var(--raio-shadow-lg)] transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-[var(--raio-accent-light)] flex items-center justify-center mb-4">
                      <problem.icon className="w-6 h-6 text-[var(--raio-accent-primary)]" />
                    </div>
                    <h3 className="text-[var(--raio-text-primary)] mb-2">
                      {problem.title}
                    </h3>
                    <p className="text-[var(--raio-text-secondary)] text-sm">
                      {problem.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Solução */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center bg-[var(--raio-accent-subtle)] border border-[var(--raio-accent-primary)] rounded-2xl p-8 lg:p-12"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--raio-accent-primary)] flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-[var(--raio-text-inverse)]" />
            </div>
            <h2 className="text-[var(--raio-text-primary)] mb-4">
              RAIO é a solução completa
            </h2>
            <p className="text-[var(--raio-text-secondary)] max-w-2xl mx-auto">
              Uma plataforma que reúne tudo que você precisa: conteúdo transformador, 
              comunidade engajada, orientação personalizada e gamificação que motiva.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features - 4 Pilares */}
      <section className="py-16 px-4 bg-[var(--raio-bg-secondary)] lg:py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-[var(--raio-text-primary)] mb-4">
              Como funciona
            </h2>
            <p className="text-[var(--raio-text-secondary)] max-w-2xl mx-auto">
              Tudo que você precisa para transformar sua família, em uma só plataforma
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {[
              {
                icon: BookOpen,
                title: 'Academia de Conteúdo',
                description: '100+ cursos e livros especializados em relacionamentos, parentalidade e crescimento pessoal',
                features: ['Cursos com certificação', 'Livros em áudio + texto', 'Trilhas personalizadas'],
                color: 'var(--raio-gold-500)'
              },
              {
                icon: MessageCircle,
                title: 'Conselheiro IA 24/7',
                description: 'Orientação personalizada sempre que você precisar, com empatia e sabedoria',
                features: ['Conversas ilimitadas', 'Respostas personalizadas', 'Planos de ação práticos'],
                color: 'var(--raio-mint-500)'
              },
              {
                icon: Users,
                title: 'Comunidade Ativa',
                description: 'Conecte-se com milhares de pessoas na mesma jornada que você',
                features: ['Grupos por segmento', 'Eventos e desafios', 'Mentoria entre pares'],
                color: 'var(--raio-coral-500)'
              },
              {
                icon: Trophy,
                title: 'Gamificação Motivadora',
                description: 'Sistema de recompensas que celebra seu progresso e mantém você engajado',
                features: ['Badges e conquistas', 'Streaks diários', 'Níveis de progresso'],
                color: 'var(--raio-accent-primary)'
              }
            ].map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full hover:shadow-[var(--raio-shadow-lg)] transition-shadow border-2 border-transparent hover:border-[var(--raio-border-hover)]">
                  <CardContent className="p-6 lg:p-8">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${feature.color}20` }}
                    >
                      <feature.icon 
                        className="w-7 h-7" 
                        style={{ color: feature.color }}
                      />
                    </div>
                    <h3 className="text-[var(--raio-text-primary)] mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-[var(--raio-text-secondary)] mb-4 text-sm">
                      {feature.description}
                    </p>
                    <ul className="space-y-2">
                      {feature.features.map((item) => (
                        <li 
                          key={item}
                          className="flex items-start text-[var(--raio-text-secondary)] text-sm"
                        >
                          <Check className="w-4 h-4 mr-2 mt-0.5 text-[var(--raio-success)] flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 lg:py-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-[var(--raio-text-primary)] mb-4">
              Escolha seu plano
            </h2>
            <p className="text-[var(--raio-text-secondary)] max-w-2xl mx-auto">
              Comece grátis e faça upgrade quando quiser. Sem compromisso.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full relative overflow-hidden">
                <CardContent className="p-6 lg:p-8">
                  <div className="mb-6">
                    <h3 className="text-[var(--raio-text-primary)] mb-2">
                      Gratuito
                    </h3>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[var(--raio-text-primary)]">R$ 0</span>
                      <span className="text-[var(--raio-text-tertiary)] text-sm">/mês</span>
                    </div>
                    <p className="text-[var(--raio-text-secondary)] text-sm">
                      Para explorar a plataforma
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {[
                      'Acesso a conteúdo introdutório',
                      'Conselheiro IA (limitado)',
                      'Participação na comunidade',
                      'Gamificação básica'
                    ].map((feature) => (
                      <li key={feature} className="flex items-start text-sm">
                        <Check className="w-4 h-4 mr-2 mt-0.5 text-[var(--raio-success)] flex-shrink-0" />
                        <span className="text-[var(--raio-text-secondary)]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleStartFree}
                  >
                    Começar Grátis
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium Plan */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full relative overflow-hidden border-2 border-[var(--raio-accent-primary)] shadow-[var(--raio-shadow-lg)]">
                {/* Badge "Mais popular" */}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-[var(--raio-accent-primary)] text-[var(--raio-text-inverse)]">
                    <Star className="w-3 h-3 mr-1" />
                    Mais popular
                  </Badge>
                </div>

                <CardContent className="p-6 lg:p-8">
                  <div className="mb-6">
                    <h3 className="text-[var(--raio-text-primary)] mb-2">
                      Premium
                    </h3>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[var(--raio-text-primary)]">R$ 49</span>
                      <span className="text-[var(--raio-text-tertiary)] text-sm">/mês</span>
                    </div>
                    <p className="text-[var(--raio-text-secondary)] text-sm">
                      Acesso completo e ilimitado
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {[
                      'Todos os cursos e livros',
                      'Conselheiro IA ilimitado',
                      'Grupos exclusivos da comunidade',
                      'Gamificação completa',
                      'Certificados profissionais',
                      'Conteúdo sincronizado (áudio + texto)',
                      'Suporte prioritário',
                      '7 dias grátis'
                    ].map((feature) => (
                      <li key={feature} className="flex items-start text-sm">
                        <Check className="w-4 h-4 mr-2 mt-0.5 text-[var(--raio-accent-primary)] flex-shrink-0" />
                        <span className="text-[var(--raio-text-secondary)]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full bg-[var(--raio-accent-primary)] hover:bg-[var(--raio-accent-hover)] text-[var(--raio-text-inverse)]"
                    onClick={handleStartPremium}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Começar Premium
                  </Button>

                  <p className="text-center text-[var(--raio-text-tertiary)] text-xs mt-4">
                    Cancele quando quiser • Sem compromisso
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Garantia */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--raio-success-light)] border border-[var(--raio-success)] rounded-full">
              <Shield className="w-5 h-5 text-[var(--raio-success)]" />
              <span className="text-[var(--raio-text-primary)] text-sm">
                Garantia de 7 dias • Teste sem riscos
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-[var(--raio-bg-secondary)] lg:py-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-[var(--raio-text-primary)] mb-4">
              Perguntas frequentes
            </h2>
            <p className="text-[var(--raio-text-secondary)]">
              Tudo que você precisa saber sobre o RAIO
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {[
                {
                  q: 'Como funciona o período gratuito?',
                  a: 'Você tem 7 dias para experimentar todos os recursos Premium sem pagar nada. Pode cancelar a qualquer momento durante o período de teste.'
                },
                {
                  q: 'Posso cancelar quando quiser?',
                  a: 'Sim! Não há compromisso. Você pode cancelar sua assinatura a qualquer momento direto no app, sem burocracias.'
                },
                {
                  q: 'O conteúdo é adequado para qual público?',
                  a: 'Nosso conteúdo é focado em relacionamentos, casamento e parentalidade. Atendemos pessoas em diferentes fases: solteiros, namorando, noivos, casados e pais.'
                },
                {
                  q: 'Como funciona o Conselheiro IA?',
                  a: 'É um assistente inteligente disponível 24/7 que oferece orientação personalizada baseada em sua situação. Ele não substitui terapia profissional, mas é ótimo para reflexões e direcionamento.'
                },
                {
                  q: 'Os cursos têm certificado?',
                  a: 'Sim! Usuários Premium recebem certificados digitais ao completar cursos, que podem ser compartilhados no LinkedIn.'
                },
                {
                  q: 'A comunidade é moderada?',
                  a: 'Sim. Temos diretrizes claras de conduta e moderação ativa para garantir um ambiente seguro e respeitoso para todos.'
                },
                {
                  q: 'Posso acessar o conteúdo offline?',
                  a: 'Membros Premium podem fazer download de livros em áudio para ouvir offline. Estamos trabalhando para adicionar cursos offline em breve.'
                },
                {
                  q: 'Como funciona a gamificação?',
                  a: 'Você ganha pontos (XP) por completar aulas, manter streaks diários, participar da comunidade e atingir metas. Isso desbloqueia badges e níveis que mostram seu progresso.'
                }
              ].map((faq, idx) => (
                <AccordionItem 
                  key={idx} 
                  value={`item-${idx}`}
                  className="bg-[var(--raio-bg-primary)] border border-[var(--raio-border-default)] rounded-lg px-6"
                >
                  <AccordionTrigger className="text-[var(--raio-text-primary)] hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[var(--raio-text-secondary)]">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="bg-gradient-to-br from-[var(--raio-accent-light)] to-[var(--raio-accent-subtle)] border border-[var(--raio-accent-primary)] rounded-2xl p-8 lg:p-12 shadow-[var(--raio-shadow-xl)]">
            <div className="w-16 h-16 rounded-full bg-[var(--raio-accent-primary)] flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-[var(--raio-text-inverse)]" />
            </div>
            
            <h2 className="text-[var(--raio-text-primary)] mb-4">
              Pronto para transformar sua família?
            </h2>
            
            <p className="text-[var(--raio-text-secondary)] mb-8 max-w-2xl mx-auto">
              Junte-se a milhares de pessoas que estão fortalecendo seus relacionamentos 
              e crescendo juntas. Comece hoje mesmo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => {
                  trackCTAClick('final', 'premium');
                  onStartPremium?.();
                }}
                className="bg-[var(--raio-accent-primary)] hover:bg-[var(--raio-accent-hover)] text-[var(--raio-text-inverse)] shadow-lg min-w-[200px]"
              >
                <Zap className="w-5 h-5 mr-2" />
                Começar Premium
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  trackCTAClick('final', 'free');
                  onStartFree?.();
                }}
                className="min-w-[200px] bg-[var(--raio-bg-secondary)]"
              >
                Experimentar Grátis
              </Button>
            </div>

            <p className="text-[var(--raio-text-tertiary)] mt-6 text-sm">
              7 dias grátis • Cancele quando quiser • Sem cartão de crédito
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-[var(--raio-bg-secondary)] border-t border-[var(--raio-border-default)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[var(--raio-accent-primary)]" />
              <span className="text-[var(--raio-text-primary)]">RAIO</span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="#" className="text-[var(--raio-text-secondary)] hover:text-[var(--raio-text-primary)] transition-colors">
                Sobre
              </a>
              <button onClick={onOpenPrivacyPolicy} className="text-[var(--raio-text-secondary)] hover:text-[var(--raio-text-primary)] transition-colors">
                Política de Privacidade
              </button>
              <button onClick={onOpenPrivacyPolicy} className="text-[var(--raio-text-secondary)] hover:text-[var(--raio-text-primary)] transition-colors">
                Termos de Uso
              </button>
              <a href="#" className="text-[var(--raio-text-secondary)] hover:text-[var(--raio-text-primary)] transition-colors">
                Ajuda
              </a>
            </div>

            <p className="text-[var(--raio-text-tertiary)] text-sm">
              © 2025 RAIO. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
