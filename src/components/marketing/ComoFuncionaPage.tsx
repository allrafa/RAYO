import { PublicLayout } from "./PublicLayout";
import { useSeoMeta } from "./useSeoMeta";

const STEPS = [
  { num: "PASSO 01", title: <>Conte sua <span className="light">fase</span> em 5 perguntas.</>, desc: "Solteiro, namorando, noivo, casado ou pai/mãe? Quanto tempo? Como vocês se conheceram? Cinco perguntas rápidas, e o RAYO já entende para onde te levar primeiro.", pills: ["Onboarding · 90s", "Sem cadastro pesado"] },
  { num: "PASSO 02", title: <>Receba sua <span className="light">primeira</span> trilha.</>, desc: "Com base nas suas respostas, recomendamos uma trilha de 7 ou 14 dias com começo, meio e fim. Tudo dentro do app, em formatos curtos: vídeo, áudio, texto e missão prática.", pills: ["Trilha de 7 ou 14 dias", "10–20 min/dia"] },
  { num: "PASSO 03", title: <>Faça a <span className="light">missão</span> de hoje.</>, desc: "Toda missão é uma ação real para fazer no seu dia: uma pergunta nova ao seu parceiro, um ritual de 5 minutos, uma anotação no fim do dia. Você marca, e a próxima já chega amanhã.", pills: ["Missão diária ou semanal", "Modo casal opcional"] },
];

const PHASES = [
  { dot: "S", n: "01", name: "Solteiro", desc: "Identidade, propósito e o que procurar (ou não) em alguém.", tags: ["Autoconhecimento", "Vínculos"] },
  { dot: "N", n: "02", name: "Namoro", desc: "Conhecer de verdade, conversar sobre o que importa, decidir junto.", tags: ["Conversas-chave", "Limites"] },
  { dot: "N", n: "03", name: "Noivos", desc: "Os 90 dias antes do altar — finanças, expectativas, projeto de vida.", tags: ["Acordos", "Projeto"] },
  { dot: "C", n: "04", name: "Casados", desc: "Manter a chama, cuidar das diferenças, rever combinados ao longo dos anos.", tags: ["Rotinas", "Reconexão"] },
  { dot: "P", n: "05", name: "Pais", desc: "Educar com firmeza e afeto sem perder o casal por trás dos pais.", tags: ["Educação", "Casal-pais"] },
];

const TIMELINE = [
  { time: "Dia 0 · 90s", h: "Você cria sua conta e responde 5 perguntas", p: "Sem cartão de crédito, sem aprovação, sem onboarding com 18 telas. Você diz sua fase, idade, há quanto tempo está nesse momento e o que mais te incomoda hoje. Pronto." },
  { time: "Dia 0 · 30s", h: "O RAYO recomenda sua primeira trilha", p: "Uma trilha curta, de 7 dias, escolhida para a sua fase e o seu momento. Você vê o que vai aprender, quanto tempo vai levar e a primeira missão." },
  { time: "Dia 1 · 10min", h: "Sua primeira missão chega no horário que você escolheu", p: "De manhã, na hora do almoço ou no fim do dia — você define. A missão é simples: uma ação real, com tempo definido, com um pequeno texto explicando por que." },
  { time: "Dia 3 · 5min", h: "Você é convidado para um grupo da Comunidade", p: "Um grupo da sua fase, com até 30 pessoas. A entrada é opcional — mas se você topar, encontra gente vivendo coisas parecidas com as suas." },
  { time: "Dia 7 · 8min", h: "Você fecha sua primeira trilha e o RAYO sugere o próximo passo", p: "Pode ser um curso da Academia, uma nova trilha mais profunda ou um grupo específico da Comunidade. Você escolhe — e o ciclo recomeça, com mais informação sobre o que funciona para você." },
];

