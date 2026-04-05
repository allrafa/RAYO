import { useState, useRef, useEffect } from "react";
import { Plus, Image, Smile, Send, Globe, Users, Lock, ChevronDown, X, Camera, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useApp } from "./AppContext";
import { enhancedToast } from "./EnhancedToast";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage?: string;
}

export function CreatePostModal({ open, onOpenChange, currentPage = "home" }: CreatePostModalProps) {
  const { userData, createPost } = useApp();
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Relacionamento");
  const [visibility, setVisibility] = useState(currentPage === "comunidade" ? "comunidade" : "publico");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    "Relacionamento",
    "Comunicação", 
    "Finanças",
    "Família",
    "Espiritualidade",
    "Lazer",
    "Saúde",
    "Carreira"
  ];

  const allVisibilityOptions = [
    {
      value: "publico",
      label: "Público",
      description: "Todos podem ver",
      icon: Globe
    },
    {
      value: "comunidade", 
      label: "Comunidade",
      description: "Apenas membros da comunidade",
      icon: Users
    },
    {
      value: "amigos",
      label: "Apenas Amigos",
      description: "Somente seus amigos próximos",
      icon: Lock
    }
  ];

  // Filtrar opções baseado na página atual
  const visibilityOptions = currentPage === "comunidade" 
    ? allVisibilityOptions // Na comunidade, todas as opções disponíveis
    : allVisibilityOptions.filter(option => option.value !== "comunidade"); // Fora da comunidade, sem opção "comunidade"

  // Reset visibility quando a página mudar ou o modal abrir
  useEffect(() => {
    if (open) {
      const defaultVisibility = currentPage === "comunidade" ? "comunidade" : "publico";
      setVisibility(defaultVisibility);
    }
  }, [open, currentPage]);

  const handleImageSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validações
    if (files.length + selectedImages.length > 4) {
      enhancedToast.error({
        title: "Muitas imagens",
        description: "Você pode adicionar no máximo 4 imagens",
        haptic: true
      });
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        enhancedToast.error({
          title: "Arquivo inválido",
          description: "Apenas imagens são permitidas",
          haptic: true
        });
        return false;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB
        enhancedToast.error({
          title: "Arquivo muito grande",
          description: "Imagens devem ter no máximo 5MB",
          haptic: true
        });
        return false;
      }
      
      return true;
    });

    setSelectedImages(prev => [...prev, ...validFiles]);
    
    if (validFiles.length > 0) {
      enhancedToast.success({
        title: `${validFiles.length} imagem(ns) adicionada(s)`,
        description: "Imagens prontas para publicação",
        haptic: true
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    enhancedToast.info({
      title: "Imagem removida",
      description: "A imagem foi removida da publicação",
      haptic: true
    });
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      enhancedToast.error({
        title: "Conteúdo necessário",
        description: "Adicione texto ou imagens para publicar",
        haptic: true
      });
      return;
    }

    if (content.trim() && content.length < 5) {
      enhancedToast.error({
        title: "Texto muito curto",
        description: "Escreva pelo menos 5 caracteres",
        haptic: true
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const ok = await createPost(content, selectedCategory, {
        visibility,
        images: selectedImages.map(file => URL.createObjectURL(file)),
        forum_id: 7,
      });
      
      if (ok) {
        setContent("");
        setSelectedCategory("Relacionamento");
        setVisibility(currentPage === "comunidade" ? "comunidade" : "publico");
        setSelectedImages([]);
        onOpenChange(false);
      }

    } catch (error) {
      enhancedToast.error({
        title: "Erro ao publicar",
        description: "Tente novamente em alguns instantes",
        haptic: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (content.trim() || selectedImages.length > 0) {
      enhancedToast.info({
        title: "Rascunho salvo",
        description: "Seu conteúdo foi mantido temporariamente",
        haptic: true
      });
    }
    onOpenChange(false);
  };

  const currentVisibility = visibilityOptions.find(opt => opt.value === visibility);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            Criar Publicação
          </DialogTitle>
          <DialogDescription>
            Compartilhe suas experiências, insights e momentos especiais com a comunidade RAIO
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* User Info com Seletor de Visibilidade */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {userData.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-medium text-lg">{userData.name}</h3>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="w-fit h-8 text-sm border-none shadow-none p-1 hover:bg-muted/50 transition-colors">
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
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <Textarea
              placeholder="Compartilhe suas experiências, insights e momentos especiais com a comunidade RAIO..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-32 resize-none border-none shadow-none text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0 p-0"
              maxLength={2000}
            />
            
            {content.length > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {content.length}/2000 caracteres
                </span>
                <span className={`font-medium ${
                  content.length < 5 ? "text-amber-600" : 
                  content.length > 1800 ? "text-red-600" : "text-green-600"
                }`}>
                  {content.length < 5 ? "Continue escrevendo..." : 
                   content.length > 1800 ? "Quase no limite" : "Perfeito!"}
                </span>
              </div>
            )}
          </div>

          {/* Image Preview */}
          {selectedImages.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Imagens selecionadas ({selectedImages.length}/4)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media and Options */}
          <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-xl">
            <span className="text-sm font-medium text-muted-foreground">
              Adicionar à publicação:
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-green-100 hover:text-green-700 transition-colors"
                onClick={handleImageSelect}
                disabled={selectedImages.length >= 4}
                title="Adicionar fotos"
              >
                <Image className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                onClick={handleImageSelect}
                disabled={selectedImages.length >= 4}
                title="Tirar foto"
              >
                <Camera className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            capture="environment"
          />

          {/* Categories */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Categoria
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:shadow-md hover:brightness-105 active:opacity-80"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex-shrink-0 pt-6 border-t">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-12"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={(!content.trim() && selectedImages.length === 0) || 
                       (content.trim() && content.length < 5) || 
                       isSubmitting}
              className="flex-1 h-12 font-medium"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publicando...
                </div>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publicar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}