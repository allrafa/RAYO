import React, { useState, useEffect, useRef } from "react";
import { X, Search, Clock, TrendingUp, Video, BookOpen, Users, MessageCircle, Filter, Star, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { useApp } from "./AppContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { smartSearch, getSearchResultMessage, getSearchSuggestions } from "./SmartSearchEngine";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'course' | 'post' | 'conversation' | 'podcast';
  category?: string;
  thumbnail?: string;
  author?: string;
  duration?: string;
  views?: string;
  rating?: number;
  isPremium?: boolean;
  tags?: string[];
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const SEARCH_CATEGORIES = [
  { id: 'all', label: 'Tudo', icon: Search },
  { id: 'videos', label: 'Vídeos', icon: Video },
  { id: 'courses', label: 'Cursos', icon: BookOpen },
  { id: 'community', label: 'Comunidade', icon: Users },
  { id: 'conversations', label: 'Conversas', icon: MessageCircle },
];

const TRENDING_SEARCHES = [
  "comunicação no casamento",
  "educação financeira para casais", 
  "intimidade",
  "conflitos",
  "filhos",
  "namoro cristão",
  "proposito"
];

const MOCK_SEARCH_RESULTS: SearchResult[] = [
  {
    id: "1",
    title: "Como Melhorar a Comunicação no Casamento",
    description: "Técnicas práticas para uma comunicação mais efetiva entre casais",
    type: "video",
    category: "Relacionamentos",
    duration: "12:34",
    views: "2.3k visualizações",
    rating: 4.8,
    isPremium: false,
    tags: ["comunicação", "casamento", "relacionamento"]
  },
  {
    id: "2", 
    title: "Academia RAIO: Fundamentos do Casamento",
    description: "Curso completo sobre os pilares de um casamento sólido",
    type: "course",
    category: "Academia",
    duration: "4h 20min",
    views: "1.2k estudantes",
    rating: 4.9,
    isPremium: true,
    tags: ["casamento", "fundamentos", "curso"]
  },
  {
    id: "3",
    title: "Dificuldades na Intimidade - Como Resolver?",
    description: "Discussão da comunidade sobre desafios íntimos no relacionamento",
    type: "post",
    category: "Comunidade",
    author: "Maria Silva",
    views: "45 comentários",
    tags: ["intimidade", "relacionamento", "ajuda"]
  },
  {
    id: "4",
    title: "Conversa com Jessica sobre Perdão",
    description: "Sessão de coaching sobre perdão e reconciliação no relacionamento",
    type: "conversation",
    category: "Conselheiro",
    duration: "8:15",
    tags: ["perdão", "coaching", "jessica"]
  }
];

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { setCurrentVideoId, setIsInVideoPage, setCurrentCourseId, setIsInCourseDetail } = useApp();

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Carregar buscas recentes do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('raio-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Erro ao carregar buscas recentes:', error);
      }
    }
  }, []);

  // Simular busca em tempo real
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsLoading(true);
      const debounceTimeout = setTimeout(() => {
        performSearch(searchQuery, selectedCategory);
      }, 300);

      return () => clearTimeout(debounceTimeout);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedCategory]);

  const performSearch = async (query: string, category: string) => {
    try {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Usa o sistema de busca inteligente - NUNCA retorna zero resultados
      let results = smartSearch(MOCK_SEARCH_RESULTS, query, {
        minResults: 5,
        fallbackToPopular: true
      });

      // Filtra por tipo se categoria específica
      if (category !== 'all') {
        const typeMap = {
          'videos': 'video',
          'courses': 'course', 
          'community': 'post',
          'conversations': 'conversation'
        };
        const targetType = typeMap[category as keyof typeof typeMap];
        
        // Primeiro tenta filtrar, mas se não houver resultados, usa busca inteligente sem filtro
        const filteredResults = results.filter(result => result.type === targetType);
        
        if (filteredResults.length === 0) {
          // Se não há resultados para o tipo específico, busca todos os tipos
          results = smartSearch(MOCK_SEARCH_RESULTS, query, {
            minResults: 5,
            fallbackToPopular: true
          });
        } else {
          results = filteredResults;
        }
      }

      // Gera mensagem contextual
      const message = getSearchResultMessage(query, results.length, MOCK_SEARCH_RESULTS);
      setResultMessage(message);

      // Gera sugestões se poucos resultados diretos
      if (results.length < 10) {
        const searchSuggestions = getSearchSuggestions(query, MOCK_SEARCH_RESULTS);
        setSuggestions(searchSuggestions);
      } else {
        setSuggestions([]);
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Erro na busca:', error);
      // Mesmo em caso de erro, retorna resultados populares
      setSearchResults(MOCK_SEARCH_RESULTS.slice(0, 5));
      setResultMessage('Resultados recomendados para você');
    } finally {
      setIsLoading(false);
    }
  };

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
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'video':
        setCurrentVideoId(result.id);
        setIsInVideoPage(true);
        break;
      case 'course':
        setCurrentCourseId(result.id);
        setIsInCourseDetail(true);
        break;
      case 'post':
        // Navegar para o post na comunidade
        break;
      case 'conversation':
        // Abrir conversa
        break;
    }
    onClose();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('raio-recent-searches');
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'course': return BookOpen;
      case 'post': return Users;
      case 'conversation': return MessageCircle;
      default: return Search;
    }
  };

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Vídeo';
      case 'course': return 'Curso';
      case 'post': return 'Post';
      case 'conversation': return 'Conversa';
      default: return 'Conteúdo';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0 gap-0">
        <DialogTitle className="sr-only">
          Buscar no RAIO
        </DialogTitle>
        <DialogDescription className="sr-only">
          Busque por vídeos, cursos, posts da comunidade e conversas no RAIO
        </DialogDescription>
        <div className="flex flex-col h-full">
          {/* Header de busca */}
          <div className="border-b bg-background p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold">Buscar no RAIO</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                ref={searchInputRef}
                placeholder="O que você está procurando?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-12 text-base bg-muted border-border focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleSearch(searchQuery);
                  }
                }}
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Filtros por categoria */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-5 h-auto p-1">
                {SEARCH_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <TabsTrigger
                      key={category.id}
                      value={category.id}
                      className="flex flex-col items-center gap-1 py-2 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{category.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Conteúdo de busca */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Estado inicial - sem busca */}
              {!searchQuery && (
                <div className="space-y-6">
                  {/* Buscas recentes */}
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Buscas recentes
                        </h3>
                        <Button variant="ghost" size="sm" onClick={clearRecentSearches}>
                          Limpar
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((search, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="cursor-pointer hover:bg-muted-foreground/20"
                            onClick={() => handleSearch(search)}
                          >
                            {search}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Buscas em alta */}
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Em alta no RAIO
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {TRENDING_SEARCHES.map((search, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleSearch(search)}
                        >
                          {search}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Resultados da busca */}
              {searchQuery && (
                <div className="space-y-4">
                  {searchResults.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-medium">
                              {resultMessage}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {searchResults.length} item{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Sugestões de termos relacionados */}
                        {suggestions.length > 0 && (
                          <div className="bg-muted/50 rounded-lg p-3 border border-border">
                            <p className="text-sm text-muted-foreground mb-2">
                              Você também pode buscar por:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {suggestions.map((suggestion, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                  onClick={() => handleSearch(suggestion)}
                                >
                                  {suggestion}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {searchResults.map((result) => {
                          const Icon = getResultIcon(result.type);
                          return (
                            <div
                              key={result.id}
                              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors group"
                              onClick={() => handleResultClick(result)}
                            >
                              {/* Thumbnail ou ícone */}
                              <div className="w-16 h-12 bg-muted rounded-md flex items-center justify-center shrink-0">
                                {result.thumbnail ? (
                                  <ImageWithFallback
                                    src={result.thumbnail}
                                    alt={result.title}
                                    className="w-full h-full object-cover rounded-md"
                                  />
                                ) : (
                                  <Icon className="w-6 h-6 text-muted-foreground" />
                                )}
                              </div>

                              {/* Conteúdo */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-medium line-clamp-1 group-hover:text-primary">
                                    {result.title}
                                  </h4>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    {result.isPremium && (
                                      <Badge variant="secondary" className="text-xs">
                                        PREMIUM
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      {getResultTypeLabel(result.type)}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {result.description}
                                </p>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {result.author && (
                                    <span>Por {result.author}</span>
                                  )}
                                  {result.duration && (
                                    <span>{result.duration}</span>
                                  )}
                                  {result.views && (
                                    <span>{result.views}</span>
                                  )}
                                  {result.rating && (
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                      <span>{result.rating}</span>
                                    </div>
                                  )}
                                </div>

                                {result.tags && (
                                  <div className="flex flex-wrap gap-1">
                                    {result.tags.slice(0, 3).map((tag, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 space-y-4">
                      <Search className="w-12 h-12 text-muted-foreground mx-auto" />
                      <div>
                        <h3 className="font-medium mb-1">Nenhum resultado encontrado</h3>
                        <p className="text-sm text-muted-foreground">
                          Tente usar palavras-chave diferentes ou navegue pelas categorias.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}