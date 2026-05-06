/**
 * RAYO - Video Progress Hook
 * Hook para gerenciar progresso de visualização de vídeos
 */

import { useState, useEffect, useCallback } from 'react';
import { VideoProgress, VideoAnalytics, UserVideoData } from '../youtube/YouTubeTypes';

const STORAGE_KEY = 'raio-video-data';

/**
 * Carrega dados do usuário do localStorage
 */
function loadUserVideoData(): UserVideoData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        videoProgress: {},
        favoriteVideos: [],
        analytics: {},
      };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Erro ao carregar dados de vídeo:', error);
    return {
      videoProgress: {},
      favoriteVideos: [],
      analytics: {},
    };
  }
}

/**
 * Salva dados do usuário no localStorage
 */
function saveUserVideoData(data: UserVideoData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Erro ao salvar dados de vídeo:', error);
  }
}

export function useVideoProgress() {
  const [userData, setUserData] = useState<UserVideoData>(loadUserVideoData);

  // Salva automaticamente quando userData muda
  useEffect(() => {
    saveUserVideoData(userData);
  }, [userData]);

  /**
   * Atualiza progresso de um vídeo
   */
  const updateProgress = useCallback((
    videoId: string,
    currentTime: number,
    duration: number
  ) => {
    const progress = (currentTime / duration) * 100;
    const completed = progress >= 95; // considera completo se assistiu 95%+

    const progressData: VideoProgress = {
      videoId,
      progress,
      currentTime,
      duration,
      lastWatched: new Date().toISOString(),
      completed,
    };

    setUserData(prev => ({
      ...prev,
      videoProgress: {
        ...prev.videoProgress,
        [videoId]: progressData,
      },
    }));
  }, []);

  /**
   * Obtém progresso de um vídeo específico
   */
  const getProgress = useCallback((videoId: string): VideoProgress | null => {
    return userData.videoProgress[videoId] || null;
  }, [userData.videoProgress]);

  /**
   * Obtém vídeos em progresso (iniciados mas não completados)
   */
  const getInProgressVideos = useCallback((): VideoProgress[] => {
    return Object.values(userData.videoProgress)
      .filter(p => !p.completed && p.progress > 0)
      .sort((a, b) => 
        new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime()
      );
  }, [userData.videoProgress]);

  /**
   * Adiciona/remove vídeo dos favoritos
   */
  const toggleFavorite = useCallback((videoId: string) => {
    setUserData(prev => {
      const isFavorite = prev.favoriteVideos.includes(videoId);
      
      return {
        ...prev,
        favoriteVideos: isFavorite
          ? prev.favoriteVideos.filter(id => id !== videoId)
          : [...prev.favoriteVideos, videoId],
      };
    });
  }, []);

  /**
   * Verifica se vídeo está nos favoritos
   */
  const isFavorite = useCallback((videoId: string): boolean => {
    return userData.favoriteVideos.includes(videoId);
  }, [userData.favoriteVideos]);

  /**
   * Registra visualização para analytics
   */
  const trackView = useCallback((
    videoId: string,
    watchTime: number,
    completion: number
  ) => {
    setUserData(prev => {
      const existing = prev.analytics[videoId];
      
      const analytics: VideoAnalytics = {
        videoId,
        views: (existing?.views || 0) + 1,
        totalWatchTime: (existing?.totalWatchTime || 0) + watchTime,
        averageCompletion: existing
          ? (existing.averageCompletion + completion) / 2
          : completion,
        lastViewed: new Date().toISOString(),
        favorites: prev.favoriteVideos.includes(videoId) ? 1 : 0,
      };

      return {
        ...prev,
        analytics: {
          ...prev.analytics,
          [videoId]: analytics,
        },
      };
    });
  }, []);

  /**
   * Obtém analytics de um vídeo
   */
  const getAnalytics = useCallback((videoId: string): VideoAnalytics | null => {
    return userData.analytics[videoId] || null;
  }, [userData.analytics]);

  /**
   * Obtém vídeos mais assistidos (top 10)
   */
  const getMostWatchedVideos = useCallback((): VideoAnalytics[] => {
    return Object.values(userData.analytics)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }, [userData.analytics]);

  /**
   * Limpa progresso de um vídeo específico
   */
  const clearProgress = useCallback((videoId: string) => {
    setUserData(prev => {
      const { [videoId]: removed, ...rest } = prev.videoProgress;
      return {
        ...prev,
        videoProgress: rest,
      };
    });
  }, []);

  /**
   * Limpa todos os dados
   */
  const clearAllData = useCallback(() => {
    const emptyData: UserVideoData = {
      videoProgress: {},
      favoriteVideos: [],
      analytics: {},
    };
    setUserData(emptyData);
    saveUserVideoData(emptyData);
  }, []);

  return {
    // Progress
    updateProgress,
    getProgress,
    getInProgressVideos,
    clearProgress,
    
    // Favorites
    toggleFavorite,
    isFavorite,
    favoriteVideos: userData.favoriteVideos,
    
    // Analytics
    trackView,
    getAnalytics,
    getMostWatchedVideos,
    
    // Utils
    clearAllData,
  };
}
