import { PublicLayout } from "./PublicLayout";
import { useSeoMeta } from "./useSeoMeta";

interface QA { q: string; a: React.ReactNode }
interface Section { num: string; title: React.ReactNode; intro: string; qas: QA[] }

const SECTIONS: Section[] = [
  {
    num: "CATEGORIA 01",
    title: <>Conta &amp; <span className="light">Cadastro</span></>,
    intro: "Como criar conta, fazer login, recuperar senha e gerenciar seus dados básicos.",
    qas: [
      { q: "Preciso pagar para criar conta?", a: <p>Não. A criação de conta é gratuita e dá acesso à primeira trilha completa, missões diárias e à Comunidade. Os planos pagos liberam toda a Academia, modo casal e funcionalidades premium.</p> },
      { q: "Posso usar o RAYO sem informar minha fase de vida?", a: <p>Pode, mas a recomendação fica genérica. As 5 perguntas iniciais existem para a curadoria fazer sentido para você desde o primeiro dia. Você pode pular e responder depois.</p> },
      { q: "Como mudo minha fase quando algo na vida muda?", a: <p>É só ir em Perfil → Editar fase. Você pode mudar quantas vezes quiser. As trilhas em andamento continuam acessíveis no histórico, e as próximas recomendações se ajustam à nova fase.</p> },
      { q: "Esqueci minha senha. Como recupero?", a: <p>Na tela de login, toque em "Esqueci minha senha" e informe seu e-mail. Você recebe um link em até 5 minutos. Se não chegar, confira a caixa de spam ou fale com a gente em suporte@rayo.app.br.</p> },
      { q: "Como excluo minha conta permanentemente?", a: <p>Vá em Perfil → Configurações → Excluir conta. A exclusão é definitiva: missões, trilhas em andamento, posts na Comunidade e dados do perfil são removidos em até 30 dias. Confira a <a href="/privacy">Política de Privacidade</a> para detalhes.</p> },
    ],
  },
  {
    num: "CATEGORIA 02",
    title: <>Conteúdo &amp; <span className="light">Trilhas</span></>,
    intro: "Como funciona a curadoria, quem produz o conteúdo, formatos disponíveis e progresso.",
    qas: [
      { q: "Quem produz o conteúdo do RAYO?", a: <p>Temos um time interno de curadoria e uma rede de especialistas convidados — psicólogos, terapeutas de casal, educadores e famílias com histórias para contar. Todo conteúdo passa por revisão antes de entrar na Academia.</p> },
      { q: "O RAYO é religioso ou tem orientação espiritual específica?", a: <p>O RAYO é uma plataforma para todas as famílias. Temos curadoria com diferentes vozes e perspectivas, incluindo conteúdo de raiz cristã e conteúdo laico. Você escolhe o que faz sentido para você — e pode filtrar conteúdo religioso nas configurações.</p> },
      { q: "Quanto tempo dura uma trilha?", a: <p>As trilhas variam de 7 a 30 dias, com 10 a 20 minutos por dia. Você pode pausar a qualquer momento — a trilha espera por você e retoma de onde parou.</p> },
      { q: "Posso baixar conteúdo para ouvir offline?", a: <p>Sim, no plano pago. Podcasts e cursos podem ser baixados para ouvir sem conexão. Shorts continuam streaming.</p> },
      { q: "Tem certificado nos cursos?", a: <p>Cursos completos da Academia geram certificado de conclusão em PDF. Você baixa a partir de Perfil → Conquistas. Trilhas e missões não geram certificado — são jornadas pessoais.</p> },
    ],
  },
  {
    num: "CATEGORIA 03",
    title: <>Modo Casal &amp; <span className="light">Família</span></>,
    intro: "Como conectar o app com seu parceiro ou com sua família, e o que cada um vê.",
    qas: [
      { q: "Como ativo o Modo Casal?", a: <p>Vá em Perfil → Modo Casal → Convidar parceiro(a). Você gera um link ou um código de 6 dígitos para seu parceiro entrar. Os dois precisam ter conta no RAYO.</p> },
      { q: "Meu parceiro vê o que eu escrevo nas anotações privadas?", a: <p>Não. Anotações, diários e respostas de reflexões são sempre privadas — nem o parceiro vê. O Modo Casal compartilha apenas a missão atual e o status (concluído ou pendente). O conteúdo da reflexão é seu.</p> },
      { q: "Funciona em famílias com filhos?", a: <p>Sim. Existe um Modo Família que permite conectar até 4 pessoas (casal + filhos adolescentes a partir de 13 anos). Os pais têm controle sobre o que cada filho vê, e cada um tem seu próprio perfil e progresso.</p> },
      { q: "Posso desconectar o Modo Casal depois?", a: <p>Pode, a qualquer momento. As missões individuais ficam, e as missões marcadas como casal viram histórico privado para cada um.</p> },
    ],
  },
  {
    num: "CATEGORIA 04",
    title: <>Planos &amp; <span className="light">Pagamento</span></>,
    intro: "Quanto custa, formas de pagamento, cancelamento, reembolso e mudança de plano.",
    qas: [
      { q: "Quais são os planos do RAYO?", a: <p>Temos três planos: Free (gratuito, com 1 trilha completa e missões diárias), Premium (Academia inteira, podcasts ilimitados e Modo Casal) e Família (até 4 perfis e Modo Família). A página de <a href="/planos">Planos</a> tem o comparativo completo e os preços atuais.</p> },
      { q: "Posso cancelar quando quiser?", a: <p>Sim. Você cancela em Perfil → Assinatura → Cancelar. O acesso continua até o fim do período já pago. Não há multa, taxa ou renovação automática depois do cancelamento.</p> },
      { q: "Tem reembolso se eu não gostar?", a: <p>Sim. Se você cancelar nos primeiros 14 dias da assinatura, devolvemos 100% do valor — sem perguntas. Basta pedir em suporte@rayo.app.br.</p> },
      { q: "Quais formas de pagamento vocês aceitam?", a: <p>Cartão de crédito (Visa, Mastercard, Elo, Amex), Pix e boleto. Pelo app da Apple ou Google, o pagamento é processado pela loja correspondente.</p> },
      { q: "Posso mudar de plano no meio do mês?", a: <p>Pode. Se você fizer upgrade, cobramos a diferença proporcional ao tempo restante. Se fizer downgrade, a mudança acontece no início do próximo ciclo.</p> },
    ],
  },
  {
    num: "CATEGORIA 05",
    title: <>Privacidade &amp; <span className="light">Dados</span></>,
    intro: "O que coletamos, como protegemos, com quem compartilhamos e o que você pode controlar.",
    qas: [
      { q: "O RAYO vende ou compartilha meus dados?", a: <p>Não. Não vendemos seus dados nem compartilhamos com anunciantes. Só usamos dados internamente para melhorar a recomendação e a curadoria — e tudo está descrito na nossa <a href="/privacy">Política de Privacidade</a>, em linguagem clara.</p> },
      { q: "Quem vê meu progresso e minhas missões?", a: <p>Por padrão, só você. Você pode ativar o Modo Casal para que seu parceiro veja a missão atual e o status, mas o conteúdo das suas reflexões é sempre privado. A Comunidade só vê o que você posta ativamente nela.</p> },
      { q: "Vocês têm conformidade com a LGPD?", a: <p>Sim. Somos uma empresa brasileira e seguimos a LGPD (Lei nº 13.709/2018). Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento via dpo@rayo.app.br.</p> },
      { q: "Posso baixar tudo que tenho no RAYO antes de excluir minha conta?", a: <p>Pode. Em Perfil → Configurações → Exportar dados, você baixa um arquivo .zip com tudo que produziu na plataforma (anotações, missões concluídas, posts da Comunidade) em até 24h.</p> },
    ],
  },
];

