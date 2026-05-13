import { Component, type ErrorInfo, type ReactNode } from "react";

// Task #203 — Boundary leve em volta dos <Suspense> de rotas lazy.
// Captura ChunkLoadError (tipicamente bundle stale após deploy) e qualquer
// outro erro de render, mostrando um cartão amigável "Recarregar" em vez
// da tela branca silenciosa. Sem dependência externa.

interface Props {
  children: ReactNode;
  variant?: "page" | "fullscreen";
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; message?: string };
  const name = String(e.name ?? "");
  const msg = String(e.message ?? "");
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (typeof console !== "undefined") {
      console.error("[RouteErrorBoundary]", error, info?.componentStack);
    }
  }

  private handleReload = (): void => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const isFull = this.props.variant === "fullscreen";
    const wrapperClass = isFull
      ? "min-h-screen flex items-center justify-center px-6"
      : "min-h-[60vh] flex items-center justify-center px-6";

    const title = this.state.isChunkError
      ? "Atualização disponível"
      : "Algo deu errado";
    const body = this.state.isChunkError
      ? "Publicamos uma versão nova do RAYO. Recarregue a página para continuar."
      : "Tivemos um problema ao carregar essa parte do app. Tente recarregar.";

    return (
      <div
        role="alert"
        className={wrapperClass}
        style={{ background: "var(--rayo-sand-100)" }}
      >
        <div
          className="max-w-md w-full text-center rounded-2xl p-8"
          style={{
            background: "var(--rayo-sand-50, #fff)",
            border: "1px solid var(--rayo-sand-200, #eee)",
          }}
        >
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ background: "var(--rayo-terra-100)" }}
            aria-hidden
          >
            <span style={{ fontSize: 28 }}>↻</span>
          </div>
          <h2
            className="text-lg mb-2"
            style={{ color: "var(--rayo-forest-900)", fontWeight: 700 }}
          >
            {title}
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: "var(--rayo-ink-700)" }}
          >
            {body}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-5 py-2 rounded-full text-sm"
            style={{
              background: "var(--rayo-terra-500)",
              color: "#fff",
              fontWeight: 600,
              border: 0,
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
