// ============================================================================
// 📚 RAIO ECOSYSTEM - BOOK TYPES
// Estrutura de dados para livros na Biblioteca
// ============================================================================

export interface BookNote {
  id: string;
  page: number;
  content: string;
  createdAt: Date;
}

export interface BookHighlight {
  id: string;
  page: number;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  createdAt: Date;
}

export interface BookReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  helpful: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  description: string;
  category: string[];
  
  // Metadados
  pages: number;
  language: string;
  publishedYear: number;
  publisher?: string;
  isbn?: string;
  
  // Leitura e Progresso
  currentPage: number;
  progress: number; // 0-100
  isCompleted: boolean;
  lastRead?: Date;
  estimatedReadTime?: string; // "2h 30min"
  
  // Engajamento
  rating?: number; // Rating pessoal do usuário (0-5)
  isFavorite: boolean;
  isEnrolled: boolean; // Se está na biblioteca do usuário
  notes: BookNote[];
  highlights: BookHighlight[];
  
  // Formato
  format: 'pdf' | 'epub' | 'audiobook' | 'physical';
  fileUrl?: string; // URL do arquivo se digital
  audioDuration?: number; // Duração em minutos se audiobook
  
  // Premium/Marketplace
  isPremium: boolean;
  price?: number;
  
  // Social/Stats
  readers: number; // Quantas pessoas leram
  averageRating: number; // Rating médio (0-5)
  reviews: BookReview[];
  
  // Tags e Filtros
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface LibraryItem {
  type: 'course' | 'book';
  data: any; // Course | Book
  addedAt: Date;
  lastAccessed?: Date;
}

export type LibraryFilter = 'all' | 'courses' | 'books';
export type BookFormat = 'pdf' | 'epub' | 'audiobook' | 'physical';
export type ReadingStatus = 'not-started' | 'reading' | 'completed';

// Helper function to get reading status
export function getReadingStatus(book: Book): ReadingStatus {
  if (book.isCompleted) return 'completed';
  if (book.currentPage > 0) return 'reading';
  return 'not-started';
}

// Helper function to format progress text
export function formatBookProgress(book: Book): string {
  if (book.isCompleted) return 'Concluído';
  if (book.currentPage === 0) return 'Não iniciado';
  return `Pág. ${book.currentPage} de ${book.pages}`;
}

// Helper function to get estimated time remaining
export function getEstimatedTimeRemaining(book: Book): string {
  if (book.isCompleted) return '0min';
  const pagesRemaining = book.pages - book.currentPage;
  const minutesPerPage = 2; // Assume 2 minutos por página
  const minutesRemaining = pagesRemaining * minutesPerPage;
  
  if (minutesRemaining < 60) {
    return `${minutesRemaining}min`;
  } else {
    const hours = Math.floor(minutesRemaining / 60);
    const minutes = minutesRemaining % 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
}
