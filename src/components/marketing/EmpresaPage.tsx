import { PublicLayout } from "./PublicLayout";
import { useSeoMeta } from "./useSeoMeta";

const VALUES = [
  { cls: "forest", num: "VALOR 01", title: <>A família <span className="light">vem</span> antes do produto.</>, desc: "Quando a feature engaja mais mas atrapalha a vida real, a feature sai. Nosso sucesso é a família ganhar tempo de qualidade — não passar mais tempo no app." },
  { cls: "terra", num: "VALOR 02", title: <>Conteúdo <span className="light">honesto</span>, sempre.</>, desc: 'Nada de "10 segredos para o casamento perfeito". Falamos do que funciona, do que não funciona e do que ainda não sabemos. Curadoria com diferentes vozes.' },
  { cls: "", num: "VALOR 03", title: <>Privacidade <span className="light">como</span> postura.</>, desc: "Não vendemos dados. Não compartilhamos com anunciantes. Não usamos o que você escreve para treinar modelos sem te perguntar. Privacidade é design, não disclaimer." },
  { cls: "sage", num: "VALOR 04", title: <>Acreditamos <span className="light">na</span> chama, não na fórmula.</>, desc: "Não existe fórmula universal para família. Existe atenção, intenção e prática. O RAYO oferece caminhos — você escolhe o seu." },
];

const HISTORY = [
  { y: "2024", h: "O começo: uma planilha de missões para o casal fundador.", p: "Tudo começou quando os fundadores criaram uma planilha de missões semanais para o próprio casamento. Em três meses, amigos pediam acesso. Em seis, nascia a primeira versão do RAYO." },
  { y: "2024", h: "Versão fechada com 50 famílias-piloto.", p: "Convidamos 50 famílias de fases diferentes para testar o app. Em 90 dias de uso, 87% queriam continuar. Foi quando o produto virou empresa." },
  { y: "2025", h: "Lançamento público e primeira rodada de captação.", p: "Em janeiro de 2025, abrimos o app para o público. Levantamos a primeira rodada com investidores anjo brasileiros que entendem a missão e respeitam a tese de privacidade." },
  { y: "2025", h: "Academia ganha curadoria com especialistas.", p: "Trazemos os primeiros parceiros da curadoria: psicólogos, terapeutas de casal e educadores. A Academia passa de 30 para 340 horas de conteúdo em 8 meses." },
  { y: "2026", h: "12 mil famílias ativas. Modo Família. Comunidade ativa.", p: "Em maio de 2026, somos 12 mil famílias ativas, lançamos o Modo Família e a Comunidade vira o terceiro pilar mais usado do app. Ainda no começo." },
];

const TEAM = [
  { i: "RV", n: "Rafael Valera", r: "Fundador & CEO", t: "PRODUTO · ESTRATÉGIA" },
  { i: "MR", n: "Marina Rossi", r: "Editora-chefe & Curadoria", t: "CONTEÚDO" },
  { i: "PA", n: "Pedro Almeida", r: "CTO & Engenharia", t: "ENG · PLATAFORMA" },
  { i: "BL", n: "Dra. Beatriz Lemos", r: "Conselho de curadoria", t: "PSICANÁLISE" },
  { i: "JC", n: "Júlia Castro", r: "Design & brand", t: "DESIGN" },
  { i: "LS", n: "Lucas Santana", r: "Comunidade & suporte", t: "COMUNIDADE" },
  { i: "AV", n: "Ana Vieira", r: "Operações & finanças", t: "OPS" },
  { i: "+", n: "Próximo(a)?", r: "Estamos contratando.", t: "VEJA AS VAGAS" },
];

