# 📚 MINHA BIBLIOTECA - PLANO DE IMPLEMENTAÇÃO

**Data**: 2025-10-23  
**Objetivo**: Renomear "Meus Cursos" para "Minha Biblioteca" e adicionar suporte para livros  
**Status**: 📋 Planejamento

---

## 🎯 CONTEXTO

### **Problema:**
- Atualmente temos apenas "Meus Cursos" na Academia
- Queremos adicionar **livros** à plataforma
- Precisamos de um nome que englobe cursos + livros + outros recursos

### **Solução:**
**"MINHA BIBLIOTECA"** ✨

**Por quê?**
- ✅ Engloba cursos, livros, artigos, eBooks, PDFs
- ✅ Termo familiar (Udemy, Coursera, Kindle, Apple Books)
- ✅ Conotação de conhecimento e aprendizado
- ✅ Escalável (pode incluir podcasts, worksheets, etc)
- ✅ Alinha com visão de fortalecimento de famílias

---

## 📊 ESTRUTURA PROPOSTA

### **1. MINHA BIBLIOTECA (Academia Page)**

```
┌─────────────────────────────────────────────────┐
│  [Minha Biblioteca] [Explorar Academia]         │ ← Tabs
├─────────────────────────────────────────────────┤
│                                                 │
│  📚 Minha Biblioteca                            │
│  ──────────────────────────────────────────     │
│                                                 │
│  Filtros: [📖 Todos] [🎓 Cursos] [📕 Livros]   │
│                                                 │
│  ┌──────────────────┐ ┌──────────────────┐     │
│  │ 🎓 Curso         │ │ 📕 Livro         │     │
│  │ 5 Pilares...     │ │ Casamento...     │     │
│  │ ████▒▒▒▒ 65%     │ │ ████████▒ 82%    │     │
│  └──────────────────┘ └──────────────────┘     │
│                                                 │
│  ┌──────────────────┐ ┌──────────────────┐     │
│  │ 📕 Livro         │ │ 🎓 Curso         │     │
│  │ Educação...      │ │ Finanças...      │     │
│  │ ████▒▒▒▒ 45%     │ │ ██▒▒▒▒▒▒ 30%     │     │
│  └──────────────────┘ └──────────────────┘     │
│                                                 │
│  Estatísticas:                                  │
│  • 3 cursos em andamento                        │
│  • 2 livros lendo                               │
│  • 5 itens completos                            │
└─────────────────────────────────────────────────┘
```

---

### **2. MINHA BIBLIOTECA (Perfil Page)**

```
┌─────────────────────────────────────────────────┐
│  👤 PERFIL                                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Atividade:                                     │
│  • 📚 Biblioteca: 10 itens                      │ ← Clicável
│  • 👥 Comunidades: 5                            │
│  • ❤️ Vídeos Favoritos: 12                      │
│  • ⚡ Sessões Conselheiro: 8                    │
│                                                 │
└─────────────────────────────────────────────────┘

Ao clicar em "Biblioteca":

┌─────────────────────────────────────────────────┐
│  ← Voltar                                       │
│                                                 │
│  📚 Minha Biblioteca                            │
│  ──────────────────────────────────────────     │
│                                                 │
│  [📖 Todos] [🎓 Cursos] [📕 Livros]            │
│                                                 │
│  🎓 Cursos (5)                                  │
│  ┌──────────────────┐ ┌──────────────────┐     │
│  │ 5 Pilares...     │ │ Comunicação...   │     │
│  └──────────────────┘ └──────────────────┘     │
│                                                 │
│  📕 Livros (5)                                  │
│  ┌──────────────────┐ ┌──────────────────┐     │
│  │ Casamento...     │ │ Educação...      │     │
│  └──────────────────┘ └──────────────────┘     │
└─────────────────────────────────────────────────┘
```

---

## 📕 ESTRUTURA DE DADOS - LIVROS

### **TypeScript Interface:**

```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  description: string;
  category: string[];
  
  // Metadados
  pages: number;
  language: string;
  publishedYear: number;
  publisher?: string;
  isbn?: string;
  
  // Leitura
  currentPage: number;
  progress: number; // 0-100
  isCompleted: boolean;
  lastRead?: Date;
  
  // Engajamento
  rating?: number; // 0-5
  isFavorite: boolean;
  notes: BookNote[];
  highlights: BookHighlight[];
  
  // Formato
  format: 'pdf' | 'epub' | 'audiobook' | 'physical';
  fileUrl?: string; // Se digital
  audioDuration?: number; // Se audiobook
  
  // Premium
  isPremium: boolean;
  price?: number;
  
  // Social
  readers: number;
  averageRating: number;
  reviews: Review[];
}

interface BookNote {
  id: string;
  page: number;
  content: string;
  createdAt: Date;
}

interface BookHighlight {
  id: string;
  page: number;
  text: string;
  color: string;
  createdAt: Date;
}
```

