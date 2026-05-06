/**
 * RAYO - YouTube Data Service
 * Serviço para buscar dados do canal @eusourafaraio
 */

import { 
  YouTubeVideo, 
  YouTubePlaylist, 
  YouTubeShort, 
  YouTubeCache,
  YouTubeAPIResponse,
  YouTubeAPIVideo,
  YouTubeAPIPlaylist
} from './YouTubeTypes';

// Configuração do canal
const CHANNEL_USERNAME = '@eusourafaraio';
const CACHE_KEY = 'raio-youtube-cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora em ms

// YouTube API Configuration
// IMPORTANTE: Cole sua API Key do Google Cloud Console aqui
// Como obter: https://console.cloud.google.com/ → APIs e Serviços → Credenciais → Criar API Key
const API_KEY = 'YOUR_YOUTUBE_API_KEY_HERE'; // ⬅️ COLE SUA API KEY AQUI
const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const USE_MOCK_DATA = API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE'; // Usa mock se API key não estiver configurada

/**
 * Converte duração ISO 8601 (PT15M33S) para segundos
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Transforma resposta da API em objeto YouTubeVideo
 */
function transformVideo(item: YouTubeAPIVideo): YouTubeVideo {
  const videoId = typeof item.id === 'string' ? item.id : item.id.videoId;
  
  return {
    id: videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: {
      default: item.snippet.thumbnails.default.url,
      medium: item.snippet.thumbnails.medium.url,
      high: item.snippet.thumbnails.high.url,
      maxres: item.snippet.thumbnails.maxres?.url,
    },
    duration: item.contentDetails ? parseDuration(item.contentDetails.duration) : 0,
    publishedAt: item.snippet.publishedAt,
    viewCount: parseInt(item.statistics?.viewCount || '0'),
    likeCount: parseInt(item.statistics?.likeCount || '0'),
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    tags: item.snippet.tags,
    categoryId: item.snippet.categoryId,
  };
}

/**
 * Transforma resposta da API em objeto YouTubePlaylist
 */
function transformPlaylist(item: YouTubeAPIPlaylist): YouTubePlaylist {
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: {
      default: item.snippet.thumbnails.default.url,
      medium: item.snippet.thumbnails.medium.url,
      high: item.snippet.thumbnails.high.url,
      maxres: item.snippet.thumbnails.maxres?.url,
    },
    itemCount: item.contentDetails?.itemCount || 0,
    publishedAt: item.snippet.publishedAt,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
  };
}

/**
 * Busca ID do canal a partir do username
 */
async function getChannelId(): Promise<string> {
  try {
    const response = await fetch(
      `${BASE_URL}/channels?part=id&forUsername=${CHANNEL_USERNAME.replace('@', '')}&key=${API_KEY}`
    );
    
    if (!response.ok) throw new Error('Erro ao buscar canal');
    
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].id;
    }
    
    throw new Error('Canal não encontrado');
  } catch (error) {
    console.error('Erro ao buscar channelId:', error);
    // Fallback para ID conhecido (substitua pelo ID real do canal)
    return 'UC_CHANNEL_ID_PLACEHOLDER';
  }
}

/**
 * Busca vídeos do canal (ordenados por data, mais recente primeiro)
 */
async function fetchVideos(channelId: string, maxResults = 20): Promise<YouTubeVideo[]> {
  try {
    // 1. Buscar lista de vídeos
    const searchResponse = await fetch(
      `${BASE_URL}/search?` +
      `part=snippet&` +
      `channelId=${channelId}&` +
      `maxResults=${maxResults}&` +
      `order=date&` +
      `type=video&` +
      `key=${API_KEY}`
    );
    
    if (!searchResponse.ok) throw new Error('Erro ao buscar vídeos');
    
    const searchData: YouTubeAPIResponse<YouTubeAPIVideo> = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }
    
    // 2. Buscar detalhes dos vídeos (duração, estatísticas)
    const videoIds = searchData.items.map(item => 
      typeof item.id === 'string' ? item.id : item.id.videoId
    ).join(',');
    
    const detailsResponse = await fetch(
      `${BASE_URL}/videos?` +
      `part=contentDetails,statistics,snippet&` +
      `id=${videoIds}&` +
      `key=${API_KEY}`
    );
    
    if (!detailsResponse.ok) throw new Error('Erro ao buscar detalhes');
    
    const detailsData: YouTubeAPIResponse<YouTubeAPIVideo> = await detailsResponse.json();
    
    return detailsData.items.map(transformVideo);
  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);
    return [];
  }
}

