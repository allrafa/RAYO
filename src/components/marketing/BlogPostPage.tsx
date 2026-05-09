import { useEffect, useState } from "react";
import { PublicLayout } from "./PublicLayout";
import { useSeoMeta } from "./useSeoMeta";
import { Markdown } from "./markdown";
import { api } from "../../lib/api";

interface BlogPost {
  id: number;
  slug: string | null;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  author: string | null;
  tags: string[];
  segments: string[];
  published_at: string | null;
}

interface Props { slug: string }

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function BlogPostPage({ slug }: Props) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await api.get<{ post: BlogPost }>(`/api/blog/posts/${encodeURIComponent(slug)}`);
      if (!alive) return;
      if (res.success && res.data) {
        setPost(res.data.post);
        setState("ok");
      } else {
        setState("missing");
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  useSeoMeta({
    title: post ? `${post.title} · Blog RAYO` : "Blog · RAYO",
    description: post?.excerpt || "Blog do RAYO — ideias, histórias e práticas para a família.",
    canonical: `https://rayo.app.br/blog/${encodeURIComponent(slug)}`,
    ogImage: post?.cover_url ?? undefined,
  });

  return (
    <PublicLayout active="blog">
      <section className="hero">
        <div className="wrap">
          <span className="hero-eyebrow"><a href="/blog" style={{ color: "var(--terra-500)" }}>← Voltar para o Blog</a></span>
          {state === "loading" && <p style={{ color: "var(--ink-500)", marginTop: 24 }}>Carregando…</p>}
          {state === "missing" && (
            <>
              <h1 className="hero-title">Artigo não encontrado.</h1>
              <p className="hero-lede">O link pode estar quebrado ou o artigo foi despublicado. Volte para o <a href="/blog" style={{ color: "var(--terra-500)" }}>Blog</a>.</p>
            </>
          )}
          {state === "ok" && post && (
            <>
              <h1 className="hero-title">{post.title}</h1>
              <p className="hero-lede">{post.excerpt}</p>
              <div className="featured-meta" style={{ marginTop: 16 }}>
                {post.published_at && <span>{fmtDate(post.published_at)}</span>}
                {post.author && (<><span className="dot"></span><span>{post.author}</span></>)}
                {post.segments[0] && (<><span className="dot"></span><span>{post.segments[0]}</span></>)}
              </div>
            </>
          )}
        </div>
      </section>

      {state === "ok" && post && (
        <section>
          <div className="wrap">
            {post.cover_url && (
              <div className="featured-img" style={{ backgroundImage: `url(${post.cover_url})`, backgroundSize: "cover", backgroundPosition: "center", marginBottom: 32 }} />
            )}
            <article
              style={{
                maxWidth: 720,
                margin: "0 auto",
                fontSize: 18,
                lineHeight: 1.7,
                color: "var(--ink-700)",
              }}
            >
              <Markdown source={post.body || ""} />
            </article>

            {post.tags.length > 0 && (
              <div style={{ maxWidth: 720, margin: "32px auto 0", display: "flex", flexWrap: "wrap", gap: 8 }}>
                {post.tags.map((t) => (
                  <span key={t} className="phase-tag">{t}</span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="wrap">
        <div className="cta-strip">
          <h2 className="cta-strip-title">Quer aplicar isso na <span className="light">sua</span> família?</h2>
          <a href="/cadastro" className="btn-primary">Começar grátis →</a>
        </div>
      </div>
    </PublicLayout>
  );
}
