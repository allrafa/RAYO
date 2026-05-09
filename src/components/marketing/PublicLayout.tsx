import type { ReactNode } from "react";

interface Props {
  active?: "recursos" | "como-funciona" | "empresa" | "blog" | "faq" | "imprensa" | "contato" | "excluir-dados" | null;
  children: ReactNode;
}

// Layout compartilhado das páginas públicas (marketing). Tudo vive dentro de
// `.marketing-page` para que o CSS de marketing-rayo.css fique scoped e não
// vaze para o app autenticado. Todos os links são <a> com hrefs reais — o
// roteamento é feito pelo `getPublicPageFromUrl` em App.tsx no carregamento
// (full reload). CTAs de auth apontam para `/login` e `/cadastro`, mapeados
// em `getInitialAuthIntent` para abrir direto no formulário correto, sem
// passar pelo welcome/onboarding.

export function PublicLayout({ active, children }: Props) {
  return (
    <div className="marketing-page">
      <header className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-brand">
            <span className="nav-mark">R</span>
            <span className="nav-name">RAYO</span>
          </a>
          <nav className="nav-links">
            <a href="/recursos" className={`nav-link${active === "recursos" ? " active" : ""}`}>Recursos</a>
            <a href="/como-funciona" className={`nav-link${active === "como-funciona" ? " active" : ""}`}>Como funciona</a>
            <a href="/empresa" className={`nav-link${active === "empresa" ? " active" : ""}`}>Empresa</a>
            <a href="/blog" className={`nav-link${active === "blog" ? " active" : ""}`}>Blog</a>
            <a href="/faq" className={`nav-link${active === "faq" ? " active" : ""}`}>FAQ</a>
          </nav>
          <div className="nav-cta">
            <a href="/login" className="btn-ghost">Entrar</a>
            <a href="/cadastro" className="btn-primary">Começar agora →</a>
          </div>
        </div>
      </header>

      {children}

      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="foot-brand-name">RAYO</div>
              <div className="foot-brand-sub">Ecossistema · Famílias</div>
              <p className="foot-tagline">
                Conteúdo, comunidade e práticas para iluminar todas as fases da sua família.
              </p>
            </div>
            {/* Apenas links para rotas públicas que existem de fato — evita
                404s de crawler. Quando novas páginas (/planos, /carreiras,
                /comunidade etc.) entrarem, adicionar aqui também. */}
            <div className="foot-col">
              <h4>Produto</h4>
              <a href="/recursos">Recursos</a>
              <a href="/como-funciona">Como funciona</a>
              <a href="/cadastro">Criar conta</a>
              <a href="/login">Entrar</a>
            </div>
            <div className="foot-col">
              <h4>Empresa</h4>
              <a href="/empresa">Sobre a empresa</a>
              <a href="/imprensa">Imprensa</a>
              <a href="/contato">Contato</a>
            </div>
            <div className="foot-col">
              <h4>Suporte</h4>
              <a href="/faq">FAQ</a>
              <a href="/blog">Blog</a>
              <a href="/contato">Fale conosco</a>
            </div>
            <div className="foot-col">
              <h4>Legal</h4>
              <a href="/terms">Termos de uso</a>
              <a href="/privacy">Privacidade</a>
              <a href="/excluir-dados">Exclusão de dados</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} RAYO. Todos os direitos reservados.</span>
            <span className="mono">rayo.app.br</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
