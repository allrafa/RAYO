import { PublicLayout } from "./PublicLayout";
import { useSeoMeta } from "./useSeoMeta";

const FACTS = [
  { n: "2024", l: "Ano de fundação", m: "São Paulo · BR" },
  { n: "12", suffix: "k+", l: "Famílias ativas no Brasil", m: "Maio · 2026" },
  { n: "7", l: "Pessoas no time", m: "100% remoto BR" },
  { n: "5", l: "Fases de vida cobertas", m: "Solteiro → Pais" },
];

const RELEASES = [
  { d: "06 mai 2026", h: "RAYO chega a 12 mil famílias e lança o Modo Família", p: "Nova funcionalidade conecta até 4 perfis (casal e filhos adolescentes) num mesmo plano e libera missões adaptadas para a dinâmica de família com filhos.", t: "Lançamento" },
  { d: "22 abr 2026", h: "RAYO firma parceria com a Dra. Beatriz Lemos para curadoria sobre adolescência", p: 'Psicanalista e referência nacional em adolescência se une ao conselho de curadoria do app para liderar a trilha "Limites na adolescência sem virar inimigo".', t: "Parceria" },
  { d: "14 mar 2026", h: "RAYO levanta rodada-semente liderada por anjos brasileiros", p: "Aporte foi feito por investidores anjo do ecossistema brasileiro de tecnologia, com a tese explícita de privacidade dos usuários e modelo de negócio sem venda de dados.", t: "Captação" },
  { d: "28 jan 2026", h: "App ultrapassa 4.9 estrelas na App Store após 8 meses de operação aberta", p: "RAYO se mantém entre os apps mais bem avaliados da categoria Bem-estar na loja brasileira da Apple, com mais de 1.200 avaliações.", t: "Marca" },
  { d: '05 dez 2025', h: 'RAYO publica seu manifesto de privacidade: "sem feed, sem venda, sem vitrine"', p: "Documento institucional posiciona a empresa contra o modelo dominante de redes sociais e detalha tecnicamente como os dados dos usuários são tratados.", t: "Posicionamento" },
];

const DOWNLOADS = [
  { cls: "", icon: "R", name: "Logos · Pacote completo", meta: "PNG, SVG, AI · Versões claro, escuro e mono · 14 MB" },
  { cls: "dark", icon: "R", name: "Logos · Versão escura", meta: "Para uso em fundos claros, materiais editoriais e reportagens." },
  { cls: "terra", icon: "R", name: "Logos · Versão monocromática", meta: "Versões em uma cor para impressão, jornal e reaproveitamento gráfico." },
  { cls: "", icon: "FOTOS DE PRODUTO", name: "Screenshots do app", meta: "12 telas em alta · iPhone e Android · PNG transparente" },
  { cls: "", icon: "FOTOS DA EQUIPE", name: "Retratos da liderança", meta: "Fundador, CTO e editora-chefe · 300dpi · Uso editorial" },
  { cls: "", icon: "GUIA DE MARCA", name: "Brand guidelines", meta: "Cores, tipografia, espaçamento, usos permitidos e proibidos · PDF · 22 págs" },
];

