import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { enhancedToast } from './EnhancedToast';
import { Book } from './types/BookTypes';
import { mockBooks, getEnrolledBooks } from './mockBooks';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  lessons: number;
  total_lessons?: number;
  rating: number;
  students: number;
  price: number;
  category: string;
  life_context?: string;
  level: string;
  isPremium: boolean;
  is_premium?: boolean;
  progress: number;
  isEnrolled?: boolean;
  completedLessons?: number;
  instructor?: string;
}

interface Post {
  id: number;
  author: string;
  avatar: string;
  time: string;
  content: string;
  category: string;
  likes: number;
  comments: number;
  shares: number;
  isPinned: boolean;
  userReacted: boolean;
  userCommented?: boolean;
  userShared?: boolean;
  visibility?: 'publico' | 'comunidade' | 'amigos';
  images?: string[];
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  isPremium: boolean;
  isInCart?: boolean;
  isFavorite?: boolean;
}

interface PlaylistItem {
  id: number;
  type: 'curso' | 'post' | 'produto';
  order: number;
}

interface Playlist {
  id: number;
  name: string;
  description: string;
  category: string;
  visibility: 'privada' | 'publica' | 'comunidade';
  tags: string[];
  items: PlaylistItem[];
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FavoriteItem {
  id: number;
  type: 'course' | 'video' | 'post' | 'product';
  addedAt: Date;
  notes?: string;
}

interface UserData {
  name: string;
  segments: string[];
  interests: string[];
  goals: string[];
  level: number;
  points: number;
  streak: number;
  completedCourses: number[];
  enrolledCourses: number[];
  enrolledBooks: string[]; // Book IDs
  favoriteProducts: number[];
  favorites: FavoriteItem[];
  cartItems: number[];
  notifications: Notification[];
  playlists: number[];
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
  action?: {
    label: string;
    callback: () => void;
  };
}

interface AppContextType {
  userData: UserData;
  updateUserData: (updates: Partial<UserData>) => void;
  courses: Course[];
  books: Book[];
  posts: Post[];
  products: Product[];
  playlists: Playlist[];
  
  enrollInCourse: (courseId: number) => void;
  startCourse: (courseId: number) => void;
  updateCourseProgress: (courseId: number, progress: number) => void;
  getCourseById: (courseId: number) => Course | undefined;
  loadCourses: () => Promise<void>;
  completeLessonOnServer: (lessonId: number) => Promise<any>;
  
  // Book functions
  enrollInBook: (bookId: string) => void;
  updateBookProgress: (bookId: string, page: number) => void;
  toggleBookFavorite: (bookId: string) => void;
  getBookById: (bookId: string) => Book | undefined;
  
  // Post functions
  likePost: (postId: number) => void;
  sharePost: (postId: number) => void;
  createPost: (content: string, category: string, options?: { visibility?: string; images?: string[] }) => void;
  
  // Product functions
  addToCart: (productId: number) => void;
  removeFromCart: (productId: number) => void;
  toggleFavorite: (productId: number) => void;
  
  // Favorites system
  addToFavorites: (id: number, type: 'course' | 'video' | 'post' | 'product', notes?: string) => void;
  removeFromFavorites: (id: number, type: 'course' | 'video' | 'post' | 'product') => void;
  isFavorite: (id: number, type: 'course' | 'video' | 'post' | 'product') => boolean;
  getFavoritesByType: (type?: 'course' | 'video' | 'post' | 'product') => FavoriteItem[];
  clearAllFavorites: () => void;
  
  // Playlist functions
  createPlaylist: (playlistData: Omit<Playlist, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>) => void;
  
  // Notification functions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (notificationId: number) => void;
  clearAllNotifications: () => void;
  
  // Search
  searchResults: any[];
  searchQuery: string;
  performSearch: (query: string) => void;
  clearSearch: () => void;

  // UI State
  isInOrbChat: boolean;
  setIsInOrbChat: (isInChat: boolean) => void;
  isInCentralConversas: boolean;
  setIsInCentralConversas: (isInCentral: boolean) => void;
  
  // Navigation State
  currentCourseId: number | null;
  setCurrentCourseId: (courseId: number | null) => void;
  isInCourseDetail: boolean;
  setIsInCourseDetail: (isInDetail: boolean) => void;
  