/**
 * Busca Shorts do canal (vídeos com duração < 60s)
 */
async function fetchShorts(channelId: string, maxResults = 15): Promise<YouTubeShort[]> {
  try {
    const videos = await fetchVideos(channelId, maxResults * 2); // busca mais para filtrar
    
    // Filtra vídeos com menos de 60 segundos
    const shorts = videos
      .filter(video => video.duration > 0 && video.duration < 60)
      .slice(0, maxResults)
      .map(video => ({ ...video, isShort: true as const }));
    
    return shorts;
  } catch (error) {
    console.error('Erro ao buscar shorts:', error);
    return [];
  }
}

/**
 * Busca playlists do canal
 */
async function fetchPlaylists(channelId: string, maxResults = 10): Promise<YouTubePlaylist[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/playlists?` +
      `part=snippet,contentDetails&` +
      `channelId=${channelId}&` +
      `maxResults=${maxResults}&` +
      `key=${API_KEY}`
    );
    
    if (!response.ok) throw new Error('Erro ao buscar playlists');
    
    const data: YouTubeAPIResponse<YouTubeAPIPlaylist> = await response.json();
    
    if (!data.items) return [];
    
    return data.items.map(transformPlaylist);
  } catch (error) {
    console.error('Erro ao buscar playlists:', error);
    return [];
  }
}

/**
 * Carrega cache do localStorage
 */
function loadCache(): YouTubeCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cache: YouTubeCache = JSON.parse(cached);
    const cacheAge = Date.now() - new Date(cache.lastUpdate).getTime();
    
    // Verifica se cache expirou
    if (cacheAge > CACHE_DURATION) {
      return null;
    }
    
    return cache;
  } catch (error) {
    console.error('Erro ao carregar cache:', error);
    return null;
  }
}

/**
 * Salva cache no localStorage
 */
function saveCache(cache: YouTubeCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Erro ao salvar cache:', error);
  }
}

/**
 * Gera dados mock para desenvolvimento/fallback
 */
function getMockData(): YouTubeCache {
  return {
    channelId: 'UC_MOCK_CHANNEL_ID',
    lastUpdate: new Date().toISOString(),
    videos: [
      {
        id: 'mock-video-1',
        title: 'Como Fortalecer seu Relacionamento - RAYO',
        description: 'Descubra estratégias práticas para fortalecer seu relacionamento e construir uma base sólida de amor e respeito.',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1758524944375-7d61202cc481?w=120&h=90&fit=crop',
          medium: 'https://images.unsplash.com/photo-1758524944375-7d61202cc481?w=320&h=180&fit=crop',
          high: 'https://images.unsplash.com/photo-1758524944375-7d61202cc481?w=480&h=360&fit=crop',
        },
        duration: 1245, // 20:45
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 15420,
        likeCount: 1230,
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
      },
      {
        id: 'mock-video-2',
        title: '5 Erros que Destroem Casamentos',
        description: 'Aprenda a identificar e evitar os 5 erros mais comuns que podem destruir um casamento.',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1680603007731-d8da76c235ba?w=120&h=90&fit=crop',
          medium: 'https://images.unsplash.com/photo-1680603007731-d8da76c235ba?w=320&h=180&fit=crop',
          high: 'https://images.unsplash.com/photo-1680603007731-d8da76c235ba?w=480&h=360&fit=crop',
        },
        duration: 892, // 14:52
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 23100,
        likeCount: 1890,
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
      },
      {
        id: 'mock-video-3',
        title: 'Comunicação Assertiva no Namoro',
        description: 'Como se comunicar de forma clara e respeitosa no relacionamento.',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1605041140728-fecfe5b22e16?w=120&h=90&fit=crop',
          medium: 'https://images.unsplash.com/photo-1605041140728-fecfe5b22e16?w=320&h=180&fit=crop',
          high: 'https://images.unsplash.com/photo-1605041140728-fecfe5b22e16?w=480&h=360&fit=crop',
        },
        duration: 1067, // 17:47
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 18750,
        likeCount: 1450,
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
      },
      {
        id: 'mock-video-4',
        title: 'Preparação para o Casamento: O que Ninguém te Conta',
        description: 'Verdades importantes sobre preparação para o casamento que você precisa saber.',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1744805624952-dab790f6b3bd?w=120&h=90&fit=crop',
          medium: 'https://images.unsplash.com/photo-1744805624952-dab790f6b3bd?w=320&h=180&fit=crop',
          high: 'https://images.unsplash.com/photo-1744805624952-dab790f6b3bd?w=480&h=360&fit=crop',
        },
        duration: 1532, // 25:32
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 31200,
        likeCount: 2450,
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
      },
      {
        id: 'mock-video-5',
        title: 'Educação Financeira para Casais',
        description: 'Como gerenciar finanças juntos e construir um futuro próspero.',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1588912914078-2fe5224fd8b8?w=120&h=90&fit=crop',
          medium: 'https://images.unsplash.com/photo-1588912914078-2fe5224fd8b8?w=320&h=180&fit=crop',
          high: 'https://images.unsplash.com/photo-1588912914078-2fe5224fd8b8?w=480&h=360&fit=crop',
        },
        duration: 1890, // 31:30
        publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 19800,
        likeCount: 1620,
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
      },
      {
        id: 'mock-video-6',
        title: 'Criando Filhos com Valores Cristãos',
        description: 'Princípios fundamentais para educar seus filhos nos caminhos do Senhor.',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1628676348963-f88c671333f6?w=120&h=90&fit=crop',
          medium: 'https://images.unsplash.com/photo-1628676348963-f88c671333f6?w=320&h=180&fit=crop',
          high: 'https://images.unsplash.com/photo-1628676348963-f88c671333f6?w=480&h=360&fit=crop',
        },
        duration: 2145, // 35:45
        publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 27300,
        likeCount: 2120,
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
      },
    ],
    playlists: [
      {
        id: 'mock-playlist-1',
        title: 'Série: Construindo um Casamento Forte',
        description: 'Uma série completa sobre como construir e manter um casamento saudável e feliz.',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1749235878214-8a3079c72e5a?w=120&h=90&fit=crop',
          medium: 'https://images.unsplash.com/photo-1749235878214-8a3079c72e5a?w=320&h=180&fit=crop',
          high: 'https://images.unsplash.com/photo-1749235878214-8a3079c72e5a?w=480&h=360&fit=crop',
        },
        itemCount: 12,
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
      },
      {
        id: 'mock-playlist-2',
        title: 'Namoro com Propósito',
        description: 'Tudo sobre namorar com intenção e propósito rumo ao casamento.',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1605041140728-fecfe5b22e16?w=120&h=90&fit=crop',
          medium: 'https://images.unsplash.com/photo-1605041140728-fecfe5b22e16?w=320&h=180&fit=crop',
          high: 'https://images.unsplash.com/photo-1605041140728-fecfe5b22e16?w=480&h=360&fit=crop',
        },
        itemCount: 8,
        publishedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
      },
      {
        id: 'mock-playlist-3',
        title: 'Pais de Primeira Viagem',
        description: 'Guia completo para novos pais navegarem essa jornada incrível.',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1628676348963-f88c671333f6?w=120&h=90&fit=crop',
          medium: 'https://images.unsplash.com/photo-1628676348963-f88c671333f6?w=320&h=180&fit=crop',
          high: 'https://images.unsplash.com/photo-1628676348963-f88c671333f6?w=480&h=360&fit=crop',
        },
        itemCount: 10,
        publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
      },
    ],
    shorts: [
      {
        id: 'mock-short-1',
        title: 'Dica Rápida: Como Pedir Desculpas',
        description: 'A forma certa de pedir desculpas no relacionamento #shorts',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1758524944375-7d61202cc481?w=120&h=200&fit=crop',
          medium: 'https://images.unsplash.com/photo-1758524944375-7d61202cc481?w=180&h=320&fit=crop',
          high: 'https://images.unsplash.com/photo-1758524944375-7d61202cc481?w=270&h=480&fit=crop',
        },
        duration: 45,
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 5600,
        likeCount: 780,
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
        isShort: true,
      },
      {
        id: 'mock-short-2',
        title: '3 Palavras que Salvam Relacionamentos',
        description: 'Essas 3 palavras podem transformar seu relacionamento #shorts #relacionamento',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1680603007731-d8da76c235ba?w=120&h=200&fit=crop',
          medium: 'https://images.unsplash.com/photo-1680603007731-d8da76c235ba?w=180&h=320&fit=crop',
          high: 'https://images.unsplash.com/photo-1680603007731-d8da76c235ba?w=270&h=480&fit=crop',
        },
        duration: 38,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 12400,
        likeCount: 1520,
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
        isShort: true,
      },
      {
        id: 'mock-short-3',
        title: 'O Segredo de Casamentos Felizes',
        description: 'Descubra o que realmente faz a diferença #casamento #amor',
        thumbnail: {
          default: 'https://images.unsplash.com/photo-1749235878214-8a3079c72e5a?w=120&h=200&fit=crop',
          medium: 'https://images.unsplash.com/photo-1749235878214-8a3079c72e5a?w=180&h=320&fit=crop',
          high: 'https://images.unsplash.com/photo-1749235878214-8a3079c72e5a?w=270&h=480&fit=crop',
        },
        duration: 52,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 8900,
        likeCount: 1120,
        channelId: 'UC_MOCK_CHANNEL_ID',
        channelTitle: 'Rafa Raio',
        isShort: true,
      },
    ],
  };
}

/**
 * API Principal - Busca todos os dados do canal
 */
export async function fetchYouTubeData(forceRefresh = false): Promise<YouTubeCache> {
  // Se API key não estiver configurada, usa dados mock
  if (USE_MOCK_DATA) {
    console.info('🎬 YouTube Integration: Usando dados MOCK (API key não configurada)');
    const mockData = getMockData();
    saveCache(mockData);
    return mockData;
  }

  // Tenta carregar do cache primeiro
  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) {
      return cached;
    }
  }
  
  try {
    // Busca channelId
    const channelId = await getChannelId();
    
    // Busca dados em paralelo
    const [videos, playlists, shorts] = await Promise.all([
      fetchVideos(channelId, 20),
      fetchPlaylists(channelId, 10),
      fetchShorts(channelId, 15),
    ]);
    
    const cache: YouTubeCache = {
      channelId,
      videos,
      playlists,
      shorts,
      lastUpdate: new Date().toISOString(),
    };
    
    // Salva cache
    saveCache(cache);
    
    return cache;
  } catch (error) {
    console.error('Erro ao buscar dados do YouTube:', error);
    
    // Fallback para dados mock
    const mockData = getMockData();
    saveCache(mockData);
    return mockData;
  }
}

/**
 * Busca vídeos de uma playlist específica
 */
export async function fetchPlaylistVideos(playlistId: string, maxResults: number = 20): Promise<YouTubeVideo[]> {
  if (USE_MOCK_DATA) {
    // Retorna dados mock para a playlist
    const mockData = getMockData();
    return mockData.videos.slice(0, Math.min(maxResults, mockData.videos.length));
  }

  try {
    // Busca itens da playlist
    const playlistItemsUrl = `${BASE_URL}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${API_KEY}`;
    const playlistResponse = await fetch(playlistItemsUrl);
    
    if (!playlistResponse.ok) {
      throw new Error(`Erro ao buscar playlist: ${playlistResponse.status}`);
    }
    
    const playlistData: YouTubeAPIResponse = await playlistResponse.json();
    
    if (!playlistData.items || playlistData.items.length === 0) {
      return [];
    }

    // Extrai IDs dos vídeos
    const videoIds = playlistData.items
      .map(item => item.snippet.resourceId?.videoId)
      .filter(Boolean)
      .join(',');

    if (!videoIds) {
      return [];
    }

    // Busca detalhes dos vídeos (duração, views, etc)
    const videosUrl = `${BASE_URL}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${API_KEY}`;
    const videosResponse = await fetch(videosUrl);
    
    if (!videosResponse.ok) {
      throw new Error(`Erro ao buscar detalhes dos vídeos: ${videosResponse.status}`);
    }
    
    const videosData: YouTubeAPIResponse = await videosResponse.json();
    
    return videosData.items.map(transformVideo);
  } catch (error) {
    console.error('Erro ao buscar vídeos da playlist:', error);
    // Retorna mock data em caso de erro
    const mockData = getMockData();
    return mockData.videos.slice(0, Math.min(maxResults, mockData.videos.length));
  }
}

/**
 * Limpa cache
 */
export function clearYouTubeCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
  }
}