---

## 🎨 DESIGN DE CARDS

### **Card de Livro (Grid):**

```
┌───────────────────────┐
│   ┌───────────────┐   │
│   │               │   │
│   │   [CAPA DO]   │   │ ← Cover image
│   │   [LIVRO]     │   │
│   │               │   │
│   └───────────────┘   │
│                       │
│   Casamento Feliz     │ ← Título
│   Dr. João Silva      │ ← Autor
│                       │
│   ████████▒▒ 82%      │ ← Progresso
│   Pág. 164 de 200     │
│                       │
│   [Continuar lendo]   │ ← CTA
│   ❤️ 📝 🔖            │ ← Quick actions
└───────────────────────┘
```

### **Card de Livro (Lista):**

```
┌─────────────────────────────────────────────┐
│ ┌─────┐                                     │
│ │CAPA │  Casamento Feliz                    │
│ │IMAGE│  Dr. João Silva • 2023              │
│ │     │                                     │
│ └─────┘  ████████▒▒ 82% (164/200 páginas)  │
│                                             │
│          [Continuar] ❤️ 📝 🔖              │
└─────────────────────────────────────────────┘
```

---

## 🎯 FUNCIONALIDADES DE LIVROS

### **1. Leitura:**
```
- ✅ Leitor PDF integrado
- ✅ Leitor EPUB (futuro)
- ✅ Player de Audiobook (futuro)
- ✅ Marcador de página automático
- ✅ Modo escuro/claro
- ✅ Ajuste de tamanho de fonte
```

### **2. Anotações:**
```
- ✅ Notas por página
- ✅ Highlights coloridos
- ✅ Bookmarks
- ✅ Exportar anotações
```

### **3. Progresso:**
```
- ✅ Tracking de páginas lidas
- ✅ Tempo de leitura
- ✅ Estatísticas semanais/mensais
- ✅ Metas de leitura
```

### **4. Social:**
```
- ✅ Ver quem está lendo
- ✅ Reviews e ratings
- ✅ Discussões por capítulo
- ✅ Compartilhar highlights
```

---

## 🛠️ IMPLEMENTAÇÃO TÉCNICA

### **Fase 1: Renomear "Meus Cursos" → "Minha Biblioteca"** (1h)

**Arquivos a modificar:**
1. `/components/AcademiaPage.tsx` - Tab label
2. `/components/SearchModal.tsx` - Menu item
3. `/components/PerfilPage.tsx` - Activity stat label
4. Qualquer outro arquivo com referência

**Mudanças:**
```tsx
// ANTES
<Button>Meus Cursos</Button>

// DEPOIS
<Button>
  <BookOpen className="w-4 h-4 mr-2" />
  Minha Biblioteca
</Button>
```

---

### **Fase 2: Criar Estrutura de Dados para Livros** (1h)

**Criar arquivo:** `/components/types/BookTypes.ts`

```typescript
export interface Book {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  description: string;
  category: string[];
  pages: number;
  currentPage: number;
  progress: number;
  isCompleted: boolean;
  format: 'pdf' | 'epub' | 'audiobook' | 'physical';
  isPremium: boolean;
  isFavorite: boolean;
  // ... mais campos
}

export interface LibraryItem {
  type: 'course' | 'book';
  data: Course | Book;
}
```

**Atualizar AppContext:**
```tsx
// Adicionar ao AppContext
const [books, setBooks] = useState<Book[]>([]);
const [enrolledBooks, setEnrolledBooks] = useState<string[]>([]);

// Funções
const addBookToLibrary = (bookId: string) => { ... };
const updateBookProgress = (bookId: string, page: number) => { ... };
```

---

### **Fase 3: Criar Mock Data de Livros** (30min)

**Arquivo:** `/components/mockBooks.ts`

