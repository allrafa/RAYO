import { useState, useEffect } from "react";
import { Search, X, BookOpen, MessageSquare, ShoppingCart, Clock, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useApp } from "./AppContext";
import { enhancedToast } from "./EnhancedToast";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const { searchQuery, searchResults, performSearch, clearSearch, enrollInCourse, addToCart } = useApp();
  const [localQuery, setLocalQuery] = useState("");

  useEffect(() => {
    if (open) {
      setLocalQuery(searchQuery);
    }
  }, [open, searchQuery]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      performSearch(localQuery);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [localQuery, performSearch]);

  const handleClose = () => {
    clearSearch();
    setLocalQuery("");
    onOpenChange(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'post': return <MessageSquare className="w-4 h-4" />;
      case 'product': return <ShoppingCart className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'course': return 'Curso';
      case 'post': return 'Post';
      case 'product': return 'Produto';
      default: return 'Item';
    }
  };

  const handleResultClick = (result: any) => {
    if (result.type === 'course') {
      enhancedToast.info({
        title: `Curso: ${result.title}`,
        description: result.isEnrolled ? "Continuar curso" : "Ver detalhes",
        haptic: true,
        action: {
          label: result.isEnrolled ? "Continuar" : "Ver mais",
          onClick: () => {
            if (!result.isEnrolled) {
              enrollInCourse(result.id);
            }
          }
        }
      });
    } else if (result.type === 'product') {
      enhancedToast.info({
        title: `Produto: ${result.name}`,
        description: `R$ ${result.price}`,
        haptic: true,
        action: {
          label: "Adicionar ao carrinho",
          onClick: () => addToCart(result.id)
        }
      });
    } else if (result.type === 'post') {
      enhancedToast.info({
        title: `Post de ${result.author}`,
        description: result.content.substring(0, 50) + "...",
        haptic: true
      });
    }
    
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar na Plataforma
          </DialogTitle>
          <DialogDescription>
            Encontre cursos, posts da comunidade, produtos e muito mais
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos, posts, produtos..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {localQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocalQuery("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {localQuery && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum resultado encontrado</p>
                <p className="text-sm">Tente palavras-chave diferentes</p>
              </div>
            )}

            {searchResults.map((result, index) => (
              <div
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 bg-primary/10 rounded-md">
                    {getIcon(result.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(result.type)}
                      </Badge>
                      {result.isPremium && (
                        <Badge className="text-xs">Premium</Badge>
                      )}
                    </div>
                    
                    <h4 className="font-medium truncate">
                      {result.title || result.name || `Post de ${result.author}`}
                    </h4>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {result.description || result.content}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {result.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[var(--rayo-ochre-500)] text-[var(--rayo-ochre-500)]" />
                          <span>{result.rating}</span>
                        </div>
                      )}
                      
                      {result.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{result.duration}</span>
                        </div>
                      )}
                      
                      {result.price && (
                        <div className="font-medium text-primary">
                          R$ {result.price}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          {!localQuery && (
            <div className="border-t pt-4">
              <h5 className="font-medium mb-2">Ações rápidas</h5>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Minha Biblioteca
                </Button>
                <Button variant="outline" size="sm" className="justify-start">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Carrinho
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}