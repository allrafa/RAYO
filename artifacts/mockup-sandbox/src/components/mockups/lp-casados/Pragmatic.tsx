import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronRight, PlayCircle, BookOpen, Users, MessageCircle, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const courses = [
  {
    title: 'Comunicação no Casamento',
    duration: '3 semanas',
    lessons: 12,
    instructor: 'João e Maria Silva',
    topics: [
      'Identificando padrões destrutivos',
      'Escuta ativa sem defesa',
      'Como alinhar expectativas invisíveis',
    ],
    icon: <MessageCircle className="w-6 h-6" />
  },
  {
    title: 'Finanças a Dois',
    duration: '3 semanas',
    lessons: 10,
    instructor: 'Carlos Oliveira',
    topics: [
      'Unificando o orçamento sem perder a autonomia',
      'Planejamento de longo prazo',
      'Lidando com dívidas e prioridades diferentes',
    ],
    icon: <BookOpen className="w-6 h-6" />
  },
  {
    title: 'Resolução de Conflitos',
    duration: '3 semanas',
    lessons: 14,
    instructor: 'Dra. Ana Costa',
    topics: [
      'Técnicas de desescalada',
      'O ciclo do perdão na prática',
      'Estabelecendo limites saudáveis',
    ],
    icon: <ShieldCheck className="w-6 h-6" />
  },
  {
    title: 'Intimidade e Conexão',
    duration: '3 semanas',
    lessons: 11,
    instructor: 'João e Maria Silva',
    topics: [
      'Recuperando o tempo de qualidade',
      'Linguagens do amor na rotina',
      'Reconstruindo a intimidade física',
    ],
    icon: <PlayCircle className="w-6 h-6" />
  }
];

const testimonials = [
  {
    name: 'Roberto e Júlia',
    age: '34 e 32 anos',
    city: 'São Paulo, SP',
    kids: '2 filhos',
    quote: 'Não queríamos terapia, queríamos um plano de ação. Os cursos nos deram um vocabulário novo para discutir problemas antigos sem brigar. Foi prático e direto ao ponto.'
  },
  {
    name: 'Fernando e Paula',
    age: '41 e 39 anos',
    city: 'Curitiba, PR',
    kids: '1 filho',
    quote: 'A trilha de finanças mudou a forma como encaramos nosso dinheiro. A planilha conjunta e os exercícios da semana 2 nos salvaram de muitas brigas. Custo-benefício excelente.'
  }
];