  // Video Page State
  currentVideoId: string | null;
  setCurrentVideoId: (videoId: string | null) => void;
  isInVideoPage: boolean;
  setIsInVideoPage: (isInVideo: boolean) => void;
  
  // Favorites Page State
  isInFavoritesPage: boolean;
  setIsInFavoritesPage: (isInFavorites: boolean) => void;
  
  // Book Reader State
  currentBookId: string | null;
  setCurrentBookId: (bookId: string | null) => void;
  isInBookDetail: boolean;
  setIsInBookDetail: (isInDetail: boolean) => void;
  isInBookReader: boolean;
  setIsInBookReader: (isInReader: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();

  const [userData, setUserData] = useState<UserData>({
    name: "Maria",
    segments: ["solteiro"],
    interests: [],
    goals: [],
    level: 3,
    points: 1250,
    streak: 5,
    completedCourses: [1],
    enrolledCourses: [1, 2],
    enrolledBooks: ['book-1', 'book-2', 'book-3', 'book-4', 'book-5', 'book-6'],
    favoriteProducts: [],
    favorites: [],
    cartItems: [],
    playlists: [],
    notifications: [
      {
        id: 1,
        title: "Novo curso disponível!",
        message: "O curso 'Intimidade no Casamento' acabou de ser lançado",
        type: 'info',
        read: false,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 2,
        title: "Parabéns!",
        message: "Você completou 5 dias consecutivos de estudo",
        type: 'success',
        read: false,
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ]
  });

  useEffect(() => {
    if (authUser) {
      setUserData(prev => ({
        ...prev,
        name: authUser.name,
        segments: authUser.segments,
        interests: authUser.interests,
        goals: authUser.goals,
        level: authUser.level ?? prev.level,
        points: authUser.xp ?? prev.points,
        streak: authUser.streak ?? prev.streak,
      }));
    }
  }, [authUser]);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      const catalogRes = await api.get<{ courses: any[] }>("/api/courses");
      if (!catalogRes.success || !catalogRes.data) return;

      let enrolledMap: Record<number, any> = {};
      if (authUser) {
        const progressRes = await api.get<{ progress: any[] }>("/api/courses/my-progress");
        if (progressRes.success && progressRes.data) {
          progressRes.data.progress.forEach((p: any) => {
            enrolledMap[p.course_id] = p;
          });
        }
      }

      const mapped: Course[] = catalogRes.data.courses.map((c: any) => {
        const enrollment = enrolledMap[c.id];
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          thumbnail: c.thumbnail,
          duration: c.duration,
          lessons: c.total_lessons,
          total_lessons: c.total_lessons,
          rating: parseFloat(c.rating),
          students: c.students,
          price: parseFloat(c.price),
          category: c.category,
          life_context: c.life_context,
          level: c.level,
          isPremium: c.is_premium,
          is_premium: c.is_premium,
          instructor: c.instructor,
          progress: enrollment ? parseFloat(enrollment.progress_percentage) : 0,
          isEnrolled: !!enrollment,
          completedLessons: enrollment ? enrollment.completed_lessons : 0,
        };
      });

      setCourses(mapped);
      setCoursesLoaded(true);
    } catch (err) {
      console.error("[AppContext] Failed to load courses:", err);
    }
  }, [authUser]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const [posts, setPosts] = useState<Post[]>([
    {
      id: 1,
      author: "Maria Silva",
      avatar: "/placeholder-avatar.jpg",
      time: "2h atrás",
      content: "Acabamos de completar o curso de comunicação não-violenta e já vemos uma diferença gigante no nosso relacionamento! 🙏 Alguém mais teve essa experiência?",
      category: "Relacionamento",
      likes: 24,
      comments: 8,
      shares: 3,
      isPinned: false,
      userReacted: false,
      visibility: "comunidade"
    },
    {
      id: 2,
      author: "João Santos",
      avatar: "/placeholder-avatar.jpg",
      time: "5h atrás",
      content: "Dica valiosa: começamos a fazer reuniões mensais para falar sobre nossas finanças. Recomendo demais! 💰",
      category: "Finanças",
      likes: 45,
      comments: 12,
      shares: 8,
      isPinned: true,
      userReacted: true,
      visibility: "comunidade",
      images: ["https://images.unsplash.com/photo-1554224155-6726b3ff858f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5hbmNlJTIwcGxhbm5pbmd8ZW58MXx8fHwxNzU5NjA4MzE5fDA&ixlib=rb-4.1.0&q=80&w=1080"]
    }
  ]);

  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      name: "Planejador de Relacionamento 2024",
      description: "Organize metas, datas especiais e momentos importantes do seu relacionamento",
      price: 47,
      originalPrice: 67,
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGFubmVyJTIwam91cm5hbHxlbnwxfHx8fDE3NTk2MDgzMTl8MA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Planejamento",
      rating: 4.9,
      reviews: 234,
      isPremium: false
    },
    {
      id: 2,
      name: "Kit de Jogos para Casais",
      description: "5 jogos diferentes para fortalecer a conexão e se divertir juntos",
      price: 89,
      image: "https://images.unsplash.com/photo-1625667517568-29c7ff4d9faf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib2FyZCUyMGdhbWUlMjBjb3VwbGV8ZW58MXx8fHwxNzU5NjA4MzE5fDA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "Diversão",
      rating: 4.7,
      reviews: 156,
      isPremium: true
    }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isInOrbChat, setIsInOrbChat] = useState(false);
  const [isInCentralConversas, setIsInCentralConversas] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState<number | null>(null);
  const [isInCourseDetail, setIsInCourseDetail] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isInVideoPage, setIsInVideoPage] = useState(false);
  const [isInFavoritesPage, setIsInFavoritesPage] = useState(false);
  const [isInPersonalDashboard, setIsInPersonalDashboard] = useState(false);

  // Load user data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('raio-user-extended');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setUserData(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
  }, []);

  // Save user data to localStorage
  const updateUserData = (updates: Partial<UserData>) => {
    const newUserData = { ...userData, ...updates };
    setUserData(newUserData);
    localStorage.setItem('raio-user-extended', JSON.stringify(newUserData));
  };

  const enrollInCourse = async (courseId: number) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    if (course.isEnrolled) {
      enhancedToast.info({
        title: "Já matriculado",
        description: "Você já tem acesso a este curso",
        haptic: true
      });
      return;
    }

    const res = await api.post<{ alreadyEnrolled: boolean; courseTitle: string }>(`/api/courses/${courseId}/enroll`);
    if (!res.success) {
      if (res.error?.code === "ALREADY_ENROLLED") {
        enhancedToast.info({ title: "Já matriculado", description: "Você já tem acesso a este curso", haptic: true });
      } else {
        enhancedToast.error({
          title: "Erro ao matricular",
          description: res.error?.message || "Tente novamente",
          haptic: true
        });
      }
      return;
    }

    setCourses(prev => prev.map(c =>
      c.id === courseId ? { ...c, isEnrolled: true, progress: 0, completedLessons: 0 } : c
    ));

    enhancedToast.success({
      title: "Matriculado com sucesso!",
      description: `Você agora tem acesso ao curso "${course.title}"`,
      haptic: true
    });
  };

  const startCourse = (courseId: number) => {
  };

  const updateCourseProgress = (courseId: number, progress: number) => {
    setCourses(prev => prev.map(c =>
      c.id === courseId ? {
        ...c,
        progress,
        completedLessons: Math.floor((progress / 100) * c.lessons)
      } : c
    ));
  };

  const completeLessonOnServer = async (lessonId: number) => {
    const res = await api.patch<{
      completedLessons: number;
      totalLessons: number;
      progressPercentage: number;
      courseCompleted: boolean;
    }>(`/api/courses/lessons/${lessonId}/progress`, { status: "completed" });

    if (res.success && res.data) {
      await loadCourses();
      if (res.data.courseCompleted) {
        enhancedToast.achievement({
          title: "Curso concluído!",
          description: "Parabéns! Você completou o curso.",
          haptic: true,
        });
      }
    }
    return res;
  };

  // Post functions
  const likePost = (postId: number) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const newLiked = !post.userReacted;
        return {
          ...post,
          userReacted: newLiked,
          likes: newLiked ? post.likes + 1 : post.likes - 1
        };
      }
      return post;
    }));
  };

  const sharePost = (postId: number) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, shares: post.shares + 1, userShared: true } : post
    ));

    // Post compartilhado silenciosamente
  };

  const createPost = (content: string, category: string, options?: { visibility?: string; images?: string[] }) => {
    const newPost: Post = {
      id: Date.now(),
      author: userData.name,
      avatar: "/placeholder-avatar.jpg",
      time: "Agora",
      content,
      category,
      likes: 0,
      comments: 0,
      shares: 0,
      isPinned: false,
      userReacted: false,
      visibility: (options?.visibility as 'publico' | 'comunidade' | 'amigos') || 'comunidade',
      images: options?.images || []
    };

    setPosts(prev => [newPost, ...prev]);
    
    // Pontos extras por imagens
    const imageBonus = (options?.images?.length || 0) * 10;
    const totalPoints = 50 + imageBonus;
    
    updateUserData({
      points: userData.points + totalPoints
    });

    enhancedToast.success({
      title: "Post publicado! ✨",
      description: `Você ganhou ${totalPoints} pontos${imageBonus > 0 ? ` (+${imageBonus} por imagens)` : ''}`,
      haptic: true
    });
  };

  // Product functions
  const addToCart = (productId: number) => {
    if (userData.cartItems.includes(productId)) return;

    updateUserData({
      cartItems: [...userData.cartItems, productId]
    });

    const product = products.find(p => p.id === productId);
    // Produto adicionado silenciosamente ao carrinho
  };

  const removeFromCart = (productId: number) => {
    updateUserData({
      cartItems: userData.cartItems.filter(id => id !== productId)
    });

    // Item removido silenciosamente do carrinho
  };

  const toggleFavorite = (productId: number) => {
    const isFavorite = userData.favoriteProducts.includes(productId);
    
    updateUserData({
      favoriteProducts: isFavorite 
        ? userData.favoriteProducts.filter(id => id !== productId)
        : [...userData.favoriteProducts, productId]
    });

    // Favorito atualizado silenciosamente
  };

  // Book functions
  const [books, setBooks] = useState<Book[]>(mockBooks);

  const enrollInBook = (bookId: string) => {
    if (userData.enrolledBooks.includes(bookId)) {
      enhancedToast.info({
        title: "Já está na sua biblioteca",
        description: "Este livro já está disponível para você",
      });
      return;
    }

    // Atualizar estado do livro para enrolled
    setBooks(prevBooks => 
      prevBooks.map(book => 
        book.id === bookId ? { ...book, isEnrolled: true } : book
      )
    );

    updateUserData({
      enrolledBooks: [...userData.enrolledBooks, bookId],
      points: userData.points + 20
    });

    const book = books.find(b => b.id === bookId);
    enhancedToast.success({
      title: "📚 Livro adicionado!",
      description: `"${book?.title}" está na sua biblioteca`,
      haptic: true
    });
  };

  const updateBookProgress = (bookId: string, page: number) => {
    setBooks(prevBooks => 
      prevBooks.map(book => {
        if (book.id !== bookId) return book;
        
        const progress = Math.round((page / book.pages) * 100);
        const isCompleted = page >= book.pages;
        
        return {
          ...book,
          currentPage: page,
          progress,
          isCompleted,
          lastRead: new Date()
        };
      })
    );

    // Pontos por progresso
    const book = books.find(b => b.id === bookId);
    if (book && page >= book.pages && !book.isCompleted) {
      updateUserData({
        points: userData.points + 100 // Bonus por completar
      });
      
      enhancedToast.success({
        title: "📖 Livro concluído!",
        description: `Parabéns! Você ganhou 100 pontos`,
        haptic: true
      });
    }
  };

  const toggleBookFavorite = (bookId: string) => {
    setBooks(prevBooks => 
      prevBooks.map(book => 
        book.id === bookId ? { ...book, isFavorite: !book.isFavorite } : book
      )
    );
  };

  const getBookById = (bookId: string): Book | undefined => {
    return books.find(book => book.id === bookId);
  };

  // Advanced Favorites System
  const addToFavorites = (id: number, type: 'course' | 'video' | 'post' | 'product', notes?: string) => {
    const exists = userData.favorites.some(fav => fav.id === id && fav.type === type);
    if (exists) return;

    const newFavorite: FavoriteItem = {
      id,
      type,
      addedAt: new Date(),
      notes
    };

    updateUserData({
      favorites: [...userData.favorites, newFavorite],
      points: userData.points + 10 // Bonus por favoritar
    });

    const typeLabels = {
      course: 'curso',
      video: 'vídeo', 
      post: 'post',
      product: 'produto'
    };

    // Item favoritado silenciosamente
  };

  const removeFromFavorites = (id: number, type: 'course' | 'video' | 'post' | 'product') => {
    updateUserData({
      favorites: userData.favorites.filter(fav => !(fav.id === id && fav.type === type))
    });

    // Item removido silenciosamente dos favoritos
  };

  const isFavorite = (id: number, type: 'course' | 'video' | 'post' | 'product'): boolean => {
    return userData.favorites.some(fav => fav.id === id && fav.type === type);
  };

  const getFavoritesByType = (type?: 'course' | 'video' | 'post' | 'product'): FavoriteItem[] => {
    if (!type) return userData.favorites;
    return userData.favorites.filter(fav => fav.type === type);
  };

  const clearAllFavorites = () => {
    updateUserData({
      favorites: []
    });

    // Favoritos limpos silenciosamente
  };

  // Notification functions
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now(),
      timestamp: new Date()
    };

    updateUserData({
      notifications: [newNotification, ...userData.notifications]
    });
  };

  const markNotificationAsRead = (notificationId: number) => {
    updateUserData({
      notifications: userData.notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    });
  };

  const clearAllNotifications = () => {
    updateUserData({
      notifications: []
    });
  };

  // Search function
  const performSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = [
      ...courses.filter(c => 
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase())
      ).map(c => ({ ...c, type: 'course' })),
      
      ...posts.filter(p => 
        p.content.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      ).map(p => ({ ...p, type: 'post' })),
      
      ...products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      ).map(p => ({ ...p, type: 'product' }))
    ];

    setSearchResults(results);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  // Playlist functions
  const createPlaylist = (playlistData: Omit<Playlist, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>) => {
    const newPlaylist: Playlist = {
      ...playlistData,
      id: Date.now(),
      authorId: userData.name,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setPlaylists(prev => [newPlaylist, ...prev]);
    
    updateUserData({
      playlists: [...userData.playlists, newPlaylist.id],
      points: userData.points + 100 // Bonus points for creating playlist
    });

    enhancedToast.success({
      title: "🎵 Playlist criada!",
      description: `"${playlistData.name}" foi criada com sucesso (+100 pontos)`,
      haptic: true
    });
  };

  const getCourseById = (courseId: number): Course | undefined => {
    return courses.find(course => course.id === courseId);
  };

  // Book Reader Navigation State
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [isInBookDetail, setIsInBookDetail] = useState(false);
  const [isInBookReader, setIsInBookReader] = useState(false);

  return (
    <AppContext.Provider value={{
      userData,
      updateUserData,
      courses,
      books,
      posts,
      products,
      playlists,
      enrollInCourse,
      startCourse,
      updateCourseProgress,
      getCourseById,
      loadCourses,
      completeLessonOnServer,
      enrollInBook,
      updateBookProgress,
      toggleBookFavorite,
      getBookById,
      likePost,
      sharePost,
      createPost,
      addToCart,
      removeFromCart,
      toggleFavorite,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      getFavoritesByType,
      clearAllFavorites,
      createPlaylist,
      addNotification,
      markNotificationAsRead,
      clearAllNotifications,
      searchResults,
      searchQuery,
      performSearch,
      clearSearch,
      isInOrbChat,
      setIsInOrbChat,
      isInCentralConversas,
      setIsInCentralConversas,
      currentCourseId,
      setCurrentCourseId,
      isInCourseDetail,
      setIsInCourseDetail,
      currentVideoId,
      setCurrentVideoId,
      isInVideoPage,
      setIsInVideoPage,
      isInFavoritesPage,
      setIsInFavoritesPage,
      isInPersonalDashboard,
      setIsInPersonalDashboard,
      currentBookId,
      setCurrentBookId,
      isInBookDetail,
      setIsInBookDetail,
      isInBookReader,
      setIsInBookReader
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}