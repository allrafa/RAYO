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
 * Ambos ficam no canto superior direito como pílulas circulares
 * para não empurrar o conteúdo das páginas e não brigar com o header
 * próprio de cada tela.
 */
export function MobileTopBar({ onOpenMessages, onTabChange }: MobileTopBarProps) {
  const { count } = useUnreadMessages();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div
        className="lg:hidden fixed z-40 flex items-center gap-2"
        style={{
          top: "calc(12px + env(safe-area-inset-top))",
          right: "calc(12px + env(safe-area-inset-right))",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if ("vibrate" in navigator) navigator.vibrate(10);
            setSearchOpen(true);
          }}
          aria-label="Buscar"
          className="flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md shadow-md transition-transform active:scale-95"
          style={{
            background: "var(--raio-bg-overlay)",
            border: "1px solid var(--raio-border-default)",
            color: "var(--raio-text-primary)",
          }}
        >
          <Search className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            if ("vibrate" in navigator) navigator.vibrate(10);
            onOpenMessages();
          }}
          aria-label={
            count > 0 ? `Mensagens (${count} não lidas)` : "Mensagens"
          }
          className="relative flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md shadow-md transition-transform active:scale-95"
          style={{
            background: "var(--raio-bg-overlay)",
            border: "1px solid var(--raio-border-default)",
            color: "var(--raio-text-primary)",
          }}
        >
          <MessageCircle className="w-5 h-5" />
          {count > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: "var(--raio-error)",
                color: "#FFFFFF",
                border: "2px solid var(--raio-bg-primary)",
              }}
              aria-hidden="true"
            >
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
