// ============================================================================
// 📚 RAIO ECOSYSTEM - BOOK CARD COMPONENT
// Card de livro para exibição na Biblioteca
// ============================================================================

import { BookOpen, CheckCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Book as BookType, formatBookProgress } from './types/BookTypes';
import { useTheme } from './ThemeProvider';

interface BookCardProps {
  book: BookType;
  onRead?: () => void;
  onToggleFavorite?: () => void;
  onEnroll?: () => void;
  variant?: 'grid' | 'list';
  showActions?: boolean;
}

export function BookCard({ 
  book, 
  onRead, 
  onToggleFavorite, 
  onEnroll,
  variant = 'grid',
  showActions = true 
}: BookCardProps) {
  const { theme } = useTheme();

  // Grid variant (padrão - para biblioteca)
  if (variant === 'grid') {
    return (
      <Card 
        className="overflow-hidden group hover:shadow-lg transition-all duration-300"
        style={{
          background: 'var(--raio-bg-secondary)',
          borderColor: 'var(--raio-border-default)'
        }}
      >
        <CardContent className="p-3">
          {/* Cover Image - CLICÁVEL */}
          <div 
            className="relative aspect-[2/3] mb-3 rounded-lg overflow-hidden cursor-pointer"
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(135deg, #374151 0%, #1F2937 100%)'
                : 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)'
            }}
            onClick={book.isEnrolled ? onRead : onEnroll}
          >
            <img 
              src={book.coverImage} 
              alt={book.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
            />
            
            {/* Badge de conclusão - minimalista */}
            {book.isCompleted && (
              <div 
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
                style={{
                  background: 'var(--raio-success)',
                }}
              >
                <CheckCircle className="w-5 h-5" style={{ color: '#FFFFFF' }} />
              </div>
            )}

            {/* Barra de progresso na base */}
            {book.isEnrolled && !book.isCompleted && book.currentPage > 0 && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ background: 'rgba(0,0,0,0.2)' }}
              >
                <div 
                  className="h-full transition-all"
                  style={{ 
                    background: 'var(--raio-accent-primary)',
                    width: `${book.progress}%`
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Info - Minimalista */}
          <div className="mb-3">
            <h3 
              className="text-sm mb-1 line-clamp-2 min-h-[2.5rem]"
              style={{ 
                fontWeight: 600,
                color: 'var(--raio-text-primary)' 
              }}
            >
              {book.title}
            </h3>
            <p 
              className="text-xs line-clamp-1"
              style={{ color: 'var(--raio-text-tertiary)' }}
            >
              {book.author}
            </p>
          </div>
          
          {/* Progress text (só se tiver progresso) */}
          {book.isEnrolled && !book.isCompleted && book.currentPage > 0 && (
            <p 
              className="text-xs mb-3"
              style={{ color: 'var(--raio-text-tertiary)' }}
            >
              {book.progress}% • {formatBookProgress(book)}
            </p>
          )}
          
          {/* Actions - Apenas um botão */}
          {showActions && (
            <Button 
              size="sm" 
              className="w-full"
              style={{
                background: book.isEnrolled 
                  ? 'var(--raio-accent-primary)' 
                  : 'transparent',
                color: book.isEnrolled
                  ? (theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF')
                  : 'var(--raio-accent-primary)',
                borderColor: book.isEnrolled 
                  ? 'var(--raio-accent-primary)'
                  : 'var(--raio-accent-primary)'
              }}
              variant={book.isEnrolled ? 'default' : 'outline'}
              onClick={book.isEnrolled ? onRead : onEnroll}
              onMouseEnter={(e) => {
                if (book.isEnrolled) {
                  e.currentTarget.style.background = 'var(--raio-accent-hover)';
                } else {
                  e.currentTarget.style.background = 'var(--raio-accent-light)';
                }
              }}
              onMouseLeave={(e) => {
                if (book.isEnrolled) {
                  e.currentTarget.style.background = 'var(--raio-accent-primary)';
                } else {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {book.isEnrolled ? (
                <>
                  <BookOpen className="w-4 h-4 mr-1" />
                  {book.currentPage > 0 ? 'Continuar' : 'Começar'}
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  {book.isPremium && book.price ? `R$ ${book.price.toFixed(2)}` : 'Adicionar'}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // List variant (para listas horizontais ou verticais)
  return (
    <Card 
      className="hover:shadow-md transition-all"
      style={{
        background: 'var(--raio-bg-secondary)',
        borderColor: 'var(--raio-border-default)'
      }}
    >
      <CardContent className="p-4 flex gap-4">
        {/* Cover */}
        <div 
          className="w-20 h-28 flex-shrink-0 rounded overflow-hidden"
          style={{
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #374151 0%, #1F2937 100%)'
              : 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)'
          }}
        >
          <img 
            src={book.coverImage} 
            alt={book.title} 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 
              className="font-semibold line-clamp-2"
              style={{ color: 'var(--raio-text-primary)' }}
            >
              {book.title}
            </h3>
            {book.isCompleted && (
              <CheckCircle 
                className="w-4 h-4 flex-shrink-0" 
                style={{ color: 'var(--raio-success)' }}
              />
            )}
          </div>
          
          <p 
            className="text-sm mb-2"
            style={{ color: 'var(--raio-text-tertiary)' }}
          >
            {book.author} • {book.publishedYear}
          </p>
          
          {book.isEnrolled && book.currentPage > 0 && !book.isCompleted && (
            <div className="mb-2">
              <Progress value={book.progress} className="h-2 mb-1" />
              <p 
                className="text-xs"
                style={{ color: 'var(--raio-text-tertiary)' }}
              >
                {book.progress}% • {formatBookProgress(book)}
              </p>
            </div>
          )}
          
          <div className="flex gap-2 mt-auto">
            {book.isEnrolled ? (
              <>
                <Button 
                  size="sm" 
                  onClick={onRead}
                  style={{
                    background: 'var(--raio-accent-primary)',
                    color: theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF'
                  }}
                >
                  {book.currentPage > 0 ? 'Continuar' : 'Começar'}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onToggleFavorite}
                  style={{
                    color: book.isFavorite ? 'var(--raio-accent-primary)' : 'var(--raio-text-secondary)'
                  }}
                >
                  <Heart className={`w-4 h-4 ${book.isFavorite ? 'fill-current' : ''}`} />
                </Button>
              </>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                onClick={onEnroll}
                style={{
                  borderColor: 'var(--raio-accent-primary)',
                  color: 'var(--raio-accent-primary)'
                }}
              >
                Adicionar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
