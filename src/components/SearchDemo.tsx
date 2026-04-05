/**
 * Demonstração da Busca Inteligente
 * 
 * Este componente demonstra como a busca inteligente funciona com diferentes queries
 */

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { useState } from "react";
import { smartSearch, getSearchResultMessage } from "./SmartSearchEngine";
import { Search, CheckCircle, Sparkles } from "lucide-react";

const DEMO_COURSES = [
  {
    id: "1",
    title: "Comunicação Não-Violenta no Casamento",
    description: "Aprenda técnicas de comunicação para fortalecer seu relacionamento conjugal",
    category: "Comunicação",
    tags: ["comunicação", "casamento", "relacionamento", "cnv"],
    instructor: "Dr. João Silva",
  },
  {
    id: "2",
    title: "Finanças para Casais",
    description: "Como gerenciar o dinheiro do casal de forma harmoniosa",
    category: "Finanças",
    tags: ["finanças", "dinheiro", "orçamento", "casamento"],
    instructor: "Maria Oliveira",
  },
  {
    id: "3",
    title: "Educação de Filhos com Propósito",
    description: "Princípios para educar seus filhos com amor e sabedoria",
    category: "Família",
    tags: ["filhos", "educação", "pais", "família"],
    instructor: "Ana Santos",
  },
  {
    id: "4",
    title: "Resolvendo Conflitos no Relacionamento",
    description: "Estratégias práticas para lidar com desentendimentos",
    category: "Conflitos",
    tags: ["conflito", "briga", "relacionamento", "resolver"],
    instructor: "Carlos Mendes",
  },
  {
    id: "5",
    title: "Intimidade e Conexão no Casamento",
    description: "Como cultivar intimidade emocional e física no casamento",
    category: "Intimidade",
    tags: ["intimidade", "casamento", "conexão", "sexo"],
    instructor: "Dra. Paula Costa",
  },
];

const TEST_QUERIES = [
  { query: "curso", description: "Termo genérico" },
  { query: "aula", description: "Sinônimo de curso" },
  { query: "relacionamento", description: "Categoria ampla" },
  { query: "grana", description: "Sinônimo de dinheiro" },
  { query: "brigas", description: "Sinônimo de conflito" },
  { query: "criança", description: "Relacionado a filhos" },
  { query: "sexo", description: "Relacionado a intimidade" },
  { query: "cnv", description: "Sigla (tag)" },
  { query: "xpto", description: "Termo inexistente - fallback" },
];

export function SearchDemo() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.trim()) {
      const searchResults = smartSearch(DEMO_COURSES, searchQuery, {
        minResults: 3,
        fallbackToPopular: true
      });
      
      setResults(searchResults);
      setMessage(getSearchResultMessage(searchQuery, searchResults.length, DEMO_COURSES));
    } else {
      setResults([]);
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl" style={{ fontWeight: 700 }}>
            Demo: Busca Inteligente
          </h1>
          <p className="text-lg text-muted-foreground">
            Sistema que <strong>NUNCA</strong> retorna zero resultados
          </p>
        </div>

        {/* Search Input */}
        <Card>
          <CardHeader>
            <CardTitle>Teste a Busca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Digite algo... tente 'curso', 'grana', 'xpto'"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {message && (
              <div className="flex items-start gap-2 bg-primary/10 rounded-lg p-4 border border-primary/20">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{message}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium">{result.title}</h3>
                      <Badge variant="outline">{result.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {result.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {result.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Por {result.instructor}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Testes Rápidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TEST_QUERIES.map((test, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(test.query)}
                  className="text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="font-medium text-sm">{test.query}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {test.description}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Recursos da Busca Inteligente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "Sinônimos Automáticos",
                  description: "Buscar por 'grana' encontra conteúdo sobre 'finanças' e 'dinheiro'"
                },
                {
                  title: "Fuzzy Matching",
                  description: "Tolera erros de digitação e encontra termos similares"
                },
                {
                  title: "Busca por Categoria",
                  description: "Termos genéricos como 'curso' mostram resultados de todas as categorias"
                },
                {
                  title: "Fallback Inteligente",
                  description: "Se não encontrar nada, mostra conteúdo popular/recomendado"
                },
                {
                  title: "Normalização de Texto",
                  description: "Remove acentos e ignora maiúsculas/minúsculas"
                },
                {
                  title: "Busca Multi-campo",
                  description: "Busca em título, descrição, categoria, tags e instrutor"
                },
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Exemplos de Busca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium min-w-[120px]">curso</span>
                  <span className="text-muted-foreground">→ Mostra todos os cursos disponíveis</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium min-w-[120px]">grana</span>
                  <span className="text-muted-foreground">→ Encontra curso de Finanças</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium min-w-[120px]">brigas</span>
                  <span className="text-muted-foreground">→ Encontra curso sobre Conflitos</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium min-w-[120px]">criança</span>
                  <span className="text-muted-foreground">→ Encontra curso sobre Filhos</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium min-w-[120px]">xpto</span>
                  <span className="text-muted-foreground">→ Mostra cursos populares (fallback)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
