import { useState, useEffect } from 'react';
import { TrillhaSession, ConversationMessage, ConsultantType } from '../TrilhaTransformacao/types';

const STORAGE_KEY = 'raio-trilha-sessions';

export function useTrilhaSessions() {
  const [sessions, setSessions] = useState<TrillhaSession[]>([]);
  const [currentSession, setCurrentSession] = useState<TrillhaSession | null>(null);

  // Carregar sessões do localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEY);
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        // Converter strings de data de volta para Date objects
        const sessionsWithDates = parsed.map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined,
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setSessions(sessionsWithDates);
      } catch (error) {
        console.error('Error loading trilha sessions:', error);
      }
    }
  }, []);

  // Salvar sessões no localStorage sempre que mudarem
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const createSession = (consultant: ConsultantType, userId: string): TrillhaSession => {
    const newSession: TrillhaSession = {
      id: Date.now().toString(),
      userId,
      consultant,
      startTime: new Date(),
      messages: [],
      insights: [],
      nextSteps: [],
      emotionalJourney: {
        start: 'inicial',
        end: 'inicial'
      }
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
    return newSession;
  };

  const updateSession = (sessionId: string, updates: Partial<TrillhaSession>) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, ...updates }
        : session
    ));

    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const addMessage = (sessionId: string, message: ConversationMessage) => {
    updateSession(sessionId, {
      messages: [...(sessions.find(s => s.id === sessionId)?.messages || []), message]
    });
  };

  const endSession = (sessionId: string, insights: string[], nextSteps: string[], emotionalJourney: { start: string; end: string; breakthrough?: string }) => {
    updateSession(sessionId, {
      endTime: new Date(),
      insights,
      nextSteps,
      emotionalJourney
    });
  };

  const getSessionById = (sessionId: string): TrillhaSession | undefined => {
    return sessions.find(session => session.id === sessionId);
  };

  const getActiveSessions = (): TrillhaSession[] => {
    return sessions.filter(session => !session.endTime);
  };

  const getCompletedSessions = (): TrillhaSession[] => {
    return sessions.filter(session => session.endTime);
  };

  const getSessionsByConsultant = (consultant: ConsultantType): TrillhaSession[] => {
    return sessions.filter(session => session.consultant === consultant);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
  };

  const clearAllSessions = () => {
    setSessions([]);
    setCurrentSession(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    sessions,
    currentSession,
    setCurrentSession,
    createSession,
    updateSession,
    addMessage,
    endSession,
    getSessionById,
    getActiveSessions,
    getCompletedSessions,
    getSessionsByConsultant,
    deleteSession,
    clearAllSessions
  };
}