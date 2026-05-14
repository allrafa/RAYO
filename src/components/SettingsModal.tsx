import { useState } from "react";
import { Settings, Contrast, Type, Accessibility, Volume2, VolumeX, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useAccessibility } from "./AccessibilityContext";
import { useApp } from "./AppContext";
import { toast } from "sonner@2.0.3";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { settings, updateSettings, toggleHighContrast } = useAccessibility();
  const { userData, updateUserData } = useApp();
  
  const [soundEnabled, setSoundEnabled] = useState(userData.preferences?.soundEnabled ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(userData.preferences?.notificationsEnabled ?? true);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    updateUserData({
      ...userData,
      preferences: {
        ...userData.preferences,
        soundEnabled: enabled
      }
    });
    toast.success(enabled ? "Sons habilitados" : "Sons desabilitados");
  };

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    updateUserData({
      ...userData,
      preferences: {
        ...userData.preferences,
        notificationsEnabled: enabled
      }
    });
    toast.success(enabled ? "Notificações habilitadas" : "Notificações desabilitadas");
  };

  const handleFontSizeChange = (size: string) => {
    updateSettings({ fontSize: size as 'sm' | 'base' | 'lg' | 'xl' });
    toast.success(`Tamanho da fonte: ${size === 'sm' ? 'Pequena' : size === 'base' ? 'Normal' : size === 'lg' ? 'Grande' : 'Muito Grande'}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações
          </DialogTitle>
          <DialogDescription>
            Personalize sua experiência na plataforma RAYO
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="accessibility">Acessibilidade</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6">
            {/* Tamanho da Fonte */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Tipografia
                </CardTitle>
                <CardDescription>
                  Ajuste o tamanho do texto para melhor legibilidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Tamanho da fonte</Label>
                  <Select value={settings.fontSize} onValueChange={handleFontSizeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Pequena (14px)</SelectItem>
                      <SelectItem value="base">Normal (16px)</SelectItem>
                      <SelectItem value="lg">Grande (18px)</SelectItem>
                      <SelectItem value="xl">Muito Grande (20px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Exemplo de texto</Label>
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p>Este é um exemplo de como o texto aparecerá com o tamanho selecionado.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tamanho atual: {settings.fontSize === 'sm' ? 'Pequena' : settings.fontSize === 'base' ? 'Normal' : settings.fontSize === 'lg' ? 'Grande' : 'Muito Grande'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accessibility" className="space-y-6">
            {/* Alto Contraste */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Contrast className="w-4 h-4" />
                  Alto Contraste
                </CardTitle>
                <CardDescription>
                  Aumenta o contraste para melhor visibilidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Modo alto contraste</Label>
                    <p className="text-sm text-muted-foreground">
                      Melhora a legibilidade com cores de alto contraste
                    </p>
                  </div>
                  <Switch
                    checked={settings.highContrast}
                    onCheckedChange={toggleHighContrast}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Texto Grande */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Texto Ampliado
                </CardTitle>
                <CardDescription>
                  Melhora o espaçamento e legibilidade do texto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Modo texto ampliado</Label>
                    <p className="text-sm text-muted-foreground">
                      Aumenta o espaçamento entre linhas e letras
                    </p>
                  </div>
                  <Switch
                    checked={settings.largeText}
                    onCheckedChange={(checked) => updateSettings({ largeText: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Movimento Reduzido */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4" />
                  Movimento Reduzido
                </CardTitle>
                <CardDescription>
                  Reduz animações para usuários sensíveis ao movimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Reduzir movimento</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimiza animações e transições
                    </p>
                  </div>
                  <Switch
                    checked={settings.reducedMotion}
                    onCheckedChange={(checked) => updateSettings({ reducedMotion: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            {/* Sons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  Sons
                </CardTitle>
                <CardDescription>
                  Configure os sons da aplicação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Sons do aplicativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Reproduz sons para ações e notificações
                    </p>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={handleSoundToggle}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notificações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Accessibility className="w-4 h-4" />
                  Notificações
                </CardTitle>
                <CardDescription>
                  Configure como você quer receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Notificações push</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações mesmo quando o app estiver fechado
                    </p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={handleNotificationsToggle}
                  />
                </div>

                {notificationsEnabled && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Novos cursos</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Mensagens diretas</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Posts da comunidade</Label>
                      <Switch defaultChecked={false} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Ofertas do marketplace</Label>
                      <Switch defaultChecked={false} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}