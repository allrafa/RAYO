// ============================================================================
// 📚 RAYO ECOSYSTEM - BIBLIOTECA PAGE
// Página dedicada da Biblioteca acessível do Perfil
// ============================================================================

import { useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { BookCard } from './BookCard';
import { useApp } from './AppContext';
import { useTheme } from './ThemeProvider';
import { toast } from 'sonner@2.0.3';

interface BibliotecaPageProps {
  onBack: () => void;
}

export function BibliotecaPage({ onBack }: BibliotecaPageProps) {
  const { courses, books, startCourse, toggleBookFavorite, setCurrentBookId, setIsInBookDetail } = useApp();
  const { theme } = useTheme();
  const [filter, setFilter] = useState<'all' | 'courses' | 'books'>('all');
  
  const enrolledCourses = courses.filter(course => course.isEnrolled);
  const enrolledBooks = books.filter(book => book.isEnrolled);
  
  const filteredCourses = filter === 'all' || filter === 'courses' ? enrolledCourses : [];
  const filteredBooks = filter === 'all' || filter === 'books' ? enrolledBooks : [];
  
  const totalItems = enrolledCourses.length + enrolledBooks.length;
  
  return (
    <div 
      className="min-h-screen pb-24 lg:pb-8" 
      style={{ background: 'var(--rayo-sand-100)' }}
    >
      {/* Header */}
      <div 
        className="sticky top-0 z-10 border-b" 
        style={{ 
          background: 'var(--rayo-sand-100)',
          borderColor: 'var(--rayo-sand-300)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Button 
            variant="ghost" 
            onClick={onBack} 
            className="mb-4 -ml-2"
            style={{ color: 'var(--rayo-ink-700)' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <BookOpen 
              className="w-8 h-8" 
              style={{ color: 'var(--rayo-terra-500)' }}
            />
            <h1 
              className="text-[32px]" 
              style={{ 
                fontWeight: 700, 
                color: 'var(--rayo-forest-900)' 
              }}
            >
              Minha Biblioteca
            </h1>
          </div>
          
          {/* Filtros */}
          <div className="flex gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              style={{
                background: filter === 'all' ? 'var(--rayo-terra-500)' : 'transparent',
                color: filter === 'all' 
                  ? (theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF')
                  : 'var(--rayo-ink-700)',
                borderColor: filter === 'all' ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)'
              }}
            >
              📖 Todos ({totalItems})
            </Button>
            <Button 
              variant={filter === 'courses' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('courses')}
              style={{
                background: filter === 'courses' ? 'var(--rayo-terra-500)' : 'transparent',
                color: filter === 'courses' 
                  ? (theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF')
                  : 'var(--rayo-ink-700)',
                borderColor: filter === 'courses' ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)'
              }}
            >
              🎓 Cursos ({enrolledCourses.length})
            </Button>
            <Button 
              variant={filter === 'books' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('books')}
              style={{
                background: filter === 'books' ? 'var(--rayo-terra-500)' : 'transparent',
                color: filter === 'books' 
                  ? (theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF')
                  : 'var(--rayo-ink-700)',
                borderColor: filter === 'books' ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)'
              }}
            >
              📕 Livros ({enrolledBooks.length})
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {/* Cursos Section */}
        {filteredCourses.length > 0 && (
          <section>
            <h2 
              className="text-[24px] mb-4" 
              style={{ 
                fontWeight: 700, 
                color: 'var(--rayo-forest-900)' 
              }}
            >
              🎓 Cursos ({filteredCourses.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map(course => (
                <div
                  key={course.id}
                  className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                  style={{
                    background: 'var(--rayo-sand-50)',
                    borderColor: 'var(--rayo-sand-300)'
                  }}
                  onClick={() => {
                    startCourse(course.id);
                    onBack();
                  }}
                >
                  <div className="aspect-video rounded-lg overflow-hidden mb-3">
                    <img 
                      src={course.thumbnail} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 
                    className="font-semibold mb-2"
                    style={{ color: 'var(--rayo-forest-900)' }}
                  >
                    {course.title}
                  </h3>
                  {course.progress > 0 && (
                    <div className="mb-2">
                      <div 
                        className="h-2 rounded-full overflow-hidden mb-1"
                        style={{ background: 'var(--rayo-sand-300)' }}
                      >
                        <div 
                          className="h-full transition-all"
                          style={{ 
                            width: `${course.progress}%`,
                            background: 'var(--rayo-terra-500)'
                          }}
                        />
                      </div>
                      <p 
                        className="text-xs"
                        style={{ color: 'var(--rayo-ink-400)' }}
                      >
                        {course.progress}% concluído
                      </p>
                    </div>
                  )}
                  <Button 
                    size="sm" 
                    className="w-full"
                    style={{
                      background: 'var(--rayo-terra-500)',
                      color: theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF'
                    }}
                  >
                    {course.progress > 0 ? 'Continuar' : 'Começar'}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* Livros Section */}
        {filteredBooks.length > 0 && (
          <section>
            <h2 
              className="text-[24px] mb-4" 
              style={{ 
                fontWeight: 700, 
                color: 'var(--rayo-forest-900)' 
              }}
            >
              📕 Livros ({filteredBooks.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredBooks.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  onRead={() => {
                    setCurrentBookId(book.id);
                    setIsInBookDetail(true);
                  }}
                  onToggleFavorite={() => toggleBookFavorite(book.id)}
                  variant="grid"
                />
              ))}
            </div>
          </section>
        )}
        
        {/* Empty state */}
        {filteredCourses.length === 0 && filteredBooks.length === 0 && (
          <div className="text-center py-20">
            <BookOpen 
              className="w-16 h-16 mx-auto mb-4" 
              style={{ color: 'var(--rayo-ink-400)', opacity: 0.3 }}
            />
            <h3 
              className="text-[24px] mb-2" 
              style={{ 
                fontWeight: 700, 
                color: 'var(--rayo-forest-900)' 
              }}
            >
              {filter === 'courses' && 'Nenhum curso encontrado'}
              {filter === 'books' && 'Nenhum livro encontrado'}
              {filter === 'all' && 'Sua biblioteca está vazia'}
            </h3>
            <p 
              className="text-[16px] mb-6" 
              style={{ color: 'var(--rayo-ink-700)' }}
            >
              Explore a Academia RAYO e adicione conteúdos à sua biblioteca
            </p>
            <Button onClick={onBack}>
              Explorar Conteúdos
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
