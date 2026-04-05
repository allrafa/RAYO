import { useState } from "react";
import { User, Camera, Edit2, Settings, Trophy, Calendar, MapPin, Heart, Users, BookOpen, BarChart3 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { useApp } from "./AppContext";
import { useFavoriteStats } from "./FavoriteButton";
import { toast } from "sonner@2.0.3";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { userData, updateUserData, getFavoritesByType, setIsInFavoritesPage, setIsInPersonalDashboard } = useApp();
  const favoriteStats = useFavoriteStats();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: userData.name || "Maria",
    bio: userData.bio || "Casada há 5 anos, mãe de 2 filhos. Apaixonada por relacionamentos saudáveis e crescimento pessoal.",
    location: userData.location || "São Paulo, SP",
    occupation: userData.occupation || "Psicóloga"
  });

  const handleSave = () => {
    updateUserData({
      ...userData,
      ...editForm
    });
    setIsEditing(false);
    toast.success("Perfil atualizado com sucesso!");
  };

  const handleCancel = () => {
    setEditForm({
      name: userData.name || "Maria",
      bio: userData.bio || "Casada há 5 anos, mãe de 2 filhos. Apaixonada por relacionamentos saudáveis e crescimento pessoal.",
      location: userData.location || "São Paulo, SP",
      occupation: userData.occupation || "Psicóloga"
    });
    setIsEditing(false);
  };

  // Mock data - em produção viria do backend
  const stats = {
    coursesCompleted: 12,
    postsCreated: 28,
    connectionsCount: 145,
    pointsEarned: userData.points || 1250,
    totalFavorites: favoriteStats.totalFavorites
  };

  const handleViewFavorites = () => {
    setIsInFavoritesPage(true);
    onOpenChange(false);
  };

  const handleViewDashboard = () => {
    setIsInPersonalDashboard(true);
    onOpenChange(false);
  };

  const achievements = [
    { id: 1, name: "Primeiro Curso", description: "Completou seu primeiro curso", icon: BookOpen, earned: true },
    { id: 2, name: "Comunicador", description: "Fez 10 posts na comunidade", icon: Users, earned: true },
    { id: 3, name: "Mentor", description: "Ajudou 5 pessoas na comunidade", icon: Heart, earned: false },
    { id: 4, name: "Dedicado", description: "7 dias consecutivos de atividade", icon: Trophy, earned: true },
  ];

  const recentActivity = [
    { id: 1, type: "course", title: "Completou: Comunicação no Casamento", date: "2 dias atrás" },
    { id: 2, type: "post", title: "Publicou: Dicas para conversas difíceis", date: "3 dias atrás" },
    { id: 3, type: "comment", title: "Comentou no post sobre finanças", date: "5 dias atrás" },
    { id: 4, type: "course", title: "Iniciou: Educação Financeira em Família", date: "1 semana atrás" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
          <DialogDescription>
            Gerencie suas informações pessoais, estatísticas e conquistas
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="activity">Atividade</TabsTrigger>
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Header do Perfil */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="/placeholder-avatar.jpg" alt={`Foto de perfil de ${editForm.name}`} />
                  <AvatarFallback className="text-2xl">{editForm.name[0]}</AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 rounded-full p-2"
                  onClick={() => toast.info("Funcionalidade de foto em desenvolvimento")}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              <div className="text-center space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{editForm.name}</h2>
                  <Badge variant="secondary">Nível {userData.level || 3}</Badge>
                </div>
                <p className="text-muted-foreground">{editForm.occupation}</p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {editForm.location}
                </p>
              </div>
            </div>

            <Separator />

            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stats.coursesCompleted}</div>
                  <div className="text-xs text-muted-foreground">Cursos Concluídos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stats.postsCreated}</div>
                  <div className="text-xs text-muted-foreground">Posts Criados</div>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all"
                onClick={handleViewFavorites}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-500">{stats.totalFavorites}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Heart className="w-3 h-3" />
                    Favoritos
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stats.pointsEarned}</div>
                  <div className="text-xs text-muted-foreground">Pontos</div>
                </CardContent>
              </Card>
            </div>

            {/* Botões de Navegação Rápida */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleViewDashboard}
                className="justify-start"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard Pessoal
              </Button>
              <Button 
                variant="outline" 
                onClick={handleViewFavorites}
                className="justify-start"
              >
                <Heart className="w-4 h-4 mr-2" />
                Favoritos ({stats.totalFavorites})
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => toast.info("Funcionalidade em desenvolvimento")}
                className="justify-start"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
              <Button 
                variant="outline" 
                onClick={() => toast.info("Relatórios disponíveis em breve")}
                className="justify-start"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Relatórios
              </Button>
            </div>

            <Separator />

            {/* Informações Editáveis */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Informações Pessoais</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                >
                  {isEditing ? "Cancelar" : <><Edit2 className="w-4 h-4 mr-2" />Editar</>}
                </Button>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="occupation">Profissão</Label>
                    <Input
                      id="occupation"
                      value={editForm.occupation}
                      onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Localização</Label>
                    <Input
                      id="location"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografia</Label>
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleSave} className="w-full">
                    Salvar Alterações
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Biografia</Label>
                    <p className="mt-1">{editForm.bio}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Atividade Recente</h3>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Conquistas</h3>
              <div className="grid gap-3">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div
                      key={achievement.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        achievement.earned ? 'bg-primary/5 border-primary/20' : 'opacity-50'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${
                        achievement.earned ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{achievement.name}</h4>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                      {achievement.earned && (
                        <Badge variant="secondary">Conquistado</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}