export function ComoFuncionaPage() {
  useSeoMeta({
    title: "Como funciona · RAYO — Do cadastro à primeira missão em 3 passos",
    description: "Sem onboarding chato. Você responde 5 perguntas, recebe sua trilha personalizada e a primeira missão chega em 30 segundos.",
    canonical: "https://rayo.app.br/como-funciona",
  });
  return (
    <PublicLayout active="como-funciona">
      <section className="hero">
        <div className="wrap">
          <span className="hero-eyebrow">Como funciona o RAYO</span>
          <h1 className="hero-title">Do cadastro à primeira missão, em <span className="light">3 passos.</span></h1>
          <p className="hero-lede">Sem onboarding chato e sem precisar mudar nada na sua rotina. Você responde 5 perguntas, recebe sua trilha e a primeira missão chega em 30 segundos.</p>
        </div>
      </section>

      <section className="steps">
        <div className="wrap">
          <span className="section-eyebrow">Os 3 passos</span>
          <h2 className="section-title">Simples por <span className="light">princípio.</span></h2>
          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <div key={i} className="step-card">
                <span className="num mono">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <div className="step-visual">
                  {s.pills.map((pill, j) => (
                    <span key={j} className="step-pill"><span className="dot"></span> {pill}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="journey">
        <div className="wrap">
          <span className="section-eyebrow">A jornada do RAYO</span>
          <h2 className="section-title">Cinco fases. <span className="light">Um</span> caminho.</h2>
          <p className="section-lede">A vida em família tem ciclos. O RAYO é construído ao redor de cinco fases — e a curadoria, as trilhas e a comunidade se ajustam a você conforme o tempo passa.</p>
          <div className="journey-track">
            {PHASES.map((ph, i) => (
              <div key={i} className="phase">
                <div className="phase-dot">{ph.dot}</div>
                <span className="phase-label mono">Fase {ph.n}</span>
                <div className="phase-name">{ph.name}</div>
                <div className="phase-desc">{ph.desc}</div>
                <div className="phase-tags">
                  {ph.tags.map((t, j) => <span key={j} className="phase-tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="duo">
        <div className="wrap">
          <span className="section-eyebrow">Modo Casal</span>
          <h2 className="section-title">Vocês caminham <span className="light">juntos.</span></h2>
          <p className="section-lede">Quando os dois estão no RAYO, vocês podem ativar o Modo Casal. As missões viram conjuntas, vocês marcam juntos, e a trilha avança no ritmo dos dois.</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <span className="section-eyebrow">Princípios de produto</span>
          <h2 className="section-title">O que <span className="light">o</span> RAYO não é.</h2>
          <p className="section-lede">A internet de famílias está cheia de feed infinito, comparação e gurus do casamento perfeito. O RAYO foi construído contra essas três coisas.</p>
          <div className="principles-grid">
            <div className="principle"><span className="principle-num mono">PRINCÍPIO 01</span><h4>Sem feed <span className="light">infinito.</span></h4><p>Você abre, faz a missão do dia ou avança um pouco na trilha, e fecha. O RAYO foi feito para sair do app, não para te prender nele.</p></div>
            <div className="principle"><span className="principle-num mono">PRINCÍPIO 02</span><h4>Sem casal <span className="light">de</span> vitrine.</h4><p>Não tem feed de momentos, não tem foto de família, não tem comparação. Sua jornada é privada por padrão — e fica privada se você quiser.</p></div>
            <div className="principle"><span className="principle-num mono">PRINCÍPIO 03</span><h4>Sem fórmula <span className="light">milagrosa.</span></h4><p>Toda família é diferente. O RAYO oferece caminhos curados, mas a escolha é sua — e você pode pular, voltar, refazer ou ignorar qualquer trilha.</p></div>
          </div>
        </div>
      </section>

      <section className="timeline">
        <div className="wrap">
          <span className="section-eyebrow">A primeira semana no RAYO</span>
          <h2 className="section-title">Como <span className="light">é</span> começar.</h2>
          <div className="timeline-list">
            {TIMELINE.map((t, i) => (
              <div key={i} className="tl-item">
                <span className="tl-time mono">{t.time}</span>
                <div className="tl-content">
                  <h4>{t.h}</h4>
                  <p>{t.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="cta-strip">
          <h2 className="cta-strip-title">Começa em <span className="light">90 segundos.</span></h2>
          <a href="/cadastro" className="btn-primary">Criar minha conta →</a>
        </div>
      </div>
    </PublicLayout>
  );
}
