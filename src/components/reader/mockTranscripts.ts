// ============================================================================
// 📚 RAYO ECOSYSTEM - MOCK TRANSCRIPTS
// Transcrições mock com timestamps para sincronização
// ============================================================================

import { Book } from '../types/BookTypes';

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  page?: number;
}

export interface BookContent {
  bookId: string;
  summary: string;
  keyTakeaways: string[];
  audioUrl: string;
  audioUrlMale: string;
  audioUrlFemale: string;
  transcript: TranscriptSegment[];
}

// Mock: Áudio gratuito do YouTube Audio Library ou similar
// Para produção, usar áudios reais do livro
// Keyed by CMS slug (stable across environments) so the reader/audio layer
// keeps working after Task #17 migrated the catalogue from `book-N` mock IDs
// to numeric CMS IDs. The legacy `book-1` alias is still served for any old
// callers that haven't migrated yet.
export const mockBookContents: Record<string, BookContent> = {
  'os-5-pilares-de-um-casamento-feliz': {
    bookId: 'os-5-pilares-de-um-casamento-feliz',
    summary: 'Descubra os cinco pilares fundamentais que sustentam um casamento saudável e duradouro: comunicação, respeito, intimidade, compromisso e crescimento conjunto. Este livro oferece ferramentas práticas baseadas em décadas de pesquisa e experiência clínica para fortalecer seu relacionamento.',
    keyTakeaways: [
      '💬 Comunicação aberta e honesta é a base de qualquer relacionamento',
      '🤝 Respeito mútuo cria um ambiente seguro para ambos',
      '❤️ Intimidade emocional é tão importante quanto a física',
      '🎯 Compromisso diário com o relacionamento faz a diferença',
      '🌱 Crescer juntos mantém o relacionamento vivo e dinâmico',
    ],
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Mock
    audioUrlMale: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    audioUrlFemale: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    transcript: [
      {
        id: 'seg-1',
        text: 'Capítulo 1: A Fundação da Comunicação',
        startTime: 0,
        endTime: 3,
        page: 1,
      },
      {
        id: 'seg-2',
        text: 'Todo casamento saudável começa com uma comunicação clara e honesta. Quando dois indivíduos decidem unir suas vidas, eles trazem consigo histórias, experiências e formas únicas de se expressar.',
        startTime: 3,
        endTime: 15,
        page: 1,
      },
      {
        id: 'seg-3',
        text: 'A comunicação não é apenas sobre falar, mas principalmente sobre escutar. Escutar ativamente significa estar presente, prestar atenção genuína e buscar compreender o ponto de vista do outro.',
        startTime: 15,
        endTime: 27,
        page: 2,
      },
      {
        id: 'seg-4',
        text: 'Muitos casais enfrentam desafios porque assumem que o parceiro deve "ler mentes" ou automaticamente saber o que estão pensando ou sentindo.',
        startTime: 27,
        endTime: 36,
        page: 2,
      },
      {
        id: 'seg-5',
        text: 'Capítulo 2: O Poder do Respeito Mútuo',
        startTime: 36,
        endTime: 40,
        page: 3,
      },
      {
        id: 'seg-6',
        text: 'O respeito é o segundo pilar fundamental. Respeitar significa valorizar o outro como indivíduo, com suas próprias necessidades, desejos e limites.',
        startTime: 40,
        endTime: 50,
        page: 3,
      },
      {
        id: 'seg-7',
        text: 'Quando há respeito, há espaço para diferenças. Você não precisa concordar com tudo que seu parceiro diz ou faz, mas deve sempre tratá-lo com dignidade.',
        startTime: 50,
        endTime: 60,
        page: 4,
      },
      {
        id: 'seg-8',
        text: 'O desrespeito pode se manifestar de formas sutis: ignorar opiniões, fazer piadas ofensivas ou minimizar sentimentos. Todas essas atitudes corroem a confiança.',
        startTime: 60,
        endTime: 71,
        page: 4,
      },
      {
        id: 'seg-9',
        text: 'Capítulo 3: Intimidade Além do Físico',
        startTime: 71,
        endTime: 75,
        page: 5,
      },
      {
        id: 'seg-10',
        text: 'A intimidade física é importante, mas a verdadeira conexão vem da intimidade emocional. Compartilhar medos, sonhos, vulnerabilidades e alegrias cria laços profundos.',
        startTime: 75,
        endTime: 87,
        page: 5,
      },
      {
        id: 'seg-11',
        text: 'Muitos casais negligenciam a intimidade emocional na correria do dia a dia. Reserve tempo para conversas profundas, sem distrações de celulares ou televisão.',
        startTime: 87,
        endTime: 98,
        page: 6,
      },
      {
        id: 'seg-12',
        text: 'A intimidade se constrói nos pequenos momentos: um olhar carinhoso, um toque suave, palavras de afirmação. Essas ações diárias fortalecem o vínculo.',
        startTime: 98,
        endTime: 109,
        page: 6,
      },
      {
        id: 'seg-13',
        text: 'Capítulo 4: Compromisso Diário',
        startTime: 109,
        endTime: 112,
        page: 7,
      },
      {
        id: 'seg-14',
        text: 'O compromisso não é algo que você faz uma vez no dia do casamento. É uma escolha diária de priorizar seu parceiro e seu relacionamento.',
        startTime: 112,
        endTime: 122,
        page: 7,
      },
      {
        id: 'seg-15',
        text: 'Haverá dias difíceis. Dias em que você não "sente" amor. Nesses momentos, o compromisso é o que mantém o relacionamento firme.',
        startTime: 122,
        endTime: 132,
        page: 8,
      },
      {
        id: 'seg-16',
        text: 'Compromisso significa escolher o "nós" ao invés do "eu". Significa fazer sacrifícios quando necessário e trabalhar em equipe para superar desafios.',
        startTime: 132,
        endTime: 143,
        page: 8,
      },
      {
        id: 'seg-17',
        text: 'Capítulo 5: Crescimento Conjunto',
        startTime: 143,
        endTime: 146,
        page: 9,
      },
      {
        id: 'seg-18',
        text: 'O último pilar é o crescimento. Casais que crescem juntos permanecem juntos. Isso significa apoiar os sonhos um do outro e buscar experiências compartilhadas.',
        startTime: 146,
        endTime: 158,
        page: 9,
      },
      {
        id: 'seg-19',
        text: 'Não tenham medo de mudanças. As pessoas evoluem, e isso é saudável. O importante é evoluir na mesma direção, com valores e objetivos alinhados.',
        startTime: 158,
        endTime: 169,
        page: 10,
      },
      {
        id: 'seg-20',
        text: 'Invistam juntos em aprendizado: leiam livros, façam cursos, viajem, experimentem hobbies novos. Cada experiência compartilhada fortalece o vínculo.',
        startTime: 169,
        endTime: 180,
        page: 10,
      },
    ],
  },
};

