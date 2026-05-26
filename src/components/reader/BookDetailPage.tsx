// ============================================================================
// 📚 RAYO ECOSYSTEM - BOOK DETAIL PAGE
// Página de detalhes do livro estilo Netflix
// ============================================================================

import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Star, Users, BookOpen, Clock, Heart, Share2, Download, Quote } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Book } from '../types/BookTypes';
import { useTheme } from '../ThemeProvider';
import { useApp } from '../AppContext';
import { getBookContent, estimateReadingDuration } from './mockTranscripts';
import { api } from '../../lib/api';
import { toast } from 'sonner@2.0.3';

interface TopHighlight {
  id: string;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  page: number;
  userCount: number;
}

const TOP_HL_COLORS: Record<string, string> = {
  yellow: '#FACC15', green: '#4ADE80', blue: '#60A5FA', pink: '#F472B6',
};

interface BookDetailPageProps {
  book: Book;
  onBack: () => void;
  onStartReading: () => void;
}

export function BookDetailPage({ book, onBack, onStartReading }: BookDetailPageProps) {
  const { theme } = useTheme();
  const { toggleBookFavorite } = useApp();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [topHighlights, setTopHighlights] = useState<TopHighlight[]>([]);

  // Use slug (CMS) and fall back to id so any legacy data still resolves.
  const content = getBookContent(book.slug ?? book.id);
  const estimatedDuration = content ? estimateReadingDuration(content.transcript) : book.estimatedReadTime;

  // Task #256 — carrega "Trechos mais destacados" deste livro (público).
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await api.get<{ highlights: TopHighlight[] }>(
        `/api/books/${encodeURIComponent(book.id)}/top-highlights?limit=8`,
      );
      if (!alive) return;
      if (res.success && res.data?.highlights) setTopHighlights(res.data.highlights);
    })();
    return () => { alive = false; };
  }, [book.id]);

  return (
    <div 
      className="min-h-screen pb-24 lg:pb-8"
      style={{ background: 'var(--rayo-sand-100)' }}
    >
      {/* Hero Section com Gradient */}
      <div className="relative">
        {/* Background Gradient */}
        <div 
          className="absolute inset-0 h-[60vh] lg:h-[70vh]"
          style={{
            background: theme === 'dark'
              ? 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, var(--rayo-sand-100) 100%)'
              : 'linear-gradient(180deg, rgba(249,250,251,0.95) 0%, var(--rayo-sand-100) 100%)'
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
              color: 'var(--rayo-ink-700)',
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
                      background: 'var(--rayo-terra-500)',
                      color: theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF',
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
                    color: 'var(--rayo-forest-900)',
                    lineHeight: 1.1
                  }}
                >
                  {book.title}
                </h1>
                <p 
                  className="text-[18px] lg:text-[20px]"
                  style={{ color: 'var(--rayo-ink-700)' }}
                >
                  por {book.author}
                </p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--rayo-ink-400)' }}>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current" style={{ color: 'var(--rayo-terra-500)' }} />
                  <span style={{ color: 'var(--rayo-forest-900)' }}>{book.averageRating.toFixed(1)}</span>
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
                      borderColor: 'var(--rayo-sand-300)',
                      color: 'var(--rayo-ink-700)'
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
                    <span className="text-sm" style={{ color: 'var(--rayo-ink-700)' }}>
                      Seu progresso
                    </span>
                    <span className="text-sm" style={{ color: 'var(--rayo-terra-500)', fontWeight: 600 }}>
                      {book.progress}%
                    </span>
                  </div>
                  <Progress value={book.progress} className="h-2 mb-1" />
                  <p className="text-xs" style={{ color: 'var(--rayo-ink-400)' }}>
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
                    background: 'var(--rayo-terra-500)',
                    color: theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF',
                    paddingLeft: '2rem',
                    paddingRight: '2rem'
                  }}
                  onClick={onStartReading}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--rayo-terra-700)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--rayo-terra-500)';
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
                    borderColor: book.isFavorite ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)',
                    color: book.isFavorite ? 'var(--rayo-terra-500)' : 'var(--rayo-ink-700)'
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
        {/* Trechos mais destacados — Task #256 */}
        {topHighlights.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-[24px]"
                style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}
              >
                Trechos mais destacados
              </h2>
              <span className="text-xs" style={{ color: 'var(--rayo-ink-400)' }}>
                pelos leitores
              </span>
            </div>
            <div
              className="flex gap-4 overflow-x-auto pb-3 -mx-6 px-6"
              style={{ scrollbarWidth: 'thin' }}
            >
              {topHighlights.map((h) => (
                <div
                  key={h.id}
                  className="flex-shrink-0 w-[280px] sm:w-[320px] rounded-2xl p-4"
                  style={{
                    background: 'var(--rayo-sand-50)',
                    border: '1px solid var(--rayo-sand-300)',
                    borderLeft: `4px solid ${TOP_HL_COLORS[h.color] || TOP_HL_COLORS.yellow}`,
                  }}
                >
                  <Quote
                    className="w-4 h-4 mb-2"
                    style={{ color: 'var(--rayo-terra-500)' }}
                  />
                  <p
                    className="text-sm italic mb-3 line-clamp-6"
                    style={{ color: 'var(--rayo-ink-700)', lineHeight: 1.5 }}
                  >
                    “{h.text.length > 260 ? h.text.slice(0, 260) + '…' : h.text}”
                  </p>
                  <div
                    className="flex items-center justify-between text-xs"
                    style={{ color: 'var(--rayo-ink-400)' }}
                  >
                    <span>Pág. {h.page}</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {h.userCount} {h.userCount === 1 ? 'leitor' : 'leitores'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Summary */}
        {content && (
          <Card style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
            <CardContent className="p-6">
              <h2 
                className="text-[24px] mb-4" 
                style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}
              >
                Sobre este livro
              </h2>
              <p 
                className="text-[16px] leading-relaxed"
                style={{ color: 'var(--rayo-ink-700)' }}
              >
                {content.summary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Key Takeaways */}
        {content && content.keyTakeaways.length > 0 && (
          <Card style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
            <CardContent className="p-6">
              <h2 
                className="text-[24px] mb-4" 
                style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}
              >
                Principais aprendizados
              </h2>
              <ul className="space-y-3">
                {content.keyTakeaways.map((takeaway, index) => (
                  <li 
                    key={index}
                    className="flex items-start gap-3 text-[16px]"
                    style={{ color: 'var(--rayo-ink-700)' }}
                  >
                    <span 
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ 
                        background: 'var(--rayo-terra-100)',
                        color: 'var(--rayo-terra-500)',
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
        <Card style={{ background: 'var(--rayo-sand-50)', borderColor: 'var(--rayo-sand-300)' }}>
          <CardContent className="p-6">
            <h2 
              className="text-[24px] mb-4" 
              style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}
            >
              Detalhes
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--rayo-ink-400)' }}>Autor</p>
                <p style={{ color: 'var(--rayo-forest-900)' }}>{book.author}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--rayo-ink-400)' }}>Editora</p>
                <p style={{ color: 'var(--rayo-forest-900)' }}>{book.publisher}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--rayo-ink-400)' }}>Ano</p>
                <p style={{ color: 'var(--rayo-forest-900)' }}>{book.publishedYear}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--rayo-ink-400)' }}>Idioma</p>
                <p style={{ color: 'var(--rayo-forest-900)' }}>
                  {book.language === 'pt-BR' ? 'Português' : book.language}
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--rayo-ink-400)' }}>Páginas</p>
                <p style={{ color: 'var(--rayo-forest-900)' }}>{book.pages}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--rayo-ink-400)' }}>Formato</p>
                <p style={{ color: 'var(--rayo-forest-900)' }}>
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
