// Backend Word model (matches backend schema with snake_case)
export interface Word {
  id: string;
  term: string;
  context: string | null;
  translation: string | null;
  part_of_speech: string | null;
  grammatical_breakdown: string | null;
  literal_translation: string | null;
  deck_id: string;
  reading_content_id: string | null;
  encounters: number;
  status: string; // "new" | "seen" | "learned"
  familiarity_score: number;
  next_review_date: string; // ISO datetime string
  last_reviewed_date: string | null; // ISO datetime string
}

export interface UsageExample {
  example: string;
  translation: string;
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
    pinyin?: string;
  }>;
  difficultyLevel?: string;
  usageExamples?: UsageExample[];
  memoryAid?: string;
  relatedWords?: string[];
  contextSentence?: string;
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
  Writing = 'writing',
  Grammar = 'grammar',
  Analytics = 'analytics',
  // Leaderboard = 'leaderboard',
  ReadingSession = 'reading_session',
  Settings = 'settings',
  // Profile = 'profile',

  // Gemini 3 Showcase Features
  Showcase = 'showcase',
  VideoLearning = 'video_learning',
  DeepReading = 'deep_reading',
}

export interface Selection {
  text: string;
  type: 'word' | 'sentence';
  contextSentence?: string;
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
  timestamp?: Date;
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

// Backend Deck model (matches backend schema)
export interface Deck {
  id: string;
  user_id: string;
  name: string;
  language: string;
  default_template_id: string | null;
  created_at: string;
  updated_at: string;
}

// Backend Card model (matches backend schema)
export interface Card {
  id: string;
  deck_id: string;
  template_id: string | null;
  front: string;
  back: string;
  word_id: string | null;
  repetition: number;
  easiness_factor: number;
  interval: number;
  next_review_date: string;
  last_reviewed_date: string | null;
}

// Backend WordContext model (matches backend schema)
export interface WordContext {
  id: string;
  word_id: string;
  reading_content_id: string | null;
  sentence: string;
  created_at: string;
}

// Backend ReadingContent model (matches backend schema)
export interface ReadingContent {
  id: string;
  title: string;
  content: string;
  source_url: string | null;
  difficulty_score: string | null;
  created_at: string;
}

// API response for vocab capture
export interface VocabCaptureResponse {
  action: "created" | "updated";
  word: Word;
}

// API response for word detail
export interface VocabWordDetailResponse {
  word: Word;
  contexts: WordContext[];
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

// Grammar Exercise types
export type GrammarExerciseType = 'fill_blank' | 'transformation' | 'multiple_choice' | 'correction';

export interface GrammarExercise {
  id: string;
  exercise_set_id: string;
  exercise_type: GrammarExerciseType;
  question: string;
  correct_answer: string;
  options: string | null; // JSON string array for multiple choice
  explanation: string | null;
  grammar_point: string | null;
  attempts: number;
  correct_attempts: number;
  last_attempted: string | null;
  created_at: string;
}

export interface GrammarExerciseSet {
  id: string;
  user_id: string;
  reading_content_id: string | null;
  title: string;
  language: string;
  difficulty_level: string | null;
  source_text: string | null;
  total_exercises: number;
  completed_exercises: number;
  created_at: string;
  exercises: GrammarExercise[];
}

export interface GenerateExercisesRequest {
  text: string;
  language: string;
  difficulty_level?: string;
  exercise_types?: GrammarExerciseType[];
  num_exercises?: number;
}

export interface CheckAnswerRequest {
  exercise_id: string;
  user_answer: string;
}

export interface CheckAnswerResponse {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  user_answer: string;
}