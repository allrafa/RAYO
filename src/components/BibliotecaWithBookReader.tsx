// ============================================================================
// 📚 RAIO ECOSYSTEM - BIBLIOTECA WITH BOOK READER
// Wrapper que gerencia Biblioteca + Book Reader
// ============================================================================

import { useApp } from './AppContext';
import { BibliotecaPage } from './BibliotecaPage';
import { BookReaderWrapper } from './reader/BookReaderWrapper';

interface BibliotecaWithBookReaderProps {
  onBack: () => void;
}

export function BibliotecaWithBookReader({ onBack }: BibliotecaWithBookReaderProps) {
  const { isInBookDetail, isInBookReader } = useApp();

  // Se está no leitor ou detalhes do livro, mostrar o BookReaderWrapper
  if (isInBookDetail || isInBookReader) {
    return <BookReaderWrapper />;
  }

  // Caso contrário, mostrar a Biblioteca normal
  return <BibliotecaPage onBack={onBack} />;
}
