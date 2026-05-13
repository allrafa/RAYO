import { PublicLayout } from "./PublicLayout";
import { useSeoMeta } from "./useSeoMeta";

export function RecursosPage() {
  useSeoMeta({
    title: "Recursos · RAYO — Tudo que sua família precisa em um só lugar",
    description:
      "Cinco pilares construídos para acompanhar todas as fases — Solteiro, Namoro, Noivos, Casados e Pais — com conteúdo prático, comunidade real e missões diárias.",
    canonical: "https://rayo.app.br/recursos",
  });
  return (
    <PublicLayout active="recursos">
      <section className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <span className="hero-eyebrow">Recursos do RAYO</span>
              <h1 className="hero-title">Tudo o que sua família <span className="light">precisa</span> em um só lugar.</h1>
              <p className="hero-lede">Cinco pilares construídos para acompanhar todas as fases — Solteiro, Namoro, Noivos, Casados e Pais — com conteúdo prático, comunidade real e missões diárias para fortalecer laços.</p>
              <div className="hero-cta-row">
                <a href="/cadastro" className="btn-primary">Experimentar grátis →</a>
                <a href="/como-funciona" className="btn-ghost">Ver como funciona</a>
              </div>
            </div>
            <div className="hero-mock">
              <div><span className="hero-mock-tag mono">Em alta agora</span></div>
              <div className="hero-mock-card">
                <div className="hero-mock-tag mono">Trilha · Casados</div>
                <div className="hero-mock-title">Conversas que fortalecem o casamento</div>
                <div className="hero-mock-meta">8 episódios · 2h 14min · 4.9 ★</div>
              </div>
              <div className="hero-mock-card">
                <div className="hero-mock-tag mono">Missão de hoje</div>
                <div className="hero-mock-title">Acender a chama da semana</div>
                <div className="hero-mock-meta">15 minutos · em casal</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pillars">
        <div className="wrap">
          <span className="section-eyebrow">Os 5 pilares</span>
          <h2 className="section-title">Um ecossistema completo, <span className="light">não</span> um app a mais.</h2>
          <p className="section-lede">Cada pilar foi pensado para responder a um momento real da vida em família. Você não escolhe entre conteúdo e prática — tem os dois, conectados.</p>
          <div className="pillars-grid">
            {[
              { cls: "forest", icon: "A", num: "01 / Conteúdo", name: "Academia", desc: "Cursos, podcasts, shorts e trilhas curadas por especialistas em família, casamento e parentalidade." },
              { cls: "", icon: "C", num: "02 / Pessoas", name: "Comunidade", desc: "Comunidades por fase, tópicos ativos e mentores. Sem julgamento, com conversas que importam." },
              { cls: "terra", icon: "T", num: "03 / Caminho", name: "Trilhas", desc: 'Jornadas guiadas para cada fase: do "como conhecer alguém de verdade" ao "como educar com firmeza e afeto".' },
              { cls: "sage", icon: "M", num: "04 / Prática", name: "Missões", desc: "Pequenas ações diárias e semanais — em casal, em família ou individuais — para sair da teoria." },
              { cls: "", icon: "P", num: "05 / Você", name: "Perfil & Jornada", desc: "Seu mapa pessoal: fase atual, conquistas, missões ativas e o próximo passo recomendado para você." },
            ].map((p, i) => (
              <div key={i} className={`pillar-card${p.cls ? ` ${p.cls}` : ""}`}>
                <div className="pillar-icon">{p.icon}</div>
                <span className="pillar-num mono">{p.num}</span>
                <h3 className="pillar-name">{p.name}</h3>
                <p className="pillar-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="feature">
        <div className="wrap">
          <div className="feature-grid">
            <div className="feature-text">
              <span className="feature-eyebrow">01 · Academia</span>
              <h3>Conteúdo que <span className="light">caminha</span> com a sua fase.</h3>
              <p>Não é mais um catálogo infinito. É uma curadoria viva, organizada por momento de vida, formato e tempo disponível. Tem cursos profundos para os domingos e shorts de 5 minutos para o trânsito.</p>
              <ul className="feature-list">
                <li>Cursos completos com certificado, divididos em módulos curtos</li>
                <li>Podcasts originais com especialistas e famílias reais</li>
                <li>Shorts: vídeos de até 90s com uma ideia prática por dia</li>
                <li>Trilhas curadas para cada fase, com sequência sugerida</li>
              </ul>
              <a href="/cadastro" className="feature-link">Ver tudo da Academia →</a>
            </div>
            <div className="feature-visual dark">
              <div className="feature-visual-mock">
                <div className="top-bar"></div>
                <div className="mock-row"><span className="mock-tag">Curso · 8 aulas</span><strong>Conversas difíceis no casamento</strong>Como ouvir de verdade quando o assunto incomoda.</div>
                <div className="mock-row"><span className="mock-tag">Podcast · 42min</span><strong>Sermos pais sem deixar de ser casal</strong>Episódio #14 com Marina e Pedro Almeida.</div>
                <div className="mock-row"><span className="mock-tag">Short · 1min</span><strong>O ritual das 6 da tarde</strong>Um hábito simples que muda o clima da casa.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature reverse" style={{ background: "var(--sand-50)" }}>
        <div className="wrap">
          <div className="feature-grid">
            <div className="feature-text">
              <span className="feature-eyebrow">02 · Comunidade</span>
              <h3>Conversas <span className="light">que</span> importam, sem ruído.</h3>
              <p>Comunidades pequenas, moderadas e organizadas pela sua fase. Aqui ninguém está performando o casamento perfeito — gente real falando do que dá certo e do que não dá.</p>
              <ul className="feature-list">
                <li>Comunidades por fase de vida e por interesse (finanças, fé, parentalidade)</li>
                <li>Discussões diárias propostas pela curadoria</li>
                <li>Mentores convidados respondem ao vivo uma vez por semana</li>
                <li>Sem feed infinito, sem curtidas, sem comparação</li>
              </ul>
              <a href="/cadastro" className="feature-link">Conhecer a Comunidade →</a>
            </div>
            <div className="feature-visual sage">
              <div className="feature-visual-mock">
                <div className="top-bar"></div>
                <div className="mock-row"><span className="mock-tag">Tópico ativo · 23</span><strong>Como dividimos as finanças?</strong>Conta conjunta, separada ou mista? Casados conta.</div>
                <div className="mock-row"><span className="mock-tag">Mentora ao vivo</span><strong>Dra. Beatriz Lemos · 19h</strong>Limites na adolescência sem virar inimigo.</div>
                <div className="mock-row"><span className="mock-tag">Comunidade · Noivos</span><strong>Os 90 dias antes do altar</strong>42 casais ativos esta semana.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature">
        <div className="wrap">
          <div className="feature-grid">
            <div className="feature-text">
              <span className="feature-eyebrow">03 · Trilhas + Missões</span>
              <h3>Da teoria <span className="light">para</span> o sofá da sua casa.</h3>
              <p>O RAYO é construído na ideia de que conhecimento sem prática vira ansiedade. Por isso, toda trilha de conteúdo vem acompanhada de missões — ações simples para fazer hoje, sozinho ou em casal.</p>
              <ul className="feature-list">
                <li>Trilhas com começo, meio e fim — entre 7 e 30 dias</li>
                <li>Missões diárias adaptadas ao seu tempo e fase</li>
                <li>Modo casal: vocês recebem a mesma missão e marcam juntos</li>
                <li>Streak gentil — sem culpa quando a vida acontecer</li>
              </ul>
              <a href="/como-funciona" className="feature-link">Explorar Trilhas →</a>
            </div>
            <div className="feature-visual terra">
              <div className="feature-visual-mock">
                <div className="top-bar"></div>
                <div className="mock-row"><span className="mock-tag">Trilha · dia 4 de 14</span><strong>Rota do casal: voltando a se ver</strong>14 dias para reencontrar a presença no dia a dia.</div>
                <div className="mock-row"><span className="mock-tag">Missão · 10 min</span><strong>Pergunte algo que você não sabe</strong>Uma pergunta nova sobre a infância dele(a).</div>
                <div className="mock-row"><span className="mock-tag">Em casal · marcado</span><strong>Vocês concluíram juntos →</strong>+1 dia na rota. Próxima missão amanhã às 8h.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="metrics">
        <div className="wrap">
          <span className="section-eyebrow">RAYO em números</span>
          <h2 className="section-title">Construído com famílias <span className="light">de</span> verdade.</h2>
          <p className="section-lede">Cada número aqui representa uma conversa que aconteceu, um casal que se reaproximou, uma família que encontrou linguagem nova.</p>
          <div className="metrics-grid">
            {[
              { num: "12", suffix: "k+", label: "Famílias ativas no app" },
              { num: "340", suffix: "+", label: "Horas de conteúdo curado" },
              { num: "87", suffix: "%", label: "Concluem a primeira trilha" },
              { num: "4.9", suffix: "★", label: "Avaliação média na App Store" },
            ].map((m, i) => (
              <div key={i} className="metric">
                <div className="metric-num">{m.num}<span className="light">{m.suffix}</span></div>
                <div className="metric-label">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="cta-strip">
          <h2 className="cta-strip-title">Comece <span className="light">hoje.</span> A sua família agradece amanhã.</h2>
          <a href="/cadastro" className="btn-primary">Criar conta grátis →</a>
        </div>
      </div>
    </PublicLayout>
  );
}