const PILLS = ["Tudo", "Conta & Cadastro", "Conteúdo & Trilhas", "Comunidade", "Modo Casal & Família", "Planos & Pagamento", "Privacidade & Dados", "Suporte técnico"];

export function FaqPage() {
  useSeoMeta({
    title: "FAQ · RAYO — Perguntas frequentes",
    description: "Conta, conteúdo, trilhas, modo casal, planos, pagamento e privacidade. As dúvidas mais comuns sobre o RAYO, respondidas.",
    canonical: "https://rayo.app.br/faq",
  });
  return (
    <PublicLayout active="faq">
      <section className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <span className="hero-eyebrow">Central de ajuda · FAQ</span>
              <h1 className="hero-title">Perguntas <span className="light">frequentes.</span></h1>
            </div>
            <div>
              <p className="hero-lede">Aqui ficam as dúvidas que mais aparecem. Se não encontrar o que procura, fale com a gente — respondemos em até um dia útil.</p>
              <div className="hero-search">
                <span style={{ fontSize: 18 }}>⌕</span>
                <input type="text" placeholder="Buscar por palavra-chave (ex.: cancelamento, modo casal)" />
              </div>
            </div>
          </div>
          <div className="cat-nav">
            {PILLS.map((p, i) => (
              <span key={p} className={`cat-pill${i === 0 ? " active" : ""}`}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {SECTIONS.map((sec, idx) => (
        <section key={idx} className="faq-section">
          <div className="wrap">
            <div className="faq-section-head">
              <div>
                <span className="num mono">{sec.num}</span>
                <h2>{sec.title}</h2>
                <p>{sec.intro}</p>
              </div>
              <div className="faq-list">
                {sec.qas.map((qa, i) => (
                  <details key={i} className="faq-item">
                    <summary>{qa.q}</summary>
                    <div className="answer">{qa.a}</div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="help">
        <div className="wrap">
          <span className="help-eyebrow">Não achou o que procurava?</span>
          <h2 className="help-title">Estamos a um <span className="light">clique.</span></h2>
          <div className="help-grid">
            <div className="help-card"><h4>Falar com suporte</h4><p>Resposta em até 1 dia útil, de seg a sex. Para dúvidas técnicas, conta, planos ou bugs.</p><a href="/contato" className="link">Abrir contato →</a></div>
            <div className="help-card"><h4>Comunidade do RAYO</h4><p>Pergunte para outras famílias que já passaram pelo que você está passando. Curadoria ativa.</p><a href="/cadastro" className="link">Entrar na Comunidade →</a></div>
            <div className="help-card"><h4>Status do serviço</h4><p>Veja em tempo real se há instabilidade no app, no streaming ou no pagamento.</p><a href="/status" className="link">Ver status →</a></div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
