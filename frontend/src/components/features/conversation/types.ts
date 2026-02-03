import { TranscriptMessage, PronunciationFeedback } from '../../../types';

// Connection status types
export type ConnectionStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

// Review feedback structure returned from AI analysis
export interface ReviewFeedback {
  overall: string;
  pronunciation: string[];
  grammar: string[];
  vocabulary: string[];
  tips: string[];
}

// Session callbacks for Gemini Live
export interface SessionCallbacks {
  onUserTranscript: (text: string) => void;
  onAiTranscript: (text: string) => void;
  onAudioData: (data: ArrayBuffer) => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onError: (error: string) => void;
}

// Session configuration
export interface SessionConfig {
  scenario: string;
  targetLanguage: string;
  voiceName?: string;
}

// Audio capture options
export interface AudioCaptureOptions {
  targetSampleRate?: number;
  onAudioData?: (pcmData: Int16Array) => void;
}

// Conversation session from backend
export interface ConversationSession {
  id: string;
  scenario: string;
  target_language: string;
  created_at: string;
  messages: ConversationMessageRead[];
}

export interface ConversationMessageRead {
  id: string;
  author: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface ConversationSessionListItem {
  id: string;
  scenario: string;
  target_language: string;
  created_at: string;
  message_count: number;
}

// Re-export for convenience
export type { TranscriptMessage, PronunciationFeedback };
