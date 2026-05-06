// ============================================================================
// 📊 RAYO ECOSYSTEM - ANALYTICS HOOKS
// React Hooks para facilitar tracking em componentes
// ============================================================================

import { useEffect, useRef } from 'react';
import { analytics } from '../lib/analytics/mixpanel';

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useAnalytics() {
  return analytics;
}

// ============================================
// PAGE VIEW TRACKING
// ============================================

export function usePageView(pageName: string, properties?: any) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      analytics.trackScreenViewed(pageName, properties);
      hasTracked.current = true;
    }
  }, [pageName, properties]);
}

// ============================================
// TIME TRACKING (Quanto tempo na página)
// ============================================

export function useTimeTracking(eventName: string, properties?: any) {
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    return () => {
      const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
      analytics.track(eventName, {
        ...properties,
        time_spent_seconds: timeSpent,
      });
    };
  }, [eventName, properties]);
}

// ============================================
// SESSION TRACKING (Leitura de livros, etc)
// ============================================

export function useSessionTracking(
  sessionType: 'book_reading' | 'course_lesson' | 'ai_conversation',
  sessionData: any
) {
  const startTime = useRef<number>(Date.now());
  const sessionRef = useRef<any>(sessionData);

  useEffect(() => {
    sessionRef.current = sessionData;
  }, [sessionData]);

  useEffect(() => {
    return () => {
      const duration = Math.floor((Date.now() - startTime.current) / 1000);
      
      switch (sessionType) {
        case 'book_reading':
          analytics.trackBookReadingSession(
            sessionRef.current.bookId,
            sessionRef.current.chapterId,
            duration,
            sessionRef.current.pagesRead || 0,
            sessionRef.current.mode || 'read'
          );
          break;
        // Adicionar outros tipos conforme necessário
      }
    };
  }, [sessionType]);
}

// ============================================
// SCROLL DEPTH TRACKING
// ============================================

export function useScrollDepth(pageName: string) {
  useEffect(() => {
    let maxDepth = 0;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      const depth = Math.floor(((scrollTop + windowHeight) / documentHeight) * 100);
      
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      
      // Track ao sair
      if (maxDepth > 0) {
        analytics.track('SCROLL_DEPTH', {
          page_name: pageName,
          max_depth_percentage: maxDepth,
        });
      }
    };
  }, [pageName]);
}

// ============================================
// CLICK TRACKING
// ============================================

export function useClickTracking(elementName: string, onClick?: () => void) {
  return () => {
    analytics.track('ELEMENT_CLICKED', {
      element_name: elementName,
    });
    
    if (onClick) {
      onClick();
    }
  };
}

// ============================================
// EXPERIMENT TRACKING (A/B Tests)
// ============================================

export function useExperiment(experimentKey: string, variant: string) {
  useEffect(() => {
    analytics.track('EXPERIMENT_VIEWED', {
      experiment_key: experimentKey,
      variant: variant,
    });
  }, [experimentKey, variant]);
}
