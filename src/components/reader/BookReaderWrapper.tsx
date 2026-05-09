// ============================================================================
// 📚 RAYO ECOSYSTEM - BOOK READER WRAPPER
// Wrapper que gerencia a navegação entre Detail e Reader
// ============================================================================

import { useEffect } from 'react';
import { useApp } from '../AppContext';
import { BookDetailPage } from './BookDetailPage';
import { BookReaderPage } from './BookReaderPage';
import { onScrollTop } from '../../lib/scrollTop';

export function BookReaderWrapper() {
  const {
    currentBookId,
    isInBookDetail,
    isInBookReader,
    setIsInBookDetail,
    setIsInBookReader,
    setCurrentBookId,
    getBookById,
    enrollInBook,
  } = useApp();

  const book = currentBookId ? getBookById(currentBookId) : null;

  // Task #115 — re-tap na aba Turmas (já-ativa) fecha detail/reader e
  // volta pro catálogo. Mesmo padrão usado em ComunidadePage/PerfilPage.
  useEffect(() => {
    return onScrollTop(() => {
      setIsInBookReader(false);
      setIsInBookDetail(false);
      setCurrentBookId(null);
    }, 'academia');
  }, [setIsInBookReader, setIsInBookDetail, setCurrentBookId]);

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
          // Matrícula implícita ao começar a ler — Task #116.
          // O fluxo "ver antes de matricular" exige que o enroll
          // aconteça aqui (e não no clique do card).
          if (!book.isEnrolled) {
            enrollInBook(book.id);
          }
          setIsInBookDetail(false);
          setIsInBookReader(true);
        }}
      />
    );
  }

  return null;
}
