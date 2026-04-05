import React, { useState } from "react";
import { Heart, BookOpen, Video, MessageCircle, ShoppingBag, Search, Filter, Trash2, Share, X, Grid3X3, List, Calendar, Star } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useApp } from "./AppContext";
import { FavoriteIcon, useFavoriteStats } from "./FavoriteButton";
import { enhancedToast } from "./EnhancedToast";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { EmptyState } from "./EmptyState";

interface FavoritesPageProps {
  onBack: () => void;
}

export function FavoritesPage({ onBack }: FavoritesPageProps) {
  const { 
    getFavoritesByType, 
    clearAllFavorites, 
    courses, 
    posts, 
    products,
    setCurrentCourseId,
    setIsInCourseDetail,
    setCurrentVideoId,
    setIsInVideoPage
  } = useApp();
  
  const favoriteStats = useFavoriteStats();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const allFavorites = getFavoritesByType();
  
  // Filter and sort favorites
  const filteredFavorites = allFavorites
    .filter(fav => {
      if (selectedCategory !== "all" && fav.type !== selectedCategory) return false;
      return true;
    })
    .filter(fav => {
      if (!searchQuery.trim()) return true;
      
      // Get the actual content to search in
      let searchContent = "";
      if (fav.type === 'course') {
        const course = courses.find(c => c.id === fav.id);
        searchContent = `${course?.title} ${course?.description} ${course?.category}`.toLowerCase();
      } else if (fav.type === 'post') {
        const post = posts.find(p => p.id === fav.id);
        searchContent = `${post?.content} ${post?.category} ${post?.author}`.toLowerCase();
      } else if (fav.type === 'product') {
        const product = products.find(p => p.id === fav.id);
        searchContent = `${product?.name} ${product?.description} ${product?.category}`.toLowerCase();
      }
      
      return searchContent.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        case "oldest":
          return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        case "alphabetical":
          const getTitle = (fav: any) => {
            if (fav.type === 'course') return courses.find(c => c.id === fav.id)?.title || '';
            if (fav.type === 'post') return posts.find(p => p.id === fav.id)?.content.slice(0, 50) || '';
            if (fav.type === 'product') return products.find(p => p.id === fav.id)?.name || '';
            return '';
          };
          return getTitle(a).localeCompare(getTitle(b));
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

  const handleItemClick = (favorite: any) => {
    if (favorite.type === 'course') {
      setCurrentCourseId(favorite.id);
      setIsInCourseDetail(true);
    } else if (favorite.type === 'video') {
      setCurrentVideoId(favorite.id.toString());
      setIsInVideoPage(true);
    }
    // Para posts e produtos, você pode implementar navegação específica
  };

  const getItemData = (favorite: any) => {
    switch (favorite.type) {
      case 'course':
        return courses.find(c => c.id === favorite.id);
      case 'post':
        return posts.find(p => p.id === favorite.id);
      case 'product':
        return products.find(p => p.id === favorite.id);
      default:
        return null;
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'course': return BookOpen;
      case 'video': return Video;
      case 'post': return MessageCircle;
      case 'product': return ShoppingBag;
      default: return Heart;
    }
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'course': return 'Cursos';
      case 'video': return 'Vídeos';
      case 'post': return 'Posts';
      case 'product': return 'Produtos';
      default: return 'Todos';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  };

  if (allFavorites.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 max-w-4xl mx-auto">
          <BreadcrumbNav 
            items={[
              { label: "Favoritos", current: true }
            ]}
            onBack={onBack}
          />
          
          <EmptyState
            icon={Heart}
            title="Nenhum favorito ainda"
            description="Comece a favoritar conteúdos para criar sua coleção pessoal"
            action={{
              label: "Explorar Conteúdos",
              onClick: onBack
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <BreadcrumbNav 
            items={[
              { label: "Favoritos", current: true }
            ]}
            onBack={onBack}
          />

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display">Meus Favoritos</h1>
              <p className="text-muted-foreground">
                Sua coleção pessoal de conteúdos favoritos
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Tudo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover todos os favoritos?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Todos os seus {allFavorites.length} favoritos serão removidos permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllFavorites} className="bg-destructive text-destructive-foreground">
                      Remover Tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <div className="font-display font-bold text-lg">{favoriteStats.totalFavorites}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                </div>
                <div className="font-display font-bold text-lg">{favoriteStats.coursesFavorites}</div>
                <div className="text-xs text-muted-foreground">Cursos</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Video className="w-5 h-5 text-green-500" />
                </div>
                <div className="font-display font-bold text-lg">{favoriteStats.videosFavorites}</div>
                <div className="text-xs text-muted-foreground">Vídeos</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <MessageCircle className="w-5 h-5 text-purple-500" />
                </div>
                <div className="font-display font-bold text-lg">{favoriteStats.postsFavorites}</div>
                <div className="text-xs text-muted-foreground">Posts</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <ShoppingBag className="w-5 h-5 text-orange-500" />
                </div>
                <div className="font-display font-bold text-lg">{favoriteStats.productsFavorites}</div>
                <div className="text-xs text-muted-foreground">Produtos</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar nos favoritos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="course">Cursos</SelectItem>
                <SelectItem value="video">Vídeos</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
                <SelectItem value="product">Produtos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="oldest">Mais antigos</SelectItem>
                <SelectItem value="alphabetical">A-Z</SelectItem>
                <SelectItem value="type">Por tipo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {filteredFavorites.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Nenhum favorito encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar seus filtros de busca.
            </p>
            <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className={
            viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }>
            {filteredFavorites.map((favorite) => {
              const itemData = getItemData(favorite);
              const Icon = getCategoryIcon(favorite.type);
              
              if (!itemData) return null;

              return (
                <Card 
                  key={`${favorite.type}-${favorite.id}`}
                  className={`cursor-pointer hover:shadow-lg transition-all group ${
                    viewMode === "list" ? "p-4" : ""
                  }`}
                  onClick={() => handleItemClick(favorite)}
                >
                  <div className={viewMode === "list" ? "flex items-center gap-4" : ""}>
                    {/* Thumbnail/Icon */}
                    <div className={`relative ${viewMode === "list" ? "w-16 h-16 flex-shrink-0" : "mb-4"}`}>
                      {(favorite.type === 'course' || favorite.type === 'product') && itemData.thumbnail ? (
                        <ImageWithFallback
                          src={itemData.thumbnail}
                          alt={itemData.title || itemData.name}
                          className={`w-full h-full object-cover rounded-lg ${
                            viewMode === "grid" ? "aspect-video" : ""
                          }`}
                        />
                      ) : (
                        <div className={`bg-muted rounded-lg flex items-center justify-center ${
                          viewMode === "list" ? "w-16 h-16" : "w-full aspect-video"
                        }`}>
                          <Icon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Favorite indicator */}
                      <div className="absolute -top-2 -right-2">
                        <FavoriteIcon id={favorite.id} type={favorite.type} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(favorite.type)}
                        </Badge>
                      </div>
                      
                      <h3 className="font-medium line-clamp-2 mb-2">
                        {itemData.title || itemData.name || itemData.content?.slice(0, 50)}
                      </h3>
                      
                      {itemData.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {itemData.description}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Favoritado em {formatDate(favorite.addedAt)}</span>
                        
                        {favorite.type === 'course' && itemData.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>{itemData.rating}</span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {favorite.notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <strong>Nota:</strong> {favorite.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}