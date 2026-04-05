/**
 * Smart Search Engine - Sistema de busca inteligente que NUNCA retorna zero resultados
 * 
 * Características:
 * - Busca fuzzy com tolerância a erros de digitação
 * - Mapeamento de sinônimos e termos relacionados
 * - Busca por categoria quando termo é genérico
 * - Fallback inteligente para resultados populares/recomendados
 * - Normalização de texto (remove acentos, case insensitive)
 */

export interface SearchableItem {
  id: string;
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  instructor?: string;
  author?: string;
  [key: string]: any;
}

// Dicionário de sinônimos e termos relacionados
const SYNONYMS_MAP: Record<string, string[]> = {
  // Termos genéricos -> específicos
  'curso': ['cursos', 'aula', 'aulas', 'treinamento', 'formação', 'capacitação', 'educação'],
  'cursos': ['curso', 'aula', 'aulas', 'treinamento', 'formação', 'capacitação', 'educação'],
  'aula': ['curso', 'cursos', 'aulas', 'treinamento', 'lição'],
  'video': ['vídeo', 'vídeos', 'videos', 'conteúdo', 'mídia'],
  'relacionamento': ['relacionamentos', 'namoro', 'casamento', 'casal', 'amor', 'romance'],
  'casamento': ['casado', 'casados', 'casal', 'matrimônio', 'esposo', 'esposa', 'conjugal'],
  'comunicação': ['comunicacao', 'conversa', 'diálogo', 'dialogo', 'falar', 'expressão'],
  'dinheiro': ['finanças', 'financeiro', 'financeira', 'economia', 'orçamento', 'grana'],
  'finanças': ['financeiro', 'financeira', 'dinheiro', 'economia', 'orçamento', 'investimento'],
  'filhos': ['filho', 'criança', 'crianças', 'pais', 'paternidade', 'maternidade', 'educação'],
  'sexo': ['intimidade', 'íntimo', 'sexual', 'sexualidade'],
  'intimidade': ['íntimo', 'intima', 'sexo', 'sexual', 'sexualidade', 'privacidade'],
  'conflito': ['conflitos', 'briga', 'brigas', 'discussão', 'desentendimento', 'problema'],
  'problema': ['problemas', 'dificuldade', 'desafio', 'conflito', 'questão'],
  'ajuda': ['ajudar', 'apoio', 'suporte', 'auxílio', 'socorro', 'orientação'],
  'conselho': ['conselhos', 'orientação', 'dica', 'dicas', 'sugestão', 'recomendação'],
  'familia': ['família', 'parentes', 'casa', 'lar', 'doméstico'],
  'espiritual': ['espiritualidade', 'fé', 'religião', 'deus', 'bíblia', 'cristão'],
  'transformação': ['transformar', 'mudança', 'mudar', 'evolução', 'crescimento', 'desenvolvimento'],
  'autoconhecimento': ['autoconhecimento', 'auto-conhecimento', 'conhecer-se', 'identidade', 'self'],
  'proposito': ['propósito', 'objetivo', 'meta', 'missão', 'vocação', 'chamado'],
  'carreira': ['trabalho', 'profissão', 'emprego', 'profissional', 'vocação'],
  'saude': ['saúde', 'bem-estar', 'wellness', 'qualidade de vida', 'saudável'],
  'emocional': ['emoções', 'sentimentos', 'psicológico', 'mental', 'emocional'],
  'coaching': ['coach', 'mentoria', 'orientação', 'aconselhamento', 'consultoria'],
  'comunidade': ['grupo', 'grupos', 'pessoas', 'membros', 'social', 'network'],
  'aprender': ['aprendizado', 'aprendizagem', 'estudar', 'estudo', 'conhecimento', 'educação'],
  'desenvolver': ['desenvolvimento', 'evoluir', 'evolução', 'crescer', 'crescimento', 'melhorar'],
};

// Categorias com palavras-chave associadas
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Relacionamentos': ['namoro', 'casamento', 'casal', 'amor', 'romance', 'conjugal', 'parceiro', 'parceira'],
  'Comunicação': ['comunicação', 'conversa', 'diálogo', 'expressão', 'falar', 'ouvir', 'linguagem'],
  'Finanças': ['dinheiro', 'financeiro', 'orçamento', 'economia', 'investir', 'poupar', 'grana'],
  'Família': ['filhos', 'pais', 'criança', 'educação', 'paternidade', 'maternidade', 'lar'],
  'Intimidade': ['sexo', 'sexual', 'íntimo', 'privacidade', 'carícia'],
  'Conflitos': ['briga', 'discussão', 'desentendimento', 'problema', 'desafio', 'resolver'],
  'Espiritualidade': ['fé', 'religião', 'deus', 'bíblia', 'cristão', 'oração', 'espiritual'],
  'Desenvolvimento Pessoal': ['crescimento', 'evolução', 'transformação', 'autoconhecimento', 'propósito'],
  'Carreira': ['trabalho', 'profissão', 'vocação', 'emprego', 'profissional'],
  'Saúde': ['bem-estar', 'wellness', 'saúde', 'qualidade de vida', 'exercício'],
};

