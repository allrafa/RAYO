// ============================================================================
// 📚 RAIO ECOSYSTEM - MOCK TRANSCRIPTS
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
export const mockBookContents: Record<string, BookContent> = {
  'book-1': {
    bookId: 'book-1',
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
