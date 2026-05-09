import { useEffect, useState } from "react";

export function TrilhaSucessoPage() {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSlug(params.get("slug"));
  }, []);

  return (
    <div className="ra-page min-h-screen pb-24 lg:pb-8 flex items-center justify-center px-4">
      <div
        className="rounded-2xl border p-8 max-w-md w-full text-center"
        style={{ borderColor: "var(--rayo-mist-300)", background: "white" }}
      >
        <div
          className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "var(--rayo-terra-50)" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               style={{ color: "var(--rayo-terra-600)" }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-xl mb-2" style={{ color: "var(--rayo-ink-900)" }}>
          Assinatura confirmada!
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--rayo-ink-500)" }}>
          Em alguns segundos sua trilha estará liberada. Recebemos a confirmação direto do Stripe e estamos sincronizando seu acesso.
        </p>
        <div className="flex flex-col gap-2">
          {slug ? (
            <a
              href={`/trilhas/${slug}`}
              className="rounded-xl py-3 text-sm"
              style={{ background: "var(--rayo-terra-500)", color: "white" }}
            >
              Voltar para a trilha
            </a>
          ) : (
            <a
              href="/trilhas"
              className="rounded-xl py-3 text-sm"
              style={{ background: "var(--rayo-terra-500)", color: "white" }}
            >
              Ver minhas trilhas
            </a>
          )}
          <a href="/" className="text-sm underline text-muted-foreground py-2">
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}
