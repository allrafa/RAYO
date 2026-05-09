import { useEffect } from "react";

interface SeoOptions {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
}

const PUBLIC_SITE_URL = "https://rayo.app.br";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Hook minimalista — atualiza title + meta tags no client. Suficiente pro
// nosso caso (a maior parte dos crawlers atuais executa JS); SSR fica para
// a próxima iteração se virar prioridade.
export function useSeoMeta({ title, description, canonical, ogImage }: SeoOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    setMeta("name", "description", description);
    const canonicalUrl = canonical || (typeof window !== "undefined" ? `${PUBLIC_SITE_URL}${window.location.pathname}` : PUBLIC_SITE_URL);
    setLink("canonical", canonicalUrl);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", "RAYO");
    if (ogImage) setMeta("property", "og:image", ogImage);
    setMeta("name", "twitter:card", ogImage ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (ogImage) setMeta("name", "twitter:image", ogImage);
    return () => {
      document.title = prevTitle;
    };
  }, [title, description, canonical, ogImage]);
}
