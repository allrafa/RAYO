import { Search, Bell, Heart, MessageCircle, Plus, BookOpen, Play, Headphones, Film, Users, MessagesSquare } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner@2.0.3";
import { useApp } from "./AppContext";
import { useScrollDirection } from "./hooks/useScrollDirection";
import { useUnreadMessages } from "./hooks/useUnreadMessages";
import { useTheme } from "./ThemeProvider";
import { api } from "../lib/api";

interface TopNavbarProps {
  onTabChange: (tab: string) => void;
}

interface SearchResult {
  kind: "curso" | "video" | "audio" | "reels" | "podcast" | "post" | "user";
  id: number;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  ctaTarget: string | null;
}

export function TopNavbar({ onTabChange }: TopNavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { setCurrentCourseId, setIsInCourseDetail } = useApp();
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 100 });
  const { theme, toggleTheme } = useTheme();
  const { count: unreadMessages } = useUnreadMessages();

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
    if (r.kind === "curso") {
      setCurrentCourseId(r.id);
      setIsInCourseDetail(true);
      onTabChange("academia");
      return;
    }
    if (r.kind === "post") {
      onTabChange("comunidade");
      return;
    }
    if (r.kind === "user") {
      onTabChange("perfil");
      return;
    }
    if (r.ctaTarget) {
      window.open(r.ctaTarget, "_blank", "noopener,noreferrer");
    } else {
      onTabChange("academia");
    }
  };

  const shouldHide = scrollDirection === 'down' && !isAtTop;

  return (
    <header
      className={`
        hidden lg:block lg:fixed lg:top-0 lg:left-64 lg:right-0 h-16
        backdrop-blur-xl
        transition-transform duration-300 ease-in-out
        ${shouldHide ? '-translate-y-full' : 'translate-y-0'}
      `}
      style={{
        zIndex: 40,
        background: 'var(--raio-bg-overlay)',
        borderBottom: '1px solid var(--raio-border-default)',
      }}
    >
      <div className="h-full px-6 flex items-center justify-between gap-4">
        <div ref={wrapperRef} className="flex-1 max-w-xl relative">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--raio-text-tertiary)' }} />
              <Input
                type="search"
                placeholder="Buscar cursos, conteúdos, comunidade…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (results.length > 0) setShowResults(true);
                }}
                className="pl-10 pr-4 h-10 border-0 focus-visible:ring-2"
                style={{
                  background: 'var(--raio-bg-tertiary)',
                  color: 'var(--raio-text-primary)',
                }}
              />
            </div>
          </form>

          {showResults && searchQuery.trim().length >= 2 && (
            <div
              role="listbox"
              className="absolute left-0 right-0 mt-2 rounded-lg shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto"
              style={{
                background: 'var(--raio-bg-secondary)',
                border: '1px solid var(--raio-border-default)',
                zIndex: 50,
              }}
            >
              {loading ? (
                <p className="p-4 text-sm text-muted-foreground">Buscando…</p>
              ) : results.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Nenhum resultado.
                </p>
              ) : (
                <ul>
                  {results.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <button
                        type="button"
                        onClick={() => handleSelect(r)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                      >
                        <span
                          className="w-9 h-9 rounded-md shrink-0 flex items-center justify-center overflow-hidden"
                          style={{ background: 'var(--raio-bg-tertiary)' }}
                        >
                          {r.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            kindIcon(r.kind)
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">
                            {r.title}
                          </span>
                          {r.subtitle && (
                            <span className="block text-xs text-muted-foreground truncate">
                              {r.subtitle}
                            </span>
                          )}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            background: 'var(--raio-bg-tertiary)',
                            color: 'var(--raio-text-secondary)',
                          }}
                        >
                          {kindLabel(r.kind)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-muted disabled:opacity-50"
            disabled
            aria-disabled="true"
            aria-label="Criar conteúdo (em breve)"
            title="Criar conteúdo — em breve"
          >
            <Plus className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-muted disabled:opacity-50"
            disabled
            aria-disabled="true"
            aria-label="Favoritos (em breve)"
            title="Favoritos — em breve"
          >
            <Heart className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-muted"
            onClick={() => onTabChange('conversas')}
            aria-label={unreadMessages > 0 ? `Mensagens (${unreadMessages} não lidas)` : 'Mensagens'}
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[9px] bg-destructive text-destructive-foreground">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </Badge>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-muted disabled:opacity-50"
            disabled
            aria-disabled="true"
            aria-label="Notificações (em breve)"
            title="Notificações — em breve"
          >
            <Bell className="w-5 h-5" />
          </Button>

          <Button
            className="ml-2 hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)',
              color: theme === 'dark' ? 'var(--raio-text-primary)' : 'var(--raio-text-inverse)',
            }}
            onClick={() => toast.success("Você já é Premium! 🎉")}
            aria-label="Status Premium"
          >
            Premium
          </Button>
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
  const cls = "w-4 h-4 text-muted-foreground";
  if (k === "curso") return <BookOpen className={cls} />;
  if (k === "audio" || k === "podcast") return <Headphones className={cls} />;
  if (k === "reels") return <Film className={cls} />;
  if (k === "post") return <MessagesSquare className={cls} />;
  if (k === "user") return <Users className={cls} />;
  return <Play className={cls} />;
}
