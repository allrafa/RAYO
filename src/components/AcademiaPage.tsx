import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Star, Users, ArrowRight, Play, ChevronLeft, ChevronRight, Trophy, Clock, BookOpen, Lock, CheckCircle, ShoppingCart, ChevronUp, Sparkles, Book, Headphones, Video, Film, Layers, GraduationCap, Package, Loader2 } from "lucide-react";
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
import heroImage from "../assets/marketplace-hero-family.jpg";

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
          courses={courses}
          mostPopularCourses={mostPopularCourses}
          bestRatedCourses={bestRatedCourses}
          filteredCourses={filteredCourses}
          setCurrentCourseId={setCurrentCourseId}
          setIsInCourseDetail={setIsInCourseDetail}
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

// MARKETPLACE VIEW — Editorial RAYO style
interface MarketplaceViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  courses: any[];
  mostPopularCourses: any[];
  bestRatedCourses: any[];
  filteredCourses: any[];
  setCurrentCourseId: (id: string) => void;
  setIsInCourseDetail: (value: boolean) => void;
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

interface BundleItemAPI {
  id: number;
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

function MarketplaceView({
  searchQuery,
  setSearchQuery,
  courses,
  mostPopularCourses,
  bestRatedCourses,
  filteredCourses,
  setCurrentCourseId,
  setIsInCourseDetail,
  enrollInCourse,
  showAllPopular,
  setShowAllPopular,
  totalPopularCourses,
  userSegments,
}: MarketplaceViewProps) {
  const popularSectionRef = useRef<HTMLDivElement>(null);
  const allCoursesRef = useRef<HTMLDivElement>(null);

  // Default selected segment = first one in user's onboarding profile (or "all")
  const initialSegment = userSegments.length > 0 ? userSegments[0] : "all";
  const [selectedSegment, setSelectedSegment] = useState<string>(initialSegment);

  // Format counts (loaded from CMS public endpoint, one request per kind).
  const [formatCounts, setFormatCounts] = useState<Record<string, number>>({});
  const [formatCountsLoading, setFormatCountsLoading] = useState<boolean>(true);

  // Curated bundles (loaded from /api/bundles, optionally filtered by segment)
  const [bundles, setBundles] = useState<BundleAPI[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState<boolean>(true);
  const [bundlesError, setBundlesError] = useState<string | null>(null);

  // Active format filter ("curso" scrolls; others render an inline showcase)
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [kindItems, setKindItems] = useState<Array<{
    id: number;
    title: string;
    short_description: string | null;
    cover_url: string | null;
    author?: string | null;
  }>>([]);
  const [kindLoading, setKindLoading] = useState<boolean>(false);
  const [kindError, setKindError] = useState<string | null>(null);
  const kindShowcaseRef = useRef<HTMLDivElement>(null);

  // Inline-expanded bundle (shows real items list)
  const [expandedBundleId, setExpandedBundleId] = useState<number | null>(null);

  // Fetch items for the selected non-curso format whenever kind or segment change
  useEffect(() => {
    if (!selectedKind || selectedKind === "curso") return;
    let cancelled = false;
    (async () => {
      setKindLoading(true);
      setKindError(null);
      try {
        const segParam =
          selectedSegment && selectedSegment !== "all"
            ? `&segment=${encodeURIComponent(selectedSegment)}`
            : "";
        const res = await api.get<{ items: typeof kindItems }>(
          `/api/content?kind=${encodeURIComponent(selectedKind)}${segParam}&limit=12`
        );
        if (cancelled) return;
        if (res.success && res.data && Array.isArray(res.data.items)) {
          setKindItems(res.data.items);
        } else {
          setKindError("Não foi possível carregar este formato agora.");
          setKindItems([]);
        }
      } catch {
        if (!cancelled) {
          setKindError("Não foi possível carregar este formato agora.");
          setKindItems([]);
        }
      } finally {
        if (!cancelled) setKindLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedKind, selectedSegment]);

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

  // Fetch format counts (one cheap call per kind, cached for the session)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFormatCountsLoading(true);
      const counts: Record<string, number> = {};
      await Promise.all(
        FORMAT_KINDS.map(async (f) => {
          try {
            const res = await api.get<{
              items: unknown[];
              pagination?: { total?: number };
              total?: number;
            }>(`/api/content?kind=${encodeURIComponent(f.kind)}&limit=1`);
            if (res.success && res.data) {
              const total =
                typeof res.data.pagination?.total === "number"
                  ? res.data.pagination.total
                  : typeof res.data.total === "number"
                  ? res.data.total
                  : Array.isArray(res.data.items)
                  ? res.data.items.length
                  : 0;
              counts[f.kind] = total;
            } else {
              counts[f.kind] = 0;
            }
          } catch {
            counts[f.kind] = 0;
          }
        })
      );
      // Curso count comes from local courses array (CMS-authored + legacy)
      counts.curso = Math.max(counts.curso || 0, courses.length);
      if (!cancelled) {
        setFormatCounts(counts);
        setFormatCountsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courses.length]);

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

  return (
    <div>
      {/* HERO — Editorial RAYO */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'var(--raio-bg-warm-cream)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-10 md:py-16">
          <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
            {/* Left — editorial copy + search */}
            <div className="space-y-6 order-2 md:order-1">
              <div>
                <p
                  className="font-display-serif italic text-[14px] mb-3"
                  style={{ color: 'var(--raio-accent-hover)', letterSpacing: '0.02em' }}
                >
                  Conteúdo para a sua família
                </p>
                <h1
                  className="font-display-serif"
                  style={{
                    fontSize: 'clamp(40px, 6vw, 64px)',
                    lineHeight: 1.0,
                    color: 'var(--raio-text-primary)',
                    letterSpacing: '-0.02em',
                    fontWeight: 400,
                  }}
                >
                  O que vocês{' '}
                  <span style={{ fontStyle: 'italic', color: 'var(--raio-accent-hover)' }}>
                    vão construir
                  </span>{' '}
                  hoje?
                </h1>
                <p
                  className="text-[16px] md:text-[17px] mt-5 leading-relaxed max-w-[480px]"
                  style={{ color: 'var(--raio-text-strong)', lineHeight: 1.65 }}
                >
                  Cursos, livros, áudios e trilhas pensados para cada momento — do solteiro aos pais — tudo em um só lugar.
                </p>

                {/* Secondary CTA + social proof */}
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (userSegments.length > 0) {
                        setSelectedSegment(userSegments[0]);
                      }
                      setTimeout(() => {
                        allCoursesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 60);
                    }}
                    className="inline-flex items-center gap-2 h-[48px] px-5 rounded-full text-[15px] transition-all"
                    style={{
                      background: 'transparent',
                      color: 'var(--raio-text-primary)',
                      border: '1.5px solid var(--raio-text-primary)',
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--raio-text-primary)';
                      e.currentTarget.style.color = 'var(--raio-text-inverse)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--raio-text-primary)';
                    }}
                  >
                    {userSegments.length > 0
                      ? 'Ver coleção da minha fase'
                      : 'Ver todas as coleções'}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div
                    className="flex items-center gap-2 text-[13px]"
                    style={{ color: 'var(--raio-text-secondary)' }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--raio-accent-hover)' }}
                    />
                    <span>
                      Curadoria editorial · 5 fases da família · novos conteúdos toda semana
                    </span>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative max-w-[520px]">
                <Input
                  placeholder='Busque por "comunicação", "filhos" ou "finanças"'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[56px] pl-6 pr-16 text-[16px] rounded-full border focus:ring-0"
                  style={{
                    fontSize: '16px',
                    background: 'var(--raio-bg-primary)',
                    borderColor: 'var(--raio-border-default)',
                    color: 'var(--raio-text-primary)',
                  }}
                />
                <Button
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-[44px] w-[44px] rounded-full"
                  style={{ background: 'var(--raio-accent-primary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--raio-accent-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--raio-accent-primary)'; }}
                  onClick={() => {
                    if (allCoursesRef.current) {
                      allCoursesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  aria-label="Buscar"
                >
                  <Search className="w-5 h-5" style={{ color: '#FFFFFF' }} />
                </Button>
              </div>
            </div>

            {/* Right — editorial photo (visible on mobile too) */}
            <div className="order-1 md:order-2">
              <div
                className="relative rounded-[24px] overflow-hidden shadow-lg"
                style={{ aspectRatio: '4 / 3' }}
              >
                <ImageWithFallback
                  src={heroImage}
                  alt="Família lendo junta em um banco de praça ao entardecer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Segment chips */}
          <div className="mt-10 md:mt-12">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[12px] uppercase tracking-wider"
                style={{ color: 'var(--raio-text-secondary)', letterSpacing: '0.12em', fontWeight: 600 }}
              >
                Para o seu momento
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[{ value: 'all', label: 'Todos' }, ...SEGMENTS].map((seg) => {
                const isActive = selectedSegment === seg.value;
                const isUserSegment = userSegments.includes(seg.value);
                return (
                  <button
                    key={seg.value}
                    type="button"
                    onClick={() => setSelectedSegment(seg.value)}
                    className="px-4 py-2 rounded-full text-[14px] transition-all"
                    style={{
                      background: isActive
                        ? 'var(--raio-text-primary)'
                        : 'var(--raio-bg-primary)',
                      color: isActive
                        ? 'var(--raio-text-inverse)'
                        : 'var(--raio-text-strong)',
                      border: `1px solid ${
                        isActive ? 'var(--raio-text-primary)' : 'var(--raio-border-default)'
                      }`,
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {seg.label}
                    {isUserSegment && !isActive && (
                      <span
                        className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle"
                        style={{ background: 'var(--raio-accent-hover)' }}
                        aria-label="Seu perfil"
                      />
                    )}
                  </button>
                );
              })}
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
                    style={{ fontWeight: 700, color: 'var(--raio-text-primary)' }}
                  >
                    {getSearchResultMessage(searchQuery, segmentFilteredCourses.length, courses)}
                  </h2>
                  <p className="text-[16px]" style={{ color: 'var(--raio-text-secondary)' }}>
                    {segmentFilteredCourses.length}{' '}
                    {segmentFilteredCourses.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
                    {selectedSegment !== 'all' && segmentLabel ? ` em ${segmentLabel}` : ''}
                  </p>
                </div>
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
            {/* FORMAT EXPLORER — 6 CMS kinds */}
            <section>
              <div className="mb-6 md:mb-8">
                <h2
                  className="font-display-serif"
                  style={{
                    fontSize: 'clamp(26px, 3vw, 32px)',
                    lineHeight: 1.1,
                    color: 'var(--raio-text-primary)',
                    fontWeight: 400,
                  }}
                >
                  Explore por{' '}
                  <span style={{ fontStyle: 'italic', color: 'var(--raio-accent-hover)' }}>
                    formato
                  </span>
                </h2>
                <p className="text-[15px] mt-2" style={{ color: 'var(--raio-text-secondary)' }}>
                  Escolha como você prefere consumir hoje.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                {FORMAT_KINDS.map((f) => {
                  const count = formatCounts[f.kind] ?? 0;
                  const Icon = f.Icon;
                  const isActiveKind = selectedKind === f.kind;
                  const handleClick = () => {
                    if (f.kind === 'curso') {
                      setSelectedKind(null);
                      if (allCoursesRef.current) {
                        allCoursesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    } else {
                      setSelectedKind(f.kind);
                      setTimeout(() => {
                        kindShowcaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 60);
                    }
                  };
                  return (
                    <button
                      key={f.kind}
                      type="button"
                      onClick={handleClick}
                      className="text-left rounded-2xl p-4 md:p-5 transition-all hover:-translate-y-0.5"
                      style={{
                        background: 'var(--raio-bg-secondary)',
                        border: `1px solid ${isActiveKind ? 'var(--raio-accent-primary)' : 'var(--raio-border-default)'}`,
                        boxShadow: isActiveKind ? '0 0 0 3px rgba(201,144,86,0.18)' : undefined,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--raio-accent-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isActiveKind
                          ? 'var(--raio-accent-primary)'
                          : 'var(--raio-border-default)';
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ background: 'var(--raio-bg-warm-cream)' }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-[15px]" style={{ fontWeight: 600, color: 'var(--raio-text-primary)' }}>
                        {f.label}
                      </div>
                      <div className="text-[12px] mt-0.5" style={{ color: 'var(--raio-text-secondary)' }}>
                        {f.description}
                      </div>
                      <div className="text-[12px] mt-2" style={{ color: 'var(--raio-text-tertiary)' }}>
                        {formatCountsLoading ? '—' : `${count} ${count === 1 ? 'item' : 'itens'}`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Kind showcase — real items for the active non-curso format */}
              {selectedKind && selectedKind !== 'curso' && (
                <div ref={kindShowcaseRef} className="mt-8">
                  <div className="flex items-end justify-between gap-4 mb-4">
                    <div>
                      <h3
                        className="text-[20px] md:text-[22px]"
                        style={{ fontWeight: 700, color: 'var(--raio-text-primary)' }}
                      >
                        {FORMAT_KINDS.find((k) => k.kind === selectedKind)?.label}
                        {selectedSegment !== 'all' && segmentLabel ? ` para ${segmentLabel}` : ''}
                      </h3>
                      <p
                        className="text-[13px] mt-1"
                        style={{ color: 'var(--raio-text-secondary)' }}
                      >
                        {kindLoading
                          ? 'Carregando…'
                          : kindError
                          ? kindError
                          : `${kindItems.length} ${kindItems.length === 1 ? 'item' : 'itens'}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedKind(null)}
                      className="text-[13px] underline"
                      style={{ color: 'var(--raio-text-secondary)' }}
                    >
                      Limpar filtro
                    </button>
                  </div>

                  {kindLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--raio-accent-primary)' }} />
                    </div>
                  ) : kindItems.length === 0 ? (
                    <EmptyMarketplaceState
                      title={`Nenhum ${FORMAT_KINDS.find((k) => k.kind === selectedKind)?.label.toLowerCase()} disponível ainda`}
                      description={
                        selectedSegment !== 'all'
                          ? `Tente outro segmento ou volte em breve — novos conteúdos chegam toda semana.`
                          : 'Volte em breve — novos conteúdos chegam toda semana.'
                      }
                      actionLabel={selectedSegment !== 'all' ? 'Ver todos os segmentos' : undefined}
                      onAction={selectedSegment !== 'all' ? () => setSelectedSegment('all') : undefined}
                    />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {kindItems.map((it) => (
                        <div
                          key={it.id}
                          className="rounded-2xl overflow-hidden"
                          style={{
                            background: 'var(--raio-bg-secondary)',
                            border: '1px solid var(--raio-border-default)',
                          }}
                        >
                          <div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
                            <ImageWithFallback
                              src={it.cover_url || ''}
                              alt={it.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <div
                              className="text-[14px] line-clamp-2"
                              style={{ fontWeight: 600, color: 'var(--raio-text-primary)' }}
                            >
                              {it.title}
                            </div>
                            {it.short_description && (
                              <div
                                className="text-[12px] mt-1 line-clamp-2"
                                style={{ color: 'var(--raio-text-secondary)' }}
                              >
                                {it.short_description}
                              </div>
                            )}
                            {it.author && (
                              <div
                                className="text-[11px] mt-2"
                                style={{ color: 'var(--raio-text-tertiary)' }}
                              >
                                {it.author}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* CURATED BUNDLES — trilhas */}
            <section>
              <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
                <div>
                  <h2
                    className="font-display-serif"
                    style={{
                      fontSize: 'clamp(26px, 3vw, 32px)',
                      lineHeight: 1.1,
                      color: 'var(--raio-text-primary)',
                      fontWeight: 400,
                    }}
                  >
                    Trilhas{' '}
                    <span style={{ fontStyle: 'italic', color: 'var(--raio-accent-hover)' }}>
                      curadas
                    </span>
                  </h2>
                  <p className="text-[15px] mt-2" style={{ color: 'var(--raio-text-secondary)' }}>
                    {selectedSegment === 'all'
                      ? 'Combinações pensadas para cada momento da sua família.'
                      : `Selecionadas para ${segmentLabel}.`}
                  </p>
                </div>
              </div>

              {bundlesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--raio-accent-primary)' }} />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {bundles.map((b) => (
                    <BundleCard
                      key={b.id}
                      bundle={b}
                      isExpanded={expandedBundleId === b.id}
                      onToggle={() =>
                        setExpandedBundleId((curr) => (curr === b.id ? null : b.id))
                      }
                      onOpenCourse={(courseId) => {
                        setCurrentCourseId(courseId);
                        setIsInCourseDetail(true);
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

            {/* MOST POPULAR */}
            <section ref={popularSectionRef}>
              <div className="flex items-center justify-between mb-6 md:mb-8 gap-4">
                <div>
                  <h2
                    className="font-display-serif"
                    style={{
                      fontSize: 'clamp(26px, 3vw, 32px)',
                      lineHeight: 1.1,
                      color: 'var(--raio-text-primary)',
                      fontWeight: 400,
                    }}
                  >
                    Mais{' '}
                    <span style={{ fontStyle: 'italic', color: 'var(--raio-accent-hover)' }}>
                      populares
                    </span>
                  </h2>
                  {!showAllPopular && totalPopularCourses > 4 && (
                    <p className="text-[14px] mt-1" style={{ color: 'var(--raio-text-secondary)' }}>
                      {totalPopularCourses} cursos disponíveis
                    </p>
                  )}
                </div>
                {totalPopularCourses > 4 && (
                  <Button
                    variant="ghost"
                    className="gap-2 hover:bg-transparent transition-all shrink-0"
                    style={{ color: 'var(--raio-accent-primary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--raio-accent-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--raio-accent-primary)'; }}
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
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ArrowRight className="w-5 h-5" />
                    )}
                  </Button>
                )}
              </div>
              {mostPopularCourses.length === 0 ? (
                <EmptyMarketplaceState
                  title="Sem cursos populares ainda"
                  description="Em breve novos lançamentos no marketplace."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500">
                  {mostPopularCourses.map((course, index) => (
                    <div
                      key={course.id}
                      className="animate-in fade-in slide-in-from-bottom-4"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: 'backwards',
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
              )}
            </section>

            {/* BEST RATED */}
            {bestRatedCourses.length > 0 && (
              <section>
                <div className="mb-6 md:mb-8">
                  <h2
                    className="font-display-serif"
                    style={{
                      fontSize: 'clamp(26px, 3vw, 32px)',
                      lineHeight: 1.1,
                      color: 'var(--raio-text-primary)',
                      fontWeight: 400,
                    }}
                  >
                    Cursos com{' '}
                    <span style={{ fontStyle: 'italic', color: 'var(--raio-accent-hover)' }}>
                      boas avaliações
                    </span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
            )}

            {/* ALL COURSES — segment-filtered */}
            <section ref={allCoursesRef}>
              <div className="mb-6 md:mb-8 flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <h2
                    className="font-display-serif"
                    style={{
                      fontSize: 'clamp(26px, 3vw, 32px)',
                      lineHeight: 1.1,
                      color: 'var(--raio-text-primary)',
                      fontWeight: 400,
                    }}
                  >
                    {selectedSegment === 'all' ? (
                      <>Todos os <span style={{ fontStyle: 'italic', color: 'var(--raio-accent-hover)' }}>cursos</span></>
                    ) : (
                      <>Cursos para <span style={{ fontStyle: 'italic', color: 'var(--raio-accent-hover)' }}>{segmentLabel}</span></>
                    )}
                  </h2>
                  <p className="text-[14px] mt-1" style={{ color: 'var(--raio-text-secondary)' }}>
                    {segmentFilteredCourses.length}{' '}
                    {segmentFilteredCourses.length === 1 ? 'curso' : 'cursos'}
                  </p>
                </div>
                {selectedSegment !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedSegment('all')}
                    className="text-[14px] underline-offset-4 hover:underline"
                    style={{ color: 'var(--raio-accent-primary)', fontWeight: 600 }}
                  >
                    Ver todos os segmentos
                  </button>
                )}
              </div>

              {segmentFilteredCourses.length === 0 ? (
                <EmptyMarketplaceState
                  title={`Sem cursos para ${segmentLabel || 'este segmento'} ainda`}
                  description="Em breve novos cursos para este momento. Enquanto isso, explore os outros segmentos."
                  actionLabel="Ver todos os segmentos"
                  onAction={() => setSelectedSegment('all')}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
    <div
      className="rounded-2xl py-12 px-6 text-center"
      style={{
        background: 'var(--raio-bg-secondary)',
        border: '1px dashed var(--raio-border-default)',
      }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'var(--raio-bg-warm-cream)' }}
      >
        <Sparkles className="w-6 h-6" style={{ color: 'var(--raio-accent-hover)' }} />
      </div>
      <h3
        className="text-[18px] mb-2"
        style={{ fontWeight: 600, color: 'var(--raio-text-primary)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-[14px] max-w-[420px] mx-auto"
          style={{ color: 'var(--raio-text-secondary)', lineHeight: 1.55 }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 text-[14px]"
          style={{ color: 'var(--raio-accent-primary)', fontWeight: 600 }}
        >
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
  onOpenCourse: (courseId: number) => void;
  onSeeAllInSegment: () => void;
}

function BundleCard({
  bundle,
  isExpanded,
  onToggle,
  onOpenCourse,
  onSeeAllInSegment,
}: BundleCardProps) {
  const accent = bundle.accent_color || 'var(--raio-accent-primary)';
  const segLabel = SEGMENTS.find((s) => s.value === bundle.segment)?.label || bundle.segment;
  const items = bundle.items || [];

  return (
    <div
      className="text-left rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--raio-bg-secondary)',
        border: `1px solid ${isExpanded ? 'var(--raio-accent-primary)' : 'var(--raio-border-default)'}`,
        boxShadow: isExpanded ? '0 0 0 3px rgba(201,144,86,0.18)' : undefined,
      }}
    >
    <button
      type="button"
      onClick={onToggle}
      className="block w-full text-left transition-all hover:-translate-y-0.5 group"
      aria-expanded={isExpanded}
    >
      <div
        className="relative h-[120px] flex items-end p-5"
        style={{
          background: `linear-gradient(135deg, ${accent}, var(--raio-text-primary))`,
        }}
      >
        <div
          className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px]"
          style={{
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(6px)',
            color: '#FFFFFF',
            fontWeight: 600,
          }}
        >
          <Package className="w-3 h-3" />
          {bundle.item_count} itens
        </div>
        <div
          className="text-[11px] uppercase tracking-wider"
          style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '0.12em', fontWeight: 600 }}
        >
          {segLabel}
        </div>
      </div>
      <div className="p-5 space-y-2">
        <h3
          className="font-display-serif"
          style={{
            fontSize: '22px',
            lineHeight: 1.15,
            color: 'var(--raio-text-primary)',
            fontWeight: 400,
          }}
        >
          {bundle.title}
        </h3>
        {bundle.subtitle && (
          <p
            className="text-[13px]"
            style={{ color: 'var(--raio-accent-hover)', fontStyle: 'italic' }}
          >
            {bundle.subtitle}
          </p>
        )}
        {bundle.description && (
          <p
            className="text-[14px] line-clamp-2"
            style={{ color: 'var(--raio-text-secondary)', lineHeight: 1.55 }}
          >
            {bundle.description}
          </p>
        )}
        <div
          className="text-[13px] pt-2 inline-flex items-center gap-1.5"
          style={{ color: 'var(--raio-accent-primary)', fontWeight: 600 }}
        >
          {isExpanded ? 'Ocultar trilha' : 'Ver trilha'}{' '}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </div>
      </div>
    </button>

    {isExpanded && (
      <div
        className="border-t px-5 py-4"
        style={{ borderColor: 'var(--raio-border-default)' }}
      >
        {items.length === 0 ? (
          <div className="text-[13px]" style={{ color: 'var(--raio-text-secondary)' }}>
            Itens desta trilha serão publicados em breve.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onOpenCourse(it.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--raio-bg-warm-cream)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] shrink-0"
                    style={{
                      background: accent,
                      color: '#FFFFFF',
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-[14px] truncate"
                      style={{ fontWeight: 600, color: 'var(--raio-text-primary)' }}
                    >
                      {it.title}
                    </div>
                    <div
                      className="text-[12px] truncate"
                      style={{ color: 'var(--raio-text-secondary)' }}
                    >
                      {[it.instructor, it.duration, it.level].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--raio-text-tertiary)' }} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onSeeAllInSegment}
          className="mt-3 w-full text-[13px] py-2 rounded-lg transition-colors"
          style={{
            background: 'var(--raio-bg-warm-cream)',
            color: 'var(--raio-accent-hover)',
            fontWeight: 600,
          }}
        >
          Ver todos os cursos para {segLabel} →
        </button>
      </div>
    )}
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
              <span
                className="text-[20px]"
                style={{
                  fontWeight: 700,
                  color: 'var(--raio-text-primary)'
                }}
              >
                R$ {Number(course.price).toFixed(2).replace('.', ',')}
              </span>
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
