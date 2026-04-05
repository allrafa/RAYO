export type ConsultantType = 'jessica' | 'rafa';

export type OrbState = 'idle' | 'listening' | 'speaking' | 'processing';

export interface ConversationState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  isMuted: boolean;
  audioLevel: number;
  transcriptionText: string;
  consultant: ConsultantType;
}

export interface ConsultantProfile {
  name: string;
  description: string;
  specialties: string[];
  personality: string;
  voiceStyle: {
    tone: string;
    pace: string;
    warmth: string;
  };
  visualStyle: {
    gradient: string;
    pulseColor: string;
    activeColor: string;
  };
}

export interface ConversationMessage {
  id: string;
  text: string;
  speaker: 'user' | 'consultant';
  timestamp: Date;
  emotion?: string;
  audioUrl?: string;
}

export interface TrillhaSession {
  id: string;
  userId: string;
  consultant: ConsultantType;
  startTime: Date;
  endTime?: Date;
  messages: ConversationMessage[];
  insights: string[];
  nextSteps: string[];
  emotionalJourney: {
    start: string;
    end: string;
    breakthrough?: string;
  };
}