/**
 * RAIO - YouTube Data Hook
 * Hook para gerenciar dados do YouTube com cache e estado
 */

import { useState, useEffect } from 'react';
import { fetchYouTubeData } from '../youtube/YouTubeService';
import { YouTubeCache } from '../youtube/YouTubeTypes';

interface UseYouTubeDataReturn {
  data: YouTubeCache | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useYouTubeData(autoFetch = true): UseYouTubeDataReturn {
  const [data, setData] = useState<YouTubeCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const youtubeData = await fetchYouTubeData(forceRefresh);
      setData(youtubeData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar dados do YouTube'));
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadData(true);
  };

  useEffect(() => {
    if (autoFetch) {
      loadData();
    }
  }, [autoFetch]);

  return { data, loading, error, refresh };
}