/**
 * Normaliza string removendo acentos e convertendo para lowercase
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calcula distância de Levenshtein (similaridade entre strings)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calcula score de similaridade (0-1)
 */
function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - (distance / maxLength);
}

/**
 * Expande query com sinônimos
 */
function expandQueryWithSynonyms(query: string): string[] {
  const normalized = normalizeString(query);
  const words = normalized.split(/\s+/);
  const expandedTerms = new Set<string>();

  // Adiciona a query original
  expandedTerms.add(normalized);

  // Para cada palavra, adiciona sinônimos
  words.forEach(word => {
    expandedTerms.add(word);
    
    // Busca sinônimos exatos
    if (SYNONYMS_MAP[word]) {
      SYNONYMS_MAP[word].forEach(synonym => {
        expandedTerms.add(normalizeString(synonym));
      });
    }

    // Busca sinônimos similares (fuzzy matching)
    Object.keys(SYNONYMS_MAP).forEach(key => {
      if (calculateSimilarity(word, key) > 0.85) {
        SYNONYMS_MAP[key].forEach(synonym => {
          expandedTerms.add(normalizeString(synonym));
        });
      }
    });
  });

  return Array.from(expandedTerms);
}

/**
 * Identifica categorias relevantes baseado na query
 */
function identifyRelevantCategories(query: string): string[] {
  const normalized = normalizeString(query);
  const relevantCategories: string[] = [];

  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    const hasMatch = keywords.some(keyword => {
      const normalizedKeyword = normalizeString(keyword);
      return (
        normalized.includes(normalizedKeyword) ||
        normalizedKeyword.includes(normalized) ||
        calculateSimilarity(normalized, normalizedKeyword) > 0.75
      );
    });

    if (hasMatch) {
      relevantCategories.push(category);
    }
  });

  return relevantCategories;
}

/**
 * Calcula score de relevância para um item
 */
function calculateRelevanceScore(item: SearchableItem, expandedTerms: string[], originalQuery: string): number {
  let score = 0;
  const normalizedQuery = normalizeString(originalQuery);

  // Busca no título (peso 3)
  const normalizedTitle = normalizeString(item.title);
  expandedTerms.forEach(term => {
    if (normalizedTitle.includes(term)) {
      score += 3;
    }
    // Bonus para match exato no título
    if (normalizedTitle.includes(normalizedQuery)) {
      score += 5;
    }
  });

  // Busca na descrição (peso 2)
  const normalizedDescription = normalizeString(item.description);
  expandedTerms.forEach(term => {
    if (normalizedDescription.includes(term)) {
      score += 2;
    }
  });

  // Busca na categoria (peso 2)
  if (item.category) {
    const normalizedCategory = normalizeString(item.category);
    expandedTerms.forEach(term => {
      if (normalizedCategory.includes(term)) {
        score += 2;
      }
    });
  }

  // Busca nas tags (peso 1.5)
  if (item.tags && Array.isArray(item.tags)) {
    item.tags.forEach(tag => {
      const normalizedTag = normalizeString(tag);
      expandedTerms.forEach(term => {
        if (normalizedTag.includes(term)) {
          score += 1.5;
        }
      });
    });
  }

  // Busca no instrutor/autor (peso 1)
  if (item.instructor) {
    const normalizedInstructor = normalizeString(item.instructor);
    expandedTerms.forEach(term => {
      if (normalizedInstructor.includes(term)) {
        score += 1;
      }
    });
  }

  if (item.author) {
    const normalizedAuthor = normalizeString(item.author);
    expandedTerms.forEach(term => {
      if (normalizedAuthor.includes(term)) {
        score += 1;
      }
    });
  }

  // Fuzzy matching adicional
  const allText = `${item.title} ${item.description} ${item.category || ''} ${(item.tags || []).join(' ')}`;
  const normalizedAllText = normalizeString(allText);
  
  if (calculateSimilarity(normalizedQuery, normalizedAllText) > 0.3) {
    score += 1;
  }

  return score;
}

/**
 * Busca inteligente que NUNCA retorna zero resultados
 */
