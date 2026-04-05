import { useState, useEffect, useRef } from "react";
import { Search, X, Clock, TrendingUp, Filter, Mic, MicOff } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "./AppContext";

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'suggestion';
  category?: string;
}

interface EnhancedSearchProps {
  placeholder?: string;
  onSearch: (query: string, filters?: SearchFilters) => void;
  onClose?: () => void;
  showFilters?: boolean;
  autoFocus?: boolean;
}

interface SearchFilters {
  category?: string;
  level?: string;
  duration?: string;
  price?: string;
}

export function EnhancedSearch({
  placeholder = "Buscar cursos, posts, produtos...",
  onSearch,
  onClose,
  showFilters = true,
  autoFocus = true
}: EnhancedSearchProps) {
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Mock suggestions - em produção viria de API
  const mockSuggestions: SearchSuggestion[] = [
    { id: '1', text: 'comunicação no casamento', type: 'popular', category: 'Relacionamento' },
    { id: '2', text: 'resolução de conflitos', type: 'popular', category: 'Relacionamento' },
    { id: '3', text: 'intimidade', type: 'recent' },
    { id: '4', text: 'educação financeira familiar', type: 'suggestion', category: 'Finanças' },
    { id: '5', text: 'paternidade consciente', type: 'popular', category: 'Parentalidade' },
  ];

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    // Filtrar sugestões baseado na query
    if (query.length > 0) {
      const filtered = mockSuggestions.filter(s => 
        s.text.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      // Mostrar sugestões populares quando não há query
      setSuggestions(mockSuggestions.filter(s => s.type === 'popular' || s.type === 'recent'));
      setShowSuggestions(true);
    }
  }, [query]);

  // Web Speech API para busca por voz
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Busca por voz não suportada neste navegador');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.lang = 'pt-BR';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSearch(transcript);
    };

    recognitionRef.current.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleSearch = (searchQuery?: string) => {
    const searchTerm = searchQuery || query;
    if (searchTerm.trim()) {
      onSearch(searchTerm, filters);
      setShowSuggestions(false);
      
      // Salvar no histórico (mock)
      const newRecent: SearchSuggestion = {
        id: Date.now().toString(),
        text: searchTerm,
        type: 'recent'
      };
      setSuggestions(prev => [newRecent, ...prev.filter(s => s.text !== searchTerm)]);
    }
  };

  const clearQuery = () => {
    setQuery("");
    setShowSuggestions(true);
    inputRef.current?.focus();
  };

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    handleSearch(suggestion.text);
  };

  const filterOptions = {
    category: ['Relacionamento', 'Parentalidade', 'Finanças', 'Espiritualidade'],
    level: ['Iniciante', 'Intermediário', 'Avançado'],
    duration: ['Até 1h', '1-3h', '3-5h', 'Mais de 5h'],
    price: ['Gratuito', 'Até R$ 50', 'R$ 50-100', 'Mais de R$ 100']
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="w-5 h-5" />
        </div>
        
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            } else if (e.key === 'Escape') {
              onClose?.();
            }
          }}
          placeholder={placeholder}
          className="pl-10 pr-20 h-12 text-base"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Voice Search */}
          <Button
            variant="ghost"
            size="sm"
            onClick={isListening ? stopVoiceSearch : startVoiceSearch}
            className={`p-2 ${isListening ? 'text-red-500' : 'text-muted-foreground'}`}
          >
            {isListening ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <MicOff className="w-4 h-4" />
              </motion.div>
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>

          {/* Clear Button */}
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearQuery}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 z-50 mt-2"
          >
            <Card className="shadow-lg border">
              <CardContent className="p-4 space-y-4">
                {/* Quick Filters */}
                {showFilters && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filtros Rápidos</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.category.map((cat) => (
                        <Badge
                          key={cat}
                          variant={filters.category === cat ? "default" : "outline"}
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => {
                            setFilters(prev => ({ 
                              ...prev, 
                              category: prev.category === cat ? undefined : cat 
                            }));
                          }}
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Sugestões</span>
                    </div>
                    
                    <div className="space-y-1">
                      {suggestions.slice(0, 5).map((suggestion) => (
                        <motion.button
                          key={suggestion.id}
                          whileHover={{ backgroundColor: "var(--accent)" }}
                          onClick={() => selectSuggestion(suggestion)}
                          className="w-full text-left p-2 rounded-lg flex items-center gap-3 hover:bg-accent transition-colors"
                        >
                          <div className="text-muted-foreground">
                            {suggestion.type === 'recent' ? (
                              <Clock className="w-4 h-4" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <span className="text-sm">{suggestion.text}</span>
                            {suggestion.category && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {suggestion.category}
                              </Badge>
                            )}
                          </div>
                          
                          {suggestion.type === 'popular' && (
                            <TrendingUp className="w-3 h-3 text-primary" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Button */}
                {query && (
                  <Button
                    onClick={() => handleSearch()}
                    className="w-full"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Buscar "{query}"
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Listening Indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center"
            onClick={stopVoiceSearch}
          >
            <Card className="p-6 text-center">
              <CardContent>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="mb-4"
                >
                  <Mic className="w-12 h-12 mx-auto text-primary" />
                </motion.div>
                <h3 className="font-display font-semibold mb-2">Ouvindo...</h3>
                <p className="text-sm text-muted-foreground">Fale o que você está procurando</p>
                <Button
                  variant="outline"
                  onClick={stopVoiceSearch}
                  className="mt-4"
                >
                  Cancelar
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook para gerenciar estado de busca
export function useEnhancedSearch() {
  const { performSearch, searchResults, searchQuery } = useApp();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});

  const handleSearch = (query: string, filters?: SearchFilters) => {
    performSearch(query);
    if (filters) {
      setSearchFilters(filters);
    }
    setIsSearchOpen(false);
  };

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => setIsSearchOpen(false);

  return {
    isSearchOpen,
    searchResults,
    searchQuery,
    searchFilters,
    handleSearch,
    openSearch,
    closeSearch,
    setSearchFilters
  };
}