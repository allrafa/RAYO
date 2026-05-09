import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronRight, Heart, Users, Video, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Aspirational() {
  const { scrollYProgress } = useScroll();
  const yHero = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C2926] font-sans selection:bg-[#E6B981] selection:text-[#2C2926]">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 mix-blend-difference text-white/90 px-6 py-6 flex justify-between items-center">
        <div className="font-serif text-2xl tracking-tight">RAYO</div>
        <Button variant="outline" className="rounded-full border-white/20 hover:bg-white hover:text-black transition-colors duration-500 font-light tracking-wide text-sm px-6 h-10">
          Entrar
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.div 
          style={{ y: yHero, opacity: opacityHero }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img 
            src="/__mockup/images/lp-casados/hero.png" 
            alt="Casal de mãos dadas"
            className="w-full h-full object-cover"
          />
        </motion.div>

        <div className="relative z-20 text-center px-6 max-w-4xl mx-auto flex flex-col items-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="font-serif text-5xl md:text-7xl lg:text-8xl text-[#FDFBF7] leading-[1.1] tracking-tight mb-8"
          >
            Lembra quando vocês <br className="hidden md:block"/> conversavam até de madrugada?
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.8 }}
            className="text-lg md:text-xl text-[#FDFBF7]/80 font-light max-w-2xl tracking-wide mb-12"
          >
            A rotina é silenciosa. Ela não avisa que o namoro virou logística, 
            que as conversas viraram boletos, que o cansaço ocupou o espaço do carinho. 
            Mas o amor que trouxe vocês até aqui ainda existe. Ele só precisa de espaço para respirar.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            <Button className="bg-[#D4A373] hover:bg-[#C28E5C] text-white rounded-full h-14 px-8 text-base font-medium tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Começar 7 dias grátis
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Section 2: The Problem (Emotional connection) */}
      <section className="py-32 px-6 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative aspect-[3/4] md:aspect-[4/5] rounded-sm overflow-hidden"
            >
              <img 
                src="/__mockup/images/lp-casados/routine.png" 
                alt="Casal no sofá à noite"
                className="w-full h-full object-cover"
              />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="max-w-xl"
            >
              <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-8 text-[#2C2926]">
                O amor não acaba com uma explosão. Ele se esconde no cansaço.
              </h2>
              <div className="space-y-6 text-[#5C5751] font-light text-lg leading-relaxed">
                <p>
                  As crianças dormiram. A casa finalmente está em silêncio. Vocês sentam no mesmo sofá, mas há um oceano de distância entre vocês. Cada um no seu celular, exaustos demais para iniciar uma conversa que não seja sobre a escola das crianças ou as contas do mês.
                </p>
                <p>
                  Vocês não pararam de se amar. Vocês apenas esqueceram como se encontrar no meio do caos diário.
                </p>
                <p className="text-[#8B7355] italic font-serif text-xl mt-8">
                  A Trilha Casados é o mapa de volta para casa.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: The Promise (Light, Morning, Connection) */}
      <section className="py-32 px-6 bg-[#FAFAF8] relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col-reverse md:grid md:grid-cols-2 gap-16 md:gap-24 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="max-w-xl"
          >
            <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-8 text-[#2C2926]">
              A reconexão é uma prática diária.
            </h2>
            <div className="space-y-6 text-[#5C5751] font-light text-lg leading-relaxed">
              <p>
                Não acreditamos em fórmulas mágicas nem em "salvar seu casamento em 30 dias". Acreditamos no café da manhã compartilhado, no olhar demorado antes de sair para o trabalho, no perdão sincero depois de uma falha.
              </p>
              <p>
                O casamento é um projeto sagrado que se constrói nas pequenas escolhas diárias. Criamos um espaço seguro para ajudar vocês a fazerem essas escolhas juntos.
              </p>
            </div>
            
            <div className="mt-12 space-y-8">
              <div className="flex items-start gap-4">
                <div className="mt-1 text-[#D4A373]"><Heart className="w-6 h-6 stroke-[1.5]" /></div>
                <div>
                  <h3 className="font-medium text-xl text-[#2C2926] mb-2 font-serif">Intenção, não obrigação</h3>
                  <p className="text-[#5C5751] font-light leading-relaxed">Conteúdos curtos que cabem na rotina. Sem pressão, no tempo de vocês.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 text-[#D4A373]"><Users className="w-6 h-6 stroke-[1.5]" /></div>
                <div>
                  <h3 className="font-medium text-xl text-[#2C2926] mb-2 font-serif">Vocês não estão sozinhos</h3>
                  <p className="text-[#5C5751] font-light leading-relaxed">Uma comunidade de casais que também estão lutando para manter o amor vivo na correria.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative w-full aspect-[4/5] rounded-sm overflow-hidden shadow-2xl"
          >
            <img 
              src="/__mockup/images/lp-casados/kitchen.png" 
              alt="Casal tomando café na cozinha"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Section 4: What's inside (Features framed elegantly) */}
      <section className="py-32 px-6 bg-[#2C2926] text-[#FDFBF7]">
        <div className="max-w-5xl mx-auto text-center mb-20">
          <h2 className="font-serif text-4xl md:text-6xl mb-6 text-[#E6B981]">O que espera por vocês</h2>
          <p className="text-lg md:text-xl font-light text-white/70 max-w-2xl mx-auto">
            A Trilha Casados é uma assinatura desenhada para dar suporte prático e emocional à jornada a dois.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 md:gap-12">
          {[
            {
              icon: <Video className="w-8 h-8 stroke-[1]" />,
              title: "4 Cursos Fundamentais",
              desc: "Comunicação, Finanças a dois, Intimidade e Resolução de conflitos. Aulas profundas e práticas."
            },
            {
              icon: <MessageCircle className="w-8 h-8 stroke-[1]" />,
              title: "Comunidade Fechada",
              desc: "Troca sincera com outros casais da mesma turma, num ambiente seguro e mediado."
            },
            {
              icon: <Heart className="w-8 h-8 stroke-[1]" />,
              title: "Exercícios Práticos",
              desc: "Materiais de apoio e desafios quinzenais para transformar o aprendizado em hábito."
            }
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
              className="p-8 border border-white/10 rounded-sm bg-white/5 hover:bg-white/10 transition-colors duration-500"
            >
              <div className="text-[#E6B981] mb-6">{item.icon}</div>
              <h3 className="font-serif text-2xl mb-4">{item.title}</h3>
              <p className="font-light text-white/70 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section 5: Pricing / CTA */}
      <section className="py-32 px-6 bg-[#FDFBF7] relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D4A373]/30 to-transparent" />
        
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-8 text-[#2C2926]">
              O melhor investimento <br className="hidden md:block"/> que vocês podem fazer.
            </h2>
            <p className="text-xl text-[#5C5751] font-light mb-12">
              Dê o primeiro passo sem compromisso. Cancele quando quiser.
            </p>

            <div className="bg-white p-10 md:p-14 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-[#E6B981]/20 max-w-2xl mx-auto text-left">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h3 className="font-serif text-2xl text-[#2C2926]">Plano Anual</h3>
                  <p className="text-[#8B7355] text-sm mt-1">Economize 17% (2 meses grátis)</p>
                </div>
                <div className="text-left md:text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg text-[#5C5751]">R$</span>
                    <span className="text-4xl font-serif text-[#2C2926]">41</span>
                    <span className="text-lg text-[#5C5751]">,67</span>
                    <span className="text-[#5C5751] font-light ml-1">/mês</span>
                  </div>
                  <div className="text-sm text-[#8B7355] mt-1">Cobrado anualmente (R$ 500)</div>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                {['Acesso imediato aos 4 cursos', 'Comunidade exclusiva da turma', 'Exercícios práticos e guias', '7 dias totalmente gratuitos'].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4A373]" />
                    <span className="text-[#5C5751]">{feat}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full bg-[#2C2926] hover:bg-[#1A1816] text-[#FDFBF7] rounded-full h-14 text-lg font-medium tracking-wide transition-all duration-300">
                Começar 7 dias grátis
              </Button>
              <p className="text-center text-sm text-[#8B7355] mt-6">
                Ou opte pelo plano mensal (R$ 50/mês). Pagamento seguro via Stripe.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6 bg-[#FAFAF8] text-[#2C2926]">
        <div className="max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="font-serif text-3xl md:text-5xl mb-16 text-center"
          >
            Perguntas Frequentes
          </motion.h2>
          
          <div className="space-y-8">
            {[
              { q: "Para quem é a Trilha Casados?", a: "Para casais que sentem que a rotina esfriou o relacionamento, mas que ainda se amam e querem se reconectar. Não é terapia de casal, mas um guia prático para reacender o diálogo e a intimidade." },
              { q: "Como funciona os 7 dias grátis?", a: "Você se cadastra e ganha acesso total à plataforma. O cartão é exigido, mas nenhuma cobrança é feita nos primeiros 7 dias. Se não gostar, pode cancelar com um clique antes da cobrança." },
              { q: "Precisamos assistir juntos?", a: "É o ideal, mas sabemos que a rotina é apertada. Vocês podem assistir separados e se comprometerem a fazer os exercícios e conversar sobre o tema depois." },
              { q: "Como é a comunidade?", a: "É um espaço privado e mediado, longe das redes sociais. Vocês farão parte de uma turma com outros casais na mesma fase, podendo trocar experiências e desafios em um ambiente seguro." },
            ].map((faq, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="border-b border-[#2C2926]/10 pb-8"
              >
                <h3 className="font-medium text-xl font-serif mb-3">{faq.q}</h3>
                <p className="text-[#5C5751] font-light leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Image & Final Thought */}
      <section className="relative h-[60vh] md:h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/30 z-10" />
          <img 
            src="/__mockup/images/lp-casados/hands.png" 
            alt="Mãos entrelaçadas"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-20 text-center px-6">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="font-serif text-3xl md:text-5xl text-[#FDFBF7] leading-relaxed max-w-3xl"
          >
            "O casamento não é o fim da busca romântica, é o começo da construção do amor."
          </motion.h2>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1816] text-[#FDFBF7]/60 py-12 px-6 font-light text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-serif text-2xl tracking-tight text-[#FDFBF7]">RAYO</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Contato</a>
          </div>
          <div>© {new Date().getFullYear()} Rayo. Todos os direitos reservados.</div>
        </div>
      </footer>
    </div>
  );
}