export function EmpresaPage() {
  useSeoMeta({
    title: "Empresa · RAYO — Iluminar todas as fases da família",
    description: "Empresa brasileira construindo um lugar único para a vida em família, onde conteúdo, comunidade e prática se encontram, sem feed infinito e sem casal de vitrine.",
    canonical: "https://rayo.app.br/empresa",
  });
  return (
    <PublicLayout active="empresa">
      <section className="hero">
        <div className="wrap">
          <span className="hero-eyebrow">Sobre o RAYO</span>
          <h1 className="hero-title">Iluminar todas as <span className="light">fases</span> da família.</h1>
          <div className="hero-byline">
            <p>Somos uma empresa brasileira construindo um lugar único para a vida em família — onde conteúdo, comunidade e prática se encontram, sem feed infinito e sem casal de vitrine.</p>
            <div className="meta mono">
              <strong>RAYO Tecnologia LTDA</strong>
              Fundada em 2024
              São Paulo · Brasil
            </div>
          </div>
        </div>
      </section>

      <section className="mission">
        <div className="wrap">
          <span className="section-eyebrow">Nossa missão</span>
          <h2 className="section-title">Famílias <span className="light">mais</span> fortes — todos os dias, em todas as fases.</h2>
          <p className="lede">Acreditamos que a vida em família é a coisa mais importante e a menos cuidada do dia a dia. A internet ajudou em quase tudo — menos nisso. O RAYO nasce para mudar essa equação.</p>
          <div className="mission-pillars">
            <div className="mp"><span className="mp-num mono">01</span><h4>Acessível para <span className="light">qualquer</span> família.</h4><p>Plano gratuito robusto, conteúdo em português, linguagem clara, sem jargão de terapia ou guru.</p></div>
            <div className="mp"><span className="mp-num mono">02</span><h4>Construído com <span className="light">especialistas</span> reais.</h4><p>Curadoria revisada por psicólogos, terapeutas, educadores e famílias com história — não por algoritmo.</p></div>
            <div className="mp"><span className="mp-num mono">03</span><h4>Privado <span className="light">por</span> padrão.</h4><p>Sua jornada é sua. Sem feed, sem comparação, sem venda de dados. Você escolhe ativamente o que compartilha.</p></div>
          </div>
        </div>
      </section>

      <section className="values">
        <div className="wrap">
          <span className="section-eyebrow">Nossos valores</span>
          <h2 className="section-title">Como tomamos <span className="light">decisões.</span></h2>
          <p className="section-lede">São quatro princípios que guiam tudo — do design da próxima tela à conversa difícil entre cofundadores.</p>
          <div className="values-grid">
            {VALUES.map((v, i) => (
              <div key={i} className={`value-card${v.cls ? ` ${v.cls}` : ""}`}>
                <span className="value-num mono">{v.num}</span>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <span className="section-eyebrow">Nossa história</span>
          <h2 className="section-title">De uma planilha <span className="light">para</span> 12 mil famílias.</h2>
          <div className="history-list">
            {HISTORY.map((h, i) => (
              <div key={i} className="h-item">
                <div className="h-year mono">{h.y}</div>
                <div className="h-content">
                  <h4>{h.h}</h4>
                  <p>{h.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="team">
        <div className="wrap">
          <span className="section-eyebrow">Nosso time</span>
          <h2 className="section-title">Gente que <span className="light">vive</span> o que constrói.</h2>
          <p className="section-lede">Somos um time pequeno e enxuto — produto, conteúdo, engenharia e parcerias. Todo mundo aqui é família, em alguma fase.</p>
          <div className="team-grid">
            {TEAM.map((m, i) => (
              <div key={i} className="member">
                <div className="member-avatar">{m.i}</div>
                <div className="member-name">{m.n}</div>
                <div className="member-role">{m.r}</div>
                <div className="member-tag mono">{m.t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="numbers">
        <div className="wrap">
          <span className="section-eyebrow">RAYO em números</span>
          <h2 className="section-title">O que <span className="light">construímos</span> até aqui.</h2>
          <p className="section-lede">Cada número aqui representa uma família — não uma métrica de vaidade. Atualizado em maio de 2026.</p>
          <div className="nm-grid">
            {[
              ["12", "k+", "Famílias ativas no app"],
              ["340", "+", "Horas de conteúdo curado"],
              ["87", "%", "Concluem a primeira trilha"],
              ["4.9", "★", "Avaliação média na App Store"],
            ].map(([n, s, l], i) => (
              <div key={i} className="nm">
                <div className="nm-num">{n}<span className="light">{s}</span></div>
                <div className="nm-label">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="cta-strip">
          <h2 className="cta-strip-title">Quer entender o RAYO <span className="light">por</span> dentro?</h2>
          <a href="/cadastro" className="btn-primary" style={{ background: "var(--terra-500)", padding: "16px 28px", fontSize: "14px" }}>Experimentar grátis →</a>
        </div>
      </div>
    </PublicLayout>
  );
}
