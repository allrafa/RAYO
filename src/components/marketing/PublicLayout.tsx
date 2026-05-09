import type { ReactNode } from "react";

interface Props {
  active?: "recursos" | "como-funciona" | "empresa" | "blog" | "faq" | "imprensa" | "contato" | null;
  children: ReactNode;
}

// Layout compartilhado das páginas públicas (marketing). Tudo vive dentro de
// `.marketing-page` para que o CSS de marketing-rayo.css fique scoped e não
// vaze para o app autenticado. Todos os links são <a> com hrefs reais — o
// roteamento é feito pelo `getPublicPageFromUrl` em App.tsx no carregamento
// (full reload). Para CTAs de signup/login usamos `/?auth=signup|login` para
// que o app principal abra direto na tela correta.

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
            <div className="foot-col">
              <h4>Produto</h4>
              <a href="/recursos">Recursos</a>
              <a href="/como-funciona">Como funciona</a>
              <a href="/planos">Planos</a>
              <a href="/baixar">Baixar app</a>
            </div>
            <div className="foot-col">
              <h4>Empresa</h4>
              <a href="/empresa">Sobre a empresa</a>
              <a href="/imprensa">Imprensa</a>
              <a href="/carreiras">Carreiras</a>
              <a href="/contato">Contato</a>
            </div>
            <div className="foot-col">
              <h4>Suporte</h4>
              <a href="/faq">FAQ</a>
              <a href="/blog">Blog</a>
              <a href="/comunidade">Comunidade</a>
              <a href="/status">Status</a>
            </div>
            <div className="foot-col">
              <h4>Legal</h4>
              <a href="/terms">Termos de uso</a>
              <a href="/privacy">Privacidade</a>
              <a href="/cookies">Cookies</a>
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
