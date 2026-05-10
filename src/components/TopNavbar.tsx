import { Search, Heart, MessageCircle, Plus, BookOpen, Play, Headphones, Film, Users, MessagesSquare } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner@2.0.3";
import { useApp } from "./AppContext";
import { useAuth, userHasRole } from "./AuthContext";
import { useScrollDirection } from "./hooks/useScrollDirection";
import { useUnreadMessages } from "./hooks/useUnreadMessages";
import { api } from "../lib/api";
import { navigateToSearchHit } from "../lib/searchNavigate";

interface TopNavbarProps {
  onTabChange: (tab: string) => void;
  isSidebarMinimized?: boolean;
}

interface SearchResult {
  kind: "curso" | "video" | "audio" | "reels" | "podcast" | "post" | "user";
  id: number;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  ctaTarget: string | null;
}

export function TopNavbar({ onTabChange, isSidebarMinimized = false }: TopNavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const {
    setCurrentCourseId,
    setIsInCourseDetail,
    setCurrentVideoId,
    setIsInVideoPage,
  } = useApp();
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 100 });
  const { count: unreadMessages } = useUnreadMessages();
  const { user } = useAuth();
  // Botões "em breve" (Criar conteúdo / Favoritos) só fazem sentido pra
  // produtores+ que têm contexto pra entender o que vem aí. Pra usuário
  // final (client) os botões desabilitados só geram dúvida — escondemos.
  const showStaffPreviews = userHasRole(user, "producer");

  // Task #44: busca real com debounce + dropdown.
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      const res = await api.get<{ results: SearchResult[] }>(
        `/api/search?q=${encodeURIComponent(trimmed)}`,
      );
      if (cancelled) return;
      if (res.success && res.data) {
        setResults(res.data.results);
        setShowResults(true);
      }
      setLoading(false);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results.length > 0) handleSelect(results[0]);
  };

  const handleSelect = (r: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    navigateToSearchHit(r, {
      onTabChange,
      setCurrentCourseId,
      setIsInCourseDetail,
      setCurrentVideoId,
      setIsInVideoPage,
    });
  };

  const shouldHide = scrollDirection === "down" && !isAtTop;
  const cls = [
    "rn-topbar",
    isSidebarMinimized ? "with-min" : "",
    shouldHide ? "hide" : "",
  ].filter(Boolean).join(" ");

  return (
    <header className={cls} role="banner">
      <div className="rn-topbar-inner">
        <div ref={wrapperRef} className="rn-search-wrap">
          <form onSubmit={handleSubmit}>
            <Search className="rn-search-icon w-4 h-4" aria-hidden="true" />
            <input
              type="search"
              className="rn-search"
              placeholder="Buscar cursos, conteúdos, comunidade…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setShowResults(true);
              }}
              aria-label="Buscar"
            />
          </form>

          {showResults && searchQuery.trim().length >= 2 && (
            <div role="listbox" className="rn-search-results">
              {loading ? (
                <p className="rn-search-empty">Buscando…</p>
              ) : results.length === 0 ? (
                <p className="rn-search-empty">Nenhum resultado.</p>
              ) : (
                <ul>
                  {results.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <button
                        type="button"
                        onClick={() => handleSelect(r)}
                        className="rn-search-item"
                      >
                        <span className="rn-search-item-thumb">
                          {r.thumbnail ? (
                            <img src={r.thumbnail} alt="" loading="lazy" />
                          ) : (
                            kindIcon(r.kind)
                          )}
                        </span>
                        <span className="rn-search-item-text">
                          <span className="rn-search-item-title">{r.title}</span>
                          {r.subtitle && (
                            <span className="rn-search-item-sub">{r.subtitle}</span>
                          )}
                        </span>
                        <span className="rn-search-item-tag">{kindLabel(r.kind)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="rn-topbar-actions">
          {showStaffPreviews && (
            <>
              <button
                type="button"
                className="rn-icon-btn"
                disabled
                aria-disabled="true"
                aria-label="Criar conteúdo (em breve)"
                title="Criar conteúdo — em breve"
              >
                <Plus className="w-5 h-5" />
              </button>

              <button
                type="button"
                className="rn-icon-btn"
                disabled
                aria-disabled="true"
                aria-label="Favoritos (em breve)"
                title="Favoritos — em breve"
              >
                <Heart className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            type="button"
            className="rn-icon-btn"
            onClick={() => onTabChange("conversas")}
            aria-label={
              unreadMessages > 0 ? `Mensagens (${unreadMessages} não lidas)` : "Mensagens"
            }
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && <span className="rn-icon-btn-dot" aria-hidden="true" />}
          </button>

          <NotificationBell onTabChange={onTabChange} />

          {/* Pill Premium — só mostra "Premium" pra quem realmente tem acesso
              (assinante ativo ou admin). Pra quem não tem, vira CTA pro
              catálogo de trilhas. Antes mostrava "Você já é Premium! 🎉" pra
              todo mundo, o que era enganoso. */}
          {user?.is_premium ? (
            <button
              type="button"
              className="rn-premium-pill"
              onClick={() => toast.success("Você já é Premium! 🎉")}
              aria-label="Status Premium"
            >
              Premium
            </button>
          ) : (
            <button
              type="button"
              className="rn-premium-pill"
              onClick={() => { window.location.href = "/trilhas"; }}
              aria-label="Conhecer planos premium"
              title="Conhecer trilhas premium"
            >
              Seja Premium
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function kindLabel(k: SearchResult["kind"]): string {
  if (k === "curso") return "Curso";
  if (k === "video") return "Vídeo";
  if (k === "audio") return "Áudio";
  if (k === "reels") return "Reels";
  if (k === "podcast") return "Podcast";
  if (k === "post") return "Post";
  return "Pessoa";
}

function kindIcon(k: SearchResult["kind"]) {
  const cls = "w-4 h-4";
  if (k === "curso") return <BookOpen className={cls} />;
  if (k === "audio" || k === "podcast") return <Headphones className={cls} />;
  if (k === "reels") return <Film className={cls} />;
  if (k === "post") return <MessagesSquare className={cls} />;
  if (k === "user") return <Users className={cls} />;
  return <Play className={cls} />;
}
