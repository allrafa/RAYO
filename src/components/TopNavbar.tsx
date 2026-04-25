import { Search, Bell, Heart, MessageCircle, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { useState } from "react";
import { toast } from "sonner@2.0.3";
import { useApp } from "./AppContext";
import { useScrollDirection } from "./hooks/useScrollDirection";
import { useUnreadMessages } from "./hooks/useUnreadMessages";
import { useTheme } from "./ThemeProvider";

interface TopNavbarProps {
  onTabChange: (tab: string) => void;
}

export function TopNavbar({ onTabChange }: TopNavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { userData } = useApp();
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 100 });
  const { theme, toggleTheme } = useTheme();
  const { count: unreadMessages } = useUnreadMessages();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.info(`Buscando por: ${searchQuery}`);
      // Aqui você pode implementar a lógica de busca real
    }
  };

  /**
   * Auto-hide navbar behavior:
   * - Scroll down: hide navbar (more screen space)
   * - Scroll up: show navbar (quick access)
   * - At top: always show navbar
   */
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
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar cursos, conteúdos, comunidades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-10 border-0 focus-visible:ring-2"
              style={{
                background: 'var(--raio-bg-tertiary)',
                color: 'var(--raio-text-primary)',
              }}
            />
          </div>
        </form>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Criar Conteúdo — em breve */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            disabled
            aria-disabled="true"
            aria-label="Criar conteúdo (em breve)"
            title="Criar conteúdo — em breve"
          >
            <Plus className="w-5 h-5" />
          </Button>

          {/* Favoritos — em breve */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            disabled
            aria-disabled="true"
            aria-label="Favoritos (em breve)"
            title="Favoritos — em breve"
          >
            <Heart className="w-5 h-5" />
          </Button>

          {/* Mensagens */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => onTabChange('conversas')}
            aria-label={unreadMessages > 0 ? `Mensagens (${unreadMessages} não lidas)` : 'Mensagens'}
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-[9px] bg-destructive text-destructive-foreground"
              >
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </Badge>
            )}
          </Button>

          {/* Notificações — em breve */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            disabled
            aria-disabled="true"
            aria-label="Notificações (em breve)"
            title="Notificações — em breve"
          >
            <Bell className="w-5 h-5" />
          </Button>

          {/* CTA Premium */}
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
