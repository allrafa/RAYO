import { useEffect, useRef, useState } from "react";
import { Search, X, ArrowLeft, BookOpen, Play, Headphones, Users, MessagesSquare, Film } from "lucide-react";
import { Input } from "./ui/input";
import { useApp } from "./AppContext";
import { api } from "../lib/api";
import { navigateToSearchHit } from "../lib/searchNavigate";

// Task #44 — Busca mobile em tela cheia.
// Aciona /api/search com debounce, mostra resultados agrupados visualmente
// e mantém uma lista local de buscas recentes. Resultados navegam para a
// aba/recurso correspondente; conteúdos com URL externa abrem em nova aba.

interface Result {
  kind: "curso" | "video" | "audio" | "reels" | "podcast" | "post" | "user";
  id: number;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  ctaTarget: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onTabChange: (tab: string) => void;
}

const RECENTS_KEY = "rayo-search-recents";
const MAX_RECENTS = 8;

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function saveRecents(list: string[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
  } catch {
    // ignore
  }
}

export function MobileSearchPage({ open, onClose, onTabChange }: Props) {
  const {
    setCurrentCourseId,
    setIsInCourseDetail,
    setCurrentVideoId,
    setIsInVideoPage,
  } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>(loadRecents);
  const inputRef = useRef<HTMLInputElement>(null);

  // Task #117 — restaura scrollY de quem abriu a busca. Sem isso a página
  // de fundo pula pro topo quando o overlay fecha, porque travamos
  // overflow do <body> enquanto o overlay está aberto.
  const savedScrollRef = useRef<number>(0);
  useEffect(() => {
    if (open) {
      savedScrollRef.current = window.scrollY;
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQ("");
      setResults([]);
      const y = savedScrollRef.current;
      if (y > 0) {
        requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      const res = await api.get<{ results: Result[] }>(
        `/api/search?q=${encodeURIComponent(trimmed)}`,
      );
      if (cancelled) return;
      if (res.success && res.data) setResults(res.data.results);
      setLoading(false);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, open]);

  const commitRecent = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecents((prev) => {
      const next = [trimmed, ...prev.filter((p) => p !== trimmed)].slice(
        0,
        MAX_RECENTS,
      );
      saveRecents(next);
      return next;
    });
  };

  const handleSelect = (r: Result) => {
    commitRecent(q);
    navigateToSearchHit(r, {
      onTabChange,
      setCurrentCourseId,
      setIsInCourseDetail,
      setCurrentVideoId,
      setIsInVideoPage,
      onClose,
    });
  };

  if (!open) return null;

  return (
    <div
      className="lg:hidden fixed inset-0 z-[60] flex flex-col"
      style={{ background: "var(--rayo-sand-100)" }}
      role="dialog"
      aria-label="Buscar"
    >
      <header
        className="flex items-center gap-2 px-3 py-2"
        style={{
          paddingTop: "calc(8px + env(safe-area-inset-top))",
          borderBottom: "1px solid var(--rayo-sand-300)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar busca"
          className="w-10 h-10 flex items-center justify-center rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--rayo-ink-400)" }}
          />
          <Input
            ref={inputRef}
            type="search"
            inputMode="search"
            placeholder="Buscar cursos, vídeos, posts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRecent(q);
            }}
            className="pl-10 pr-9 h-10"
            style={{
              background: "var(--rayo-sand-300)",
              color: "var(--rayo-forest-900)",
            }}
          />
          {q.length > 0 && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Limpar"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {q.trim().length < 2 ? (
          <RecentsView
            recents={recents}
            onPick={(t) => setQ(t)}
            onClear={() => {
              setRecents([]);
              saveRecents([]);
            }}
          />
        ) : loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            Buscando…
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            Nenhum resultado para "{q}".
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--rayo-sand-300)" }}>
            {results.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 active:bg-muted"
                >
                  <div
                    className="w-12 h-12 rounded-md shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ background: "var(--rayo-sand-300)" }}
                  >
                    {r.thumbnail ? (
                      // Não usamos ImageWithFallback aqui pra manter o
                      // bundle leve dentro do overlay.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      kindIconNode(r.kind)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {r.subtitle}
                      </p>
                    )}
                    <span
                      className="inline-block text-[10px] mt-1 px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--rayo-sand-300)",
                        color: "var(--rayo-ink-700)",
                      }}
                    >
                      {kindLabel(r.kind)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RecentsView({
  recents,
  onPick,
  onClear,
}: {
  recents: string[];
  onPick: (term: string) => void;
  onClear: () => void;
}) {
  if (recents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-6 text-center">
        Comece a digitar para buscar conteúdos, cursos, posts ou pessoas.
      </p>
    );
  }
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">Buscas recentes</p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:underline"
        >
          Limpar
        </button>
      </div>
      <ul className="space-y-1">
        {recents.map((r) => (
          <li key={r}>
            <button
              type="button"
              onClick={() => onPick(r)}
              className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-md hover:bg-muted"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{r}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function kindLabel(k: Result["kind"]): string {
  if (k === "curso") return "Curso";
  if (k === "video") return "Vídeo";
  if (k === "audio") return "Áudio";
  if (k === "reels") return "Reels";
  if (k === "podcast") return "Podcast";
  if (k === "post") return "Post";
  return "Pessoa";
}

function kindIconNode(k: Result["kind"]) {
  const cls = "w-5 h-5 text-muted-foreground";
  if (k === "curso") return <BookOpen className={cls} />;
  if (k === "audio" || k === "podcast") return <Headphones className={cls} />;
  if (k === "reels") return <Film className={cls} />;
  if (k === "post") return <MessagesSquare className={cls} />;
  if (k === "user") return <Users className={cls} />;
  return <Play className={cls} />;
}
