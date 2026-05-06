/**
 * RAYO - YouTube Integration Types
 * Types para integração com YouTube Data API v3
 */

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: {
    default: string;
    medium: string;
    high: string;
    maxres?: string;
  };
  duration: number; // em segundos
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  channelId: string;
  channelTitle: string;
  tags?: string[];
  categoryId?: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: {
    default: string;
    medium: string;
    high: string;
    maxres?: string;
  };
  itemCount: number;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  videos?: YouTubeVideo[];
}

export interface YouTubeShort extends YouTubeVideo {
  isShort: true;
}

export interface VideoProgress {
  videoId: string;
  progress: number; // 0-100 (porcentagem)
  currentTime: number; // tempo atual em segundos
  duration: number; // duração total em segundos
  lastWatched: string; // ISO date string
  completed: boolean; // true se progress >= 95%
}

export interface VideoAnalytics {
  videoId: string;
  views: number; // quantas vezes foi assistido na plataforma
  totalWatchTime: number; // tempo total assistido em segundos
  averageCompletion: number; // porcentagem média de conclusão
  lastViewed: string; // ISO date string
  favorites: number; // quantas pessoas favoritaram
}

export interface YouTubeCache {
  videos: YouTubeVideo[];
  playlists: YouTubePlaylist[];
  shorts: YouTubeShort[];
  channelId: string;
  lastUpdate: string; // ISO date string
}

export interface UserVideoData {
  videoProgress: Record<string, VideoProgress>; // videoId -> progress
  favoriteVideos: string[]; // array de videoIds
  analytics: Record<string, VideoAnalytics>; // videoId -> analytics
}

export interface YouTubeAPIResponse<T> {
  items: T[];
  pageInfo?: {
    totalResults: number;
    resultsPerPage: number;
  };
  nextPageToken?: string;
  prevPageToken?: string;
}

// YouTube API Response Types
export interface YouTubeAPIVideo {
  kind: string;
  etag: string;
  id: string | { videoId: string };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    tags?: string[];
    categoryId?: string;
    resourceId?: {
      kind: string;
      videoId: string;
    };
  };
  contentDetails?: {
    duration: string; // ISO 8601 duration format (PT15M33S)
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

export interface YouTubeAPIPlaylist {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelTitle: string;
  };
  contentDetails?: {
    itemCount: number;
  };
}
