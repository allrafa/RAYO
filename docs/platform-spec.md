# Índice

1. [Arquitetura Geral](#arquitetura-geral)
2. [Sistema de Autenticação](#sistema-de-autenticação)
3. [Onboarding Personalizado](#onboarding-personalizado)
4. [Academia RAIO](#academia-raio)
5. [Sistema de Comunidade](#sistema-de-comunidade)
6. [Gamificação](#gamificação)
7. [Dashboard Personalizado](#dashboard-personalizado)
8. [Sistema de Contextos](#sistema-de-contextos)
9. [Analytics e Tracking](#analytics-e-tracking)
10. [LGPD e Compliance](#lgpd-e-compliance)
11. [Design System](#design-system)
12. [Infraestrutura Técnica](#infraestrutura-técnica)

---

## 1. Arquitetura Geral

### Stack Tecnológica

```
┌─────────────────────────────────────────────┐
│           FRONTEND LAYER                    │
│  React 18 + TypeScript + Tailwind v4       │
├─────────────────────────────────────────────┤
│           ROUTING LAYER                     │
│  React Router v7 (Data Mode)               │
├─────────────────────────────────────────────┤
│           STATE MANAGEMENT                  │
│  React Context + Custom Hooks              │
├─────────────────────────────────────────────┤
│           BACKEND LAYER                     │
│  Supabase (Auth + Database + Storage)      │
├─────────────────────────────────────────────┤
│           ANALYTICS LAYER                   │
│  Mixpanel + GrowthBook                     │
├─────────────────────────────────────────────┤
│           BUILD LAYER                       │
│  Vite 6 + ESBuild                          │
└─────────────────────────────────────────────┘
```

### Estrutura de Diretórios

```
/
├── components/           # Componentes React reutilizáveis
│   ├── layout/          # Layouts (Sidebar, Navbar, BottomBar)
│   ├── ui/              # Componentes UI base (Button, Input, etc)
│   ├── features/        # Features específicas
│   ├── gamification/    # Badges, Missões, Progresso
│   └── community/       # Fóruns, Posts, Comentários
│
├── lib/                 # Utilitários e configurações
│   ├── supabase.ts      # Cliente Supabase
│   ├── mixpanel.ts      # Cliente Mixpanel
│   ├── growthbook.ts    # Cliente GrowthBook
│   └── utils.ts         # Funções auxiliares
│
├── hooks/               # Custom React Hooks
│   ├── useAuth.ts       # Autenticação
│   ├── useProfile.ts    # Perfil do usuário
│   ├── useGamification.ts # Gamificação
│   └── useCourses.ts    # Cursos
│
├── types/               # TypeScript Types
│   ├── database.ts      # Types do Supabase
│   ├── user.ts          # User types
│   └── course.ts        # Course types
│
├── styles/              # Estilos globais
│   └── globals.css      # Tailwind + CSS Variables
│
├── routes/              # Configuração de rotas
│   └── index.tsx        # Router setup
│
└── App.tsx              # Componente principal
```

---

## 2. Sistema de Autenticação

### Tecnologia
- **Supabase Auth**
- Métodos: Email/Senha, Google OAuth, Magic Link

### Fluxo de Autenticação

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

// hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

### Funcionalidades de Auth

#### 1. Cadastro (Sign Up)
```typescript
const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        onboarding_completed: false,
        created_at: new Date().toISOString()
      }
    }
  })
  
  if (!error) {
    // Tracking Mixpanel
    mixpanel.track('User Signed Up', {
      method: 'email',
      timestamp: new Date()
    })
  }
  
  return { data, error }
}
```

#### 2. Login
```typescript
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (!error) {
    mixpanel.track('User Logged In', {
      user_id: data.user.id,
      method: 'email'
    })
  }
  
  return { data, error }
}
```

#### 3. Google OAuth
```typescript
const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  
  return { data, error }
}
```

#### 4. Logout
```typescript
const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  
  if (!error) {
    mixpanel.track('User Logged Out')
    mixpanel.reset() // Limpar dados do usuário
  }
  
  return { error }
}
```

#### 5. Reset de Senha
```typescript
const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  })
  
  return { data, error }
}
```

### Proteção de Rotas

```typescript
// components/ProtectedRoute.tsx
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return <LoadingSpinner />
  }

  return user ? <>{children}</> : null
}
```

### Database Schema (Supabase)

```sql
-- Tabela de perfis (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  life_context TEXT, -- 'single', 'dating', 'engaged', 'married', 'parents'
  goals TEXT[],
  content_preferences TEXT[],
  
  -- Subscription
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'premium'
  subscription_status TEXT DEFAULT 'active',
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

---

## 3. Onboarding Personalizado

### Objetivo
Coletar informações cruciais para personalizar a experiência do usuário desde o início.

### Fluxo de 5 Telas

#### Tela 1: Welcome
```typescript
// components/onboarding/WelcomeScreen.tsx
export function WelcomeScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-off-white">
      <div className="max-w-md text-center px-6">
        <div className="mb-8">
          <Logo size="large" />
        </div>
        
        <h1 className="text-4xl font-bold mb-4">
          Bem-vindo ao RAIO! ⚡
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          Fortaleça sua família através de conteúdo transformador, 
          comunidade engajada e recursos práticos.
        </p>
        
        <Button 
          size="lg" 
          onClick={() => nextStep()}
          className="w-full"
        >
          Começar minha jornada
        </Button>
      </div>
    </div>
  )
}
```

#### Tela 2: Life Context
```typescript
type LifeContext = 'single' | 'dating' | 'engaged' | 'married' | 'parents'

const CONTEXTS = [
  { id: 'single', label: 'Solteiro(a)', icon: '🚶', description: 'Preparação pessoal' },
  { id: 'dating', label: 'Namoro', icon: '💑', description: 'Construindo relacionamento' },
  { id: 'engaged', label: 'Noivos', icon: '💍', description: 'Preparação para casamento' },
  { id: 'married', label: 'Casados', icon: '💑', description: 'Fortalecendo matrimônio' },
  { id: 'parents', label: 'Pais', icon: '👨‍👩‍👧‍👦', description: 'Educando filhos' }
]

export function LifeContextScreen() {
  const [selected, setSelected] = useState<LifeContext | null>(null)
  
  return (
    <div className="onboarding-screen">
      <h2>Qual é o seu contexto atual?</h2>
      <p className="subtitle">Isso nos ajuda a personalizar sua experiência</p>
      
      <div className="grid gap-4 mt-8">
        {CONTEXTS.map(context => (
          <ContextCard
            key={context.id}
            {...context}
            selected={selected === context.id}
            onClick={() => setSelected(context.id as LifeContext)}
          />
        ))}
      </div>
      
      <Button 
        disabled={!selected}
        onClick={() => saveAndNext({ life_context: selected })}
      >
        Continuar
      </Button>
    </div>
  )
}
```

#### Tela 3: Goals
```typescript
const GOALS = [
  { id: 'relationship', label: 'Melhorar relacionamento', icon: '❤️' },
  { id: 'personal_growth', label: 'Crescimento pessoal', icon: '🌱' },
  { id: 'parenting', label: 'Educação dos filhos', icon: '👨‍👩‍👧' },
  { id: 'finance', label: 'Gestão financeira', icon: '💰' },
  { id: 'communication', label: 'Comunicação efetiva', icon: '💬' },
  { id: 'spiritual', label: 'Vida espiritual', icon: '🙏' }
]

export function GoalsScreen() {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  
  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId].slice(0, 3) // Máximo 3
    )
  }
  
  return (
    <div className="onboarding-screen">
      <h2>O que você busca?</h2>
      <p className="subtitle">Selecione até 3 objetivos</p>
      
      <div className="grid grid-cols-2 gap-4 mt-8">
        {GOALS.map(goal => (
          <GoalCard
            key={goal.id}
            {...goal}
            selected={selectedGoals.includes(goal.id)}
            onClick={() => toggleGoal(goal.id)}
          />
        ))}
      </div>
      
      <div className="text-sm text-gray-500 mt-4">
        {selectedGoals.length}/3 selecionados
      </div>
      
      <Button 
        disabled={selectedGoals.length === 0}
        onClick={() => saveAndNext({ goals: selectedGoals })}
      >
        Continuar
      </Button>
    </div>
  )
}
```

#### Tela 4: Content Preferences
```typescript
const CONTENT_TYPES = [
  { id: 'videos', label: 'Vídeos curtos', icon: '🎥' },
  { id: 'articles', label: 'Artigos e textos', icon: '📄' },
  { id: 'podcasts', label: 'Podcasts/Áudio', icon: '🎧' },
  { id: 'exercises', label: 'Exercícios práticos', icon: '✍️' },
  { id: 'community', label: 'Discussões em comunidade', icon: '💬' }
]

export function ContentPreferencesScreen() {
  const [preferences, setPreferences] = useState<string[]>([])
  
  return (
    <div className="onboarding-screen">
      <h2>Como você prefere aprender?</h2>
      <p className="subtitle">Vamos priorizar estes formatos para você</p>
      
      <div className="flex flex-col gap-3 mt-8">
        {CONTENT_TYPES.map(type => (
          <PreferenceCard
            key={type.id}
            {...type}
            selected={preferences.includes(type.id)}
            onClick={() => togglePreference(type.id)}
          />
        ))}
      </div>
      
      <Button onClick={() => saveAndNext({ content_preferences: preferences })}>
        Continuar
      </Button>
    </div>
  )
}
```

#### Tela 5: Notifications
```typescript
export function NotificationsScreen() {
  const [notifications, setNotifications] = useState({
    new_courses: true,
    community_replies: true,
    achievements: true,
    daily_missions: true,
    newsletter: false
  })
  
  const completeOnboarding = async () => {
    // Salvar preferências
    await updateProfile({
      onboarding_completed: true,
      notification_preferences: notifications
    })
    
    // Tracking
    mixpanel.track('Onboarding Completed', {
      life_context: profileData.life_context,
      goals_count: profileData.goals.length,
      preferences_count: profileData.content_preferences.length
    })
    
    // Redirecionar para dashboard
    navigate('/dashboard')
  }
  
  return (
    <div className="onboarding-screen">
      <h2>Fique por dentro! 🔔</h2>
      <p className="subtitle">Configure suas notificações</p>
      
      <div className="flex flex-col gap-4 mt-8">
        <NotificationToggle
          label="Novos cursos disponíveis"
          checked={notifications.new_courses}
          onChange={(checked) => setNotifications(prev => ({
            ...prev,
            new_courses: checked
          }))}
        />
        
        <NotificationToggle
          label="Respostas em discussões"
          checked={notifications.community_replies}
          onChange={(checked) => setNotifications(prev => ({
            ...prev,
            community_replies: checked
          }))}
        />
        
        {/* Outros toggles... */}
      </div>
      
      <Button onClick={completeOnboarding}>
        Começar minha jornada! 🚀
      </Button>
    </div>
  )
}
```

### Salvamento de Dados

```typescript
// hooks/useOnboarding.ts
export function useOnboarding() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState({})
  
  const saveAndNext = async (stepData: any) => {
    // Salvar dados do step atual
    setData(prev => ({ ...prev, ...stepData }))
    
    // Próximo step
    setStep(prev => prev + 1)
    
    // Tracking
    mixpanel.track('Onboarding Step Completed', {
      step_number: step,
      step_name: getStepName(step),
      data: stepData
    })
  }
  
  const updateProfile = async (finalData: any) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...finalData,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    if (error) {
      throw error
    }
  }
  
  return { step, data, saveAndNext, updateProfile }
}
```

---

## 4. Academia RAIO

### Estrutura de Cursos

```sql
-- Tabela de Cursos
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  
  -- Categorização
  life_context TEXT[], -- Contextos aplicáveis
  category TEXT, -- 'relationship', 'personal', 'parenting', 'finance', etc
  tags TEXT[],
  
  -- Conteúdo
  instructor_name TEXT,
  instructor_avatar TEXT,
  total_duration_minutes INTEGER,
  total_lessons INTEGER,
  
  -- Acesso
  access_tier TEXT DEFAULT 'free', -- 'free', 'premium'
  
  -- Engajamento
  rating DECIMAL(2,1),
  total_ratings INTEGER DEFAULT 0,
  total_enrollments INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'published', -- 'draft', 'published', 'archived'
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Módulos
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Aulas
CREATE TABLE course_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  
  -- Conteúdo
  content_type TEXT, -- 'video', 'text', 'audio', 'exercise'
  video_url TEXT,
  video_duration_seconds INTEGER,
  text_content TEXT,
  
  -- Recursos
  has_transcript BOOLEAN DEFAULT FALSE,
  has_exercise BOOLEAN DEFAULT FALSE,
  resources_urls TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Progresso do Usuário
CREATE TABLE user_course_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Progresso
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  
  -- Estatísticas
  progress_percentage INTEGER DEFAULT 0,
  completed_lessons INTEGER DEFAULT 0,
  total_time_spent_minutes INTEGER DEFAULT 0,
  
  -- Certificado
  certificate_issued BOOLEAN DEFAULT FALSE,
  certificate_url TEXT,
  certificate_issued_at TIMESTAMPTZ,
  
  UNIQUE(user_id, course_id)
);

-- Tabela de Progresso por Aula
CREATE TABLE user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  
  -- Status
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_position_seconds INTEGER DEFAULT 0,
  
  -- Engajamento
  time_spent_seconds INTEGER DEFAULT 0,
  replay_count INTEGER DEFAULT 0,
  
  UNIQUE(user_id, lesson_id)
);

-- RLS Policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Todos podem ver cursos publicados
CREATE POLICY "Anyone can view published courses"
  ON courses FOR SELECT
  USING (status = 'published');

-- Usuários só veem seu próprio progresso
CREATE POLICY "Users can view own progress"
  ON user_course_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_course_progress FOR UPDATE
  USING (auth.uid() = user_id);
```

### Componentes da Academia

#### 1. Catálogo de Cursos

```typescript
// components/academy/CourseCatalog.tsx
export function CourseCatalog() {
  const { lifeContext } = useProfile()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('popular')
  
  const { data: courses, loading } = useCourses({
    lifeContext,
    filter,
    sort
  })
  
  return (
    <div className="course-catalog">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Academia RAIO</h1>
        
        <div className="flex gap-4">
          <FilterDropdown value={filter} onChange={setFilter} />
          <SortDropdown value={sort} onChange={setSort} />
        </div>
      </div>
      
      {/* Cursos em Progresso */}
      {userProgress.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            Continue de onde parou
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {userProgress.map(course => (
              <CourseCard key={course.id} {...course} inProgress />
            ))}
          </div>
        </section>
      )}
      
      {/* Recomendações Personalizadas */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">
          Recomendado para você
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.recommended.map(course => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>
      </section>
      
      {/* Todos os Cursos */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Todos os cursos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.all.map(course => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>
      </section>
    </div>
  )
}
```

#### 2. Card de Curso

```typescript
// components/academy/CourseCard.tsx
export function CourseCard({ course, inProgress }: CourseCardProps) {
  const { subscriptionTier } = useProfile()
  const isLocked = course.access_tier === 'premium' && subscriptionTier === 'free'
  
  return (
    <div className="course-card relative">
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <img 
          src={course.thumbnail_url} 
          alt={course.title}
          className="w-full h-full object-cover rounded-t-lg"
        />
        
        {isLocked && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-t-lg">
            <LockIcon className="w-12 h-12 text-yellow-400" />
          </div>
        )}
        
        {inProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200">
            <div 
              className="h-full bg-yellow-400"
              style={{ width: `${course.progress_percentage}%` }}
            />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-500">{course.category}</span>
          {course.access_tier === 'premium' && (
            <Badge variant="premium">Premium</Badge>
          )}
        </div>
        
        <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {course.description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <StarIcon className="w-4 h-4 fill-yellow-400" />
            <span>{course.rating}</span>
            <span>·</span>
            <span>{course.total_lessons} aulas</span>
          </div>
          
          <span>{formatDuration(course.total_duration_minutes)}</span>
        </div>
        
        {inProgress ? (
          <Button className="w-full mt-4" onClick={() => navigateTo(course)}>
            Continuar
          </Button>
        ) : (
          <Button 
            className="w-full mt-4"
            variant={isLocked ? 'outline' : 'default'}
            onClick={() => isLocked ? showUpgradeModal() : enrollInCourse(course)}
          >
            {isLocked ? (
              <>
                <LockIcon className="w-4 h-4 mr-2" />
                Fazer upgrade
              </>
            ) : (
              'Começar curso'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
```

#### 3. Player de Curso

```typescript
// components/academy/CoursePlayer.tsx
export function CoursePlayer({ courseId }: CoursePlayerProps) {
  const { course, modules, loading } = useCourse(courseId)
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const handleLessonComplete = async () => {
    await markLessonComplete(currentLesson.id)
    
    // Tracking
    mixpanel.track('Lesson Completed', {
      course_id: courseId,
      lesson_id: currentLesson.id,
      lesson_title: currentLesson.title
    })
    
    // Gamificação
    await addXP(10)
    
    // Próxima aula
    const nextLesson = getNextLesson()
    if (nextLesson) {
      setCurrentLesson(nextLesson)
    } else {
      // Curso completo!
      await completeCourse()
    }
  }
  
  return (
    <div className="course-player flex h-screen">
      {/* Video Player */}
      <div className="flex-1 bg-black">
        <video
          ref={videoRef}
          src={currentLesson?.video_url}
          controls
          className="w-full h-full"
          onEnded={handleLessonComplete}
          onTimeUpdate={saveProgress}
        />
        
        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-between text-white">
            <h2 className="text-xl font-semibold">
              {currentLesson?.title}
            </h2>
            
            <div className="flex gap-2">
              <Button variant="ghost" onClick={toggleTranscript}>
                <SubtitlesIcon />
              </Button>
              <Button variant="ghost" onClick={downloadResources}>
                <DownloadIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar - Lista de Aulas */}
      {sidebarOpen && (
        <div className="w-96 bg-white border-l overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg">{course?.title}</h3>
            <ProgressBar value={course?.progress_percentage} />
          </div>
          
          {modules?.map(module => (
            <div key={module.id} className="border-b">
              <div className="p-4 bg-gray-50">
                <h4 className="font-semibold">{module.title}</h4>
              </div>
              
              {module.lessons.map((lesson, idx) => (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  number={idx + 1}
                  active={currentLesson?.id === lesson.id}
                  completed={lesson.completed}
                  onClick={() => setCurrentLesson(lesson)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### 4. Sistema de Certificados

```typescript
// hooks/useCertificate.ts
export function useCertificate(courseId: string) {
  const generateCertificate = async () => {
    // Verificar se curso foi completado
    const { data: progress } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .single()
    
    if (progress.progress_percentage < 100) {
      throw new Error('Course not completed')
    }
    
    // Gerar certificado (PDF via API)
    const certificateData = {
      user_name: profile.full_name,
      course_title: course.title,
      completion_date: new Date(),
      certificate_id: generateUniqueId(),
      instructor_name: course.instructor_name
    }
    
    const pdfUrl = await generateCertificatePDF(certificateData)
    
    // Salvar no Supabase Storage
    const { data: uploadData } = await supabase.storage
      .from('certificates')
      .upload(`${user.id}/${courseId}.pdf`, pdfBlob)
    
    // Atualizar progresso
    await supabase
      .from('user_course_progress')
      .update({
        certificate_issued: true,
        certificate_url: uploadData.path,
        certificate_issued_at: new Date()
      })
      .eq('course_id', courseId)
      .eq('user_id', user.id)
    
    // Gamificação
    await unlockBadge('first_certificate')
    await addXP(100)
    
    // Tracking
    mixpanel.track('Certificate Issued', {
      course_id: courseId,
      course_title: course.title
    })
    
    return uploadData.path
  }
  
  return { generateCertificate }
}
```

---

## 5. Sistema de Comunidade

### Database Schema

```sql
-- Tabela de Fóruns
CREATE TABLE forums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  
  -- Categorização
  life_context TEXT, -- 'single', 'dating', etc
  icon TEXT,
  color TEXT,
  
  -- Acesso
  access_tier TEXT DEFAULT 'free', -- 'free', 'premium'
  
  -- Estatísticas
  total_posts INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conteúdo
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Flags
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  is_reported BOOLEAN DEFAULT FALSE,
  
  -- Estatísticas
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Comentários
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Conteúdo
  content TEXT NOT NULL,
  
  -- Flags
  is_helpful BOOLEAN DEFAULT FALSE,
  is_reported BOOLEAN DEFAULT FALSE,
  
  -- Estatísticas
  likes_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Likes
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, user_id)
);

CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(comment_id, user_id)
);

-- Tabela de Restrições (Free Tier)
CREATE TABLE user_community_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Limites semanais (Free tier)
  posts_this_week INTEGER DEFAULT 0,
  comments_this_week INTEGER DEFAULT 0,
  week_start_date DATE,
  
  UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Todos podem ver posts
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  USING (true);

-- Usuários podem criar posts (com limite)
CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem editar seus próprios posts
CREATE POLICY "Users can edit own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);
```

### Componentes da Comunidade

#### 1. Lista de Fóruns

```typescript
// components/community/ForumList.tsx
export function ForumList() {
  const { lifeContext, subscriptionTier } = useProfile()
  const { data: forums } = useForums()
  
  return (
    <div className="forum-list">
      <h1 className="text-3xl font-bold mb-6">Comunidade RAIO</h1>
      
      {/* Fórum Principal */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Discussões Gerais</h2>
        <div className="grid gap-4">
          {forums.general.map(forum => (
            <ForumCard key={forum.id} forum={forum} />
          ))}
        </div>
      </section>
      
      {/* Fórum do Seu Contexto */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Seu Contexto: {getContextLabel(lifeContext)}
        </h2>
        <div className="grid gap-4">
          {forums.contextSpecific.map(forum => (
            <ForumCard key={forum.id} forum={forum} />
          ))}
        </div>
      </section>
      
      {/* Fóruns Premium */}
      {subscriptionTier === 'premium' && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-2xl font-semibold">Grupos Exclusivos</h2>
            <Badge variant="premium">Premium</Badge>
          </div>
          <div className="grid gap-4">
            {forums.premium.map(forum => (
              <ForumCard key={forum.id} forum={forum} premium />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

#### 2. Feed de Posts

```typescript
// components/community/PostFeed.tsx
export function PostFeed({ forumId }: { forumId: string }) {
  const { subscriptionTier } = useProfile()
  const { posts, loading } = usePosts(forumId)
  const { canPost, remainingPosts } = usePostLimits()
  
  return (
    <div className="post-feed">
      {/* Create Post */}
      {canPost ? (
        <CreatePostCard forumId={forumId} />
      ) : (
        <LimitReachedCard 
          message={`Você atingiu o limite de ${remainingPosts} posts por semana (Free)`}
          upgradeAction={() => navigate('/premium')}
        />
      )}
      
      {/* Sorting */}
      <div className="flex gap-2 mb-6">
        <SortButton active value="recent">Recentes</SortButton>
        <SortButton value="popular">Populares</SortButton>
        <SortButton value="trending">Em Alta</SortButton>
      </div>
      
      {/* Posts */}
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      
      {/* Load More */}
      <Button variant="outline" className="w-full mt-6">
        Carregar mais
      </Button>
    </div>
  )
}
```

#### 3. Card de Post

```typescript
// components/community/PostCard.tsx
export function PostCard({ post }: { post: Post }) {
  const { hasLiked, toggleLike } = usePostLike(post.id)
  
  return (
    <div className="post-card border rounded-lg p-6 hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar src={post.author.avatar_url} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{post.author.full_name}</span>
              {post.author.subscription_tier === 'premium' && (
                <Badge variant="premium" size="sm">Premium</Badge>
              )}
              {post.author.badges?.includes('community_leader') && (
                <BadgeIcon name="community_leader" size="sm" />
              )}
            </div>
            <span className="text-sm text-gray-500">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
        </div>
        
        {post.is_pinned && (
          <PinIcon className="text-yellow-400" />
        )}
      </div>
      
      {/* Content */}
      <Link to={`/community/post/${post.id}`}>
        <h3 className="text-lg font-semibold mb-2 hover:text-yellow-600">
          {post.title}
        </h3>
        <p className="text-gray-700 line-clamp-3 mb-4">
          {post.content}
        </p>
      </Link>
      
      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-6">
          <button 
            className={cn(
              "flex items-center gap-2 hover:text-yellow-600",
              hasLiked && "text-yellow-600"
            )}
            onClick={toggleLike}
          >
            <HeartIcon className={hasLiked ? "fill-current" : ""} />
            <span>{post.likes_count}</span>
          </button>
          
          <div className="flex items-center gap-2">
            <CommentIcon />
            <span>{post.comments_count}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <EyeIcon />
            <span>{post.views_count}</span>
          </div>
        </div>
        
        <Button variant="ghost" size="sm">
          Compartilhar
        </Button>
      </div>
    </div>
  )
}
```

#### 4. Thread de Comentários

```typescript
// components/community/CommentThread.tsx
export function CommentThread({ postId }: { postId: string }) {
  const { comments, loading } = useComments(postId)
  const { canComment, remainingComments } = useCommentLimits()
  
  return (
    <div className="comment-thread">
      <h3 className="text-xl font-semibold mb-4">
        {comments.length} Comentários
      </h3>
      
      {/* Create Comment */}
      {canComment ? (
        <CreateCommentBox postId={postId} />
      ) : (
        <LimitReachedCard 
          message="Limite de comentários atingido (Free)"
          upgradeAction={() => navigate('/premium')}
        />
      )}
      
      {/* Comments */}
      <div className="space-y-6 mt-6">
        {comments.map(comment => (
          <Comment 
            key={comment.id} 
            comment={comment}
            onReply={(commentId) => openReplyBox(commentId)}
          />
        ))}
      </div>
    </div>
  )
}

function Comment({ comment, onReply }: CommentProps) {
  const { hasLiked, toggleLike } = useCommentLike(comment.id)
  
  return (
    <div className="comment">
      <div className="flex gap-3">
        <Avatar src={comment.author.avatar_url} size="sm" />
        
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-sm">
                {comment.author.full_name}
              </span>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(comment.created_at)}
              </span>
              {comment.is_helpful && (
                <Badge variant="success" size="sm">Útil</Badge>
              )}
            </div>
            
            <p className="text-sm">{comment.content}</p>
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <button 
              className="hover:text-yellow-600"
              onClick={toggleLike}
            >
              {hasLiked ? '❤️' : '🤍'} {comment.likes_count}
            </button>
            
            <button 
              className="hover:text-yellow-600"
              onClick={() => onReply(comment.id)}
            >
              Responder
            </button>
            
            {comment.user_id === currentUser.id && (
              <>
                <button className="hover:text-yellow-600">Editar</button>
                <button className="hover:text-red-600">Excluir</button>
              </>
            )}
          </div>
          
          {/* Nested Replies */}
          {comment.replies?.length > 0 && (
            <div className="mt-4 space-y-4 ml-6 border-l-2 pl-4">
              {comment.replies.map(reply => (
                <Comment key={reply.id} comment={reply} onReply={onReply} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 6. Gamificação

### Database Schema

```sql
-- Tabela de Badges
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  tier TEXT, -- 'bronze', 'silver', 'gold', 'platinum', 'premium'
  
  -- Critérios
  criteria_type TEXT, -- 'course_complete', 'streak', 'community', etc
  criteria_value INTEGER,
  
  -- Estatísticas
  total_awarded INTEGER DEFAULT 0,
  rarity_percentage DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Badges do Usuário
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  is_displayed BOOLEAN DEFAULT FALSE, -- Se está no perfil
  
  UNIQUE(user_id, badge_id)
);

-- Tabela de XP do Usuário
CREATE TABLE user_xp (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  
  -- XP
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  xp_to_next_level INTEGER DEFAULT 100,
  
  -- Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Missões
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT, -- 'daily', 'weekly', 'monthly', 'special'
  
  -- Critérios
  action_type TEXT, -- 'watch_lesson', 'complete_course', 'post_comment', etc
  action_count INTEGER DEFAULT 1,
  
  -- Recompensas
  xp_reward INTEGER,
  badge_reward UUID REFERENCES badges(id),
  
  -- Validade
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Progresso de Missões
CREATE TABLE user_mission_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  
  -- Progresso
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- Recompensa
  reward_claimed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, mission_id)
);

-- RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mission_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own XP"
  ON user_xp FOR SELECT
  USING (auth.uid() = user_id);
```

### Sistema de XP e Níveis

```typescript
// lib/gamification.ts
const XP_LEVELS = [
  { level: 1, xp: 0, title: 'Iniciante' },
  { level: 2, xp: 100, title: 'Aprendiz' },
  { level: 3, xp: 250, title: 'Praticante' },
  { level: 4, xp: 500, title: 'Experiente' },
  { level: 5, xp: 1000, title: 'Mestre' },
  { level: 6, xp: 2000, title: 'Mentor' },
  { level: 7, xp: 5000, title: 'Líder' },
]

const XP_REWARDS = {
  // Academia
  watch_lesson: 10,
  complete_exercise: 15,
  complete_course: 50,
  get_certificate: 100,
  
  // Comunidade
  create_post: 20,
  create_comment: 10,
  receive_like: 5,
  helpful_comment: 30,
  
  // Missões
  daily_mission: 25,
  weekly_mission: 100,
  monthly_mission: 500,
  
  // Streaks
  streak_day: 5,
  streak_week: 50,
  streak_month: 200,
}

export async function addXP(userId: string, amount: number, reason: string) {
  // Buscar XP atual
  const { data: userXP } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  const newTotalXP = userXP.total_xp + amount
  const newLevel = calculateLevel(newTotalXP)
  const leveledUp = newLevel > userXP.current_level
  
  // Atualizar XP
  await supabase
    .from('user_xp')
    .update({
      total_xp: newTotalXP,
      current_level: newLevel,
      xp_to_next_level: getXPToNextLevel(newLevel),
      updated_at: new Date()
    })
    .eq('user_id', userId)
  
  // Se subiu de nível
  if (leveledUp) {
    await handleLevelUp(userId, newLevel)
  }
  
  // Tracking
  mixpanel.track('XP Earned', {
    user_id: userId,
    amount,
    reason,
    new_total: newTotalXP,
    new_level: newLevel,
    leveled_up: leveledUp
  })
  
  return { newTotalXP, newLevel, leveledUp }
}

function calculateLevel(totalXP: number): number {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= XP_LEVELS[i].xp) {
      return XP_LEVELS[i].level
    }
  }
  return 1
}

async function handleLevelUp(userId: string, newLevel: number) {
  // Notificação
  await createNotification(userId, {
    type: 'level_up',
    title: `Parabéns! Você atingiu o nível ${newLevel}!`,
    message: `Você agora é um ${XP_LEVELS[newLevel - 1].title}!`,
    icon: '🎉'
  })
  
  // Badge de nível (se aplicável)
  if ([3, 5, 7].includes(newLevel)) {
    await unlockBadge(userId, `level_${newLevel}`)
  }
  
  // Tracking
  mixpanel.track('Level Up', {
    user_id: userId,
    new_level: newLevel
  })
}
```

### Sistema de Badges

```typescript
// hooks/useBadges.ts
export function useBadges() {
  const { user } = useAuth()
  
  const unlockBadge = async (badgeName: string) => {
    // Verificar se já possui
    const { data: existing } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', user.id)
      .eq('badge_id', (await getBadgeByName(badgeName)).id)
      .single()
    
    if (existing) return // Já possui
    
    // Desbloquear badge
    const { data: badge } = await getBadgeByName(badgeName)
    
    await supabase
      .from('user_badges')
      .insert({
        user_id: user.id,
        badge_id: badge.id,
        earned_at: new Date()
      })
    
    // Notificação
    await createNotification(user.id, {
      type: 'badge_unlocked',
      title: 'Nova conquista desbloqueada!',
      message: `Você ganhou: ${badge.title}`,
      icon: badge.icon,
      badge_id: badge.id
    })
    
    // Tracking
    mixpanel.track('Badge Unlocked', {
      badge_name: badgeName,
      badge_title: badge.title,
      badge_tier: badge.tier
    })
  }
  
  return { unlockBadge }
}

// Lista de Badges
const BADGES = [
  // Início
  { name: 'newcomer', title: 'Bem-vindo', icon: '👋', tier: 'bronze', criteria: 'Completou onboarding' },
  { name: 'first_lesson', title: 'Primeira Aula', icon: '📚', tier: 'bronze', criteria: 'Assistiu primeira aula' },
  
  // Academia
  { name: 'first_course', title: 'Primeira Conquista', icon: '🎓', tier: 'silver', criteria: 'Completou primeiro curso' },
  { name: 'courses_5', title: 'Dedicado', icon: '📖', tier: 'gold', criteria: 'Completou 5 cursos' },
  { name: 'courses_10', title: 'Master Graduate', icon: '👨‍🎓', tier: 'platinum', criteria: 'Completou 10 cursos' },
  { name: 'first_certificate', title: 'Certificado', icon: '📜', tier: 'gold', criteria: 'Primeiro certificado' },
  
  // Comunidade
  { name: 'first_post', title: 'Primeira Participação', icon: '💬', tier: 'bronze', criteria: 'Primeiro post' },
  { name: 'helpful_member', title: 'Membro Útil', icon: '⭐', tier: 'silver', criteria: '10 comentários úteis' },
  { name: 'community_leader', title: 'Líder Comunitário', icon: '👑', tier: 'platinum', criteria: 'Top 10% em engajamento' },
  
  // Streaks
  { name: 'streak_7', title: 'Comprometido', icon: '🔥', tier: 'silver', criteria: '7 dias consecutivos' },
  { name: 'streak_30', title: 'Disciplinado', icon: '⚡', tier: 'gold', criteria: '30 dias consecutivos' },
  { name: 'streak_90', title: 'Imparável', icon: '💪', tier: 'platinum', criteria: '90 dias consecutivos' },
  
  // Premium
  { name: 'premium_member', title: 'Premium Member', icon: '💎', tier: 'premium', criteria: 'Assinatura Premium' },
  { name: 'loyal_champion', title: 'Loyal Champion', icon: '🏆', tier: 'premium', criteria: '6 meses Premium' },
  { name: 'elite_founder', title: 'Elite Founder', icon: '👑', tier: 'premium', criteria: '12 meses Premium' },
  
  // Referral
  { name: 'referral_1', title: 'Convidou um Amigo', icon: '🤝', tier: 'bronze', criteria: '1 referral' },
  { name: 'referral_5', title: 'Embaixador', icon: '🌟', tier: 'gold', criteria: '5 referrals' },
]
```

### Sistema de Missões

```typescript
// components/gamification/MissionsPanel.tsx
export function MissionsPanel() {
  const { missions, loading } = useMissions()
  const [filter, setFilter] = useState<'daily' | 'weekly' | 'all'>('daily')
  
  const filteredMissions = missions.filter(m => 
    filter === 'all' ? true : m.type === filter
  )
  
  return (
    <div className="missions-panel">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Missões</h2>
        
        <div className="flex gap-2">
          <Button 
            variant={filter === 'daily' ? 'default' : 'outline'}
            onClick={() => setFilter('daily')}
          >
            Diárias
          </Button>
          <Button 
            variant={filter === 'weekly' ? 'default' : 'outline'}
            onClick={() => setFilter('weekly')}
          >
            Semanais
          </Button>
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredMissions.map(mission => (
          <MissionCard key={mission.id} mission={mission} />
        ))}
      </div>
    </div>
  )
}

function MissionCard({ mission }: { mission: Mission }) {
  const progress = mission.current_progress / mission.target_progress * 100
  
  return (
    <div className="mission-card border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{mission.title}</h3>
            <Badge variant={mission.type === 'daily' ? 'default' : 'secondary'}>
              {mission.type === 'daily' ? 'Diária' : 'Semanal'}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{mission.description}</p>
        </div>
        
        <div className="text-right">
          <div className="text-yellow-600 font-semibold">
            +{mission.xp_reward} XP
          </div>
          {mission.completed && (
            <CheckIcon className="w-5 h-5 text-green-500 mt-1" />
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Progresso</span>
          <span>{mission.current_progress}/{mission.target_progress}</span>
        </div>
        
        <ProgressBar value={progress} />
      </div>
      
      {mission.completed && !mission.reward_claimed && (
        <Button 
          className="w-full mt-3"
          onClick={() => claimReward(mission.id)}
        >
          Resgatar Recompensa
        </Button>
      )}
    </div>
  )
}
```

### Sistema de Streaks

```typescript
// lib/streaks.ts
export async function updateStreak(userId: string) {
  const { data: userXP } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  const today = new Date().toISOString().split('T')[0]
  const lastActivity = userXP.last_activity_date
  
  // Calcular diferença de dias
  const daysDiff = lastActivity 
    ? differenceInDays(new Date(today), new Date(lastActivity))
    : 999
  
  let newStreak = userXP.current_streak
  let streakBroken = false
  
  if (daysDiff === 0) {
    // Mesmo dia, não faz nada
    return
  } else if (daysDiff === 1) {
    // Dia consecutivo, incrementa streak
    newStreak++
    await addXP(userId, XP_REWARDS.streak_day, 'Streak day')
  } else {
    // Streak quebrado
    newStreak = 1
    streakBroken = true
  }
  
  // Atualizar
  await supabase
    .from('user_xp')
    .update({
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, userXP.longest_streak),
      last_activity_date: today
    })
    .eq('user_id', userId)
  
  // Verificar marcos de streak
  if ([7, 30, 60, 90].includes(newStreak)) {
    await unlockBadge(userId, `streak_${newStreak}`)
  }
  
  // Notificação de streak quebrado
  if (streakBroken && userXP.current_streak > 7) {
    await createNotification(userId, {
      type: 'streak_broken',
      title: 'Seu streak foi quebrado',
      message: `Você tinha um streak de ${userXP.current_streak} dias. Comece novamente!`,
      icon: '💔'
    })
  }
  
  // Tracking
  mixpanel.track('Streak Updated', {
    user_id: userId,
    new_streak: newStreak,
    streak_broken: streakBroken
  })
}
```

---

## 7. Dashboard Personalizado

### Componente Principal

```typescript
// components/dashboard/Dashboard.tsx
export function Dashboard() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { xp, level, streak } = useGamification()
  const { missions } = useMissions()
  const { coursesInProgress } = useCourses()
  const { recentPosts } = useCommunityActivity()
  
  return (
    <div className="dashboard p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Olá, {profile.full_name}! 👋
        </h1>
        <p className="text-gray-600">
          Pronto para continuar sua jornada de transformação?
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon="🔥"
              label="Streak"
              value={`${streak} dias`}
              trend="+2 vs semana passada"
            />
            <StatCard
              icon="⚡"
              label="Nível"
              value={level}
              sublabel={`${xp.current_xp_percentage}% para próximo`}
            />
            <StatCard
              icon="🎯"
              label="Progresso Semanal"
              value="75%"
              trend="3 de 4 metas"
            />
          </div>
          
          {/* Continue Assistindo */}
          {coursesInProgress.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                Continue de onde parou
              </h2>
              <div className="space-y-4">
                {coursesInProgress.map(course => (
                  <CourseProgressCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          )}
          
          {/* Recomendações */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              Recomendado para você
            </h2>
            <RecommendedCourses lifeContext={profile.life_context} goals={profile.goals} />
          </section>
          
          {/* Atividade da Comunidade */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              Discussões ativas
            </h2>
            <div className="space-y-3">
              {recentPosts.map(post => (
                <PostPreviewCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Perfil Card */}
          <ProfileCard profile={profile} xp={xp} />
          
          {/* Missões do Dia */}
          <section>
            <h3 className="text-xl font-semibold mb-3">
              Missões de hoje
            </h3>
            <div className="space-y-3">
              {missions.daily.map(mission => (
                <MissionCard key={mission.id} mission={mission} compact />
              ))}
            </div>
          </section>
          
          {/* Badges Recentes */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold">Conquistas</h3>
              <Link to="/profile/badges" className="text-sm text-yellow-600">
                Ver todas
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {profile.recent_badges.map(badge => (
                <BadgeIcon key={badge.id} badge={badge} size="lg" />
              ))}
            </div>
          </section>
          
          {/* CTA Premium */}
          {profile.subscription_tier === 'free' && (
            <UpgradeToPremiumCard />
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 8. Sistema de Contextos

### Personalização por Contexto

```typescript
// lib/contexts.ts
export const LIFE_CONTEXTS = {
  single: {
    id: 'single',
    label: 'Solteiro(a)',
    icon: '🚶',
    color: '#3B82F6',
    description: 'Preparação pessoal e desenvolvimento individual',
    
    recommendedCourses: [
      'autoconhecimento',
      'valores-pessoais',
      'preparacao-relacionamento',
      'gestao-financeira-pessoal'
    ],
    
    forumId: 'forum_single',
    
    dashboardConfig: {
      primaryGoal: 'Crescimento pessoal',
      suggestedActions: [
        'Complete o curso de autoconhecimento',
        'Defina seus valores pessoais',
        'Prepare-se para relacionamentos saudáveis'
      ]
    }
  },
  
  dating: {
    id: 'dating',
    label: 'Namoro',
    icon: '💑',
    color: '#EC4899',
    description: 'Construindo relacionamento saudável',
    
    recommendedCourses: [
      'comunicacao-namoro',
      'resolucao-conflitos',
      'limites-saudaveis',
      'prepara cao-futuro'
    ],
    
    forumId: 'forum_dating',
    
    dashboardConfig: {
      primaryGoal: 'Fortalecer relacionamento',
      suggestedActions: [
        'Melhore sua comunicação',
        'Aprenda a resolver conflitos',
        'Defina limites saudáveis juntos'
      ]
    }
  },
  
  engaged: {
    id: 'engaged',
    label: 'Noivos',
    icon: '💍',
    color: '#8B5CF6',
    description: 'Preparação para o casamento',
    
    recommendedCourses: [
      'preparacao-casamento',
      'gestao-financeira-casal',
      'expectativas-realistas',
      'primeiros-anos'
    ],
    
    forumId: 'forum_engaged',
    
    dashboardConfig: {
      primaryGoal: 'Preparar para casamento',
      suggestedActions: [
        'Alinhe expectativas',
        'Planeje finanças juntos',
        'Prepare-se para os primeiros anos'
      ]
    }
  },
  
  married: {
    id: 'married',
    label: 'Casados',
    icon: '💑',
    color: '#EF4444',
    description: 'Fortalecimento do matrimônio',
    
    recommendedCourses: [
      'comunicacao-casamento',
      'intimidade-emocional',
      'gestao-conflitos-matrimonio',
      'renovacao-votos'
    ],
    
    forumId: 'forum_married',
    
    dashboardConfig: {
      primaryGoal: 'Fortalecer matrimônio',
      suggestedActions: [
        'Invista em intimidade emocional',
        'Melhore a comunicação',
        'Renovem seus votos'
      ]
    }
  },
  
  parents: {
    id: 'parents',
    label: 'Pais',
    icon: '👨‍👩‍👧‍👦',
    color: '#10B981',
    description: 'Educação de filhos e família',
    
    recommendedCourses: [
      'educacao-filhos',
      'disciplina-positiva',
      'desenvolvimento-infantil',
      'equilibrio-familiar'
    ],
    
    forumId: 'forum_parents',
    
    dashboardConfig: {
      primaryGoal: 'Educar filhos com excelência',
      suggestedActions: [
        'Aprenda sobre desenvolvimento infantil',
        'Pratique disciplina positiva',
        'Equilibre vida familiar e pessoal'
      ]
    }
  }
}

// Hook para usar contexto
export function useLifeContext() {
  const { profile } = useProfile()
  const context = LIFE_CONTEXTS[profile.life_context]
  
  return {
    context,
    config: context.dashboardConfig,
    recommendedCourses: context.recommendedCourses,
    forumId: context.forumId
  }
}
```

---

## 9. Analytics e Tracking

### Mixpanel Integration

```typescript
// lib/mixpanel.ts
import mixpanel from 'mixpanel-browser'

mixpanel.init(process.env.VITE_MIXPANEL_TOKEN!, {
  debug: process.env.NODE_ENV === 'development',
  track_pageview: true,
  persistence: 'localStorage'
})

export const analytics = {
  // Identificar usuário
  identify(userId: string, traits?: any) {
    mixpanel.identify(userId)
    if (traits) {
      mixpanel.people.set(traits)
    }
  },
  
  // Tracking de eventos
  track(eventName: string, properties?: any) {
    mixpanel.track(eventName, {
      ...properties,
      timestamp: new Date(),
      platform: 'web'
    })
  },
  
  // Pageviews
  page(pageName: string, properties?: any) {
    mixpanel.track('Page Viewed', {
      page_name: pageName,
      ...properties
    })
  },
  
  // Reset (logout)
  reset() {
    mixpanel.reset()
  }
}

// Eventos principais
export const AnalyticsEvents = {
  // Auth
  USER_SIGNED_UP: 'User Signed Up',
  USER_LOGGED_IN: 'User Logged In',
  USER_LOGGED_OUT: 'User Logged Out',
  
  // Onboarding
  ONBOARDING_STARTED: 'Onboarding Started',
  ONBOARDING_STEP_COMPLETED: 'Onboarding Step Completed',
  ONBOARDING_COMPLETED: 'Onboarding Completed',
  
  // Academia
  COURSE_VIEWED: 'Course Viewed',
  COURSE_ENROLLED: 'Course Enrolled',
  LESSON_STARTED: 'Lesson Started',
  LESSON_COMPLETED: 'Lesson Completed',
  COURSE_COMPLETED: 'Course Completed',
  CERTIFICATE_ISSUED: 'Certificate Issued',
  
  // Comunidade
  POST_CREATED: 'Post Created',
  POST_LIKED: 'Post Liked',
  COMMENT_CREATED: 'Comment Created',
  COMMENT_LIKED: 'Comment Liked',
  
  // Gamificação
  XP_EARNED: 'XP Earned',
  LEVEL_UP: 'Level Up',
  BADGE_UNLOCKED: 'Badge Unlocked',
  MISSION_COMPLETED: 'Mission Completed',
  STREAK_UPDATED: 'Streak Updated',
  
  // Premium
  UPGRADE_VIEWED: 'Upgrade Page Viewed',
  PLAN_SELECTED: 'Plan Selected',
  CHECKOUT_STARTED: 'Checkout Started',
  SUBSCRIPTION_CREATED: 'Subscription Created',
  SUBSCRIPTION_CANCELLED: 'Subscription Cancelled',
  
  // Referral
  REFERRAL_LINK_SHARED: 'Referral Link Shared',
  REFERRAL_SIGNUP: 'Referral Signup'
}
```

### GrowthBook Integration

```typescript
// lib/growthbook.ts
import { GrowthBook } from '@growthbook/growthbook-react'

export const gb = new GrowthBook({
  apiHost: "https://cdn.growthbook.io",
  clientKey: process.env.VITE_GROWTHBOOK_CLIENT_KEY!,
  enableDevMode: process.env.NODE_ENV === 'development',
  trackingCallback: (experiment, result) => {
    // Track no Mixpanel
    analytics.track('Experiment Viewed', {
      experiment_id: experiment.key,
      variant_id: result.key
    })
  }
})

// Feature Flags
export const FeatureFlags = {
  NEW_DASHBOARD: 'new-dashboard',
  ENHANCED_GAMIFICATION: 'enhanced-gamification',
  AI_RECOMMENDATIONS: 'ai-recommendations',
  SOCIAL_SHARING: 'social-sharing',
  MOBILE_APP_BANNER: 'mobile-app-banner'
}

// Hook para usar feature flags
export function useFeature(featureKey: string) {
  const isEnabled = gb.isOn(featureKey)
  const value = gb.getFeatureValue(featureKey, null)
  
  return { isEnabled, value }
}
```

---

## 10. LGPD e Compliance

### Sistema de Consentimento

```typescript
// components/compliance/CookieConsent.tsx
export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true, // Sempre true
    analytics: false,
    marketing: false
  })
  
  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      setShowBanner(true)
    } else {
      const saved = JSON.parse(consent)
      setPreferences(saved)
      initializeTracking(saved)
    }
  }, [])
  
  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true
    }
    saveConsent(allAccepted)
  }
  
  const acceptSelected = () => {
    saveConsent(preferences)
  }
  
  const saveConsent = (prefs: any) => {
    localStorage.setItem('cookie_consent', JSON.stringify(prefs))
    localStorage.setItem('cookie_consent_date', new Date().toISOString())
    
    initializeTracking(prefs)
    setShowBanner(false)
    
    // Track consentimento
    if (prefs.analytics) {
      analytics.track('Cookie Consent Given', { preferences: prefs })
    }
  }
  
  const initializeTracking = (prefs: any) => {
    if (prefs.analytics) {
      // Inicializar Mixpanel
      mixpanel.opt_in_tracking()
    } else {
      mixpanel.opt_out_tracking()
    }
  }
  
  if (!showBanner) return null
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-6 z-50">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-lg font-semibold mb-2">
          Privacidade e Cookies 🍪
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Usamos cookies e tecnologias semelhantes para melhorar sua experiência, 
          personalizar conteúdo e analisar nosso tráfego. Seus dados são tratados 
          de acordo com a LGPD.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked disabled />
              <span>Cookies necessários (obrigatório)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={preferences.analytics}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  analytics: e.target.checked
                }))}
              />
              <span>Cookies analíticos</span>
            </label>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={acceptSelected}>
              Salvar preferências
            </Button>
            <Button onClick={acceptAll}>
              Aceitar todos
            </Button>
          </div>
        </div>
        
        <Link 
          to="/privacy" 
          className="text-xs text-yellow-600 hover:underline mt-2 inline-block"
        >
          Ler Política de Privacidade
        </Link>
      </div>
    </div>
  )
}
```

### Database - Dados Pessoais

```sql
-- Tabela de Requisições LGPD
CREATE TABLE lgpd_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo de requisição
  request_type TEXT, -- 'data_export', 'data_deletion', 'data_correction'
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
  
  -- Dados
  request_data JSONB,
  response_data JSONB,
  
  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Processamento
  processed_by UUID,
  notes TEXT
);

-- Função para anonimizar usuário (LGPD - Direito ao Esquecimento)
CREATE OR REPLACE FUNCTION anonymize_user(user_id_to_anonymize UUID)
RETURNS VOID AS $$
BEGIN
  -- Anonimizar perfil
  UPDATE profiles
  SET
    email = CONCAT('deleted_', user_id_to_anonymize, '@anonymized.local'),
    full_name = 'Usuário Removido',
    avatar_url = NULL,
    onboarding_completed = FALSE,
    life_context = NULL,
    goals = NULL,
    content_preferences = NULL
  WHERE id = user_id_to_anonymize;
  
  -- Anonimizar posts
  UPDATE posts
  SET content = '[Conteúdo removido pelo usuário]'
  WHERE user_id = user_id_to_anonymize;
  
  -- Anonimizar comentários
  UPDATE comments
  SET content = '[Comentário removido pelo usuário]'
  WHERE user_id = user_id_to_anonymize;
  
  -- Manter dados agregados (sem PII)
  -- user_course_progress, user_xp, etc permanecem para analytics
END;
$$ LANGUAGE plpgsql;
```

---

## 11. Design System

### Tokens CSS (globals.css)

```css
/* /styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Colors */
    --color-primary: #FAFAFA; /* Off-white */
    --color-secondary: #0A0A0A; /* Preto */
    --color-accent: #FFEB3B; /* Amarelo */
    
    /* Grays */
    --color-gray-50: #FAFAFA;
    --color-gray-100: #F5F5F5;
    --color-gray-200: #EEEEEE;
    --color-gray-300: #E0E0E0;
    --color-gray-400: #BDBDBD;
    --color-gray-500: #9E9E9E;
    --color-gray-600: #757575;
    --color-gray-700: #616161;
    --color-gray-800: #424242;
    --color-gray-900: #212121;
    
    /* Typography - Urbanist */
    --font-family: 'Urbanist', -apple-system, system-ui, sans-serif;
    
    /* Spacing */
    --spacing-xs: 0.25rem; /* 4px */
    --spacing-sm: 0.5rem;  /* 8px */
    --spacing-md: 1rem;    /* 16px */
    --spacing-lg: 1.5rem;  /* 24px */
    --spacing-xl: 2rem;    /* 32px */
    --spacing-2xl: 3rem;   /* 48px */
    
    /* Border Radius */
    --radius-sm: 0.25rem;  /* 4px */
    --radius-md: 0.5rem;   /* 8px */
    --radius-lg: 0.75rem;  /* 12px */
    --radius-xl: 1rem;     /* 16px */
    
    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  }
  
  body {
    font-family: var(--font-family);
    background-color: var(--color-primary);
    color: var(--color-secondary);
  }
  
  /* Typography Defaults */
  h1 {
    font-size: 2.25rem; /* 36px */
    font-weight: 700;
    line-height: 1.2;
  }
  
  h2 {
    font-size: 1.875rem; /* 30px */
    font-weight: 600;
    line-height: 1.3;
  }
  
  h3 {
    font-size: 1.5rem; /* 24px */
    font-weight: 600;
    line-height: 1.4;
  }
  
  p {
    font-size: 1rem; /* 16px */
    line-height: 1.6;
  }
}
```

---

## 12. Infraestrutura Técnica

### Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima

# Mixpanel
VITE_MIXPANEL_TOKEN=seu_token

# GrowthBook
VITE_GROWTHBOOK_API_KEY=sua_api_key
VITE_GROWTHBOOK_CLIENT_KEY=sua_client_key
```

### Build e Deploy

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  }
}
```