```typescript
export const mockBooks: Book[] = [
  {
    id: 'book-1',
    title: 'Os 5 Pilares de um Casamento Feliz',
    author: 'Dr. João Silva',
    coverImage: 'https://source.unsplash.com/400x600/?marriage,book',
    description: 'Descubra os fundamentos para construir...',
    category: ['Relacionamentos', 'Casamento'],
    pages: 200,
    currentPage: 164,
    progress: 82,
    isCompleted: false,
    format: 'pdf',
    isPremium: false,
    isFavorite: true,
    language: 'pt-BR',
    publishedYear: 2023,
    rating: 4.8,
    readers: 1240,
    averageRating: 4.7,
  },
  {
    id: 'book-2',
    title: 'Educação Positiva: Criando Filhos Resilientes',
    author: 'Dra. Maria Santos',
    coverImage: 'https://source.unsplash.com/400x600/?parenting,book',
    description: 'Aprenda técnicas comprovadas...',
    category: ['Parentalidade', 'Educação'],
    pages: 280,
    currentPage: 126,
    progress: 45,
    isCompleted: false,
    format: 'pdf',
    isPremium: true,
    isFavorite: false,
    language: 'pt-BR',
    publishedYear: 2024,
    rating: 4.9,
    readers: 980,
    averageRating: 4.8,
  },
  {
    id: 'book-3',
    title: 'Finanças do Casal: Prosperidade Juntos',
    author: 'Carlos Oliveira',
    coverImage: 'https://source.unsplash.com/400x600/?finance,book',
    description: 'Organize suas finanças familiares...',
    category: ['Finanças', 'Casamento'],
    pages: 156,
    currentPage: 156,
    progress: 100,
    isCompleted: true,
    format: 'pdf',
    isPremium: false,
    isFavorite: true,
    language: 'pt-BR',
    publishedYear: 2023,
    rating: 5.0,
    readers: 2100,
    averageRating: 4.6,
  },
  // ... mais livros
];
```

---

### **Fase 4: Componente BookCard** (1.5h)

**Criar arquivo:** `/components/BookCard.tsx`

```tsx
import { Book, BookOpen, Heart, MessageSquare } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface BookCardProps {
  book: Book;
  onRead: () => void;
  onToggleFavorite: () => void;
  variant?: 'grid' | 'list';
}

export function BookCard({ book, onRead, onToggleFavorite, variant = 'grid' }: BookCardProps) {
  if (variant === 'grid') {
    return (
      <Card className="overflow-hidden group hover:shadow-lg transition-all">
        <CardContent className="p-4">
          {/* Cover Image */}
          <div className="relative aspect-[2/3] mb-4 rounded-lg overflow-hidden">
            <img 
              src={book.coverImage} 
              alt={book.title}
              className="w-full h-full object-cover"
            />
            {book.isPremium && (
              <Badge className="absolute top-2 right-2">Premium</Badge>
            )}
          </div>
          
          {/* Info */}
          <h3 className="font-semibold mb-1 line-clamp-2">{book.title}</h3>
          <p className="text-sm text-muted-foreground mb-3">{book.author}</p>
          
          {/* Progress */}
          {book.currentPage > 0 && (
            <div className="mb-3">
              <Progress value={book.progress} className="h-2 mb-1" />
              <p className="text-xs text-muted-foreground">
                Pág. {book.currentPage} de {book.pages}
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={onRead}
            >
              {book.currentPage > 0 ? 'Continuar' : 'Começar'}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={onToggleFavorite}
            >
              <Heart className={book.isFavorite ? 'fill-current' : ''} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // List variant
  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4 flex gap-4">
        {/* Cover */}
        <div className="w-20 h-28 flex-shrink-0 rounded overflow-hidden">
          <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1">{book.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">
            {book.author} • {book.publishedYear}
          </p>
          
          {book.currentPage > 0 && (
            <div className="mb-2">
              <Progress value={book.progress} className="h-2 mb-1" />
              <p className="text-xs text-muted-foreground">
                {book.progress}% ({book.currentPage}/{book.pages} páginas)
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button size="sm" onClick={onRead}>
              {book.currentPage > 0 ? 'Continuar' : 'Começar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggleFavorite}>
              <Heart className={book.isFavorite ? 'fill-current' : ''} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### **Fase 5: Atualizar AcademiaPage com Filtros** (2h)

**Adicionar:**
```tsx
// Estados
const [libraryFilter, setLibraryFilter] = useState<'all' | 'courses' | 'books'>('all');

// Combinar cursos e livros
const libraryItems: LibraryItem[] = [
  ...enrolledCourses.map(c => ({ type: 'course', data: c })),
  ...enrolledBooks.map(b => ({ type: 'book', data: b }))
];

// Filtrar
const filteredLibrary = libraryItems.filter(item => {
  if (libraryFilter === 'all') return true;
  if (libraryFilter === 'courses') return item.type === 'course';
  if (libraryFilter === 'books') return item.type === 'book';
  return true;
});

