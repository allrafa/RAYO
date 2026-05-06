// ============================================================================
// 📚 RAYO ECOSYSTEM - ACADEMIA WITH BOOK READER
// Wrapper que gerencia Academia + Book Reader
// ============================================================================

import { useApp } from './AppContext';
import { AcademiaPage } from './AcademiaPage';
import { BookReaderWrapper } from './reader/BookReaderWrapper';

export function AcademiaWithBookReader() {
  const { isInBookDetail, isInBookReader } = useApp();

  // Se está no leitor ou detalhes do livro, mostrar o BookReaderWrapper
  if (isInBookDetail || isInBookReader) {
    return <BookReaderWrapper />;
  }

  // Caso contrário, mostrar a Academia normal
  return <AcademiaPage />;
}