// Mocks mínimos pros demais livros do CMS. Mantemos apenas summary,
// 3 takeaways e 2 segments por livro pra evitar a tela "Conteúdo não
// encontrado" no reader. Quando o conteúdo real for produzido, basta
// substituir a entrada correspondente em `mockBookContents`. — Task #116.
function placeholderContent(
  slug: string,
  summary: string,
  takeaways: string[],
  firstParagraph: string,
): BookContent {
  return {
    bookId: slug,
    summary,
    keyTakeaways: takeaways,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    audioUrlMale: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    audioUrlFemale: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    transcript: [
      {
        id: 'seg-intro',
        text: 'Introdução',
        startTime: 0,
        endTime: 3,
        page: 1,
      },
      {
        id: 'seg-1',
        text: firstParagraph,
        startTime: 3,
        endTime: 18,
        page: 1,
      },
    ],
  };
}

const placeholders: BookContent[] = [
  placeholderContent(
    'educacao-positiva-criando-filhos-resilientes',
    'Um guia prático para pais que querem criar filhos emocionalmente fortes através da educação positiva, com limites claros e empatia genuína.',
    [
      '🌱 Resiliência se constrói com vínculo, não com punição',
      '🤝 Limites claros dão segurança à criança',
      '💛 Empatia não é permissividade',
    ],
    'A educação positiva começa com a forma como você enxerga seu filho: alguém em construção, e não um adulto em miniatura.',
  ),
  placeholderContent(
    'financas-do-casal-prosperidade-juntos',
    'Como construir prosperidade financeira em casal sem brigas: orçamento conjunto, metas compartilhadas e conversas honestas sobre dinheiro.',
    [
      '💰 Dinheiro é assunto de casal, não de uma pessoa só',
      '📊 Orçamento começa com transparência total',
      '🎯 Metas comuns alinham as decisões do dia a dia',
    ],
    'Casais que prosperam juntos compartilham planilhas, mas também sonhos. Dinheiro deixa de ser tabu quando vira projeto comum.',
  ),
  placeholderContent(
    'comunicacao-nao-violenta-em-familia',
    'Aplicando os princípios da CNV no ambiente familiar para resolver conflitos sem gritar, julgar ou ferir relacionamentos importantes.',
    [
      '👂 Escutar sem interromper já desarma metade dos conflitos',
      '🗣️ Fale do que sente, não do que o outro "fez"',
      '🤲 Pedidos claros substituem exigências',
    ],
    'A comunicação não-violenta começa quando você troca o "você sempre" pelo "eu sinto que". Pequena mudança, grande impacto.',
  ),
  placeholderContent(
    'a-arte-de-educar-sem-gritar',
    'Estratégias práticas para pais que querem parar de gritar e construir autoridade pelo respeito mútuo, com técnicas testadas no dia a dia.',
    [
      '🧘 O grito é sintoma — entenda o gatilho antes',
      '⏸️ Pause: 3 respirações antes de responder',
      '🤝 Autoridade vem do exemplo, não do volume',
    ],
    'Gritar é um hábito, não um traço de personalidade. E como todo hábito, pode ser substituído com prática consciente.',
  ),
  placeholderContent(
    'intimidade-e-conexao-no-casamento',
    'Como reacender a chama no casamento de longa data através da intimidade emocional, vulnerabilidade compartilhada e rituais de conexão.',
    [
      '💞 Intimidade física precede e segue a emocional',
      '🕯️ Rituais simples mantêm a chama viva',
      '🫂 Vulnerabilidade é coragem, não fraqueza',
    ],
    'A conexão profunda não acontece por acaso: é o resultado de pequenas escolhas diárias de presença e cuidado.',
  ),
  placeholderContent(
    'proposito-de-vida-encontrando-seu-chamado',
    'Um guia para descobrir seu propósito de vida combinando dons naturais, paixões e necessidades do mundo ao seu redor.',
    [
      '🎯 Propósito é interseção entre dom, paixão e serviço',
      '🌍 O mundo precisa do que só você pode oferecer',
      '🌱 Propósito se descobre fazendo, não pensando',
    ],
    'Seu propósito não está escondido em algum lugar do futuro: ele já se manifesta nas pequenas coisas que você faz com alegria.',
  ),
  placeholderContent(
    'gestao-do-tempo-para-pais-ocupados',
    'Métodos práticos de gestão de tempo adaptados à realidade de pais e mães ocupados, com foco em qualidade ao invés de quantidade.',
    [
      '⏰ Tempo de qualidade > tempo de quantidade',
      '📋 Bloqueie tempo pra família como reunião sagrada',
      '🚫 Aprender a dizer "não" libera o "sim" pro que importa',
    ],
    'Pais ocupados não precisam de mais horas no dia: precisam de melhores escolhas dentro das horas que já têm.',
  ),
  placeholderContent(
    'saude-mental-da-familia-moderna',
    'Como cuidar da saúde mental de toda a família na era digital: ansiedade, sobrecarga, telas e os novos desafios da parentalidade contemporânea.',
    [
      '🧠 Saúde mental da família começa pela do cuidador',
      '📵 Limites com telas protegem todos',
      '💬 Conversas sobre emoções devem ser rotina, não exceção',
    ],
    'A família moderna enfrenta desafios que nenhuma geração anterior conheceu. Cuidar da saúde mental virou habilidade essencial.',
  ),
  placeholderContent(
    'criando-vinculos-seguros-com-seus-filhos',
    'A teoria do apego aplicada na prática: como criar filhos com vínculo seguro que se torna base pra todos os relacionamentos da vida.',
    [
      '🔗 Vínculo seguro vira modelo pra futuras relações',
      '👶 Presença consistente vale mais que perfeição',
      '🤗 Reparar vínculos rompidos fortalece a confiança',
    ],
    'Vínculo seguro não exige pais perfeitos: exige pais presentes, que voltam, que reconhecem erros e que estão dispostos a reparar.',
  ),
];

for (const content of placeholders) {
  if (!mockBookContents[content.bookId]) {
    mockBookContents[content.bookId] = content;
  }
}

// Helper para buscar conteúdo do livro
export function getBookContent(bookId: string): BookContent | null {
  return mockBookContents[bookId] || null;
}

// Helper para estimar duração total de leitura
export function estimateReadingDuration(transcript: TranscriptSegment[]): string {
  if (transcript.length === 0) return '0min';
  
  const lastSegment = transcript[transcript.length - 1];
  const totalSeconds = lastSegment.endTime;
  const minutes = Math.ceil(totalSeconds / 60);
  
  if (minutes < 60) {
    return `${minutes}min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }
}
