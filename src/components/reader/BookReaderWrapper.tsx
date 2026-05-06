// ============================================================================
// 📚 RAYO ECOSYSTEM - BOOK READER WRAPPER
// Wrapper que gerencia a navegação entre Detail e Reader
// ============================================================================

import { useApp } from '../AppContext';
import { BookDetailPage } from './BookDetailPage';
import { BookReaderPage } from './BookReaderPage';

export function BookReaderWrapper() {
  const {
    currentBookId,
    isInBookDetail,
    isInBookReader,
    setIsInBookDetail,
    setIsInBookReader,
    setCurrentBookId,
    getBookById,
  } = useApp();

  const book = currentBookId ? getBookById(currentBookId) : null;

  // Se não há livro selecionado, não renderiza nada
  if (!book) {
    return null;
  }

  // Navegação do Reader
  if (isInBookReader) {
    return (
      <BookReaderPage
        book={book}
        onBack={() => {
          setIsInBookReader(false);
          setIsInBookDetail(true);
        }}
      />
    );
  }

  // Navegação do Detail
  if (isInBookDetail) {
    return (
      <BookDetailPage
        book={book}
        onBack={() => {
          setIsInBookDetail(false);
          setCurrentBookId(null);
        }}
        onStartReading={() => {
          setIsInBookDetail(false);
          setIsInBookReader(true);
        }}
      />
    );
  }

  return null;
}
