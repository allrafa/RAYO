// ============================================================================
// 📚 RAYO ECOSYSTEM - ACADEMIA WITH BOOK READER
// Wrapper que gerencia Academia + Book Reader
// ============================================================================

import { useApp } from './AppContext';
import { AcademiaPage } from './AcademiaPage';
import { BookReaderWrapper } from './reader/BookReaderWrapper';
import { TurmaShell } from './turmas/TurmaShell';
import { useScrollRestore } from '../lib/scrollRestore';

export function AcademiaWithBookReader() {
  const { isInBookDetail, isInBookReader, isInCourseDetail, currentCourseId } = useApp();

  // Task #120 — preserva o scroll da Academia ao abrir/voltar de
  // BookCard (Minha Biblioteca) ou CourseCard (Catálogo). O hook fica
  // aqui (não em AcademiaPage) porque a página é desmontada quando
  // qualquer um dos detalhes abre.
  useScrollRestore('academia-page', isInBookDetail || isInBookReader || (isInCourseDetail && !!currentCourseId));

  // Se está no leitor ou detalhes do livro, mostrar o BookReaderWrapper
  if (isInBookDetail || isInBookReader) {
    return <BookReaderWrapper />;
  }

  // Task #99 — quando o usuário entra em uma turma (clique num card),
  // renderiza o TurmaShell (mini-Skool: landing + tabs Aulas/Comunidade/
  // Membros/Sobre). Se não for membro, o shell mostra a landing pura
  // com modal "Em breve" pra capturar interesse.
  if (isInCourseDetail && currentCourseId) {
    return <TurmaShell />;
  }

  // Caso contrário, mostrar a Academia normal
  return <AcademiaPage />;
}
