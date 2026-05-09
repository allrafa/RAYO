import { useState } from "react";
import { PublicLayout } from "./PublicLayout";
import { useSeoMeta } from "./useSeoMeta";
import { api } from "../../lib/api";

const ASSUNTOS = [
  { v: "", l: "Escolha um assunto…" },
  { v: "suporte", l: "Suporte e dúvidas sobre o app" },
  { v: "planos", l: "Planos, pagamento e reembolso" },
  { v: "conta", l: "Problemas com minha conta" },
  { v: "conteudo", l: "Sugestão de conteúdo ou parceria" },
  { v: "empresa", l: "Parcerias corporativas" },
  { v: "imprensa", l: "Imprensa e mídia" },
  { v: "carreira", l: "Carreiras e candidaturas" },
  { v: "privacidade", l: "Privacidade e LGPD" },
  { v: "outro", l: "Outro assunto" },
];

export function ContatoPage() {
  useSeoMeta({
    title: "Contato · RAYO — Suporte, parcerias, imprensa e ideias",
    description: "Suporte, parcerias, imprensa, ideias para o produto, dúvidas sobre conteúdo. Respondemos em até um dia útil.",
    canonical: "https://rayo.app.br/contato",
  });

  const [form, setForm] = useState({ nome: "", email: "", assunto: "", mensagem: "" });
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setErrMsg("");
    const res = await api.post<{ ok: boolean; delivered: boolean }>("/api/contato", form);
    if (res.success) {
      setState("ok");
      setForm({ nome: "", email: "", assunto: "", mensagem: "" });
    } else {
      setState("error");
      const code = res.error?.code;
      setErrMsg(
        code === "RATE_LIMITED" ? "Muitas mensagens deste IP. Tente novamente em até 1 hora."
          : res.error?.message || "Não conseguimos enviar agora. Tente novamente em instantes.",
      );
    }
  }

  return (
    <PublicLayout active="contato">
      <section className="hero">
        <div className="wrap">
          <span className="hero-eyebrow">Fale com a gente</span>
          <h1 className="hero-title">Estamos <span className="light">por</span> aqui.</h1>
          <p className="hero-lede">Suporte, parcerias, imprensa, ideias para o produto, dúvidas sobre conteúdo — tudo passa por aqui. Respondemos em até um dia útil.</p>
        </div>
      </section>

      <section className="main">
        <div className="wrap">
          <div className="main-grid">
            <form className="form-card" onSubmit={onSubmit} noValidate>
              <h2>Mande sua <span className="light">mensagem.</span></h2>
              <p className="form-sub">Preencha o que faz sentido. Quanto mais contexto, melhor a resposta.</p>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="nome">Nome</label>
                  <input
                    id="nome" name="nome" type="text" required minLength={2} maxLength={120}
                    placeholder="Como devemos te chamar?"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">E-mail</label>
                  <input
                    id="email" name="email" type="email" required maxLength={200}
                    placeholder="seu@email.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="assunto">Assunto</label>
                <select
                  id="assunto" name="assunto" required
                  value={form.assunto}
                  onChange={(e) => setForm((f) => ({ ...f, assunto: e.target.value }))}
                >
                  {ASSUNTOS.map((a) => (
                    <option key={a.v} value={a.v}>{a.l}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="mensagem">Mensagem</label>
                <textarea
                  id="mensagem" name="mensagem" required minLength={10} maxLength={5000}
                  placeholder="Conta tudo. Quanto mais detalhe, mais rápido conseguimos ajudar."
                  value={form.mensagem}
                  onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
                />
              </div>

              {state === "ok" && (
                <p style={{ color: "var(--sage-700)", fontSize: 14, margin: "8px 0" }}>
                  Mensagem enviada. Vamos responder em até um dia útil.
                </p>
              )}
              {state === "error" && (
                <p style={{ color: "var(--terra-700)", fontSize: 14, margin: "8px 0" }}>{errMsg}</p>
              )}

              <div className="form-actions">
                <p className="form-note">Ao enviar, você concorda com a nossa <a href="/privacy">Política de Privacidade</a>. Não compartilhamos seus dados.</p>
                <button type="submit" className="submit-btn" disabled={state === "sending"}>
                  {state === "sending" ? "Enviando…" : "Enviar mensagem →"}
                </button>
              </div>
            </form>

            <div>
              <div className="side-block dark">
                <h3>Canais <span className="light">diretos</span></h3>
                <p>Para assuntos específicos, escreva direto para o time responsável.</p>
                {[
                  ["Suporte", "suporte@rayo.app.br"],
                  ["Imprensa", "imprensa@rayo.app.br"],
                  ["Parcerias", "parcerias@rayo.app.br"],
                  ["Privacidade · LGPD", "dpo@rayo.app.br"],
                ].map(([l, v]) => (
                  <div key={l} className="channel">
                    <div className="icon">@</div>
                    <div>
                      <span className="channel-label mono">{l}</span>
                      <span className="channel-value">{v}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="side-block">
                <h3>Quando <span className="light">esperar</span> resposta</h3>
                <p>De segunda a sexta, em horário comercial (Brasília). Demandas críticas (pagamento, acesso bloqueado) têm prioridade.</p>
                <div className="channel"><div className="icon">⏱</div><div><span className="channel-label mono">Tempo médio</span><span className="channel-value">Até 1 dia útil</span></div></div>
                <div className="channel"><div className="icon">🇧🇷</div><div><span className="channel-label mono">Onde estamos</span><span className="channel-value">São Paulo · Brasil</span></div></div>
              </div>

              <div className="side-block">
                <h3>Tem <span className="light">dúvida</span> rápida?</h3>
                <p>Antes de escrever, dá uma olhada no FAQ — talvez sua dúvida esteja respondida lá.</p>
                <a href="/faq" className="btn-ghost" style={{ marginTop: 8 }}>Ir para o FAQ →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="faq-teaser">
        <div className="wrap">
          <span className="faq-teaser-eyebrow">Antes de escrever</span>
          <h2 className="faq-teaser-title">As 3 <span className="light">dúvidas</span> mais comuns.</h2>
          <div className="faq-teaser-grid">
            <div className="faq-teaser-card"><h4>Como cancelo minha assinatura?</h4><p>Em Perfil → Assinatura → Cancelar. O acesso continua até o fim do período já pago. Sem multa.</p></div>
            <div className="faq-teaser-card"><h4>O RAYO funciona offline?</h4><p>Parcialmente. No plano pago, você baixa cursos e podcasts para ouvir sem internet. Comunidade exige conexão.</p></div>
            <div className="faq-teaser-card"><h4>Posso usar com meu parceiro(a)?</h4><p>Sim. O Modo Casal conecta os dois apps e libera missões conjuntas. Conteúdo privado continua privado.</p></div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
