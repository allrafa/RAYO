import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, X, Clock, Heart, BookOpen, Users, MessageCircle, Video, Music, GraduationCap, Headphones, Baby, Mic, Camera } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { useApp } from "./AppContext";

interface SpotifyStyleSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// Categorias de conteúdo do RAIO com cores inspiradas no Spotify
const searchCategories = [
  {
    id: 'casamento',
    title: 'Casamento',
    description: 'Fortaleça seu relacionamento',
    color: 'bg-gradient-to-br from-red-500 to-pink-600',
    icon: '💕'
  },
  {
    id: 'comunicacao',
    title: 'Comunicação',
    description: 'Melhore o diálogo no relacionamento',
    color: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    icon: '💬'
  },
  {
    id: 'financas',
    title: 'Finanças',
    description: 'Educação financeira para casais',
    color: 'bg-gradient-to-br from-green-500 to-emerald-600',
    icon: '💰'
  },
  {
    id: 'intimidade',
    title: 'Intimidade',
    description: 'Construa uma conexão profunda',
    color: 'bg-gradient-to-br from-purple-500 to-violet-600',
    icon: '❤️'
  },
  {
    id: 'filhos',
    title: 'Filhos & Educação',
    description: 'Eduque com amor e sabedoria',
    color: 'bg-gradient-to-br from-yellow-500 to-orange-600',
    icon: '👶'
  },
  {
    id: 'namoro',
    title: 'Namoro Cristão',
    description: 'Relacionamento com propósito',
    color: 'bg-gradient-to-br from-rose-500 to-pink-600',
    icon: '🌹'
  },
  {
    id: 'proposito',
    title: 'Propósito',
    description: 'Descubra seu chamado',
    color: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    icon: '✨'
  },
  {
    id: 'fe',
    title: 'Fé & Espiritualidade',
    description: 'Cresça na caminhada com Deus',
    color: 'bg-gradient-to-br from-amber-500 to-yellow-600',
    icon: '🙏'
  },
  {
    id: 'lideranca',
    title: 'Liderança',
    description: 'Lidere sua família com sabedoria',
    color: 'bg-gradient-to-br from-slate-600 to-gray-700',
    icon: '👑'
  },
  {
    id: 'conflitos',
    title: 'Gestão de Conflitos',
    description: 'Resolva desentendimentos',
    color: 'bg-gradient-to-br from-orange-500 to-red-600',
    icon: '🤝'
  },
  {
    id: 'perdao',
    title: 'Perdão',
    description: 'Liberte-se e perdoe',
    color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    icon: '🕊️'
  },
  {
    id: 'autoestima',
    title: 'Autoestima',
    description: 'Valorize quem você é',
    color: 'bg-gradient-to-br from-pink-500 to-rose-600',
    icon: '🌟'
  },
  {
    id: 'ansiedade',
    title: 'Ansiedade & Estresse',
    description: 'Encontre paz interior',
    color: 'bg-gradient-to-br from-blue-600 to-indigo-700',
    icon: '🧘‍♀️'
  },
  {
    id: 'gratidao',
    title: 'Gratidão',
    description: 'Cultive um coração grato',
    color: 'bg-gradient-to-br from-yellow-600 to-orange-700',
    icon: '🌻'
  },
  {
    id: 'tempo',
    title: 'Gestão do Tempo',
    description: 'Organize sua vida',
    color: 'bg-gradient-to-br from-gray-600 to-slate-700',
    icon: '⏰'
  },
  {
    id: 'habitos',
    title: 'Hábitos Saudáveis',
    description: 'Transforme sua rotina',
    color: 'bg-gradient-to-br from-green-600 to-lime-700',
    icon: '🌱'
  },
  {
    id: 'sonhos',
    title: 'Sonhos & Metas',
    description: 'Realize seus objetivos',
    color: 'bg-gradient-to-br from-violet-600 to-purple-700',
    icon: '🎯'
  },
  {
    id: 'sabedoria',
    title: 'Sabedoria',
    description: 'Decisões com discernimento',
    color: 'bg-gradient-to-br from-amber-600 to-orange-700',
    icon: '📚'
  },
  {
    id: 'familia',
    title: 'Família',
    description: 'Fortaleça os laços familiares',
    color: 'bg-gradient-to-br from-teal-600 to-cyan-700',
    icon: '🏠'
  },
  {
    id: 'amizades',
    title: 'Amizades',
    description: 'Cultive relacionamentos saudáveis',
    color: 'bg-gradient-to-br from-lime-600 to-green-700',
    icon: '👫'
  }
];