export function smartSearch<T extends SearchableItem>(
  items: T[],
  query: string,
  options: {
    minResults?: number;
    fallbackToPopular?: boolean;
    categoryFilter?: string;
  } = {}
): T[] {
  const {
    minResults = 5,
    fallbackToPopular = true,
    categoryFilter
  } = options;

  // Se não há query, retorna items populares
  if (!query.trim()) {
    return items.slice(0, minResults);
  }

  // Expande query com sinônimos
  const expandedTerms = expandQueryWithSynonyms(query);
  const relevantCategories = identifyRelevantCategories(query);

  // Calcula scores para cada item
  const scoredItems = items.map(item => ({
    item,
    score: calculateRelevanceScore(item, expandedTerms, query)
  }));

  // Filtra por categoria se especificado
  let filteredScoredItems = categoryFilter
    ? scoredItems.filter(({ item }) => item.category === categoryFilter)
    : scoredItems;

  // Ordena por score
  filteredScoredItems.sort((a, b) => b.score - a.score);

  // Filtra items com score > 0
  let results = filteredScoredItems
    .filter(({ score }) => score > 0)
    .map(({ item }) => item);

  // ESTRATÉGIA 1: Se muito poucos resultados, busca por categoria relevante
  if (results.length < minResults && relevantCategories.length > 0) {
    const categoryResults = items.filter(item =>
      relevantCategories.includes(item.category || '')
    );
    
    // Adiciona resultados de categoria que ainda não estão nos resultados
    categoryResults.forEach(categoryItem => {
      if (!results.find(r => r.id === categoryItem.id)) {
        results.push(categoryItem);
      }
    });
  }

  // ESTRATÉGIA 2: Se ainda poucos resultados, usa fuzzy matching mais agressivo
  if (results.length < minResults) {
    const fuzzyResults = items.filter(item => {
      const allText = `${item.title} ${item.description}`;
      const similarity = calculateSimilarity(normalizeString(query), normalizeString(allText));
      return similarity > 0.2 && !results.find(r => r.id === item.id);
    });

    results = [...results, ...fuzzyResults.slice(0, minResults - results.length)];
  }

  // ESTRATÉGIA 3: Fallback para items populares/recomendados
  if (results.length < minResults && fallbackToPopular) {
    const popularItems = items
      .filter(item => !results.find(r => r.id === item.id))
      .sort((a, b) => {
        // Prioriza items com mais estudantes/visualizações
        const aPopularity = (a as any).students || (a as any).views || 0;
        const bPopularity = (b as any).students || (b as any).views || 0;
        return bPopularity - aPopularity;
      });

    const needed = minResults - results.length;
    results = [...results, ...popularItems.slice(0, needed)];
  }

  // ESTRATÉGIA 4: Se ainda não tem resultados suficientes, pega os primeiros items
  if (results.length < minResults) {
    const remaining = items
      .filter(item => !results.find(r => r.id === item.id))
      .slice(0, minResults - results.length);
    
    results = [...results, ...remaining];
  }

  return results;
}

/**
 * Retorna sugestões de correção ortográfica
 */
export function getSearchSuggestions(query: string, items: SearchableItem[]): string[] {
  const normalized = normalizeString(query);
  const suggestions = new Set<string>();

  // Adiciona sinônimos diretos
  Object.keys(SYNONYMS_MAP).forEach(key => {
    if (calculateSimilarity(normalized, key) > 0.7) {
      suggestions.add(key);
      SYNONYMS_MAP[key].slice(0, 2).forEach(syn => suggestions.add(syn));
    }
  });

  // Adiciona termos similares dos items
  items.forEach(item => {
    const words = normalizeString(item.title).split(/\s+/);
    words.forEach(word => {
      if (word.length > 3 && calculateSimilarity(normalized, word) > 0.7) {
        suggestions.add(word);
      }
    });
  });

  return Array.from(suggestions).slice(0, 5);
}

/**
 * Retorna mensagem contextual explicando os resultados
 */
export function getSearchResultMessage(
  query: string,
  resultCount: number,
  items: SearchableItem[]
): string {
  const relevantCategories = identifyRelevantCategories(query);
  
  if (resultCount === 0) {
    return 'Encontramos conteúdos relevantes para você';
  }

  if (relevantCategories.length > 0) {
    return `Resultados para "${query}" em ${relevantCategories.join(', ')}`;
  }

  const expandedTerms = expandQueryWithSynonyms(query);
  if (expandedTerms.length > 1) {
    return `Encontramos resultados relacionados a "${query}"`;
  }

  return `${resultCount} resultado${resultCount !== 1 ? 's' : ''} para "${query}"`;
}
