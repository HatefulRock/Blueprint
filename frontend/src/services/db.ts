
import { Word, UserProfile, Goals, /*LeaderboardUser,*/ StudyPlan, View, Deck } from '../types';
// import { LEADERBOARD_DATA } from '../data/leaderboardData';

const now = new Date();
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
const dueTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
const duePast = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

const MOCK_DECKS: Deck[] = [
    { id: 1, name: "Core Spanish Verbs", language: "Spanish", wordCount: 4 },
    { id: 2, name: "Basic Chinese", language: "Chinese", wordCount: 2 }
];

const MOCK_WORD_BANK: Word[] = [
  {
    term: 'hola',
    context: 'Hola. Me llamo Juan.',
    familiarityScore: 3,
    language: 'Spanish',
    deckId: 1,
    nextReviewDate: dueTomorrow,
    lastReviewedDate: oneDayAgo,
    analysis: {
      translation: 'hello',
      literalTranslation: 'hello',
      grammaticalBreakdown: 'Interjection used as a greeting.',
    },
  },
  {
    term: 'familia',
    context: 'Esta es mi familia.',
    familiarityScore: 2,
    language: 'Spanish',
    deckId: 1,
    nextReviewDate: duePast, // Due now
    analysis: {
      translation: 'family',
      literalTranslation: 'family',
      grammaticalBreakdown: 'Feminine noun. Refers to a group of one or more parents and their children living together as a unit.',
    },
  },
  {
    term: 'casa',
    context: 'Vivimos en una casa grande y azul.',
    familiarityScore: 4,
    language: 'Spanish',
    deckId: 1,
    nextReviewDate: dueTomorrow,
    analysis: {
      translation: 'house',
      literalTranslation: 'house',
      grammaticalBreakdown: 'Feminine noun. A building for human habitation.',
    },
  },
  {
    term: 'perro',
    context: 'Tenemos un perro.',
    familiarityScore: 5,
    language: 'Spanish',
    deckId: 1,
    nextReviewDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    analysis: {
        translation: 'dog',
        literalTranslation: 'dog',
        grammaticalBreakdown: 'Masculine noun. A domesticated carnivorous mammal that typically has a long snout, an acute sense of smell, and a barking, howling, or whining voice.'
    }
  },
  {
    term: '你好',
    context: '你好。我叫李华。',
    familiarityScore: 1,
    language: 'Chinese',
    deckId: 2,
    nextReviewDate: duePast, // Due
    analysis: {
      translation: 'hello',
      literalTranslation: 'you good',
      grammaticalBreakdown: 'Common greeting. Composed of 你 (you) and 好 (good).',
    },
  },
  {
    term: '家庭',
    context: '这是我的家庭。',
    familiarityScore: 2,
    language: 'Chinese',
    deckId: 2,
    nextReviewDate: duePast, // Due
    analysis: {
      translation: 'family',
      literalTranslation: 'home court',
      grammaticalBreakdown: 'Noun. Refers to family or household.',
    },
  }
];

const MOCK_USER_PROFILE: UserProfile = {
  // points: 1250,
  // streak: 5,
  goalProgress: {
    newWordsThisWeek: 8,
    practiceSessionsThisWeek: 2,
    weekStartDate: new Date().toISOString(),
  },
};

const MOCK_GOALS: Goals = {
  wordsPerWeek: 15,
  practiceSessionsPerWeek: 4,
};

/*
const MOCK_ACHIEVEMENTS: Record<string, boolean> = {
  'FIRST_WORD': true,
  'TEN_WORDS': false,
  'GOAL_SETTER': true,
};
*/

const MOCK_STUDY_PLAN: StudyPlan = {
    date: new Date().toISOString(),
    summary: "Today's focus is on reinforcing your recent vocabulary and trying it out in a real conversation. Let's build both your knowledge and confidence!",
    tasks: [
        {
            id: 'task-1',
            title: "Review 10 Flashcards",
            description: "Strengthen your memory of recently learned words.",
            type: 'flashcards',
            targetView: View.Flashcards,
            isCompleted: false,
        },
        {
            id: 'task-2',
            title: "Read 'Un Día en la Ciudad'",
            description: "Practice your reading comprehension with a short story.",
            type: 'read',
            targetView: View.Reader,
            isCompleted: false,
            metadata: { textId: 'a2-1' }
        },
        {
            id: 'task-3',
            title: "Practice Ordering at a Café",
            description: "Use your vocabulary in a simulated conversation.",
            type: 'conversation',
            targetView: View.Conversation,
            isCompleted: false,
        }
    ]
}

// Simulate a simple in-memory database
export const db = {
  words: [...MOCK_WORD_BANK],
  decks: [...MOCK_DECKS],
  userProfile: { ...MOCK_USER_PROFILE },
  goals: { ...MOCK_GOALS },
  // achievements: { ...MOCK_ACHIEVEMENTS },
  // leaderboard: [...LEADERBOARD_DATA],
  studyPlan: {...MOCK_STUDY_PLAN }
};
