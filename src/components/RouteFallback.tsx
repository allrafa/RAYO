// Task #180 — Skeleton/loader exibido enquanto chunks lazy de cada
// rota são baixados. Centralizado pra reuso e pra evitar tela branca
// durante a primeira navegação a uma área não carregada.

export function RouteFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando"
      className="min-h-[60vh] flex items-center justify-center"
      style={{ background: "var(--rayo-sand-100)" }}
    >
      <div className="text-center space-y-4">
        <div
          className="w-12 h-12 mx-auto rounded-full flex items-center justify-center"
          style={{ background: "var(--rayo-terra-100)" }}
        >
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--rayo-terra-500)",
              borderTopColor: "transparent",
            }}
          />
        </div>
        <p
          className="text-sm"
          style={{ color: "var(--rayo-ink-700)" }}
        >
          Carregando...
        </p>
      </div>
    </div>
  );
}

export function PublicRouteFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando"
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--rayo-sand-100)" }}
    >
      <div
        className="w-10 h-10 border-2 rounded-full animate-spin"
        style={{
          borderColor: "var(--rayo-terra-500)",
          borderTopColor: "transparent",
        }}
      />
    </div>
  );
}