// Render
<div className="flex gap-2 mb-6">
  <Button 
    variant={libraryFilter === 'all' ? 'default' : 'outline'}
    onClick={() => setLibraryFilter('all')}
  >
    📖 Todos ({libraryItems.length})
  </Button>
  <Button 
    variant={libraryFilter === 'courses' ? 'default' : 'outline'}
    onClick={() => setLibraryFilter('courses')}
  >
    🎓 Cursos ({enrolledCourses.length})
  </Button>
  <Button 
    variant={libraryFilter === 'books' ? 'default' : 'outline'}
    onClick={() => setLibraryFilter('books')}
  >
    📕 Livros ({enrolledBooks.length})
  </Button>
</div>

{/* Grid de itens */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {filteredLibrary.map(item => (
    item.type === 'course' 
      ? <CourseCard key={item.data.id} course={item.data} />
      : <BookCard key={item.data.id} book={item.data} />
  ))}
</div>
```

---

### **Fase 6: Adicionar ao PerfilPage** (1h)

**Atualizar activityStats:**
```tsx
const activityStats = [
  { 
    icon: BookOpen, 
    label: "Biblioteca", 
    value: (userData.completedCourses?.length || 0) + enrolledBooks.length,
    onClick: () => setShowBiblioteca(true)
  },
  { icon: Users, label: "Comunidades", value: 5 },
  { icon: Heart, label: "Vídeos Favoritos", value: favoriteVideos.length },
  { icon: Sparkles, label: "Sessões Conselheiro", value: 8 },
];

// Componente Biblioteca Page
if (showBiblioteca) {
  return <BibliotecaPage onBack={() => setShowBiblioteca(false)} />;
}
```

---

### **Fase 7: Componente BibliotecaPage** (2h)

**Criar arquivo:** `/components/BibliotecaPage.tsx`

```tsx
import { useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { BookCard } from './BookCard';
import { CourseCard } from './CourseCard'; // Assumindo que existe
import { useApp } from './AppContext';

interface BibliotecaPageProps {
  onBack: () => void;
}

export function BibliotecaPage({ onBack }: BibliotecaPageProps) {
  const { enrolledCourses, enrolledBooks } = useApp();
  const [filter, setFilter] = useState<'all' | 'courses' | 'books'>('all');
  
  const filteredCourses = filter === 'all' || filter === 'courses' ? enrolledCourses : [];
  const filteredBooks = filter === 'all' || filter === 'books' ? enrolledBooks : [];
  
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--rayo-sand-100)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b" style={{ 
        background: 'var(--rayo-sand-100)',
        borderColor: 'var(--rayo-sand-300)'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <h1 className="text-2xl font-bold mb-4">📚 Minha Biblioteca</h1>
          
          {/* Filtros */}
          <div className="flex gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              Todos
            </Button>
            <Button 
              variant={filter === 'courses' ? 'default' : 'outline'}
              onClick={() => setFilter('courses')}
            >
              Cursos
            </Button>
            <Button 
              variant={filter === 'books' ? 'default' : 'outline'}
              onClick={() => setFilter('books')}
            >
              Livros
            </Button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {filteredCourses.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">🎓 Cursos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCourses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}
        
        {filteredBooks.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">📕 Livros</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}
        
        {filteredCourses.length === 0 && filteredBooks.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg text-muted-foreground">
              Sua biblioteca está vazia
            </p>
            <Button className="mt-4" onClick={onBack}>
              Explorar Conteúdos
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### **Fase 8: Leitor de Livros (Básico)** (3h)

**Criar arquivo:** `/components/BookReaderPage.tsx`

```tsx
import { useState } from 'react';
import { ArrowLeft, BookmarkPlus, MessageSquare, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface BookReaderPageProps {
  book: Book;
  onBack: () => void;
}

export function BookReaderPage({ book, onBack }: BookReaderPageProps) {
  const [currentPage, setCurrentPage] = useState(book.currentPage || 1);
  
  // Simular conteúdo (em produção seria PDF viewer)
  const content = `
    <h1>Capítulo ${Math.floor(currentPage / 10) + 1}</h1>
    <p>Lorem ipsum dolor sit amet...</p>
  `;
  
  const handleNextPage = () => {
    if (currentPage < book.pages) {
      setCurrentPage(prev => prev + 1);
      // Atualizar progresso no backend
    }
  };
  
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex-1 mx-4">
            <Progress value={(currentPage / book.pages) * 100} />
            <p className="text-xs text-center mt-1">
              {currentPage} de {book.pages}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <BookmarkPlus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          <div 
            className="prose dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
      
      {/* Footer Navigation */}
      <footer className="border-t p-4">
        <div className="flex justify-between max-w-3xl mx-auto">
          <Button 
            variant="outline" 
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            ← Anterior
          </Button>
          <Button 
            variant="outline" 
            onClick={handleNextPage}
            disabled={currentPage === book.pages}
          >
            Próxima →
          </Button>
        </div>
      </footer>
    </div>
  );
}
```

---

## 📅 CRONOGRAMA

### **Sprint 1: Fundação (4h)**
- ✅ Fase 1: Renomear para "Minha Biblioteca" (1h)
- ✅ Fase 2: Estrutura de dados (1h)
- ✅ Fase 3: Mock data (30min)
- ✅ Fase 4: BookCard component (1.5h)

### **Sprint 2: Integração (4h)**
- ✅ Fase 5: Filtros na Academia (2h)
- ✅ Fase 6: Seção no Perfil (1h)
- ✅ Fase 7: BibliotecaPage (1h)

### **Sprint 3: Leitor (3-6h)**
- ✅ Fase 8: Book Reader básico (3h)
- 🔄 Fase 9: PDF Viewer integrado (futuro - 3h)
- 🔄 Fase 10: Anotações e highlights (futuro - 2h)

**Total Estimado: 8-12 horas** (para MVP completo)

---

## 🎯 PRIORIDADES

### **MVP (Mínimo Viável) - FAZER AGORA:**
1. ✅ Renomear "Meus Cursos" → "Minha Biblioteca"
2. ✅ Criar estrutura de dados para livros
3. ✅ Adicionar 5-10 livros mock
4. ✅ BookCard component (grid + list)
5. ✅ Filtros na Academia (Todos/Cursos/Livros)
6. ✅ Seção "Biblioteca" no Perfil
7. ✅ Página de Biblioteca dedicada

### **V2 (Próximas Iterações):**
1. 🔄 Leitor de PDF integrado
2. 🔄 Sistema de anotações
3. 🔄 Highlights e bookmarks
4. 🔄 Estatísticas de leitura
5. 🔄 Metas de leitura
6. 🔄 Discussões por capítulo
7. 🔄 Recomendações personalizadas

---

## 📊 IMPACTO NO USUÁRIO

### **ANTES:**
```
Academia → Meus Cursos (apenas cursos)
Perfil → Cursos Completados (apenas cursos)
```

### **DEPOIS:**
```
Academia → Minha Biblioteca (cursos + livros + filtros)
Perfil → Biblioteca: 10 itens (cursos + livros unificados)
```

**Benefícios:**
- ✅ Mais conteúdo disponível
- ✅ Organização clara (filtros)
- ✅ Término familiar e intuitivo
- ✅ Escalável (pode adicionar podcasts, artigos, etc)
- ✅ Alinha com concorrentes (Udemy, Coursera)

---

## 🎨 DESIGN TOKENS PARA LIVROS

```css
/* Cores específicas para livros */
--raio-book-brown: #8B4513;
--raio-book-light: #FFF8DC;
--raio-book-highlight-yellow: #FFEB3B;
--raio-book-highlight-green: #4CAF50;
--raio-book-highlight-blue: #2196F3;
--raio-book-highlight-pink: #E91E63;
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### **Fase 1: Renomeação** ✅
- [ ] Atualizar AcademiaPage.tsx (tab label)
- [ ] Atualizar SearchModal.tsx (menu item)
- [ ] Atualizar PerfilPage.tsx (activity stat)
- [ ] Buscar e substituir todas referências

### **Fase 2: Dados** ✅
- [ ] Criar BookTypes.ts
- [ ] Atualizar AppContext com books
- [ ] Criar mockBooks.ts
- [ ] Adicionar 5-10 livros mock

### **Fase 3: UI** ✅
- [ ] Criar BookCard.tsx
- [ ] Adicionar filtros na Academia
- [ ] Atualizar PerfilPage
- [ ] Criar BibliotecaPage.tsx

### **Fase 4: Funcionalidades** 🔄
- [ ] Sistema de progresso
- [ ] Favoritos
- [ ] Reader básico
- [ ] Anotações (futuro)

---

## 🚀 PRÓXIMOS PASSOS

1. **Aprovar o nome "Minha Biblioteca"**
2. **Definir prioridade** (MVP agora ou V2 depois?)
3. **Implementar fase a fase**
4. **Testar com usuários**
5. **Iterar baseado em feedback**

---

**Status**: 📋 Aguardando Aprovação  
**Estimativa MVP**: 8 horas  
**ROI**: Alto (mais valor para usuários, diferencial competitivo)

**Quer que eu implemente o MVP agora?** 🚀