const faqs = [
  {
    question: 'E se meu cônjuge não quiser fazer junto no início?',
    answer: 'Muitos começam a Trilha sozinhos. O conteúdo foi desenhado para que a mudança nas suas atitudes já comece a alterar a dinâmica do relacionamento. Frequentemente, ao ver as mudanças práticas, o parceiro se interessa em participar.'
  },
  {
    question: 'Isso substitui terapia de casal?',
    answer: 'Não. A Trilha Casados é educacional e preventiva. Fornecemos ferramentas práticas, exercícios e repertório para casais que querem melhorar a convivência. Para casos de trauma profundo ou crises agudas, recomendamos acompanhamento profissional específico.'
  },
  {
    question: 'Como funciona a garantia de 7 dias?',
    answer: 'Você faz a assinatura, mas o cartão só é cobrado após 7 dias. Durante esse período, você tem acesso completo a todo o conteúdo. Se não gostar ou achar que não é o momento, basta cancelar na plataforma em dois cliques, sem cobrança e sem precisar falar com ninguém.'
  },
  {
    question: 'Quanto tempo precisamos dedicar por semana?',
    answer: 'Cerca de 40 a 60 minutos por semana. As aulas em vídeo são curtas (10-15 minutos) e o foco está na aplicação dos exercícios durante a semana. É desenhado para encaixar na rotina de quem trabalha e tem filhos.'
  }
];

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function Pragmatic() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-orange-200 selection:text-orange-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight">RAYO</div>
          <div className="hidden md:flex gap-6 text-sm font-medium text-zinc-600">
            <a href="#curriculo" className="hover:text-zinc-900 transition-colors">Currículo</a>
            <a href="#metodo" className="hover:text-zinc-900 transition-colors">Como Funciona</a>
            <a href="#preco" className="hover:text-zinc-900 transition-colors">Preços</a>
          </div>
          <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-none">
            Começar 7 dias grátis
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 border border-zinc-200 text-sm font-medium mb-6 rounded-none">
              <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
              Trilha Casados
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-6 text-zinc-950">
              4 cursos. 12 semanas. <br />
              Uma forma <span className="text-orange-600">diferente</span> de conversar.
            </h1>
            <p className="text-lg text-zinc-600 mb-8 leading-relaxed">
              Sem gurus, sem promessas mágicas. Um currículo estruturado para casais que precisam alinhar comunicação, finanças e rotina através de práticas diárias.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white rounded-none h-14 px-8 text-base shadow-sm">
                Começar 7 dias grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-none h-14 px-8 text-base border-zinc-300 text-zinc-700 hover:bg-zinc-100">
                Ver currículo detalhado
              </Button>
            </div>
            
            <div className="mt-8 flex items-center gap-4 text-sm text-zinc-500">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-zinc-300 border-2 border-white" />
                ))}
              </div>
              <p>Junte-se a mais de <span className="font-semibold text-zinc-900">2.500 casais</span></p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-100/40 to-transparent -translate-x-4 translate-y-4 -z-10"></div>
            <img 
              src="/__mockup/images/lp-casados/hero-pragmatic.png" 
              alt="Casal conversando de forma focada e calma" 
              className="w-full aspect-[4/3] object-cover shadow-sm border border-zinc-200"
            />
            
            <div className="absolute -bottom-6 -left-6 bg-white p-4 shadow-lg border border-zinc-100 max-w-xs">
              <div className="flex items-center gap-3 mb-2">
                <Check className="w-5 h-5 text-orange-600" />
                <span className="font-mono text-sm font-semibold tracking-tight text-zinc-900">MÉTRICA CHAVE</span>
              </div>
              <p className="text-sm text-zinc-600">
                Mais de <span className="font-semibold text-zinc-900">47 aulas práticas</span> em vídeo com exercícios aplicáveis na mesma semana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Before / After Section */}
      <section className="py-20 bg-white border-y border-zinc-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 mb-4">A lacuna entre intenção e prática</h2>
            <p className="text-zinc-600 max-w-2xl mx-auto">O desgaste não acontece por falta de amor, mas por falhas de processo na rotina. Veja o que as 12 semanas abordam concretamente.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-px bg-zinc-200 border border-zinc-200">
            <div className="bg-zinc-50 p-8 md:p-12">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-zinc-800">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Sintomas atuais
              </h3>
              <ul className="space-y-4">
                {[
                  "Discussões circulares que nunca chegam a uma decisão clara.",
                  "Contas pagas, mas sem visibilidade do orçamento conjunto.",
                  "A rotina dita o ritmo; o tempo de qualidade é o que sobra (se sobrar).",
                  "Sentimento de que são colegas de quarto administrando uma casa."
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-zinc-600">
                    <span className="text-red-400 mt-1 shrink-0">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white p-8 md:p-12">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-zinc-950">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Objetivos práticos (12 semanas)
              </h3>
              <ul className="space-y-4">
                {[
                  "Metodologia para discutir problemas e chegar a acordos registrados.",
                  "Planilha financeira integrada com limites de autonomia definidos.",
                  "Agenda semanal com blocos inegociáveis de conexão, independentemente dos filhos.",
                  "Intencionalidade clara na manutenção do afeto e da intimidade."
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-zinc-800 font-medium">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section id="curriculo" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 mb-4">Currículo Estruturado</h2>
          <p className="text-zinc-600 max-w-2xl">Não é conteúdo solto. É uma sequência lógica desenhada para construir fundamentos antes de tratar temas complexos.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {courses.map((course, idx) => (
            <FadeIn key={idx} delay={idx * 0.1}>
              <div className="group border border-zinc-200 bg-white p-8 hover:border-orange-600 transition-colors h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 bg-zinc-100 flex items-center justify-center text-zinc-700 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                    {course.icon}
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-wider block">Módulo 0{idx + 1}</span>
                    <span className="text-sm font-medium text-zinc-600">{course.duration}</span>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-zinc-950 mb-2">{course.title}</h3>
                <p className="text-sm text-zinc-500 mb-6 pb-6 border-b border-zinc-100">Prof: {course.instructor} • {course.lessons} aulas</p>
                
                <ul className="space-y-3 mt-auto">
                  {course.topics.map((topic, i) => (
                    <li key={i} className="flex gap-3 text-sm text-zinc-700">
                      <ChevronRight className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="metodo" className="py-24 bg-zinc-950 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">Como a plataforma funciona na prática</h2>
              <p className="text-zinc-400 mb-12">Um ecossistema desenhado para manter o casal engajado, sem sobrecarregar a rotina que já é pesada.</p>
              
              <div className="space-y-10">
                {[
                  {
                    title: "Aulas direto ao ponto",
                    desc: "Vídeos de 10 a 15 minutos. Zero enrolação. Assista no celular no caminho pro trabalho ou juntos no sofá."
                  },
                  {
                    title: "Exercícios de aplicação",
                    desc: "Toda aula termina com uma ação concreta para a semana. Um PDF, uma pergunta ou uma tarefa simples."
                  },
                  {
                    title: "Comunidade escopada",
                    desc: "Fórum estilo Reddit, apenas com casais da sua turma. Troque experiências reais anonimamente ou não."
                  }
                ].map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="font-mono text-2xl font-light text-orange-500 shrink-0">0{i+1}</div>
                    <div>
                      <h4 className="text-lg font-semibold mb-2">{step.title}</h4>
                      <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
               <img 
                src="/__mockup/images/lp-casados/working-together.png" 
                alt="Casal cozinhando juntos, aplicando exercícios na rotina" 
                className="w-full object-cover shadow-2xl border border-zinc-800"
              />
              <div className="absolute top-1/2 -translate-y-1/2 -left-12 bg-zinc-900 p-6 border border-zinc-800 shadow-xl hidden md:block">
                <div className="font-mono text-sm text-zinc-400 mb-2">PLATAFORMA</div>
                <div className="text-lg font-medium text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-500" />
                  Exercício da Semana 02
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950">Resultados Documentados</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((test, i) => (
              <div key={i} className="bg-white p-8 border border-zinc-200">
                <p className="text-zinc-700 mb-8 italic">"{test.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center font-bold text-zinc-500">
                    {test.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-950">{test.name}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-1">
                      {test.age} • {test.city} • {test.kids}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="preco" className="py-24 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 mb-4">Assinatura Transparente</h2>
          <p className="text-zinc-600">Sem taxas escondidas. Cancele com um clique.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="bg-white border border-zinc-200 p-8 flex flex-col h-full">
            <h3 className="text-xl font-semibold mb-2">Mensal</h3>
            <p className="text-zinc-500 text-sm mb-6">Flexibilidade total</p>
            <div className="mb-8">
              <span className="text-4xl font-bold text-zinc-950">R$ 50</span>
              <span className="text-zinc-500">/mês</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              {['Acesso completo aos 4 cursos', 'Comunidade da Trilha', 'Materiais de apoio em PDF', 'Cobrança mensal no cartão'].map((feature, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-700">
                  <Check className="w-5 h-5 text-orange-600 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <Button variant="outline" className="w-full rounded-none h-12 border-zinc-300">
              Assinar Mensal
            </Button>
          </div>

          <div className="bg-zinc-950 text-white p-8 border border-zinc-950 flex flex-col h-full relative">
            <div className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-bold px-3 py-1 uppercase tracking-wider">
              Economia de 17%
            </div>
            <h3 className="text-xl font-semibold mb-2">Anual</h3>
            <p className="text-zinc-400 text-sm mb-6">Para quem busca mudança a longo prazo</p>
            <div className="mb-2">
              <span className="text-4xl font-bold">R$ 500</span>
              <span className="text-zinc-400">/ano</span>
            </div>
            <p className="text-orange-400 text-sm mb-8 font-mono">Equivale a R$ 41,67/mês (menos que um café)</p>
            
            <ul className="space-y-4 mb-8 flex-1">
              {['Acesso completo aos 4 cursos', 'Comunidade da Trilha', 'Materiais de apoio em PDF', 'Cobrança única anual'].map((feature, i) => (
                <li key={i} className="flex gap-3 text-sm text-zinc-300">
                  <Check className="w-5 h-5 text-orange-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <div className="space-y-3">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-none h-12">
                Começar 7 dias grátis
              </Button>
              <p className="text-xs text-center text-zinc-500">Primeiros 7 dias grátis. Cancele antes se quiser.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-zinc-50 border-t border-zinc-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-3 justify-center mb-12">
            <HelpCircle className="w-6 h-6 text-orange-600" />
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950">Perguntas Frequentes</h2>
          </div>
          
          <Accordion type="single" collapsible className="w-full bg-white border border-zinc-200">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-zinc-200 last:border-0 px-6">
                <AccordionTrigger className="text-left font-semibold text-zinc-900 hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-zinc-600 pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-bold text-xl tracking-tight text-zinc-900">RAYO</div>
          <div className="text-sm text-zinc-500">
            © {new Date().getFullYear()} RAYO Plataforma. Todos os direitos reservados.
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-900">Termos</a>
            <a href="#" className="hover:text-zinc-900">Privacidade</a>
            <a href="#" className="hover:text-zinc-900">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
