
export interface Word {
  term: string;
  context: string;
  familiarityScore: number; // 1-5 scale
  language: string; // e.g., 'Spanish', 'French'
  deckId?: number; // Optional link to a specific deck
  analysis: { // The saved analysis must be complete
    translation: string;
    literalTranslation: string;
    grammaticalBreakdown: string;
  };
  imageUrl?: string; // Optional URL for AI-generated mnemonic image
  nextReviewDate?: string; // ISO date string for SRS
  lastReviewedDate?: string; // ISO date string
}

export interface AnalysisResult {
  translation: string;
  partOfSpeech?: string;
  literalTranslation?: string;
  grammaticalBreakdown?: string;
  wordBreakdown?: Array<{
    term: string;
    translation: string;
    partOfSpeech: string;
  }>;
}

export interface GrammarCheckResult {
  corrected: string;
  explanation: string;
  isCorrect: boolean;
}

export interface TranslationEvaluation {
  isCorrect: boolean;
  feedback: string;
}

export interface UserProfile {
  // points: number;
  // streak: number;
  goalProgress: GoalProgress;
}

export enum View {
  Reader = 'reader',
  Vocabulary = 'vocabulary',
  Flashcards = 'flashcards',
  Conversation = 'conversation',
  Dashboard = 'dashboard',
  Practice = 'practice',
  // Leaderboard = 'leaderboard',
  ReadingSession = 'reading_session',
  // Profile = 'profile',
}

export interface Selection {
  text: string;
  type: 'word' | 'sentence';
}

export interface PronunciationFeedback {
  score: number; // 0-100
  feedbackText: string;
  mispronouncedWords: Array<{
    word: string;
    error: string; // e.g. "Silent H", "Wrong Stress"
    correction: string; // phonetic or tip
  }>;
  intonationTip?: string;
  fluencyScore?: number;
}

export interface TranscriptMessage {
  id: number;
  author: 'user' | 'ai';
  text: string;
  feedback?: PronunciationFeedback;
  isLoadingFeedback?: boolean;
  audioData?: string; // Base64 WAV for analysis context
}

/*
export interface Achievement {
  id: string;
  name: string;
  description: string;
}
*/

export interface CuratedText {
  id: string;
  title: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  content: string;
  language: string;
}

export interface ActiveReadingText {
  id?: string;
  title: string;
  content: string;
}


export interface Goals {
  wordsPerWeek: number;
  practiceSessionsPerWeek: number;
}

export interface GoalProgress {
  newWordsThisWeek: number;
  practiceSessionsThisWeek: number;
  weekStartDate: string; // ISO string
}

export type AnalysisDisplayMode = 'panel' | 'popup';

export type ExerciseType = 'fill-the-blank' | 'scramble' | 'translate';

export interface Exercise {
  word: Word;
  type: ExerciseType;
}

export interface Deck {
  id: number;
  name: string;
  language: string;
  wordCount: number;
}


export interface StudyTask {
  id: string;
  title: string;
  description: string;
  type: 'flashcards' | 'practice' | 'read' | 'conversation';
  targetView: View;
  isCompleted: boolean;
  metadata?: {
    textId?: string;
    wordCount?: number;
  };
}

export interface StudyPlan {
  date: string;
  tasks: StudyTask[];
  summary: string;
}

export interface LanguageOption {
    code: string;
    name: string;
}