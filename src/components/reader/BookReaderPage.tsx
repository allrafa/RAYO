// ============================================================================
// 📚 RAIO ECOSYSTEM - BOOK READER PAGE
// Leitor interativo com sincronização de áudio e texto
// ============================================================================

import { useState } from 'react';
import { ArrowLeft, BookOpen, Headphones, Sparkles, User, Volume2, Menu, Settings2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Book } from '../types/BookTypes';
import { useTheme } from '../ThemeProvider';
import { BookReaderProvider, useBookReader, ReadingMode } from './BookReaderContext';
import { getBookContent } from './mockTranscripts';
import { AudioPlayer } from './AudioPlayer';
import { TranscriptViewer } from './TranscriptViewer';
import { CompactAudioPlayer } from './CompactAudioPlayer';
import { toast } from 'sonner@2.0.3';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '../ui/sheet';

interface BookReaderPageProps {
  book: Book;
  onBack: () => void;
}

function BookReaderContent({ book, onBack }: BookReaderPageProps) {
  const { state, setMode, setNarrator, transcript } = useBookReader();
  const { theme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  // Pegar o título do segmento atual
  const currentSegment = transcript.find(seg => seg.id === state.currentSegmentId);
  const currentChapter = currentSegment?.text.split('.')[0] || 'Capítulo atual';

  return (
    <div 
      className="min-h-screen flex flex-col pb-20"
      style={{ background: 'var(--raio-bg-primary)' }}
    >
      {/* Header Minimalista */}
      <div 
        className="sticky top-0 z-10 border-b backdrop-blur-lg"
        style={{ 
          background: theme === 'dark' 
            ? 'rgba(17, 24, 39, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          borderColor: 'var(--raio-border-default)'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              style={{ color: 'var(--raio-text-secondary)' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            {/* Center: Mode Tabs */}
            <div className="flex items-center gap-1 bg-opacity-50 rounded-full p-1"
              style={{ background: 'var(--raio-bg-tertiary)' }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('read')}
                className="rounded-full px-3"
                style={{
                  background: state.mode === 'read' 
                    ? 'var(--raio-bg-secondary)' 
                    : 'transparent',
                  color: state.mode === 'read' 
                    ? 'var(--raio-text-primary)'
                    : 'var(--raio-text-tertiary)',
                }}
              >
                Read
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('listen')}
                className="rounded-full px-3"
                style={{
                  background: state.mode === 'listen' 
                    ? 'var(--raio-bg-secondary)' 
                    : 'transparent',
                  color: state.mode === 'listen' 
                    ? 'var(--raio-text-primary)'
                    : 'var(--raio-text-tertiary)',
                }}
              >
                Listen
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('read-listen')}
                className="rounded-full px-3"
                style={{
                  background: state.mode === 'read-listen' 
                    ? 'var(--raio-bg-secondary)' 
                    : 'transparent',
                  color: state.mode === 'read-listen' 
                    ? 'var(--raio-text-primary)'
                    : 'var(--raio-text-tertiary)',
                }}
              >
                Read + Listen
              </Button>
            </div>

            {/* Right: Settings */}
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  style={{ color: 'var(--raio-text-secondary)' }}
                >
                  <Settings2 className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right"
                style={{ 
                  background: 'var(--raio-bg-secondary)',
                  borderColor: 'var(--raio-border-default)'
                }}
              >
                <SheetHeader>
                  <SheetTitle style={{ color: 'var(--raio-text-primary)' }}>
                    Configurações
                  </SheetTitle>
                  <SheetDescription style={{ color: 'var(--raio-text-tertiary)' }}>
                    Personalize sua experiência de leitura
                  </SheetDescription>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
                  {/* Narrator Selection */}
                  <div>
                    <h3 
                      className="text-sm mb-3 flex items-center gap-2"
                      style={{ 
                        fontWeight: 600,
                        color: 'var(--raio-text-primary)' 
                      }}
                    >
                      <User className="w-4 h-4" />
                      Narrador
                    </h3>
                    <div className="space-y-2">
                      <Button
                        variant={state.narratorVoice === 'female' ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => {
                          setNarrator('female');
                          toast.success('Narrador alterado para voz feminina');
                        }}
                        style={{
                          background: state.narratorVoice === 'female' 
                            ? 'var(--raio-accent-primary)' 
                            : 'transparent',
                          color: state.narratorVoice === 'female' 
                            ? (theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF')
                            : 'var(--raio-text-secondary)',
                          borderColor: state.narratorVoice === 'female' 
                            ? 'var(--raio-accent-primary)' 
                            : 'var(--raio-border-default)'
                        }}
                      >
                        👩 Voz Feminina
                      </Button>
                      <Button
                        variant={state.narratorVoice === 'male' ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => {
                          setNarrator('male');
                          toast.success('Narrador alterado para voz masculina');
                        }}
                        style={{
                          background: state.narratorVoice === 'male' 
                            ? 'var(--raio-accent-primary)' 
                            : 'transparent',
                          color: state.narratorVoice === 'male' 
                            ? (theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF')
                            : 'var(--raio-text-secondary)',
                          borderColor: state.narratorVoice === 'male' 
                            ? 'var(--raio-accent-primary)' 
                            : 'var(--raio-border-default)'
                        }}
                      >
                        👨 Voz Masculina
                      </Button>
                    </div>
                  </div>

                  {/* Progress Info */}
                  <div>
                    <h3 
                      className="text-sm mb-3"
                      style={{ 
                        fontWeight: 600,
                        color: 'var(--raio-text-primary)' 
                      }}
                    >
                      Progresso
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--raio-text-tertiary)' }}>Página atual</span>
                        <span style={{ color: 'var(--raio-text-primary)', fontWeight: 600 }}>
                          {state.currentPage} de {book.pages}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--raio-text-tertiary)' }}>Progresso</span>
                        <span style={{ color: 'var(--raio-accent-primary)', fontWeight: 600 }}>
                          {Math.round((state.currentPage / book.pages) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width com Título Destacado */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* Título do Capítulo Atual - Destacado como na imagem */}
        <h1 
          className="text-2xl lg:text-3xl mb-6 lg:mb-8 leading-tight"
          style={{ 
            fontWeight: 700,
            color: 'var(--raio-text-primary)',
          }}
        >
          {currentChapter}
        </h1>

        {/* Transcript - Texto limpo e focado */}
        <TranscriptViewer />
      </div>

      {/* Compact Player - Fixo no Bottom */}
      <CompactAudioPlayer book={book} />
    </div>
  );
}

// Wrapper com Provider
export function BookReaderPage({ book, onBack }: BookReaderPageProps) {
  const content = getBookContent(book.id);

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Conteúdo do livro não encontrado.</p>
      </div>
    );
  }

  return (
    <BookReaderProvider
      book={book}
      transcript={content.transcript}
      audioUrl={content.audioUrl}
    >
      <BookReaderContent book={book} onBack={onBack} />
    </BookReaderProvider>
  );
}