export function SpotifyStyleSearch({ isOpen, onClose }: SpotifyStyleSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { setCurrentVideoId, setIsInVideoPage } = useApp();

  // Debounce da busca para melhor performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtrar categorias baseado na busca
  const getFilteredCategories = (query: string) => {
    if (!query.trim()) return searchCategories;
    
    const lowerQuery = query.toLowerCase();
    return searchCategories.filter(category => 
      category.title.toLowerCase().includes(lowerQuery) ||
      category.description.toLowerCase().includes(lowerQuery) ||
      category.id.toLowerCase().includes(lowerQuery)
    );
  };

  const filteredCategories = getFilteredCategories(debouncedQuery);
  const hasSearchResults = debouncedQuery.trim().length > 0;

  // Carregar pesquisas recentes do localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('raio-recent-searches');
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (error) {
          console.error('Erro ao carregar buscas recentes:', error);
        }
      }
      
      // Focar no input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      // Reset quando modal fecha
      setSearchQuery("");
      setDebouncedQuery("");
    }
  }, [isOpen]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Adicionar às buscas recentes
      const newRecentSearches = [
        query,
        ...recentSearches.filter(s => s !== query)
      ].slice(0, 5);
      
      setRecentSearches(newRecentSearches);
      localStorage.setItem('raio-recent-searches', JSON.stringify(newRecentSearches));
      
      setSearchQuery(query);
      
      // Não fecha mais o modal - mantém aberto para mostrar resultados
      // onClose(); - REMOVIDO
    }
  };

  const handleCategoryClick = (category: any) => {
    // Define a categoria como busca para mostrar resultados relacionados
    setSearchQuery(category.title);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('raio-recent-searches');
  };

  const removeRecentSearch = (searchToRemove: string) => {
    const newRecentSearches = recentSearches.filter(s => s !== searchToRemove);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('raio-recent-searches', JSON.stringify(newRecentSearches));
  };

  const clearSearchAndBackToCategories = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      {/* Header Fixo */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-background border-b border-border p-4 z-10 flex items-center">
        <div className="flex items-center gap-3 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              ref={searchInputRef}
              placeholder="O que você quer explorar?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-base bg-muted/50 border-0 focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  handleSearch(searchQuery);
                }
              }}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearchAndBackToCategories}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={searchQuery.trim() ? clearSearchAndBackToCategories : onClose}
            className="text-muted-foreground"
          >
            {searchQuery.trim() ? "Limpar" : "Cancelar"}
          </Button>
        </div>
      </div>

      {/* Container Scrollável */}
      <div 
        className="absolute top-20 left-0 right-0 bottom-0 overflow-y-auto scrollbar-hide" 
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch', // iOS momentum scrolling
          overscrollBehavior: 'contain' // Previne scroll do background
        }}
      >
        <div className="p-4 space-y-8 pb-20">
        {/* Pesquisas Recentes */}
        {recentSearches.length > 0 && !hasSearchResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pesquisas recentes
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearRecentSearches}
                className="text-muted-foreground"
              >
                Limpar buscas recentes
              </Button>
            </div>
            
            <div className="space-y-2">
              {recentSearches.map((search, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer group"
                  onClick={() => handleSearch(search)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                      <Search className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{search}</p>
                      <p className="text-sm text-muted-foreground">Busca</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(search);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Descubra algo novo */}
        {!hasSearchResults && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Descubra algo novo</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {searchCategories.slice(0, 6).map((category) => (
                <div
                  key={category.id}
                  className={`${category.color} p-4 rounded-lg cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg relative overflow-hidden will-change-transform`}
                  onClick={() => handleCategoryClick(category)}
                >
                  <div className="relative z-10">
                    <h3 className="font-semibold text-white text-lg mb-1">
                      {category.title}
                    </h3>
                    <p className="text-white/90 text-sm">
                      {category.description}
                    </p>
                  </div>
                  
                  <div className="absolute bottom-2 right-2 text-2xl opacity-80">
                    {category.icon}
                  </div>
                  
                  {/* Gradient overlay para melhor legibilidade */}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/30"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navegar por todas as categorias */}
        {!hasSearchResults && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Navegar por tudo</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {searchCategories.map((category) => (
                <div
                  key={category.id}
                  className={`${category.color} aspect-square rounded-lg cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg relative overflow-hidden p-4 flex flex-col justify-between will-change-transform`}
                  onClick={() => handleCategoryClick(category)}
                >
                  <div className="relative z-10">
                    <h3 className="font-bold text-white text-base leading-tight">
                      {category.title}
                    </h3>
                  </div>
                  
                  <div className="text-3xl self-end opacity-90 transform rotate-12">
                    {category.icon}
                  </div>
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-black/25"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sugestões de busca em tempo real */}
        {hasSearchResults && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Search className="w-5 h-5" />
                Resultados para "{debouncedQuery}"
              </h2>
              <Badge variant="secondary" className="text-xs">
                {filteredCategories.length} {filteredCategories.length === 1 ? 'resultado' : 'resultados'}
              </Badge>
            </div>
            
            {filteredCategories.length > 0 ? (
              <div className="space-y-4">
                {/* Categorias correspondentes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      className={`${category.color} p-4 rounded-lg cursor-pointer transform transition-all duration-300 hover:scale-102 hover:shadow-lg relative overflow-hidden`}
                      onClick={() => handleCategoryClick(category)}
                    >
                      <div className="relative z-10 flex items-center gap-3">
                        <div className="text-2xl">
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-base mb-1">
                            {category.title}
                          </h3>
                          <p className="text-white/90 text-sm">
                            {category.description}
                          </p>
                        </div>
                        <div className="text-white/70">
                          <ArrowLeft className="w-4 h-4 transform rotate-180" />
                        </div>
                      </div>
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-black/30"></div>
                    </div>
                  ))}
                </div>

                {/* Busca exata como opção */}
                <div className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                     onClick={() => handleSearch(searchQuery)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                      <Search className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Buscar por "{searchQuery}"</p>
                      <p className="text-sm text-muted-foreground">Ver todos os conteúdos relacionados</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground transform rotate-180" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tente buscar por outros termos ou explore as categorias abaixo
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={clearSearchAndBackToCategories}
                  >
                    Explorar categorias
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}