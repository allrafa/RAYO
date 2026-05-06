import { useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { useUnreadMessages } from "./hooks/useUnreadMessages";
import { MobileSearchPage } from "./MobileSearchPage";

interface MobileTopBarProps {
  onOpenMessages: () => void;
  onTabChange: (tab: string) => void;
}

/**
 * Slim mobile-only top bar com dois ícones flutuantes:
 *   • Lupa (Task #44) — abre /MobileSearchPage em tela cheia.
 *   • Envelope (Task #41) — atalho para Mensagens.
 *
 * Pílulas circulares no canto superior direito (não empurram o
 * conteúdo das páginas e não brigam com o header próprio de cada tela).
 * Estilo RAYO DS v2.0 (sand-100, forest-900, terra dot).
 */
export function MobileTopBar({ onOpenMessages, onTabChange }: MobileTopBarProps) {
  const { count } = useUnreadMessages();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div className="rn-mobile-pills">
        <button
          type="button"
          className="rn-mobile-pill"
          onClick={() => {
            if ("vibrate" in navigator) navigator.vibrate(10);
            setSearchOpen(true);
          }}
          aria-label="Buscar"
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="rn-mobile-pill"
          onClick={() => {
            if ("vibrate" in navigator) navigator.vibrate(10);
            onOpenMessages();
          }}
          aria-label={count > 0 ? `Mensagens (${count} não lidas)` : "Mensagens"}
        >
          <MessageCircle className="w-5 h-5" />
          {count > 0 && (
            <span className="rn-mobile-pill-dot" aria-hidden="true">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </div>

      <MobileSearchPage
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onTabChange={onTabChange}
      />
    </>
  );
}
