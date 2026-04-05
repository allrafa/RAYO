import { useState, useEffect } from "react";
import { Plus, Music, BookOpen, MessageSquare, ShoppingBag, Search, X, Heart, Lock, Globe, Users, Star, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { useApp } from "./AppContext";
import { enhancedToast } from "./EnhancedToast";

interface CreatePlaylistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePlaylistModal({ open, onOpenChange }: CreatePlaylistModalProps) {
  const { userData, courses, posts, products } = useApp();
  const [step, setStep] = useState(1);
  const [playlistData, setPlaylistData] = useState({
    name: "",
    description: "",
    category: "relacionamento",
    visibility: "privada",
    cover: "",
    tags: [] as string[]
  });
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("cursos");
  const [isCreating, setIsCreating] = useState(false);

  const categories = [
    { value: "relacionamento", label: "Relacionamento", icon: Heart },
    { value: "comunicacao", label: "Comunicação", icon: MessageSquare },
    { value: "financas", label: "Finanças", icon: ShoppingBag },
    { value: "familia", label: "Família", icon: Users },
    { value: "crescimento", label: "Crescimento Pessoal", icon: Star },
    { value: "espiritualidade", label: "Espiritualidade", icon: BookOpen }
  ];

  const visibilityOptions = [
    {
      value: "privada",
      label: "Privada",
      description: "Apenas você pode ver",
      icon: Lock
    },
    {
      value: "publica",
      label: "Pública",
      description: "Todos podem ver",
      icon: Globe
    },
    {
      value: "comunidade",
      label: "Comunidade",
      description: "Membros da comunidade",
      icon: Users
    }
  ];

  const suggestedTags = [
    "casamento", "namoro", "comunicação", "finanças", "filhos", 
    "intimidade", "conflitos", "metas", "planejamento", "crescimento"
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setPlaylistData({
        name: "",
        description: "",
        category: "relacionamento",
        visibility: "privada",
        cover: "",
        tags: []
      });
      setSelectedItems([]);
      setSearchQuery("");
      setActiveTab("cursos");
    }
  }, [open]);

  const handleInputChange = (field: string, value: any) => {
    setPlaylistData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleTag = (tag: string) => {
    setPlaylistData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const toggleItemSelection = (item: any, type: string) => {
    const itemWithType = { ...item, type };
    const isSelected = selectedItems.some(selected => 
      selected.id === item.id && selected.type === type
    );
    
    if (isSelected) {
      setSelectedItems(prev => prev.filter(selected => 
        !(selected.id === item.id && selected.type === type)
      ));
    } else {
      setSelectedItems(prev => [...prev, itemWithType]);
    }
  };

  const isItemSelected = (item: any, type: string) => {
    return selectedItems.some(selected => 
      selected.id === item.id && selected.type === type
    );
  };

  const filteredContent = (type: string) => {
    let content: any[] = [];
    
    switch (type) {
      case "cursos":
        content = courses;
        break;
      case "posts":
        content = posts;
        break;
      case "produtos":
        content = products;
        break;
    }

    if (!searchQuery) return content;
    
    return content.filter(item => {
      const searchField = type === "cursos" ? item.title : 
                         type === "posts" ? item.content : 
                         item.name;
      return searchField.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const handleCreatePlaylist = async () => {
    if (!playlistData.name.trim()) {
      enhancedToast.error({
        title: "Nome obrigatório",
        description: "Por favor, digite um nome para sua playlist",
        haptic: true
      });
      return;
    }

    if (selectedItems.length === 0) {
      enhancedToast.error({
        title: "Adicione conteúdo",
        description: "Selecione pelo menos um item para sua playlist",
        haptic: true
      });
      return;
    }

    setIsCreating(true);

    try {
      // Simular criação da playlist
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      enhancedToast.success({
        title: "🎵 Playlist criada!",
        description: `"${playlistData.name}" foi criada com ${selectedItems.length} itens`,
        haptic: true
      });

      onOpenChange(false);

    } catch (error) {
      enhancedToast.error({
        title: "Erro ao criar playlist",
        description: "Tente novamente em alguns instantes",
        haptic: true
      });
    } finally {
      setIsCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center pb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Informações da Playlist</h3>
              <p className="text-muted-foreground text-sm">
                Configure os detalhes básicos da sua playlist personalizada
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Nome da Playlist *
                </label>
                <Input
                  placeholder="Ex: Meu Plano de Crescimento no Casamento"
                  value={playlistData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {playlistData.name.length}/100 caracteres
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Descrição
                </label>
                <Textarea
                  placeholder="Descreva o objetivo da sua playlist..."
                  value={playlistData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="min-h-20"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Categoria
                </label>
                <Select value={playlistData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center gap-2">
                          <category.icon className="w-4 h-4" />
                          {category.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Visibilidade
                </label>
                <Select value={playlistData.visibility} onValueChange={(value) => handleInputChange("visibility", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-3">
                          <option.icon className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tags (opcional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={playlistData.tags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:shadow-md hover:brightness-105"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                {playlistData.tags.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {playlistData.tags.length} tags selecionadas
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center pb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Adicionar Conteúdo</h3>
              <p className="text-muted-foreground text-sm">
                Selecione cursos, posts e produtos para sua playlist
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conteúdo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Items Counter */}
            {selectedItems.length > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedItems.length} itens selecionados
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedItems([])}
                  >
                    Limpar seleção
                  </Button>
                </div>
              </div>
            )}

            {/* Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cursos" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Cursos
                </TabsTrigger>
                <TabsTrigger value="posts" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Posts
                </TabsTrigger>
                <TabsTrigger value="produtos" className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Produtos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cursos" className="space-y-3 max-h-96 overflow-y-auto">
                {filteredContent("cursos").map((course) => (
                  <Card
                    key={course.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isItemSelected(course, "cursos") ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => toggleItemSelection(course, "cursos")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <Checkbox 
                            checked={isItemSelected(course, "cursos")}
                            onChange={() => {}} // Handled by card click
                          />
                        </div>
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">{course.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {course.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {course.lessons} aulas
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {course.duration}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="posts" className="space-y-3 max-h-96 overflow-y-auto">
                {filteredContent("posts").map((post) => (
                  <Card
                    key={post.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isItemSelected(post, "posts") ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => toggleItemSelection(post, "posts")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <Checkbox 
                            checked={isItemSelected(post, "posts")}
                            onChange={() => {}} // Handled by card click
                          />
                        </div>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={post.avatar} />
                          <AvatarFallback>{post.author[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{post.author}</span>
                            <Badge variant="outline" className="text-xs">
                              {post.category}
                            </Badge>
                          </div>
                          <p className="text-sm line-clamp-3">{post.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{post.likes} curtidas</span>
                            <span>{post.comments} comentários</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="produtos" className="space-y-3 max-h-96 overflow-y-auto">
                {filteredContent("produtos").map((product) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isItemSelected(product, "produtos") ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => toggleItemSelection(product, "produtos")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <Checkbox 
                            checked={isItemSelected(product, "produtos")}
                            onChange={() => {}} // Handled by card click
                          />
                        </div>
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">{product.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {product.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-semibold text-sm">R$ {product.price}</span>
                            <Badge variant="outline" className="text-xs">
                              ⭐ {product.rating}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center pb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Revisar Playlist</h3>
              <p className="text-muted-foreground text-sm">
                Confira todos os detalhes antes de criar sua playlist
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">{playlistData.name}</h4>
                {playlistData.description && (
                  <p className="text-sm text-muted-foreground mb-3">{playlistData.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {categories.find(c => c.value === playlistData.category)?.label}
                  </Badge>
                  <Badge variant="outline">
                    {visibilityOptions.find(v => v.value === playlistData.visibility)?.label}
                  </Badge>
                  {playlistData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium mb-3">
                  Conteúdo selecionado ({selectedItems.length} itens)
                </h5>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedItems.map((item, index) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">
                          {item.type === "cursos" ? item.title : 
                           item.type === "posts" ? `Post de ${item.author}` : 
                           item.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.type === "posts" ? "post" : item.type.slice(0, -1)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Music className="w-5 h-5 text-primary" />
            </div>
            Criar Nova Playlist
          </DialogTitle>
          <DialogDescription>
            Organize seus conteúdos favoritos em playlists personalizadas
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 py-4 flex-shrink-0">
          {[1, 2, 3].map((stepNumber) => (
            <div
              key={stepNumber}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                step >= stepNumber 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {stepNumber}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          {renderStepContent()}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 pt-6 border-t">
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
                disabled={isCreating}
              >
                Voltar
              </Button>
            )}
            
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="flex-1"
                disabled={step === 1 && !playlistData.name.trim()}
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={handleCreatePlaylist}
                disabled={isCreating || selectedItems.length === 0}
                className="flex-1"
              >
                {isCreating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando...
                  </div>
                ) : (
                  <>
                    <Music className="w-4 h-4 mr-2" />
                    Criar Playlist
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}