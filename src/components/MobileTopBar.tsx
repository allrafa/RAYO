import { MessageCircle } from "lucide-react";
import { useUnreadMessages } from "./hooks/useUnreadMessages";

interface MobileTopBarProps {
  onOpenMessages: () => void;
}

/**
 * Slim mobile-only top bar that surfaces the Messages entry point pulled
 * out of the bottom navbar in Task #41. Renders only on small screens
 * (the desktop TopNavbar already exposes the same envelope icon). The
 * button is a fixed circular pill in the top-right corner so it doesn't
 * push page content down or fight with each page's own header.
 */
export function MobileTopBar({ onOpenMessages }: MobileTopBarProps) {
  const { count } = useUnreadMessages();

  return (
    <button
      type="button"
      onClick={() => {
        if ('vibrate' in navigator) navigator.vibrate(10);
        onOpenMessages();
      }}
      aria-label={count > 0 ? `Mensagens (${count} não lidas)` : 'Mensagens'}
      className="lg:hidden fixed z-40 flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md shadow-md transition-transform active:scale-95"
      style={{
        top: 'calc(12px + env(safe-area-inset-top))',
        right: 'calc(12px + env(safe-area-inset-right))',
        background: 'var(--raio-bg-overlay)',
        border: '1px solid var(--raio-border-default)',
        color: 'var(--raio-text-primary)',
      }}
    >
      <MessageCircle className="w-5 h-5" />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{
            background: 'var(--raio-error)',
            color: '#FFFFFF',
            border: '2px solid var(--raio-bg-primary)',
          }}
          aria-hidden="true"
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
