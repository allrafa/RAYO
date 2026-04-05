import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { 
  Heart, Star, Award, Trophy, Zap, 
  BookOpen, Users, MessageSquare, Bell,
  Settings, Shield, HelpCircle, Globe
} from "lucide-react";

export function ColorPaletteDemo() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl lg:text-5xl" style={{ fontWeight: 700 }}>
            Nova Paleta Minimalista
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Verde Sálvia (Sage Green) - Design system sofisticado e atemporal
          </p>
        </div>

        {/* Color Swatches */}
        <section>
          <h2 className="text-2xl mb-6" style={{ fontWeight: 700 }}>
            Cores Principais
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Sage Green */}
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-[#6b7f73] border border-border"></div>
              <p className="text-sm" style={{ fontWeight: 600 }}>Primary</p>
              <p className="text-xs text-muted-foreground">#6b7f73</p>
            </div>

            {/* Mint */}
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-[#14b8a6] border border-border"></div>
              <p className="text-sm" style={{ fontWeight: 600 }}>Accent</p>
              <p className="text-xs text-muted-foreground">#14b8a6</p>
            </div>

            {/* Gold */}
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-[#f59e0b] border border-border"></div>
              <p className="text-sm" style={{ fontWeight: 600 }}>Warmth</p>
              <p className="text-xs text-muted-foreground">#f59e0b</p>
            </div>

            {/* Coral */}
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-[#ec4899] border border-border"></div>
              <p className="text-sm" style={{ fontWeight: 600 }}>Energy</p>
              <p className="text-xs text-muted-foreground">#ec4899</p>
            </div>

            {/* Neutral */}
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-[#78716c] border border-border"></div>
              <p className="text-sm" style={{ fontWeight: 600 }}>Text</p>
              <p className="text-xs text-muted-foreground">#78716c</p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-2xl mb-6" style={{ fontWeight: 700 }}>
            Botões
          </h2>
          <div className="flex flex-wrap gap-4">
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
              Primary Button
            </Button>
            <Button variant="outline">
              Outline Button
            </Button>
            <Button variant="ghost">
              Ghost Button
            </Button>
            <Button variant="secondary">
              Secondary Button
            </Button>
            <Button className="bg-accent hover:opacity-90 text-accent-foreground">
              Accent Button
            </Button>
          </div>
        </section>

        {/* Cards */}
        <section>
          <h2 className="text-2xl mb-6" style={{ fontWeight: 700 }}>
            Cards & Components
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Relacionamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Fortaleça seus relacionamentos com conteúdo transformador
                </p>
                <Progress value={65} className="mb-2" />
                <p className="text-sm text-muted-foreground">65% completo</p>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Conquistas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  12 badges desbloqueados este mês
                </p>
                <div className="flex gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Nível 5
                  </Badge>
                  <Badge className="bg-accent/10 text-accent border-accent/20">
                    Premium
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-warning" />
                </div>
                <CardTitle>Comunidade</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Conecte-se com pessoas em transformação
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">1,234 membros</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-2xl mb-6" style={{ fontWeight: 700 }}>
            Estatísticas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <p className="text-3xl mb-1" style={{ fontWeight: 700 }}>250</p>
                <p className="text-sm text-muted-foreground">Pontos</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-accent" />
                </div>
                <p className="text-3xl mb-1" style={{ fontWeight: 700 }}>12</p>
                <p className="text-sm text-muted-foreground">Conquistas</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-warning" />
                </div>
                <p className="text-3xl mb-1" style={{ fontWeight: 700 }}>7</p>
                <p className="text-sm text-muted-foreground">Dias</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-3xl mb-1" style={{ fontWeight: 700 }}>32</p>
                <p className="text-sm text-muted-foreground">Favoritos</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Form Elements */}
        <section>
          <h2 className="text-2xl mb-6" style={{ fontWeight: 700 }}>
            Formulários
          </h2>
          <Card className="border-border max-w-md">
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm" style={{ fontWeight: 600 }}>
                  Nome completo
                </label>
                <Input 
                  placeholder="Digite seu nome" 
                  className="bg-input-background border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm" style={{ fontWeight: 600 }}>
                  Email
                </label>
                <Input 
                  type="email"
                  placeholder="seu@email.com" 
                  className="bg-input-background border-border"
                />
              </div>
              <Button className="w-full bg-primary hover:bg-primary-hover">
                Salvar alterações
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Icon Grid */}
        <section>
          <h2 className="text-2xl mb-6" style={{ fontWeight: 700 }}>
            Ícones com Nova Paleta
          </h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {[
              { icon: BookOpen, color: "primary" },
              { icon: Users, color: "accent" },
              { icon: MessageSquare, color: "primary" },
              { icon: Bell, color: "warning" },
              { icon: Settings, color: "primary" },
              { icon: Shield, color: "accent" },
              { icon: HelpCircle, color: "primary" },
              { icon: Globe, color: "accent" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="text-center">
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-lg bg-${item.color}/10 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${item.color}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-2xl mb-6" style={{ fontWeight: 700 }}>
            Tipografia
          </h2>
          <div className="space-y-4">
            <div>
              <h1>Heading 1 - Display Extrabold</h1>
              <p className="text-muted-foreground">36px, weight 800</p>
            </div>
            <div>
              <h2>Heading 2 - Display Bold</h2>
              <p className="text-muted-foreground">24px, weight 700</p>
            </div>
            <div>
              <h3>Heading 3 - Body Semibold</h3>
              <p className="text-muted-foreground">20px, weight 600</p>
            </div>
            <div>
              <p>
                Body text - Este é um exemplo de texto de corpo normal. A paleta minimalista
                oferece excelente legibilidade e contraste perfeito para leitura prolongada.
              </p>
              <p className="text-muted-foreground text-sm mt-2">16px, weight 400</p>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="bg-muted p-8 rounded-2xl">
          <h2 className="text-2xl mb-6" style={{ fontWeight: 700 }}>
            Antes vs Depois
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg mb-4" style={{ fontWeight: 600 }}>
                ❌ Paleta Anterior
              </h3>
              <ul className="space-y-2 text-sm">
                <li>• Verde floresta muito vibrante (#4ade80)</li>
                <li>• Lime elétrico (#84cc16)</li>
                <li>• Muita saturação</li>
                <li>• Cansa a vista</li>
                <li>• Parece "gritar"</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg mb-4" style={{ fontWeight: 600 }}>
                ✅ Nova Paleta Sage
              </h3>
              <ul className="space-y-2 text-sm">
                <li>• Verde sálvia suave (#6b7f73)</li>
                <li>• Mint elegante (#14b8a6)</li>
                <li>• Saturação balanceada</li>
                <li>• Fácil de ler por horas</li>
                <li>• Sofisticado e profissional</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
