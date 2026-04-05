// ============================================================================
// 📚 RAIO ECOSYSTEM - BOOK DETAIL PAGE
// Página de detalhes do livro estilo Netflix
// ============================================================================

import { useState } from 'react';
import { ArrowLeft, Play, Star, Users, BookOpen, Clock, Heart, Share2, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Book } from '../types/BookTypes';
import { useTheme } from '../ThemeProvider';
import { useApp } from '../AppContext';
import { getBookContent, estimateReadingDuration } from './mockTranscripts';
import { toast } from 'sonner@2.0.3';

interface BookDetailPageProps {
  book: Book;
  onBack: () => void;
  onStartReading: () => void;
}

export function BookDetailPage({ book, onBack, onStartReading }: BookDetailPageProps) {
  const { theme } = useTheme();
  const { toggleBookFavorite } = useApp();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const content = getBookContent(book.id);
  const estimatedDuration = content ? estimateReadingDuration(content.transcript) : book.estimatedReadTime;

  return (
    <div 
      className="min-h-screen pb-24 lg:pb-8"
      style={{ background: 'var(--raio-bg-primary)' }}
    >
      {/* Hero Section com Gradient */}
      <div className="relative">
        {/* Background Gradient */}
        <div 
          className="absolute inset-0 h-[60vh] lg:h-[70vh]"
          style={{
            background: theme === 'dark'
              ? 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, var(--raio-bg-primary) 100%)'
              : 'linear-gradient(180deg, rgba(249,250,251,0.95) 0%, var(--raio-bg-primary) 100%)'
          }}
        />
        
        {/* Background Image Blur */}
        <div 
          className="absolute inset-0 h-[60vh] lg:h-[70vh] overflow-hidden"
          style={{ opacity: 0.15 }}
        >
          <img 
            src={book.coverImage}
            alt=""
            className="w-full h-full object-cover blur-2xl scale-110"
          />
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-6 pt-6 pb-12">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-6 -ml-2"
            style={{ 
              color: 'var(--raio-text-secondary)',
              background: theme === 'dark' 
                ? 'rgba(0, 0, 0, 0.3)'
                : 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {/* Hero Content */}
          <div className="grid lg:grid-cols-[300px_1fr] gap-8 items-start">
            {/* Book Cover */}
            <div className="mx-auto lg:mx-0">
              <div 
                className="relative w-[200px] h-[300px] lg:w-[300px] lg:h-[450px] rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: theme === 'dark' 
                    ? 'linear-gradient(135deg, #374151 0%, #1F2937 100%)'
                    : 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)'
                }}
              >
                <img 
                  src={book.coverImage}
                  alt={book.title}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                />
                
                {/* Premium Badge */}
                {book.isPremium && (
                  <Badge 
                    className="absolute top-4 right-4 text-xs shadow-lg"
                    style={{
                      background: 'var(--raio-accent-primary)',
                      color: theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF',
                    }}
                  >
                    Premium
                  </Badge>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-6">
              {/* Title & Author */}
              <div>
                <h1 
                  className="text-[32px] lg:text-[48px] mb-2"
                  style={{ 
                    fontWeight: 700,
                    color: 'var(--raio-text-primary)',
                    lineHeight: 1.1
                  }}
                >
                  {book.title}
                </h1>
                <p 
                  className="text-[18px] lg:text-[20px]"
                  style={{ color: 'var(--raio-text-secondary)' }}
                >
                  por {book.author}
                </p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--raio-text-tertiary)' }}>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current" style={{ color: 'var(--raio-accent-primary)' }} />
                  <span style={{ color: 'var(--raio-text-primary)' }}>{book.averageRating.toFixed(1)}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{book.readers.toLocaleString()} leitores</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{book.pages} páginas</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{estimatedDuration}</span>
                </div>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {book.category.map((cat, index) => (
                  <Badge 
                    key={index}
                    variant="outline"
                    style={{
                      borderColor: 'var(--raio-border-default)',
                      color: 'var(--raio-text-secondary)'
                    }}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>

              {/* Progress (se já iniciado) */}
              {book.isEnrolled && book.currentPage > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm" style={{ color: 'var(--raio-text-secondary)' }}>
                      Seu progresso
                    </span>
                    <span className="text-sm" style={{ color: 'var(--raio-accent-primary)', fontWeight: 600 }}>
                      {book.progress}%
                    </span>
                  </div>
                  <Progress value={book.progress} className="h-2 mb-1" />
                  <p className="text-xs" style={{ color: 'var(--raio-text-tertiary)' }}>
                    Página {book.currentPage} de {book.pages}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  size="lg"
                  className="gap-2"
                  style={{
                    background: 'var(--raio-accent-primary)',
                    color: theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF',
                    paddingLeft: '2rem',
                    paddingRight: '2rem'
                  }}
                  onClick={onStartReading}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--raio-accent-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--raio-accent-primary)';
                  }}
                >
                  <Play className="w-5 h-5" />
                  {book.currentPage > 0 ? 'Continuar Lendo' : 'Começar a Ler'}
                </Button>
                
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    toggleBookFavorite(book.id);
                    toast.success(book.isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
                  }}
                  style={{
                    borderColor: book.isFavorite ? 'var(--raio-accent-primary)' : 'var(--raio-border-default)',
                    color: book.isFavorite ? 'var(--raio-accent-primary)' : 'var(--raio-text-secondary)'
                  }}
                >
                  <Heart className={`w-5 h-5 ${book.isFavorite ? 'fill-current' : ''}`} />
                </Button>
                
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => toast.info('Compartilhar em breve!')}
                >
                  <Share2 className="w-5 h-5" />
                </Button>
                
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => toast.info('Download em breve!')}
                >
                  <Download className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Summary */}
        {content && (
          <Card style={{ background: 'var(--raio-bg-secondary)', borderColor: 'var(--raio-border-default)' }}>
            <CardContent className="p-6">
              <h2 
                className="text-[24px] mb-4" 
                style={{ fontWeight: 700, color: 'var(--raio-text-primary)' }}
              >
                Sobre este livro
              </h2>
              <p 
                className="text-[16px] leading-relaxed"
                style={{ color: 'var(--raio-text-secondary)' }}
              >
                {content.summary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Key Takeaways */}
        {content && content.keyTakeaways.length > 0 && (
          <Card style={{ background: 'var(--raio-bg-secondary)', borderColor: 'var(--raio-border-default)' }}>
            <CardContent className="p-6">
              <h2 
                className="text-[24px] mb-4" 
                style={{ fontWeight: 700, color: 'var(--raio-text-primary)' }}
              >
                Principais aprendizados
              </h2>
              <ul className="space-y-3">
                {content.keyTakeaways.map((takeaway, index) => (
                  <li 
                    key={index}
                    className="flex items-start gap-3 text-[16px]"
                    style={{ color: 'var(--raio-text-secondary)' }}
                  >
                    <span 
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ 
                        background: 'var(--raio-accent-light)',
                        color: 'var(--raio-accent-primary)',
                        fontWeight: 600
                      }}
                    >
                      {index + 1}
                    </span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Book Details */}
        <Card style={{ background: 'var(--raio-bg-secondary)', borderColor: 'var(--raio-border-default)' }}>
          <CardContent className="p-6">
            <h2 
              className="text-[24px] mb-4" 
              style={{ fontWeight: 700, color: 'var(--raio-text-primary)' }}
            >
              Detalhes
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--raio-text-tertiary)' }}>Autor</p>
                <p style={{ color: 'var(--raio-text-primary)' }}>{book.author}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--raio-text-tertiary)' }}>Editora</p>
                <p style={{ color: 'var(--raio-text-primary)' }}>{book.publisher}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--raio-text-tertiary)' }}>Ano</p>
                <p style={{ color: 'var(--raio-text-primary)' }}>{book.publishedYear}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--raio-text-tertiary)' }}>Idioma</p>
                <p style={{ color: 'var(--raio-text-primary)' }}>
                  {book.language === 'pt-BR' ? 'Português' : book.language}
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--raio-text-tertiary)' }}>Páginas</p>
                <p style={{ color: 'var(--raio-text-primary)' }}>{book.pages}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--raio-text-tertiary)' }}>Formato</p>
                <p style={{ color: 'var(--raio-text-primary)' }}>
                  {book.format.toUpperCase()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
