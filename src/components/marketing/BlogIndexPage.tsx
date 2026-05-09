import { useEffect, useState } from "react";
import { PublicLayout } from "./PublicLayout";
import { useSeoMeta } from "./useSeoMeta";
import { api } from "../../lib/api";

interface BlogPost {
  id: number;
  slug: string | null;
  title: string;
  excerpt: string;
  cover_url: string | null;
  author: string | null;
  tags: string[];
  segments: string[];
  published_at: string | null;
}

const PILLS = ["Tudo", "Solteiro", "Namoro", "Noivos", "Casados", "Pais", "Histórias reais", "Especialistas", "Bastidores RAYO"];
const TINTS = ["forest", "terra", "sage", "sand", "ochre", "ink"] as const;

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function readingMin(post: BlogPost): string {
  // Aproximação: 200 palavras/min sobre excerpt+título; valor mínimo de 3 min.
  const words = `${post.title} ${post.excerpt}`.split(/\s+/).filter(Boolean).length;
  const min = Math.max(3, Math.round(words / 200) || 3);
  return `${min} min`;
}

export function BlogIndexPage() {
  useSeoMeta({
    title: "Blog · RAYO — Ideias, histórias e práticas para a família",
    description: "Artigos, histórias reais, entrevistas com especialistas e práticas testadas — sobre relacionamento, parentalidade, autoconhecimento e as fases da vida em família.",
    canonical: "https://rayo.app.br/blog",
  });

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await api.get<{ items: BlogPost[] }>("/api/blog/posts?limit=30");
      if (!alive) return;
      setPosts(res.success && res.data ? res.data.items : []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <PublicLayout active="blog">
      <section className="hero">
        <div className="wrap">
          <span className="hero-eyebrow">Blog do RAYO · Ideias para a família</span>
          <h1 className="hero-title">Onde a teoria <span className="light">vira</span> conversa.</h1>
          <p className="hero-lede">Artigos, histórias reais, entrevistas com especialistas e práticas testadas — sobre relacionamento, parentalidade, autoconhecimento e as fases da vida em família.</p>
          <div className="cats">
            {PILLS.map((p, i) => (
              <span key={p} className={`cat-pill${i === 0 ? " active" : ""}`}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {featured && (
        <section className="featured">
          <div className="wrap">
            <div className="featured-grid">
              <div className="featured-img" style={featured.cover_url ? { backgroundImage: `url(${featured.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                <span className="featured-img-tag">Em destaque{featured.segments[0] ? ` · ${featured.segments[0]}` : ""}</span>
              </div>
              <div className="featured-text">
                <div className="featured-meta">
                  <span>{fmtDate(featured.published_at)}</span>
                  <span className="dot"></span>
                  <span>Leitura · {readingMin(featured)}</span>
                  {featured.segments[0] && (<><span className="dot"></span><span>{featured.segments[0]}</span></>)}
                </div>
                <h2>{featured.title}</h2>
                <p>{featured.excerpt}</p>
                {featured.author && (
                  <div className="featured-author">
                    <div className="author-avatar">{featured.author.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div className="author-name">{featured.author}</div>
                      <div className="author-meta">RAYO</div>
                    </div>
                  </div>
                )}
                {featured.slug && (
                  <a href={`/blog/${encodeURIComponent(featured.slug)}`} className="btn-primary" style={{ marginTop: 16, alignSelf: "flex-start" }}>
                    Ler matéria completa →
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="grid-section">
        <div className="wrap">
          <div className="grid-head">
            <h2>Mais <span className="light">recentes</span></h2>
            <span className="meta mono">{rest.length > 0 ? `${rest.length} artigos` : ""}</span>
          </div>

          {loading && <p style={{ color: "var(--ink-500)" }}>Carregando…</p>}
          {!loading && posts.length === 0 && (
            <div style={{ padding: "48px 0", color: "var(--ink-500)" }}>
              Em breve, novos artigos. Por enquanto, dá uma olhada em <a href="/recursos" style={{ color: "var(--terra-500)" }}>Recursos</a> ou no nosso <a href="/faq" style={{ color: "var(--terra-500)" }}>FAQ</a>.
            </div>
          )}
          {rest.length > 0 && (
            <div className="post-grid">
              {rest.map((p, i) => {
                const tint = TINTS[i % TINTS.length];
                const seg = p.segments[0] ?? "RAYO";
                const Card = (
                  <article className="post-card">
                    <div className={`post-img ${tint}`} style={p.cover_url ? { backgroundImage: `url(${p.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                      <span className="post-img-tag">{seg}</span>
                    </div>
                    <div className="post-meta"><span>{fmtDate(p.published_at)}</span><span className="dot"></span><span>{readingMin(p)}</span></div>
                    <h3>{p.title}</h3>
                    <p>{p.excerpt}</p>
                  </article>
                );
                return p.slug ? (
                  <a key={p.id} href={`/blog/${encodeURIComponent(p.slug)}`} style={{ display: "block" }}>{Card}</a>
                ) : (
                  <div key={p.id}>{Card}</div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="newsletter">
        <div className="wrap">
          <div className="nl-grid">
            <div>
              <span className="nl-eyebrow">Newsletter semanal</span>
              <h2 className="nl-title">Uma <span className="light">ideia</span> nova, todo domingo.</h2>
            </div>
            <div>
              <p className="nl-lede">A "Carta de domingo" do RAYO chega uma vez por semana com uma ideia, uma história e uma missão para experimentar com a sua família. Sem spam, sem promo.</p>
              <form className="nl-form" style={{ marginTop: 24 }} onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="seu@email.com" />
                <button type="submit">Assinar grátis</button>
              </form>
              <p className="nl-note">Cadastre-se para receber. Cancele quando quiser.</p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
