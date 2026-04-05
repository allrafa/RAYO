import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Star, Users, ArrowRight, Play, ChevronLeft, ChevronRight, Trophy, Clock, BookOpen, Lock, CheckCircle, ShoppingCart, ChevronUp, Sparkles, Book } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useApp } from "./AppContext";
import { FavoriteIcon } from "./FavoriteButton";
import { toast } from "sonner@2.0.3";
import { smartSearch, getSearchResultMessage } from "./SmartSearchEngine";
import { useTheme } from "./ThemeProvider";
import { BookCard } from "./BookCard";
import heroImage from "figma:asset/ea9ad589377749103929b7dc6624939347a69a09.png";

export function AcademiaPage() {
  const { courses, books, setCurrentCourseId, setIsInCourseDetail, setCurrentBookId, setIsInBookDetail, startCourse, enrollInCourse, enrollInBook, toggleBookFavorite, userData } = useApp();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState<"minha-biblioteca" | "marketplace">("marketplace");
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
      className="min-h-screen"
      style={{ background: 'var(--raio-bg-primary)' }}
    >
      {/* NAVIGATION TABS - Above Everything */}
      <div 
        className="sticky top-0 z-50"
        style={{ 
          background: 'var(--raio-bg-primary)',
          borderBottom: '1px solid var(--raio-border-default)',
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
                borderColor: currentView === "minha-biblioteca" ? 'var(--raio-accent-primary)' : 'transparent',
                color: currentView === "minha-biblioteca" ? 'var(--raio-accent-primary)' : 'var(--raio-text-tertiary)',
              }}
              onMouseEnter={(e) => {
                if (currentView !== "minha-biblioteca") {
                  e.currentTarget.style.color = 'var(--raio-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "minha-biblioteca") {
                  e.currentTarget.style.color = 'var(--raio-text-tertiary)';
                }
              }}
            >
              <BookOpen className="w-4 h-4" />
              Minha Biblioteca
              {libraryItems.length > 0 && (
                <Badge 
                  className="ml-2" 
                  style={{ 
                    fontSize: '12px', 
                    fontWeight: 700,
                    background: 'var(--raio-accent-primary)',
                    color: theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF',
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
                borderColor: currentView === "marketplace" ? 'var(--raio-accent-primary)' : 'transparent',
                color: currentView === "marketplace" ? 'var(--raio-accent-primary)' : 'var(--raio-text-tertiary)',
              }}
              onMouseEnter={(e) => {
                if (currentView !== "marketplace") {
                  e.currentTarget.style.color = 'var(--raio-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== "marketplace") {
                  e.currentTarget.style.color = 'var(--raio-text-tertiary)';
                }
              }}
            >
              Marketplace
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
          totalCourses={totalCourses}
          mostPopularCourses={mostPopularCourses}
          bestRatedCourses={bestRatedCourses}
          filteredCourses={filteredCourses}
          setCurrentCourseId={setCurrentCourseId}
          setIsInCourseDetail={setIsInCourseDetail}
          enrollInCourse={enrollInCourse}
          showAllPopular={showAllPopular}
          setShowAllPopular={setShowAllPopular}
          totalPopularCourses={totalPopularCourses}
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
        <div className="text-center space-y-6">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'var(--raio-bg-tertiary)' }}
          >
            <BookOpen 
              className="w-12 h-12" 
              style={{ color: 'var(--raio-text-tertiary)' }}
            />
          </div>
          <div>
            <h2 
              className="text-[32px] mb-3" 
              style={{ 
                fontWeight: 700, 
                color: 'var(--raio-text-primary)' 
              }}
            >
              Sua biblioteca está vazia
            </h2>
            <p 
              className="text-[18px] mb-8" 
              style={{ color: 'var(--raio-text-secondary)' }}
            >
              Explore nosso marketplace e comece sua jornada de transformação
            </p>
          </div>
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
            background: libraryFilter === 'all' ? 'var(--raio-accent-primary)' : 'transparent',
            color: libraryFilter === 'all' 
              ? (theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF')
              : 'var(--raio-text-secondary)',
            borderColor: libraryFilter === 'all' ? 'var(--raio-accent-primary)' : 'var(--raio-border-default)'
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
            background: libraryFilter === 'courses' ? 'var(--raio-accent-primary)' : 'transparent',
            color: libraryFilter === 'courses' 
              ? (theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF')
              : 'var(--raio-text-secondary)',
            borderColor: libraryFilter === 'courses' ? 'var(--raio-accent-primary)' : 'var(--raio-border-default)'
          }}
        >
          🎓 Cursos ({totalCourses})
        </Button>
        <Button
          variant={libraryFilter === 'books' ? 'default' : 'outline'}
          onClick={() => setLibraryFilter('books')}
          className="gap-2"
          style={{
            background: libraryFilter === 'books' ? 'var(--raio-accent-primary)' : 'transparent',
            color: libraryFilter === 'books' 
              ? (theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF')
              : 'var(--raio-text-secondary)',
            borderColor: libraryFilter === 'books' ? 'var(--raio-accent-primary)' : 'var(--raio-border-default)'
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
              style={{ fontWeight: 700, color: 'var(--raio-text-primary)' }}
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
            style={{ fontWeight: 700, color: 'var(--raio-text-primary)' }}
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
            <Card 
              style={{ 
                background: 'var(--raio-bg-secondary)',
                borderColor: 'var(--raio-border-default)',
              }}
            >
              <CardContent className="p-4 text-center">
                <div 
                  className="text-[24px] mb-1" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  {totalCourses + totalBooks}
                </div>
                <div 
                  className="text-[12px]" 
                  style={{ color: 'var(--raio-text-secondary)' }}
                >
                  Itens na Biblioteca
                </div>
              </CardContent>
            </Card>
            <Card 
              style={{ 
                background: 'var(--raio-bg-secondary)',
                borderColor: 'var(--raio-border-default)',
              }}
            >
              <CardContent className="p-4 text-center">
                <div 
                  className="text-[24px] mb-1" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  {totalCourses}
                </div>
                <div 
                  className="text-[12px]" 
                  style={{ color: 'var(--raio-text-secondary)' }}
                >
                  Cursos Ativos
                </div>
              </CardContent>
            </Card>
            <Card 
              style={{ 
                background: 'var(--raio-bg-secondary)',
                borderColor: 'var(--raio-border-default)',
              }}
            >
              <CardContent className="p-4 text-center">
                <div 
                  className="text-[24px] mb-1" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  {totalBooks}
                </div>
                <div 
                  className="text-[12px]" 
                  style={{ color: 'var(--raio-text-secondary)' }}
                >
                  Livros
                </div>
              </CardContent>
            </Card>
            <Card 
              style={{ 
                background: 'var(--raio-bg-secondary)',
                borderColor: 'var(--raio-border-default)',
              }}
            >
              <CardContent className="p-4 text-center">
                <div 
                  className="text-[24px] mb-1" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  {books.filter(b => b.isCompleted).length + courses.filter(c => c.progress === 100).length}
                </div>
                <div 
                  className="text-[12px]" 
                  style={{ color: 'var(--raio-text-secondary)' }}
                >
                  Itens Concluídos
                </div>
              </CardContent>
            </Card>
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
                color: 'var(--raio-text-primary)' 
              }}
            >
                {course.title}
              </h2>
              {course.progress === 100 && (
                <Badge 
                  style={{ 
                    background: 'var(--raio-success)',
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
              style={{ color: 'var(--raio-text-secondary)' }}
            >
              {course.description}
            </p>
            <div 
              className="flex items-center gap-4 text-[13px]" 
              style={{ color: 'var(--raio-text-secondary)' }}
            >
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
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
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[13px]">
              <span style={{ color: 'var(--raio-text-secondary)' }}>
                Progresso do curso
              </span>
              <span style={{ 
                fontWeight: 600, 
                color: 'var(--raio-text-primary)' 
              }}>
                {course.progress}%
              </span>
            </div>
            <div 
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--raio-bg-tertiary)' }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${course.progress}%`,
                  background: 'linear-gradient(90deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lessons Carousel */}
      {lessonsError ? (
        <div className="px-6 py-4 text-center" style={{ color: 'var(--raio-text-secondary)' }}>
          <p className="text-[14px]">Não foi possível carregar as aulas. Tente novamente mais tarde.</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="px-6 py-4 text-center" style={{ color: 'var(--raio-text-secondary)' }}>
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
          style={{ borderColor: 'var(--raio-border-default)' }}
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
        style={{ background: 'var(--raio-bg-tertiary)' }}
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
                  background: 'var(--raio-success)',
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
                  style={{ color: 'var(--raio-accent-primary)' }}
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

// MARKETPLACE VIEW - Hotmart Style
interface MarketplaceViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalCourses: number;
  mostPopularCourses: any[];
  bestRatedCourses: any[];
  filteredCourses: any[];
  setCurrentCourseId: (id: string) => void;
  setIsInCourseDetail: (value: boolean) => void;
  enrollInCourse: (id: number) => void;
  showAllPopular: boolean;
  setShowAllPopular: (value: boolean) => void;
  totalPopularCourses: number;
}

function MarketplaceView({
  searchQuery,
  setSearchQuery,
  totalCourses,
  mostPopularCourses,
  bestRatedCourses,
  filteredCourses,
  setCurrentCourseId,
  setIsInCourseDetail,
  enrollInCourse,
  showAllPopular,
  setShowAllPopular,
  totalPopularCourses,
}: MarketplaceViewProps) {
  const popularSectionRef = useRef<HTMLDivElement>(null);

  // Scroll suave quando expandir
  useEffect(() => {
    if (showAllPopular && popularSectionRef.current) {
      setTimeout(() => {
        popularSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [showAllPopular]);

  return (
    <div>
      {/* HERO SECTION - Hotmart Style */}
      <section 
        className="overflow-hidden"
        style={{ background: 'var(--raio-bg-secondary)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              {/* Main Heading */}
              <div>
                <h1 
                  className="text-[40px] md:text-[56px] leading-[1.1] tracking-tight mb-4" 
                  style={{ 
                    fontWeight: 700,
                    color: 'var(--raio-text-primary)'
                  }}
                >
                  O que você quer{" "}
                  <span style={{ color: 'var(--raio-accent-primary)' }}>aprender</span>{" "}
                  hoje?
                </h1>
                <p 
                  className="text-[18px] leading-relaxed"
                  style={{ color: 'var(--raio-text-secondary)' }}
                >
                  Busque por um tema e escolha o curso perfeito para você
                </p>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Input
                  placeholder='Tente buscar por "comunicação" ou "finanças"'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[56px] pl-6 pr-16 text-[16px] rounded-full border-2 shadow-sm focus:ring-0"
                  style={{ 
                    fontSize: '16px',
                    background: 'var(--raio-bg-primary)',
                    borderColor: 'var(--raio-border-default)',
                    color: 'var(--raio-text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--raio-accent-primary)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--raio-border-default)';
                  }}
                />
                <Button
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-[44px] w-[44px] rounded-full"
                  style={{
                    background: 'var(--raio-accent-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--raio-accent-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--raio-accent-primary)';
                  }}
                  onClick={() => {
                    // Handle search
                  }}
                >
                  <Search 
                    className="w-5 h-5"
                    style={{ color: '#FFFFFF' }}
                  />
                </Button>
              </div>
            </div>

            {/* Right Image */}
            <div className="hidden md:block">
              <div className="relative">
                <ImageWithFallback
                  src={heroImage}
                  alt="Aprenda com a RAIO"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        {/* Show search results if searching */}
        {searchQuery.trim() ? (
          <section>
            <div className="mb-8">
              <div className="flex items-start gap-3 mb-4 bg-muted/30 rounded-lg p-4 border border-border">
                <Sparkles className="w-6 h-6 text-primary shrink-0 mt-1" />
                <div>
                  <h2 
                    className="text-[24px] mb-2" 
                    style={{ 
                      fontWeight: 700, 
                      color: 'var(--raio-text-primary)' 
                    }}
                  >
                    {getSearchResultMessage(searchQuery, filteredCourses.length, courses)}
                  </h2>
                  <p 
                    className="text-[16px]" 
                    style={{ color: 'var(--raio-text-secondary)' }}
                  >
                    {filteredCourses.length} {filteredCourses.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {filteredCourses.map((course) => (
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
          </section>
        ) : (
          <>
            {/* MOST POPULAR - Hotmart Style */}
            <section ref={popularSectionRef}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 
                    className="text-[32px]" 
                    style={{ 
                      fontWeight: 700, 
                      color: 'var(--raio-text-primary)' 
                    }}
                  >
                    Mais populares
                  </h2>
                  {!showAllPopular && totalPopularCourses > 4 && (
                    <p 
                      className="text-[14px] mt-1" 
                      style={{ color: 'var(--raio-text-secondary)' }}
                    >
                      {totalPopularCourses} cursos disponíveis
                    </p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  className="gap-2 hover:bg-transparent transition-all"
                  style={{ color: 'var(--raio-accent-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--raio-accent-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--raio-accent-primary)';
                  }}
                  onClick={() => {
                    const newValue = !showAllPopular;
                    setShowAllPopular(newValue);
                    if (newValue) {
                      toast.success(`Mostrando todos os ${totalPopularCourses} cursos populares`);
                    }
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {showAllPopular ? 'Mostrar menos' : 'Explorar tudo'}
                  </span>
                  {showAllPopular ? (
                    <ChevronUp className="w-5 h-5 transition-transform" />
                  ) : (
                    <ArrowRight className="w-5 h-5 transition-transform" />
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-500">
                {mostPopularCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{ 
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: 'backwards'
                    }}
                  >
                    <PopularCard
                      course={course}
                      onClick={() => {
                        setCurrentCourseId(course.id);
                        setIsInCourseDetail(true);
                      }}
                    />
                  </div>
                ))}
              </div>
              
              {/* Mostrar contador quando expandido */}
              {showAllPopular && mostPopularCourses.length > 4 && (
                <div className="mt-6 text-center">
                  <p 
                    className="text-[14px]" 
                    style={{ color: 'var(--raio-text-secondary)' }}
                  >
                    Mostrando {mostPopularCourses.length} cursos populares
                  </p>
                </div>
              )}
            </section>

            {/* PRODUCTS WITH GOOD REVIEWS */}
            <section>
              <div className="mb-8">
                <h2 
                  className="text-[32px] mb-2" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  Cursos com boas avaliações
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {bestRatedCourses.slice(0, 8).map((course) => (
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
            </section>

            {/* ALL PRODUCTS */}
            <section>
              <div className="mb-8">
                <h2 
                  className="text-[32px] mb-2" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  Todos os cursos
                </h2>
                <p 
                  className="text-[16px]" 
                  style={{ color: 'var(--raio-text-secondary)' }}
                >
                  {filteredCourses.length} {filteredCourses.length === 1 ? 'curso' : 'cursos'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {filteredCourses.map((course) => (
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
            </section>
          </>
        )}
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
            e.currentTarget.style.color = 'var(--raio-accent-bright)';
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

// Course Card - Hotmart product style
interface CourseCardProps {
  course: any;
  onClick: () => void;
  enrollInCourse: (id: number) => void;
}

function CourseCard({ course, onClick, enrollInCourse }: CourseCardProps) {
  const discountedPrice = course.price > 0 ? course.price * 0.5 : 0;

  const handleEnroll = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    enrollInCourse(course.id);
  };

  return (
    <Card
      className="group border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
      style={{ background: 'var(--raio-bg-secondary)' }}
    >
      {/* Thumbnail */}
      <div 
        onClick={onClick}
        className="relative aspect-[16/9] overflow-hidden cursor-pointer"
        style={{ background: 'var(--raio-bg-tertiary)' }}
      >
        <ImageWithFallback
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3">
          <div className="bg-white/95 rounded-full p-1.5 shadow-sm">
            <FavoriteIcon id={course.id} type="course" />
          </div>
        </div>
        {course.isEnrolled && (
          <div className="absolute top-3 left-3">
            <Badge 
              style={{ 
                fontSize: '12px', 
                fontWeight: 600,
                background: 'var(--raio-success)',
                color: '#FFFFFF',
              }}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Adquirido
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4 space-y-3">
        <div onClick={onClick} className="cursor-pointer">
          {/* Rating */}
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-[#FFA500] text-[#FFA500]" />
            <span 
              className="text-[14px]" 
              style={{ 
                fontWeight: 700, 
                color: 'var(--raio-text-primary)' 
              }}
            >
              {course.rating}
            </span>
            <span 
              className="text-[14px]" 
              style={{ color: 'var(--raio-text-secondary)' }}
            >
              ({course.students})
            </span>
          </div>

          {/* Title */}
          <h3 
            className="text-[16px] line-clamp-2 leading-snug transition-colors mt-2" 
            style={{ 
              fontWeight: 600, 
              color: 'var(--raio-text-primary)' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--raio-accent-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--raio-text-primary)';
            }}
          >
            {course.title}
          </h3>

          {/* Instructor */}
          <p 
            className="text-[14px] mt-2" 
            style={{ color: 'var(--raio-text-secondary)' }}
          >
            {course.instructor}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-2 pt-2">
            {course.price > 0 ? (
              <>
                <span 
                  className="text-[20px]" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  R$ {discountedPrice.toFixed(0)}
                </span>
                <span 
                  className="text-[14px] line-through" 
                  style={{ color: 'var(--raio-text-tertiary)' }}
                >
                  R$ {course.price}
                </span>
              </>
            ) : (
              <span 
                className="text-[20px]" 
                style={{ 
                  fontWeight: 700, 
                  color: 'var(--raio-success)' 
                }}
              >
                Gratuito
              </span>
            )}
          </div>
        </div>

        {/* Enroll Button - Only show if not enrolled */}
        {!course.isEnrolled && (
          <Button
            onClick={handleEnroll}
            className="w-full mt-3"
            style={{ 
              fontWeight: 600,
              background: 'var(--raio-accent-primary)',
              color: '#FFFFFF',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--raio-accent-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--raio-accent-primary)';
            }}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Adquirir Curso
          </Button>
        )}
        
        {/* Show "Go to Course" if enrolled */}
        {course.isEnrolled && (
          <Button
            onClick={onClick}
            className="w-full mt-3"
            style={{ 
              fontWeight: 600,
              background: 'var(--raio-success)',
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
      </CardContent>
    </Card>
  );
}
