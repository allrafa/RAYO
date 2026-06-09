import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, Star, Users, ArrowRight, Play, ChevronLeft, ChevronRight, ChevronDown, Trophy, Clock, BookOpen, Lock, CheckCircle, ShoppingCart, ChevronUp, Sparkles, Book, Headphones, Video, Film, Layers, GraduationCap, Package, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useApp } from "./AppContext";
import { cardKeyHandler, stopBubble } from "../lib/cardClickTargets";
import { FavoriteIcon } from "./FavoriteButton";
import { toast } from "sonner@2.0.3";
import { smartSearch, getSearchResultMessage } from "./SmartSearchEngine";
import { useTheme } from "./ThemeProvider";
import { BookCard } from "./BookCard";
import heroImage from "../assets/marketplace-hero-family.jpg";

export function AcademiaPage() {
  const { courses, books, setCurrentCourseId, setIsInCourseDetail, setCurrentBookId, setIsInBookDetail, setCurrentVideoId, setIsInVideoPage, startCourse, enrollInCourse, enrollInBook, toggleBookFavorite, userData } = useApp();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  // Task #128 — `currentView` persiste em sessionStorage. Sem isso,
  // abrir um livro/vídeo do catálogo desmonta a AcademiaPage (via
  // AcademiaWithBookReader) e ao voltar o usuário cairia em
  // "marketplace" mesmo se estava na "minha-biblioteca" — ou perderia
  // o filtro de kind escolhido (ver MarketplaceView.selectedKind).
  const [currentView, setCurrentView] = useState<"minha-biblioteca" | "marketplace">(() => {
    try {
      const v = sessionStorage.getItem('rayo-academia-view');
      return v === 'minha-biblioteca' ? 'minha-biblioteca' : 'marketplace';
    } catch {
      return 'marketplace';
    }
  });
  useEffect(() => {
    try { sessionStorage.setItem('rayo-academia-view', currentView); } catch {}
  }, [currentView]);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'courses' | 'books'>('all');
  const [showAllPopular, setShowAllPopular] = useState(false);

  // Filter courses com busca inteligente - NUNCA retorna zero resultados
  const filteredCourses = searchQuery.trim()
    ? smartSearch(courses, searchQuery, {
        minResults: 8,
        fallbackToPopular: true
      })
    : courses;

  const allPopularCourses = courses.filter(course => course.students > 300);
  const mostPopularCourses = showAllPopular ? allPopularCourses : allPopularCourses.slice(0, 4);
  const bestRatedCourses = courses.filter(course => course.rating >= 4.7);
  const enrolledCourses = courses.filter(course => course.isEnrolled);
  const enrolledBooks = books.filter(book => book.isEnrolled);
  
  // Combined library items
  const libraryItems = [
    ...enrolledCourses.map(c => ({ type: 'course' as const, data: c })),
    ...enrolledBooks.map(b => ({ type: 'book' as const, data: b }))
  ];
  
  // Filtered library based on selection
  const filteredLibraryItems = libraryItems.filter(item => {
    if (libraryFilter === 'all') return true;
    if (libraryFilter === 'courses') return item.type === 'course';
    if (libraryFilter === 'books') return item.type === 'book';
    return true;
  });

  const totalCourses = courses.length;
  const totalPopularCourses = allPopularCourses.length;

  return (
    <div
      className="ra-page min-h-screen"
      style={{ background: 'var(--rayo-sand-100)' }}
    >
      {/* NAVIGATION TABS - Above Everything */}
      <div 
        className="sticky top-0 z-50"
        style={{ 
          background: 'var(--rayo-sand-100)',
          borderBottom: '1px solid var(--rayo-sand-300)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 pt-6">
            <Button
              variant="ghost"
              className="relative px-6 py-3 rounded-none border-b-2 transition-all flex items-center gap-2"
              onClick={() => setCurrentView("minha-biblioteca")}
              style={{ 
                fontWeight: currentView === "minha-biblioteca" ? 700 : 500,
                borderColor: currentView === "minha-biblioteca" ? 'var(--rayo-terra-500)' : 'transparent',
                color: currentView === "minha-biblioteca" ? 'var(--rayo-terra-500)' : 'var(--rayo-ink-400)',
              }}
              onMouseEnter={(e) => {
                if (currentView !== "minha-biblioteca") {
                  e.currentTarget.style.color = 'var(--rayo-forest-900)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "minha-biblioteca") {
                  e.currentTarget.style.color = 'var(--rayo-ink-400)';
                }
              }}
            >
              <BookOpen className="w-4 h-4" />
              Minhas Turmas
              {libraryItems.length > 0 && (
                <Badge 
                  className="ml-2" 
                  style={{ 
                    fontSize: '12px', 
                    fontWeight: 700,
                    background: 'var(--rayo-terra-500)',
                    color: theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF',
                  }}
                >
                  {libraryItems.length}
                </Badge>
              )}
            </Button>
            <Button
              variant="ghost"
              className="relative px-6 py-3 rounded-none border-b-2 transition-all"
              onClick={() => setCurrentView("marketplace")}
              style={{ 
                fontWeight: currentView === "marketplace" ? 700 : 500,
                borderColor: currentView === "marketplace" ? 'var(--rayo-terra-500)' : 'transparent',
                color: currentView === "marketplace" ? 'var(--rayo-terra-500)' : 'var(--rayo-ink-400)',
              }}
              onMouseEnter={(e) => {
                if (currentView !== "marketplace") {
                  e.currentTarget.style.color = 'var(--rayo-forest-900)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "marketplace") {
                  e.currentTarget.style.color = 'var(--rayo-ink-400)';
                }
              }}
            >
              Catálogo de turmas
            </Button>
          </div>
        </div>
      </div>

      {/* CONTENT BASED ON VIEW */}
      {currentView === "minha-biblioteca" ? (
        <MinhaBlibiotecaView 
          libraryItems={filteredLibraryItems}
          libraryFilter={libraryFilter}
          setLibraryFilter={setLibraryFilter}
          totalCourses={enrolledCourses.length}
          totalBooks={enrolledBooks.length}
          startCourse={startCourse}
          toggleBookFavorite={toggleBookFavorite}
          setCurrentBookId={setCurrentBookId}
          setIsInBookDetail={setIsInBookDetail}
        />
      ) : (
        <MarketplaceView
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          courses={courses}
          mostPopularCourses={mostPopularCourses}
          bestRatedCourses={bestRatedCourses}
          filteredCourses={filteredCourses}
          setCurrentCourseId={setCurrentCourseId}
          setIsInCourseDetail={setIsInCourseDetail}
          setCurrentBookId={setCurrentBookId}
          setIsInBookDetail={setIsInBookDetail}
          setCurrentVideoId={setCurrentVideoId}
          setIsInVideoPage={setIsInVideoPage}
          enrollInCourse={enrollInCourse}
          showAllPopular={showAllPopular}
          setShowAllPopular={setShowAllPopular}
          totalPopularCourses={totalPopularCourses}
          userSegments={userData.segments || []}
        />
      )}
    </div>
  );
}

// MINHA BIBLIOTECA VIEW - Unified Courses + Books
interface MinhaBlibiotecaViewProps {
  libraryItems: Array<{ type: 'course' | 'book'; data: any }>;
  libraryFilter: 'all' | 'courses' | 'books';
  setLibraryFilter: (filter: 'all' | 'courses' | 'books') => void;
  totalCourses: number;
  totalBooks: number;
  startCourse: (id: string) => void;
  toggleBookFavorite: (bookId: string) => void;
  setCurrentBookId: (bookId: string | null) => void;
  setIsInBookDetail: (isInDetail: boolean) => void;
}

function MinhaBlibiotecaView({ 
  libraryItems, 
  libraryFilter,
  setLibraryFilter,
  totalCourses,
  totalBooks,
  startCourse,
  toggleBookFavorite,
  setCurrentBookId,
  setIsInBookDetail
}: MinhaBlibiotecaViewProps) {
  const { theme } = useTheme();

  // Empty state
  if (libraryItems.length === 0 && libraryFilter === 'all') {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="ra-empty large">
          <div className="ra-empty-icon">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="ra-empty-title">Sua biblioteca está vazia</h2>
          <p className="ra-empty-sub">
            Explore nosso catálogo de turmas e comece sua jornada de transformação
          </p>
        </div>
      </div>
    );
  }

  // Separate items by type for display
  const courses = libraryItems.filter(item => item.type === 'course').map(item => item.data);
  const books = libraryItems.filter(item => item.type === 'book').map(item => item.data);

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-8">
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={libraryFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setLibraryFilter('all')}
          className="gap-2"
          style={{
            background: libraryFilter === 'all' ? 'var(--rayo-terra-500)' : 'transparent',
            color: libraryFilter === 'all' 
              ? (theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF')
              : 'var(--rayo-ink-700)',
            borderColor: libraryFilter === 'all' ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)'
          }}
        >
          <BookOpen className="w-4 h-4" />
          Todos ({totalCourses + totalBooks})
        </Button>
        <Button
          variant={libraryFilter === 'courses' ? 'default' : 'outline'}
          onClick={() => setLibraryFilter('courses')}
          className="gap-2"
          style={{
            background: libraryFilter === 'courses' ? 'var(--rayo-terra-500)' : 'transparent',
            color: libraryFilter === 'courses' 
              ? (theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF')
              : 'var(--rayo-ink-700)',
            borderColor: libraryFilter === 'courses' ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)'
          }}
        >
          🎓 Cursos ({totalCourses})
        </Button>
        <Button
          variant={libraryFilter === 'books' ? 'default' : 'outline'}
          onClick={() => setLibraryFilter('books')}
          className="gap-2"
          style={{
            background: libraryFilter === 'books' ? 'var(--rayo-terra-500)' : 'transparent',
            color: libraryFilter === 'books' 
              ? (theme === 'dark' ? 'var(--rayo-forest-900)' : '#FFFFFF')
              : 'var(--rayo-ink-700)',
            borderColor: libraryFilter === 'books' ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-300)'
          }}
        >
          📕 Livros ({totalBooks})
        </Button>
      </div>

      {/* Courses Section */}
      {(libraryFilter === 'all' || libraryFilter === 'courses') && courses.length > 0 && (
        <div className="space-y-10">
          <div>
            <h2 
              className="text-[24px] mb-6" 
              style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}
            >
              🎓 Seus Cursos
            </h2>
            {courses.map((course: any) => (
              <CourseWithLessons
                key={course.id}
                course={course}
                onLessonClick={startCourse}
              />
            ))}
          </div>
        </div>
      )}

      {/* Books Section */}
      {(libraryFilter === 'all' || libraryFilter === 'books') && books.length > 0 && (
        <div className="space-y-6">
          <h2 
            className="text-[24px]" 
            style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}
          >
            📕 Seus Livros
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {books.map((book: any) => (
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
        </div>
      )}

      {/* Stats Overview */}
      {libraryFilter === 'all' && (
        <div className="mt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="ra-metric ra-card-hover" style={{ alignItems: 'center', textAlign: 'center' }}>
              <div className="ra-metric-value">{totalCourses + totalBooks}</div>
              <div className="ra-metric-label">Itens na Biblioteca</div>
            </div>
            <div className="ra-metric ra-card-hover" style={{ alignItems: 'center', textAlign: 'center' }}>
              <div className="ra-metric-value">{totalCourses}</div>
              <div className="ra-metric-label">Cursos Ativos</div>
            </div>
            <div className="ra-metric ra-card-hover" style={{ alignItems: 'center', textAlign: 'center' }}>
              <div className="ra-metric-value">{totalBooks}</div>
              <div className="ra-metric-label">Livros</div>
            </div>
            <div className="ra-metric ra-card-hover" style={{ alignItems: 'center', textAlign: 'center' }}>
              <div className="ra-metric-value">{books.filter(b => b.isCompleted).length + courses.filter(c => c.progress === 100).length}</div>
              <div className="ra-metric-label">Itens Concluídos</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface APILesson {
  id: number;
  title: string;
  duration: string;
  duration_seconds: number;
  module_id: number;
  sort_order: number;
  video_url: string | null;
  content_type: string;
  is_free_preview: boolean;
  description: string | null;
}

interface APIModule {
  id: number;
  title: string;
  description: string;
  sort_order: number;
  lessons: APILesson[];
}

interface APILessonProgress {
  lesson_id: number;
  status: string;
  progress_seconds: number;
  completed_at: string | null;
}

interface LessonDisplay {
  id: number;
  title: string;
  duration: string;
  completed: boolean;
  thumbnail: string;
}

interface CourseWithLessonsProps {
  course: { id: number; title: string; description: string; thumbnail: string; rating: number; duration: string; lessons: number; students: number; progress: number; isEnrolled?: boolean };
  onLessonClick: (id: string) => void;
}

function CourseWithLessons({ course, onLessonClick }: CourseWithLessonsProps) {
  const [lessons, setLessons] = useState<LessonDisplay[]>([]);
  const [lessonsError, setLessonsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detailRes = await api.get<{ course: { modules: APIModule[] } }>(`/api/courses/${course.id}`);
        if (cancelled || !detailRes.success || !detailRes.data) {
          if (!cancelled) setLessonsError(true);
          return;
        }
        const allLessons: LessonDisplay[] = [];
        const progressRes = await api.get<{ progress: { lessonProgress: APILessonProgress[] } | null }>(`/api/courses/${course.id}/progress`);
        const lessonProgressMap: Record<number, string> = {};
        if (progressRes.success && progressRes.data?.progress?.lessonProgress) {
          progressRes.data.progress.lessonProgress.forEach((lp) => {
            lessonProgressMap[lp.lesson_id] = lp.status;
          });
        }
        detailRes.data.course.modules?.forEach((mod) => {
          mod.lessons?.forEach((l) => {
            allLessons.push({
              id: l.id,
              title: l.title,
              duration: l.duration,
              completed: lessonProgressMap[l.id] === 'completed',
              thumbnail: course.thumbnail,
            });
          });
        });
        if (!cancelled) {
          setLessons(allLessons);
          setLessonsError(false);
        }
      } catch {
        if (!cancelled) setLessonsError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [course.id, course.thumbnail]);

  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById(`lessons-${course.id}`);
    if (container) {
      const scrollAmount = direction === "left" ? -600 : 600;
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Course Header */}
      <div className="px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 
              className="text-[24px]" 
              style={{ 
                fontWeight: 700, 
                color: 'var(--rayo-forest-900)' 
              }}
            >
                {course.title}
              </h2>
              {course.progress === 100 && (
                <Badge 
                  style={{ 
                    background: 'var(--rayo-sage-500)',
                    color: '#FFFFFF',
                  }}
                >
                  <Trophy className="w-3 h-3 mr-1" />
                  Concluído
                </Badge>
              )}
            </div>
            <p 
              className="text-[14px] mb-3" 
              style={{ color: 'var(--rayo-ink-700)' }}
            >
              {course.description}
            </p>
            <div 
              className="flex items-center gap-4 text-[13px]" 
              style={{ color: 'var(--rayo-ink-700)' }}
            >
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4" style={{ fill: 'var(--rayo-ochre-500)', color: 'var(--rayo-ochre-500)' }} />
                <span>{course.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{course.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{course.lessons} aulas</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{course.students.toLocaleString()} alunos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {course.progress > 0 && (
          <div className="ra-progress mt-4">
            <div className="ra-progress-head">
              <span className="ra-progress-label">Progresso do curso</span>
              <span className="ra-progress-value">{course.progress}%</span>
            </div>
            <div className="ra-progress-track">
              <div className="ra-progress-fill" style={{ width: `${course.progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Lessons Carousel */}
      {lessonsError ? (
        <div className="px-6 py-4 text-center" style={{ color: 'var(--rayo-ink-700)' }}>
          <p className="text-[14px]">Não foi possível carregar as aulas. Tente novamente mais tarde.</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="px-6 py-4 text-center" style={{ color: 'var(--rayo-ink-700)' }}>
          <p className="text-[14px]">Carregando aulas...</p>
        </div>
      ) : (
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Lessons horizontal scroll */}
        <div
          id={`lessons-${course.id}`}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-6 pb-4"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {lessons.map((lesson, index) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              lessonNumber={index + 1}
              onClick={() => onLessonClick(course.id)}
              isLocked={index > 0 && !lessons[index - 1].completed}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
      )}

      {/* Divider */}
      <div className="px-6">
        <div 
          className="border-b" 
          style={{ borderColor: 'var(--rayo-sand-300)' }}
        ></div>
      </div>
    </div>
  );
}

// Lesson card component
interface LessonCardProps {
  lesson: any;
  lessonNumber: number;
  onClick: () => void;
  isLocked: boolean;
}

function LessonCard({ lesson, lessonNumber, onClick, isLocked }: LessonCardProps) {
  return (
    <div
      onClick={isLocked ? undefined : onClick}
      className={`flex-none w-[280px] ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} group`}
      style={{ scrollSnapAlign: 'start' }}
    >
      <div 
        className={`relative aspect-video rounded-lg overflow-hidden transition-all duration-300 ${!isLocked && 'group-hover:scale-105 group-hover:shadow-xl'}`}
        style={{ background: 'var(--rayo-sand-300)' }}
      >
        <ImageWithFallback
          src={lesson.thumbnail}
          alt={lesson.title}
          className="w-full h-full object-cover"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
          {/* Lesson number badge */}
          <div className="absolute top-2 left-2">
            <Badge className="bg-white/95 text-black" style={{ fontWeight: 700 }}>
              Aula {lessonNumber}
            </Badge>
          </div>

          {/* Completed badge */}
          {lesson.completed && (
            <div className="absolute top-2 right-2">
              <Badge 
                style={{ 
                  background: 'var(--rayo-sage-500)',
                  color: '#FFFFFF',
                }}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Completo
              </Badge>
            </div>
          )}

          {/* Play/Lock button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              isLocked 
                ? 'bg-black/60' 
                : 'bg-white/90 group-hover:bg-white group-hover:scale-110'
            }`}>
              {isLocked ? (
                <Lock className="w-7 h-7 text-white" />
              ) : (
                <Play 
                  className="w-7 h-7 ml-1" 
                  style={{ color: 'var(--rayo-terra-500)' }}
                />
              )}
            </div>
          </div>

          {/* Title and duration */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h4 className="text-white text-[14px] line-clamp-2 mb-1" style={{ fontWeight: 600 }}>
              {lesson.title}
            </h4>
            <div className="flex items-center gap-2 text-white/90 text-[12px]">
              <Clock className="w-3 h-3" />
              <span>{lesson.duration}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MARKETPLACE VIEW — Editorial RAYO style
interface MarketplaceViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  courses: any[];
  mostPopularCourses: any[];
  bestRatedCourses: any[];
  filteredCourses: any[];
  setCurrentCourseId: (id: number | null) => void;
  setIsInCourseDetail: (value: boolean) => void;
  setCurrentBookId: (bookId: string | null) => void;
  setIsInBookDetail: (value: boolean) => void;
  setCurrentVideoId: (videoId: string | null) => void;
  setIsInVideoPage: (value: boolean) => void;
  enrollInCourse: (id: number) => void;
  showAllPopular: boolean;
  setShowAllPopular: (value: boolean) => void;
  totalPopularCourses: number;
  userSegments: string[];
}

const SEGMENTS: Array<{ value: string; label: string }> = [
  { value: "solteiro", label: "Solteiro" },
  { value: "namoro",   label: "Namoro" },
  { value: "noivos",   label: "Noivos" },
  { value: "casados",  label: "Casados" },
  { value: "pais",     label: "Pais" },
];

const FORMAT_KINDS: Array<{
  kind: string;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { kind: "curso",  label: "Cursos",  description: "Estude no seu ritmo",      Icon: GraduationCap },
  { kind: "livro",  label: "Livros",  description: "Leituras essenciais",      Icon: Book },
  { kind: "audio",  label: "Áudios",  description: "Para ouvir no caminho",    Icon: Headphones },
  { kind: "video",  label: "Vídeos",  description: "Conteúdo em movimento",    Icon: Video },
  { kind: "serie",  label: "Séries",  description: "Jornadas em episódios",    Icon: Layers },
  { kind: "reels",  label: "Reels",   description: "Inspiração rápida",        Icon: Film },
];

// Task #262 — Metadados de tipo de produto para o badge reutilizável do
// catálogo (jornada Skool). Deriva rótulo + ícone + cor a partir do `kind`
// do item; cai em "Curso" pra kinds desconhecidos.
const PRODUCT_TYPE_META: Record<
  string,
  { label: string; Icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  curso: { label: "Curso", Icon: GraduationCap, color: "var(--rayo-forest-900)" },
  livro: { label: "Livro", Icon: Book,          color: "var(--rayo-terra-700)" },
  audio: { label: "Áudio", Icon: Headphones,    color: "var(--rayo-sage-500)" },
  video: { label: "Vídeo", Icon: Video,         color: "var(--rayo-terra-500)" },
  serie: { label: "Série", Icon: Layers,        color: "var(--rayo-forest-900)" },
  reels: { label: "Reels", Icon: Film,          color: "var(--rayo-terra-500)" },
};

// Badge de tipo de produto reutilizável. `solid` usa a cor do tipo como
// fundo (pra fundos claros); o default usa pílula branca (pra overlay em
// cima de imagem).
function ProductTypeBadge({
  kind,
  solid = false,
  className = "",
}: {
  kind: string;
  solid?: boolean;
  className?: string;
}) {
  const meta = PRODUCT_TYPE_META[kind] ?? PRODUCT_TYPE_META.curso;
  const Icon = meta.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] ${className}`}
      style={{
        background: solid ? meta.color : "rgba(255,255,255,0.95)",
        color: solid ? "#FFFFFF" : meta.color,
        fontWeight: 600,
        boxShadow: solid ? undefined : "0 1px 2px rgba(0,0,0,0.10)",
      }}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {meta.label}
    </span>
  );
}

interface BundleItemAPI {
  id: number;
  // Task #264 — agora o backend devolve o tipo real de cada marco (curso,
  // livro, áudio, vídeo, série, reels), não só curso.
  kind: string;
  title: string;
  thumbnail: string | null;
  duration: string | null;
  level: string | null;
  instructor: string | null;
}

interface BundleAPI {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  segment: string;
  cover_url: string | null;
  accent_color: string | null;
  item_count: number;
  items?: BundleItemAPI[];
}

// Item normalizado da biblioteca unificada "Todos os conteúdos" (mockup .card).
// `status` segue o vocabulário visual do mockup: free | open | premium | soon.
type LibStatus = "free" | "open" | "premium" | "soon";
interface LibItem {
  id: number;
  kind: string;
  title: string;
  author: string | null;
  cover: string | null;
  status: LibStatus;
  statusLabel: string;
  actionLabel: string;
  actionVariant: "primary" | "outline" | "soft";
  trailSlug?: string | null;
  favType: "course" | "video" | "post" | "product";
}

// Deriva o tipo de favorito (contrato do FavoriteIcon) a partir do kind.
function favTypeFor(kind: string): LibItem["favType"] {
  if (kind === "curso") return "course";
  if (kind === "video" || kind === "audio" || kind === "reels") return "video";
  return "product"; // livro, serie, etc.
}

function MarketplaceView({
  searchQuery,
  setSearchQuery,
  courses,
  mostPopularCourses,
  bestRatedCourses,
  filteredCourses,
  setCurrentCourseId,
  setIsInCourseDetail,
  setCurrentBookId,
  setIsInBookDetail,
  setCurrentVideoId,
  setIsInVideoPage,
  enrollInCourse,
  showAllPopular,
  setShowAllPopular,
  totalPopularCourses,
  userSegments,
}: MarketplaceViewProps) {
  const popularSectionRef = useRef<HTMLDivElement>(null);
  const allCoursesRef = useRef<HTMLDivElement>(null);

  // Task #179 — `?segmento=…` na URL é a fonte da verdade pro filtro
  // de segmento no catálogo. Permite compartilhar links tipo
  // `/academia?segmento=casados` e o estado é restaurado em refresh /
  // back-forward. Sem `?segmento`, cai pro primeiro segmento do
  // onboarding (ou "all"). useSearchParams cuida da serialização.
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialSegment =
    searchParams.get("segmento") ??
    (userSegments.length > 0 ? userSegments[0] : "all");
  const [selectedSegment, setSelectedSegmentState] =
    useState<string>(initialSegment);

  // Sync state → URL (replace, sem entrada extra no histórico).
  // "all" e o default-do-onboarding ficam SEM query string pra URLs
  // limpas; só serializamos quando o usuário escolheu algo explícito.
  const setSelectedSegment = useCallback(
    (next: string) => {
      setSelectedSegmentState(next);
      const params = new URLSearchParams(searchParams);
      if (next === "all") params.delete("segmento");
      else params.set("segmento", next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // Sync URL → state quando back/forward muda `?segmento`. Valida o
  // valor contra SEGMENTS pra não envenenar estado com `?segmento=foo`.
  // Quando não há query, restaura o default (primeiro segmento do
  // onboarding ou "all") — sem isso a URL `/academia` ficaria divergente
  // do state após back/forward (apontado em code review).
  useEffect(() => {
    const qs = searchParams.get("segmento");
    const allowed = new Set(SEGMENTS.map((s) => s.value));
    if (qs && allowed.has(qs)) {
      if (qs !== selectedSegment) setSelectedSegmentState(qs);
      return;
    }
    const fallback = userSegments.length > 0 ? userSegments[0] : "all";
    if (selectedSegment !== fallback) setSelectedSegmentState(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, userSegments]);

  // Curated bundles (loaded from /api/bundles, optionally filtered by segment)
  const [bundles, setBundles] = useState<BundleAPI[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState<boolean>(true);
  const [bundlesError, setBundlesError] = useState<string | null>(null);

  // Task #262 — "Aprofunde um tema": produtos de conteúdo (não-curso) do
  // segmento ativo, mesclados com os cursos numa grade única com badge de
  // tipo. Exclui 'curso' (já vem dos CourseCards) e 'artigo' (blog).
  const [deepenItems, setDeepenItems] = useState<ContentProductItem[]>([]);
  const [deepenLoading, setDeepenLoading] = useState<boolean>(true);

  // Inline-expanded bundle (shows real items list)
  const [expandedBundleId, setExpandedBundleId] = useState<number | null>(null);

  // Filtro de formato + paginação da biblioteca unificada "Todos os conteúdos".
  const [libFormat, setLibFormat] = useState<string>("todos");
  const [libLimit, setLibLimit] = useState<number>(8);

  // Re-sync segment if onboarding changes after mount
  useEffect(() => {
    if (userSegments.length > 0 && selectedSegment === "all") {
      setSelectedSegment(userSegments[0]);
    }
  }, [userSegments, selectedSegment]);

  // Smooth scroll when expanding popular grid
  useEffect(() => {
    if (showAllPopular && popularSectionRef.current) {
      setTimeout(() => {
        popularSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }, [showAllPopular]);

  // Fetch curated bundles (filtered by selected segment when not "all")
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBundlesLoading(true);
      setBundlesError(null);
      try {
        const qs = selectedSegment !== "all"
          ? `?segment=${encodeURIComponent(selectedSegment)}`
          : "";
        const res = await api.get<{ bundles: BundleAPI[] }>(`/api/bundles${qs}`);
        if (cancelled) return;
        if (res.success && res.data) {
          setBundles(res.data.bundles || []);
        } else {
          setBundles([]);
          setBundlesError(res.error?.message || "Não foi possível carregar as trilhas.");
        }
      } catch (err) {
        if (!cancelled) {
          setBundles([]);
          setBundlesError("Não foi possível carregar as trilhas.");
        }
      } finally {
        if (!cancelled) setBundlesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSegment]);

  // Fetch mixed content products for "Aprofunde um tema". Filtra fora cursos
  // (já renderizados como CourseCard) e artigos (blog) na exibição.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDeepenLoading(true);
      try {
        const segParam =
          selectedSegment && selectedSegment !== "all"
            ? `&segment=${encodeURIComponent(selectedSegment)}`
            : "";
        const res = await api.get<{ items: ContentProductItem[] }>(
          `/api/content?limit=12${segParam}`,
        );
        if (cancelled) return;
        if (res.success && res.data && Array.isArray(res.data.items)) {
          setDeepenItems(res.data.items);
        } else {
          setDeepenItems([]);
        }
      } catch {
        if (!cancelled) setDeepenItems([]);
      } finally {
        if (!cancelled) setDeepenLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSegment]);

  // Backend-driven segment filter: when a non-"all" segment is selected we
  // refetch from /api/courses?life_context=X (server applies the filter and
  // ordering). Falls back to client-side filtering of the in-memory `courses`
  // if the request fails or while it's loading. Search query stays client-side
  // because smartSearch ranks across already-loaded courses.
  const [serverSegmentCourses, setServerSegmentCourses] = useState<any[] | null>(null);
  useEffect(() => {
    if (selectedSegment === "all") {
      setServerSegmentCourses(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ courses: any[] }>(
          `/api/courses?life_context=${encodeURIComponent(selectedSegment)}`
        );
        if (cancelled) return;
        if (res.success && res.data && Array.isArray(res.data.courses)) {
          setServerSegmentCourses(res.data.courses);
        } else {
          setServerSegmentCourses(null);
        }
      } catch {
        if (!cancelled) setServerSegmentCourses(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSegment]);

  // Apply segment filter on top of search-filtered courses. Prefer the
  // backend-filtered list when available; otherwise fall back to the local
  // search-aware filter so search keeps working without re-fetching.
  const segmentFilteredCourses = useMemo(() => {
    if (selectedSegment === "all") return filteredCourses;
    if (searchQuery.trim()) {
      // Search is local — keep client filter so smart-search ranking is preserved.
      return filteredCourses.filter((c) => c?.life_context === selectedSegment);
    }
    if (serverSegmentCourses) return serverSegmentCourses;
    return filteredCourses.filter((c) => c?.life_context === selectedSegment);
  }, [filteredCourses, selectedSegment, serverSegmentCourses, searchQuery]);

  const segmentLabel = SEGMENTS.find((s) => s.value === selectedSegment)?.label;

  // Task #262 — "Comece por aqui": ponto de entrada de baixo atrito por
  // momento. Prefere um curso gratuito não-matriculado; cai pro primeiro
  // curso do segmento. `null` => bloco oculto (sem dados → sem espaço morto).
  const startHereCourse = useMemo(() => {
    const pool = segmentFilteredCourses;
    if (!pool || pool.length === 0) return null;
    const freeFirst = pool.find(
      (c) => !(Number(c?.price) > 0) && !c?.isEnrolled,
    );
    return freeFirst ?? pool[0];
  }, [segmentFilteredCourses]);

  // Produtos de conteúdo (não-curso) prontos pra grade "Aprofunde um tema".
  const deepenProducts = useMemo(
    () =>
      deepenItems.filter(
        (it) => it.kind !== "curso" && it.kind !== "artigo",
      ),
    [deepenItems],
  );

  // Task #151 — Auditoria: "Mais populares" e "Melhores avaliações" agora
  // respeitam o filtro de segmento (antes ignoravam, vinham crus do parent).
  // Quando segment=all mantemos o ranking original do parent (que pode ter
  // ordens curadas); fora disso, derivamos do segmentFilteredCourses.
  // Mantém paridade com a lógica do parent: popular = students > 300,
  // top-rated = rating >= 4.7 (cutoffs originais). showAllPopular controla
  // o slice(0,4) vs lista cheia, igual ao caso `all`.
  const segmentedPopularAll = useMemo(
    () =>
      [...segmentFilteredCourses]
        .filter((c) => Number(c?.students) > 300)
        .sort(
          (a, b) => (Number(b?.students) || 0) - (Number(a?.students) || 0),
        ),
    [segmentFilteredCourses],
  );

  const displayedPopular = useMemo(() => {
    if (selectedSegment === 'all') return mostPopularCourses;
    return showAllPopular ? segmentedPopularAll : segmentedPopularAll.slice(0, 4);
  }, [segmentedPopularAll, mostPopularCourses, selectedSegment, showAllPopular]);

  const displayedTopRated = useMemo(() => {
    if (selectedSegment === 'all') return bestRatedCourses;
    return [...segmentFilteredCourses]
      .filter((c) => Number(c?.rating) >= 4.7)
      .sort((a, b) => (Number(b?.rating) || 0) - (Number(a?.rating) || 0));
  }, [segmentFilteredCourses, bestRatedCourses, selectedSegment]);

  const displayedTotalPopular =
    selectedSegment === 'all' ? totalPopularCourses : segmentedPopularAll.length;

  // Biblioteca unificada "Todos os conteúdos": funde cursos do segmento ativo
  // com os conteúdos digitais (livro/áudio/vídeo/etc.) numa lista normalizada,
  // mapeando cada item para o vocabulário de status do mockup.
  const libraryItems = useMemo<LibItem[]>(() => {
    const fromCourses: LibItem[] = segmentFilteredCourses.map((c: any) => {
      const trailSlug: string | null = c?.trail_slug || null;
      const isEnrolled = !!c?.isEnrolled;
      const isPaid = Number(c?.price) > 0;
      let status: LibStatus;
      let statusLabel: string;
      let actionLabel: string;
      let actionVariant: LibItem["actionVariant"];
      if (isEnrolled) {
        status = "open"; statusLabel = "Adquirido"; actionLabel = "Continuar"; actionVariant = "soft";
      } else if (trailSlug) {
        status = "premium"; statusLabel = "Trilha"; actionLabel = "Ver trilha"; actionVariant = "primary";
      } else if (isPaid) {
        status = "soon"; statusLabel = "Em breve"; actionLabel = "Avise-me"; actionVariant = "soft";
      } else {
        status = "free"; statusLabel = "Gratuito"; actionLabel = "Acessar"; actionVariant = "outline";
      }
      return {
        id: Number(c?.id),
        kind: "curso",
        title: c?.title ?? "",
        author: c?.instructor ?? null,
        cover: c?.thumbnail ?? null,
        status, statusLabel, actionLabel, actionVariant,
        trailSlug,
        favType: "course",
      };
    });

    const fromContent: LibItem[] = deepenProducts.map((it) => {
      const isPaid = !!it.is_premium || Number(it.price) > 0;
      let status: LibStatus;
      let statusLabel: string;
      let actionLabel: string;
      let actionVariant: LibItem["actionVariant"];
      if (it.kind === "livro") {
        if (isPaid) {
          status = "premium"; statusLabel = "Premium"; actionLabel = "Adquirir"; actionVariant = "primary";
        } else {
          status = "free"; statusLabel = "Gratuito"; actionLabel = "Ler"; actionVariant = "outline";
        }
      } else if (it.kind === "serie") {
        status = "soon"; statusLabel = "Em breve"; actionLabel = "Avise-me"; actionVariant = "soft";
      } else {
        // video, audio, reels
        status = "open"; statusLabel = "Acesso imediato"; actionLabel = "Assistir"; actionVariant = "soft";
      }
      return {
        id: Number(it.id),
        kind: it.kind,
        title: it.title,
        author: it.author ?? null,
        cover: it.cover_url ?? null,
        status, statusLabel, actionLabel, actionVariant,
        trailSlug: null,
        favType: favTypeFor(it.kind),
      };
    });

    return [...fromCourses, ...fromContent];
  }, [segmentFilteredCourses, deepenProducts]);

  // Chips de formato da biblioteca: "Todos" + cada kind presente, com contagem.
  const libFormatChips = useMemo(() => {
    const counts: Record<string, number> = {};
    libraryItems.forEach((it) => {
      counts[it.kind] = (counts[it.kind] ?? 0) + 1;
    });
    const present = FORMAT_KINDS.filter((f) => (counts[f.kind] ?? 0) > 0).map(
      (f) => ({ value: f.kind, label: f.label, count: counts[f.kind] ?? 0 }),
    );
    return [{ value: "todos", label: "Todos", count: libraryItems.length }, ...present];
  }, [libraryItems]);

  // Itens que batem com o filtro de formato atual.
  const libMatched = useMemo(
    () =>
      libFormat === "todos"
        ? libraryItems
        : libraryItems.filter((it) => it.kind === libFormat),
    [libraryItems, libFormat],
  );

  // Se o formato selecionado some (mudança de segmento), volta pra "Todos".
  useEffect(() => {
    if (libFormat !== "todos" && !libFormatChips.some((c) => c.value === libFormat)) {
      setLibFormat("todos");
    }
  }, [libFormatChips, libFormat]);

  // Reseta a paginação ao trocar de segmento ou formato.
  useEffect(() => {
    setLibLimit(8);
  }, [selectedSegment, libFormat]);

  // Abre um item da biblioteca seguindo o contrato de roteamento por kind.
  const openLibItem = useCallback(
    (it: LibItem) => {
      switch (it.kind) {
        case "curso":
          if (it.trailSlug) {
            window.location.href = `/trilhas/${it.trailSlug}`;
          } else {
            setCurrentCourseId(it.id);
            setIsInCourseDetail(true);
          }
          break;
        case "livro":
          setCurrentBookId(String(it.id));
          setIsInBookDetail(true);
          break;
        case "video":
        case "audio":
        case "reels":
          setCurrentVideoId(String(it.id));
          setIsInVideoPage(true);
          break;
        case "serie":
          toast.info("Página de séries em breve");
          break;
        default:
          break;
      }
    },
    [setCurrentCourseId, setIsInCourseDetail, setCurrentBookId, setIsInBookDetail, setCurrentVideoId, setIsInVideoPage],
  );

  return (
    <div className="rt">
      {/* HERO */}
      <section style={{ background: 'var(--rayo-sand-50)' }}>
        <div className="rt-hero">
          <div>
            <p className="rt-hero-eyebrow">Conteúdo para a sua família</p>
            <h1 className="rt-hero-title">
              O que vocês <span className="light">vão</span> construir hoje?
            </h1>
            <p className="rt-hero-sub">
              Cursos, livros, áudios e trilhas pensados para cada momento — do
              solteiro aos pais — tudo em um só lugar.
            </p>
            <div className="rt-hero-search">
              <input
                placeholder='Busque por "comunicação", "filhos" ou "finanças"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar"
              />
              <button
                type="button"
                className="rt-hero-search-btn"
                aria-label="Buscar"
                onClick={() =>
                  allCoursesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="rt-hero-imgwrap">
            <ImageWithFallback
              src={heroImage}
              alt="Família lendo junta em um banco de praça ao entardecer"
            />
          </div>
        </div>
      </section>

      {/* STICKY FILTER SPINE */}
      <div className="rt-spine">
        <div className="rt-filter-row">
          <span className="rt-filter-label">Fase</span>
          <div className="rt-phase-chips">
            {[{ value: 'all', label: 'Todos' }, ...SEGMENTS].map((seg) => {
              const isActive = selectedSegment === seg.value;
              const isUserSegment = userSegments.includes(seg.value);
              return (
                <button
                  key={seg.value}
                  type="button"
                  className={`rt-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedSegment(seg.value)}
                >
                  {seg.label}
                  {isUserSegment && !isActive && <span className="rt-chip-dot" />}
                </button>
              );
            })}
          </div>
          {(selectedSegment !== 'all' || libFormat !== 'todos') && (
            <button
              type="button"
              className="rt-filter-clear"
              onClick={() => {
                setSelectedSegment('all');
                setLibFormat('todos');
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="rt-content">
        {searchQuery.trim() ? (
          <section className="rt-sec">
            <div className="rt-sec-head">
              <div>
                <div className="rt-sec-eyebrow">Resultados da busca</div>
                <h2 className="rt-sec-title">
                  {getSearchResultMessage(searchQuery, segmentFilteredCourses.length, courses)}
                </h2>
              </div>
              <span className="rt-sec-count">
                {segmentFilteredCourses.length}{' '}
                {segmentFilteredCourses.length === 1 ? 'curso' : 'cursos'}
                {selectedSegment !== 'all' && segmentLabel ? ` · ${segmentLabel}` : ''}
              </span>
            </div>
            {segmentFilteredCourses.length === 0 ? (
              <EmptyMarketplaceState
                title="Nenhum curso bate com essa busca"
                description={
                  selectedSegment !== 'all'
                    ? `Tente buscar em outro segmento ou limpe o filtro "${segmentLabel}".`
                    : 'Tente outras palavras-chave ou explore os formatos abaixo.'
                }
                actionLabel={selectedSegment !== 'all' ? 'Ver todos os segmentos' : undefined}
                onAction={selectedSegment !== 'all' ? () => setSelectedSegment('all') : undefined}
              />
            ) : (
              <div className="rt-lib-grid">
                {segmentFilteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onClick={() => {
                      setCurrentCourseId(course.id);
                      setIsInCourseDetail(true);
                    }}
                    enrollInCourse={enrollInCourse}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* COMECE POR AQUI */}
            {startHereCourse && (
              <section className="rt-sec">
                <div className="rt-sec-head">
                  <div>
                    <div className="rt-sec-eyebrow">Seu ponto de partida</div>
                    <h2 className="rt-sec-title">
                      Comece por <span className="light">aqui</span>
                    </h2>
                  </div>
                </div>
                <StartHereCard
                  course={startHereCourse}
                  segmentLabel={selectedSegment !== 'all' ? segmentLabel : undefined}
                  onOpen={() => {
                    if (startHereCourse.trail_slug) {
                      window.location.href = `/trilhas/${startHereCourse.trail_slug}`;
                    } else {
                      setCurrentCourseId(startHereCourse.id);
                      setIsInCourseDetail(true);
                    }
                  }}
                />
              </section>
            )}

            {/* TRILHAS */}
            <section className="rt-sec">
              <div className="rt-sec-head">
                <div>
                  <div className="rt-sec-eyebrow">Jornadas curadas de ponta a ponta</div>
                  <h2 className="rt-sec-title">
                    Trilhas <span className="light">para a sua fase</span>
                  </h2>
                </div>
                {!bundlesLoading && !bundlesError && bundles.length > 0 && (
                  <span className="rt-sec-count">
                    {bundles.length} {bundles.length === 1 ? 'trilha' : 'trilhas'}
                  </span>
                )}
              </div>
              {bundlesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--rayo-terra-500)' }} />
                </div>
              ) : bundlesError ? (
                <EmptyMarketplaceState
                  title="Não conseguimos carregar as trilhas"
                  description={bundlesError}
                />
              ) : bundles.length === 0 ? (
                <EmptyMarketplaceState
                  title="Nenhuma trilha para este segmento ainda"
                  description="Em breve novas trilhas curadas. Enquanto isso, explore outros segmentos."
                  actionLabel="Ver todos os segmentos"
                  onAction={() => setSelectedSegment('all')}
                />
              ) : (
                <div className="rt-trail-grid">
                  {bundles.map((b) => (
                    <BundleCard
                      key={b.id}
                      bundle={b}
                      isExpanded={expandedBundleId === b.id}
                      onToggle={() =>
                        setExpandedBundleId((curr) => (curr === b.id ? null : b.id))
                      }
                      onOpenItem={(it) => {
                        switch (it.kind) {
                          case 'livro':
                            setCurrentBookId(String(it.id));
                            setIsInBookDetail(true);
                            break;
                          case 'video':
                          case 'audio':
                          case 'reels':
                            setCurrentVideoId(String(it.id));
                            setIsInVideoPage(true);
                            break;
                          case 'serie':
                            toast.info('Página de séries em breve');
                            break;
                          case 'curso':
                          default:
                            setCurrentCourseId(it.id);
                            setIsInCourseDetail(true);
                            break;
                        }
                      }}
                      onSeeAllInSegment={() => {
                        setSelectedSegment(b.segment);
                        setTimeout(() => {
                          allCoursesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 60);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* CONTEÚDOS — biblioteca unificada */}
            <section className="rt-sec" ref={allCoursesRef}>
              <div className="rt-sec-head">
                <div>
                  <div className="rt-sec-eyebrow">Biblioteca · acesso digital imediato</div>
                  <h2 className="rt-sec-title">
                    Todos os <span className="light">conteúdos</span>
                  </h2>
                </div>
                {libMatched.length > 0 && (
                  <span className="rt-sec-count">
                    {libMatched.length} {libMatched.length === 1 ? 'item' : 'itens'}
                  </span>
                )}
              </div>

              {libraryItems.length > 0 && (
                <div className="rt-lib-controls">
                  <div className="rt-format-chips">
                    {libFormatChips.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={`rt-format-chip ${libFormat === c.value ? 'active' : ''}`}
                        onClick={() => setLibFormat(c.value)}
                      >
                        {c.label}
                        <span className="ct">{c.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {deepenLoading && libraryItems.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--rayo-terra-500)' }} />
                </div>
              ) : libMatched.length === 0 ? (
                <EmptyMarketplaceState
                  title={`Sem conteúdos para ${segmentLabel || 'este segmento'} ainda`}
                  description="Em breve novos materiais para este momento. Enquanto isso, explore os outros segmentos."
                  actionLabel={selectedSegment !== 'all' ? 'Ver todos os segmentos' : undefined}
                  onAction={selectedSegment !== 'all' ? () => setSelectedSegment('all') : undefined}
                />
              ) : (
                <>
                  <div className="rt-lib-grid">
                    {libMatched.slice(0, libLimit).map((it) => (
                      <LibraryCard
                        key={`${it.kind}-${it.id}`}
                        item={it}
                        onOpen={() => openLibItem(it)}
                      />
                    ))}
                  </div>
                  {libMatched.length > libLimit && (
                    <button
                      type="button"
                      className="rt-show-more"
                      onClick={() => setLibLimit((n) => n + 8)}
                    >
                      Ver mais
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </section>

            {/* COMUNIDADE — upsell */}
            <CommunityUpsell onJoin={() => navigate('/comunidade')} />
          </>
        )}
      </div>
    </div>
  );
}

// Empty state for marketplace sections
interface EmptyMarketplaceStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function EmptyMarketplaceState({ title, description, actionLabel, onAction }: EmptyMarketplaceStateProps) {
  return (
    <div className="ra-empty dashed">
      <div className="ra-empty-icon">
        <Sparkles className="w-6 h-6" />
      </div>
      <h3 className="ra-empty-title" style={{ fontSize: 18 }}>{title}</h3>
      {description && (
        <p className="ra-empty-sub" style={{ fontSize: 14, maxWidth: 420, color: 'var(--rayo-ink-700)' }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="ra-empty-action">
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

// Curated bundle card
interface BundleCardProps {
  bundle: BundleAPI;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenItem: (item: BundleItemAPI) => void;
  onSeeAllInSegment: () => void;
}

function BundleCard({
  bundle,
  isExpanded,
  onToggle,
  onOpenItem,
  onSeeAllInSegment,
}: BundleCardProps) {
  const accent = bundle.accent_color || 'var(--rayo-terra-500)';
  const segLabel = SEGMENTS.find((s) => s.value === bundle.segment)?.label || bundle.segment;
  const items = bundle.items || [];
  const empty = bundle.item_count === 0;

  return (
    <div className={`rt-trail ${isExpanded ? 'expanded' : ''}`}>
      <button
        type="button"
        className="rt-trail-head"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className={`rt-trail-band ${bundle.segment}`}>
          <span className="rt-trail-phase">{segLabel}</span>
          <span className={`rt-trail-count ${empty ? 'soon' : ''}`}>
            {empty ? (
              'Em breve'
            ) : (
              <>
                <Package className="w-3 h-3" />
                {bundle.item_count} {bundle.item_count === 1 ? 'item' : 'itens'}
              </>
            )}
          </span>
        </div>
        <div className="rt-trail-body">
          <div className="rt-trail-title">{bundle.title}</div>
          {bundle.subtitle && <div className="rt-trail-subtitle">{bundle.subtitle}</div>}
          {bundle.description && <div className="rt-trail-desc">{bundle.description}</div>}
          <div className="rt-trail-foot">
            <span className="rt-trail-meta">
              {bundle.item_count} {bundle.item_count === 1 ? 'item' : 'itens'}
            </span>
            <span className="rt-trail-action">
              {isExpanded ? 'Ocultar' : 'Ver trilha'}
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="rt-trail-panel">
          {items.length === 0 ? (
            <div className="rt-trail-item-meta" style={{ padding: '8px' }}>
              Itens desta trilha serão publicados em breve.
            </div>
          ) : (
            items.map((it, i) => (
              <button
                type="button"
                key={`${it.kind}-${it.id}`}
                className="rt-trail-item"
                onClick={() => onOpenItem(it)}
              >
                <span className="rt-trail-item-num" style={{ background: accent }}>
                  {i + 1}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="rt-trail-item-title"
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {it.title}
                  </div>
                  <div className="rt-trail-item-meta">
                    {[it.instructor, it.duration, it.level].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <ProductTypeBadge kind={it.kind || 'curso'} className="shrink-0" />
              </button>
            ))
          )}
          <button type="button" className="rt-trail-seeall" onClick={onSeeAllInSegment}>
            Ver todos os cursos para {segLabel} →
          </button>
        </div>
      )}
    </div>
  );
}

// Card unificado da biblioteca "Todos os conteúdos" (mockup .card). Recebe um
// LibItem já normalizado (status/ação derivados) e roteia via onOpen.
function LibraryCard({ item, onOpen }: { item: LibItem; onOpen: () => void }) {
  const meta = PRODUCT_TYPE_META[item.kind] ?? PRODUCT_TYPE_META.curso;
  const TypeIcon = meta.Icon;
  const hasFav = Number.isFinite(item.id);
  return (
    <div
      className="rt-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={cardKeyHandler(onOpen)}
      aria-label={`Abrir ${item.title}`}
    >
      <div className="rt-card-img">
        {item.cover && <ImageWithFallback src={item.cover} alt={item.title} />}
        <span className="rt-card-type">
          <TypeIcon className="w-3 h-3" />
          {meta.label}
        </span>
        {hasFav && (
          <div className="rt-card-bookmark" onClick={(e) => e.stopPropagation()}>
            <FavoriteIcon id={item.id} type={item.favType} />
          </div>
        )}
      </div>
      <div className="rt-card-body">
        <div className="rt-card-title">{item.title}</div>
        {item.author && <div className="rt-card-author">{item.author}</div>}
        <div className="rt-card-foot">
          <span className={`rt-status ${item.status}`}>
            <span className="dot" />
            {item.statusLabel}
          </span>
          <button
            type="button"
            className={`rt-card-action ${item.actionVariant}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            {item.actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Popular Card - Hotmart style with image overlay
interface PopularCardProps {
  course: any;
  onClick: () => void;
}

function PopularCard({ course, onClick }: PopularCardProps) {
  return (
    <div
      onClick={onClick}
      className="relative h-[200px] rounded-2xl overflow-hidden cursor-pointer group desktop-card-hover"
    >
      <ImageWithFallback
        src={course.thumbnail}
        alt={course.category}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 group-hover:from-black/80 group-hover:via-black/40 transition-all duration-300"></div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 
          className="text-white text-[20px] transition-colors duration-300" 
          style={{ fontWeight: 700 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--rayo-terra-500)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#FFFFFF';
          }}
        >
          {course.category}
        </h3>
        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-white/90 text-[14px]">
            {course.students.toLocaleString()} alunos
          </p>
        </div>
      </div>
    </div>
  );
}

// Task #262 — Card de produto de conteúdo (não-curso) usado nas grades
// "Aprofunde um tema" e "Explore por formato". Mostra badge de tipo no topo
// e um rótulo de baixo atrito ("Acesso imediato" pra gratuito, "Acesso
// digital" pro pago) — tudo derivado de dados reais do content_item.
interface ContentProductItem {
  id: number | string;
  title: string;
  short_description?: string | null;
  cover_url?: string | null;
  author?: string | null;
  kind: string;
  is_premium?: boolean;
  price?: number | string | null;
}

function ContentProductCard({
  item,
  onOpen,
}: {
  item: ContentProductItem;
  onOpen: () => void;
}) {
  const isFree = !item.is_premium && !(Number(item.price) > 0);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={cardKeyHandler(onOpen)}
      className="ra-card ra-card-hover overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rayo-terra-500)]"
      style={{ padding: 0 }}
      aria-label={`Abrir ${item.title}`}
    >
      <div className="relative w-full" style={{ aspectRatio: "4 / 3" }}>
        <ImageWithFallback
          src={item.cover_url || ""}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <ProductTypeBadge kind={item.kind} />
        </div>
      </div>
      <div className="p-4">
        <div
          className="text-[14px] line-clamp-2"
          style={{ fontWeight: 600, color: "var(--rayo-forest-900)" }}
        >
          {item.title}
        </div>
        {item.short_description && (
          <div
            className="text-[12px] mt-1 line-clamp-2"
            style={{ color: "var(--rayo-ink-700)" }}
          >
            {item.short_description}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mt-3">
          {item.author ? (
            <span className="text-[11px] truncate" style={{ color: "var(--rayo-ink-400)" }}>
              {item.author}
            </span>
          ) : (
            <span />
          )}
          <span
            className="text-[11px] shrink-0"
            style={{
              color: isFree ? "var(--rayo-sage-500)" : "var(--rayo-ink-700)",
              fontWeight: 600,
            }}
          >
            {isFree ? "Acesso imediato" : "Acesso digital"}
          </span>
        </div>
      </div>
    </div>
  );
}

// Task #262 — Card grande "Comece por aqui": o ponto de entrada de baixo
// atrito por momento de vida. Deriva de um curso (preferencialmente
// gratuito) do segmento ativo.
function StartHereCard({
  course,
  segmentLabel,
  onOpen,
}: {
  course: any;
  segmentLabel?: string;
  onOpen: () => void;
}) {
  const isFree = !(Number(course.price) > 0);
  return (
    <div
      className="rt-start"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={cardKeyHandler(onOpen)}
      aria-label={`Começar ${course.title}`}
    >
      <div className="rt-start-imgwrap">
        {course.thumbnail && <ImageWithFallback src={course.thumbnail} alt={course.title} />}
        <span className="rt-start-badge">
          <Sparkles className="w-3 h-3" />
          {isFree ? "Comece grátis" : "Recomendado"}
        </span>
      </div>
      <div className="rt-start-body">
        <div className="rt-start-eyebrow">
          Seu primeiro passo{segmentLabel ? ` · ${segmentLabel}` : ""}
        </div>
        <h3 className="rt-start-title">{course.title}</h3>
        {course.description && <p className="rt-start-desc">{course.description}</p>}
        <span className="rt-start-cta">
          {course.isEnrolled ? "Continuar" : isFree ? "Começar agora" : "Ver detalhes"}
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
}

// Task #262 — Bloco final "Faça parte da comunidade": upsell de
// pertencimento que comunica o valor do acesso completo e leva ao caminho
// de comunidade existente (/comunidade).
function CommunityUpsell({ onJoin }: { onJoin: () => void }) {
  const perks: Array<{ Icon: React.ComponentType<{ className?: string }>; title: string; text: string }> = [
    { Icon: Users, title: "Comunidade ativa", text: "Troque experiências e tire dúvidas com outras famílias." },
    { Icon: Layers, title: "Trilhas completas", text: "Acompanhe as jornadas curadas de ponta a ponta." },
    { Icon: Sparkles, title: "Conteúdo novo toda semana", text: "Cursos, livros e áudios para o seu momento de vida." },
  ];
  return (
    <section>
      <div
        className="rounded-3xl overflow-hidden p-8 md:p-12"
        style={{ background: "linear-gradient(135deg, var(--rayo-forest-900), var(--rayo-terra-700))" }}
      >
        <div className="max-w-2xl">
          <p
            className="font-display-serif italic text-[14px] mb-2"
            style={{ color: "rgba(255,255,255,0.85)", letterSpacing: "0.02em" }}
          >
            Mais do que conteúdo
          </p>
          <h2
            className="font-display-serif"
            style={{
              fontSize: "clamp(28px, 3.4vw, 40px)",
              lineHeight: 1.05,
              color: "#FFFFFF",
              fontWeight: 400,
            }}
          >
            Faça parte da{" "}
            <span style={{ fontStyle: "italic" }}>comunidade RAYO</span>
          </h2>
          <p className="text-[15px] md:text-[16px] mt-4" style={{ color: "rgba(255,255,255,0.88)", lineHeight: 1.6 }}>
            Famílias caminham melhor juntas. Conecte-se, acompanhe trilhas
            completas e receba novos conteúdos pensados para cada fase.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          {perks.map((p) => {
            const Icon = p.Icon;
            return (
              <div
                key={p.title}
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.10)", backdropFilter: "blur(6px)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: "rgba(255,255,255,0.16)" }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-[15px]" style={{ fontWeight: 600, color: "#FFFFFF" }}>
                  {p.title}
                </div>
                <div className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.82)" }}>
                  {p.text}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex items-center gap-2 h-[50px] px-6 rounded-full text-[15px] transition-all hover:-translate-y-0.5"
            style={{ background: "var(--rayo-sand-50)", color: "var(--rayo-forest-900)", fontWeight: 600 }}
          >
            Entrar na comunidade
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

// Course Card - Hotmart product style
interface CourseCardProps {
  course: any;
  onClick: () => void;
  enrollInCourse: (id: number) => void;
}

function CourseCard({ course, onClick, enrollInCourse: _enrollInCourse }: CourseCardProps) {
  // Task #151 — Quando o curso faz parte de uma trilha paga (Task #130),
  // o catálogo NÃO leva mais pra landing/waitlist da turma. Em vez disso,
  // o clique vai direto pro detalhe da trilha (/trilhas/:slug), onde o
  // checkout Stripe acontece. Cursos avulsos (sem trail_slug) seguem
  // pro fluxo legado de "Em breve" (TurmaShell + JoinInterestModal).
  const trailSlug: string | undefined = course?.trail_slug || undefined;
  const trailTitle: string | undefined = course?.trail_title || undefined;
  const isInTrail = !!trailSlug;

  const goToTrail = () => {
    if (trailSlug) window.location.href = `/trilhas/${trailSlug}`;
  };

  const handleCardClick = () => {
    if (isInTrail) goToTrail();
    else onClick();
  };

  const handleEnroll = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleCardClick();
  };

  // Task #164 — Wrapper inteiro vira clicável (role="button"). FavoriteIcon
  // e CTA usam stopBubble pra não disparar o destino do card.
  return (
    <div
      className="ra-card ra-card-hover group overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rayo-terra-500)]"
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={cardKeyHandler(handleCardClick)}
      aria-label={isInTrail ? `Ver trilha ${trailTitle ?? ''}` : `Abrir ${course.title}`}
      style={{
        padding: 0,
        background:
          'linear-gradient(180deg, var(--rayo-sand-50) 0%, var(--rayo-sand-100) 100%)',
        borderTop: '3px solid transparent',
        borderImage:
          'linear-gradient(90deg, var(--rayo-forest-900), var(--rayo-terra-500), var(--rayo-sage-500)) 1',
        cursor: 'pointer',
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-[16/9] overflow-hidden"
        style={{ background: 'var(--rayo-sand-300)' }}
      >
        <ImageWithFallback
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white/95 rounded-full p-1.5 shadow-sm">
            <FavoriteIcon id={course.id} type="course" />
          </div>
        </div>
        {course.isEnrolled ? (
          <div className="absolute top-3 left-3">
            <Badge 
              style={{ 
                fontSize: '12px', 
                fontWeight: 600,
                background: 'var(--rayo-sage-500)',
                color: '#FFFFFF',
              }}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Adquirido
            </Badge>
          </div>
        ) : isInTrail ? (
          <div className="absolute top-3 left-3">
            <Badge
              style={{
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--rayo-terra-500)',
                color: '#FFFFFF',
                maxWidth: '180px',
              }}
              className="line-clamp-1"
            >
              <Sparkles className="w-3 h-3 mr-1 shrink-0" />
              {trailTitle ? `Trilha: ${trailTitle}` : 'Parte de uma trilha'}
            </Badge>
          </div>
        ) : null}
        {/* Task #262 — badge de tipo (bottom-left p/ não colidir com os
            badges Adquirido/Trilha no top-left). */}
        <div className="absolute bottom-3 left-3">
          <ProductTypeBadge kind="curso" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          {/* Rating — só renderiza se tiver dado real (Task #151: ratings fake do seed
              foram zerados em migração; cursos novos começam em 0). */}
          {Number(course.rating) > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-[#FFA500] text-[#FFA500]" />
              <span
                className="text-[14px]"
                style={{
                  fontWeight: 700,
                  color: 'var(--rayo-forest-900)'
                }}
              >
                {Number(course.rating).toFixed(1)}
              </span>
              {Number(course.students) > 0 && (
                <span
                  className="text-[14px]"
                  style={{ color: 'var(--rayo-ink-700)' }}
                >
                  ({course.students})
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h3 
            className="text-[16px] line-clamp-2 leading-snug transition-colors mt-2" 
            style={{ 
              fontWeight: 600, 
              color: 'var(--rayo-forest-900)' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--rayo-terra-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--rayo-forest-900)';
            }}
          >
            {course.title}
          </h3>

          {/* Instructor */}
          <p 
            className="text-[14px] mt-2" 
            style={{ color: 'var(--rayo-ink-700)' }}
          >
            {course.instructor}
          </p>

          {/* Task #151 — Matriz de preço/CTA do catálogo:
              - Em trilha paga (Stripe): nada de preço aqui (vem da trilha em /trilhas/:slug).
              - Avulso gratuito (price=0): badge "Gratuito" sage-500.
              - Avulso pago (price>0): NÃO promete vaga — só "Em breve" subtle (waitlist real). */}
          {!isInTrail && (
            <div className="flex items-baseline gap-2 pt-2">
              {Number(course.price) > 0 ? (
                <span
                  className="text-[14px]"
                  style={{ fontWeight: 600, color: 'var(--rayo-ink-700)' }}
                >
                  Em breve
                </span>
              ) : (
                <span
                  className="text-[20px]"
                  style={{ fontWeight: 700, color: 'var(--rayo-sage-500)' }}
                >
                  Gratuito
                </span>
              )}
            </div>
          )}
        </div>

        {/* Enroll Button - Only show if not enrolled.
            Task #151 CTA matrix:
            - trilha paga → "Ver trilha" (vai pro checkout)
            - avulso gratuito → "Acessar" (vai pra TurmaShell normal)
            - avulso pago → "Avise-me" (waitlist honesta, sem checkout) */}
        {!course.isEnrolled && (
          <Button
            onClick={stopBubble(handleEnroll)}
            className="w-full mt-3"
            style={{
              fontWeight: 600,
              background: 'var(--rayo-terra-500)',
              color: '#FFFFFF',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--rayo-terra-700)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--rayo-terra-500)';
            }}
          >
            {isInTrail
              ? 'Ver trilha'
              : Number(course.price) > 0
                ? 'Avise-me'
                : 'Acessar'}
          </Button>
        )}
        
        {/* Show "Go to Course" if enrolled */}
        {course.isEnrolled && (
          <Button
            onClick={stopBubble(() => onClick())}
            className="w-full mt-3"
            style={{ 
              fontWeight: 600,
              background: 'var(--rayo-sage-500)',
              color: '#FFFFFF',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Acessar Curso
          </Button>
        )}
      </div>
    </div>
  );
}