export function ImprensaPage() {
  useSeoMeta({
    title: "Imprensa · RAYO — Press kit, releases e contato",
    description: "Sala de imprensa do RAYO: boilerplate institucional, fatos rápidos, releases recentes, cobertura na imprensa e download de logos e assets.",
    canonical: "https://rayo.app.br/imprensa",
  });
  return (
    <PublicLayout active="imprensa">
      <section className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <span className="hero-eyebrow">Sala de imprensa</span>
              <h1 className="hero-title">Press kit do <span className="light">RAYO.</span></h1>
            </div>
            <div className="hero-side">
              <h3 className="mono">Atendimento à imprensa</h3>
              <p><strong>Marina Rossi</strong> — Diretora de Comunicação</p>
              <p><a href="mailto:imprensa@rayo.app.br">imprensa@rayo.app.br</a></p>
              <p>+55 11 9 0000-0000 (WhatsApp)</p>
              <p>Resposta em até 1 dia útil</p>
            </div>
          </div>
        </div>
      </section>

      <section className="facts">
        <div className="wrap">
          <span className="section-eyebrow">Fatos rápidos · Maio 2026</span>
          <h2 className="section-title">RAYO em <span className="light">um</span> piscar de olhos.</h2>
          <div className="facts-grid" style={{ marginTop: 48 }}>
            {FACTS.map((f, i) => (
              <div key={i} className="fact">
                <div className="fact-num">{f.n}{f.suffix && <span className="light">{f.suffix}</span>}</div>
                <div className="fact-label">{f.l}</div>
                <div className="fact-meta mono">{f.m}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="boiler">
            <span className="section-eyebrow">Boilerplate · texto institucional para citação</span>
            <h2>Sobre o <span className="light">RAYO.</span></h2>
            <div className="boiler-text">
              <p>RAYO é uma plataforma brasileira de bem-estar familiar fundada em 2024 e sediada em São Paulo. Reunimos conteúdo curado, comunidade moderada e missões diárias num mesmo app, com o objetivo de fortalecer famílias em todas as fases — Solteiro, Namoro, Noivos, Casados e Pais.</p>
              <p>Construímos contra três coisas: o feed infinito, o casal de vitrine e a fórmula milagrosa. Por isso o produto é privado por padrão, sem comparação social e baseado em prática, não só conhecimento. Hoje, mais de 12 mil famílias ativas usam o RAYO no Brasil.</p>
              <p>Pode ser citado como: <em>"RAYO, plataforma brasileira de bem-estar familiar"</em>.</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <span className="section-eyebrow">Press kit · Download</span>
          <h2 className="section-title">Logos, fotos e <span className="light">assets</span> de marca.</h2>
          <div className="downloads-grid">
            {DOWNLOADS.map((d, i) => (
              <div key={i} className={`dl-card${d.cls ? ` ${d.cls}` : ""}`}>
                <div className="dl-preview">{d.icon === "R" ? <div className="logo-circle">R</div> : d.icon}</div>
                <div className="dl-name">{d.name}</div>
                <div className="dl-meta">{d.meta}</div>
                <div className="dl-link">Baixar →</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <span className="section-eyebrow">Releases mais recentes</span>
          <h2 className="section-title">O que <span className="light">anunciamos.</span></h2>
          <div className="releases-list">
            {RELEASES.map((r, i) => (
              <div key={i} className="release">
                <span className="release-date mono">{r.d}</span>
                <div className="release-content">
                  <h3>{r.h}</h3>
                  <p>{r.p}</p>
                  <span className="release-tag mono">{r.t}</span>
                </div>
                <span className="release-arrow">→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="coverage">
        <div className="wrap">
          <span className="section-eyebrow">Cobertura na imprensa</span>
          <h2 className="section-title">Quem já <span className="light">falou</span> sobre o RAYO.</h2>
          <div className="coverage-grid">
            <div className="clip"><span className="clip-source mono">Folha de S.Paulo</span><p className="clip-quote">"Um aplicativo brasileiro que aposta na ideia oposta do feed infinito para falar de família."</p><div className="clip-meta mono">Caderno Tec · Mar/2026</div></div>
            <div className="clip"><span className="clip-source mono">Revista Vida Simples</span><p className="clip-quote">"O RAYO traz para o casal o que o Headspace fez pela meditação: tirar a teoria do papel."</p><div className="clip-meta mono">Edição 252 · Abr/2026</div></div>
            <div className="clip"><span className="clip-source mono">Podcast Café Brasil</span><p className="clip-quote">"Entrevista com o fundador sobre por que o app não tem feed, não tem curtida, não tem comparação."</p><div className="clip-meta mono">Episódio 1.184 · Fev/2026</div></div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="contact">
          <div>
            <h2>Vai escrever sobre o <span className="light">RAYO?</span></h2>
            <p>Falamos com a imprensa de segunda a sexta. Mande sua pauta, prazo e o que precisa — material, entrevista, demo do app — e nos coordenamos com você.</p>
          </div>
          <div className="contact-channels">
            <div className="channel"><span className="channel-label mono">E-mail · imprensa</span><span className="channel-value">imprensa@rayo.app.br</span></div>
            <div className="channel"><span className="channel-label mono">Porta-voz</span><span className="channel-value">Marina Rossi · Comunicação</span></div>
            <div className="channel"><span className="channel-label mono">WhatsApp</span><span className="channel-value">+55 11 9 0000-0000</span></div>
            <div className="channel"><span className="channel-label mono">Tempo de resposta</span><span className="channel-value">Até 1 dia útil</span></div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
