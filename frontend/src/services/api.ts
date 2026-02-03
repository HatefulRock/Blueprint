import axios from "axios";

//const API_BASE_URL = "http://localhost:8000";
const API_BASE_URL = "https://blueprint-qubr.vercel.app";

type ID = string | number;


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach Authorization header from localStorage if present
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = config.headers || ({} as any);
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
}, (error) => Promise.reject(error));

// unwrap response to return data directly and normalize dashboard payloads
api.interceptors.response.use((response) => {
  const data = response.data;

  // Normalize known dashboard shape to avoid nulls and awkward strings client-side
  try {
    if (data && typeof data === 'object') {
      if (data.progress) {
        data.progress.newWordsThisWeek = data.progress.newWordsThisWeek ?? 0;
        data.progress.practiceSessionsThisWeek = data.progress.practiceSessionsThisWeek ?? 0;
        data.progress.wordsGoal = data.progress.wordsGoal ?? 20;
        data.progress.sessionsGoal = data.progress.sessionsGoal ?? 3;
      }

      if (data.studyPlan && typeof data.studyPlan.summary === 'string') {
        // Replace obvious placeholders like 'None' or 'null' with numeric values
        const count = data.progress?.newWordsThisWeek ?? 0;
        data.studyPlan.summary = data.studyPlan.summary.replace(/\b(None|null)\b/gi, String(count));
        // If summary becomes empty or still unsatisfying, fallback to a safe generated summary
        if (!data.studyPlan.summary || data.studyPlan.summary.trim().length === 0) {
          data.studyPlan.summary = `You're doing great! You've learned ${count} words this week.`;
        }
      }
    }
  } catch (e) {
    // If normalization fails, just return the original data
    console.error('Response normalization failed', e);
  }

  return data;
}, (error) => {
  // If unauthorized, clear stored token
  if (error && error.response && error.response.status === 401) {
    try { localStorage.removeItem('authToken'); } catch (e) {}
  }
  return Promise.reject(error);
});
api.defaults.headers.post['Content-Type'] = 'application/json';

// We will export a typed wrapper that returns the axios response data directly
export type ApiResponse<T> = Promise<T>;

export const apiRequest = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
apiRequest.interceptors.response.use((response) => response.data, (error) => Promise.reject(error));


export const userService = {
  // Auth endpoints
  register: (payload: { username: string; password: string }) => api.post('/auth/register', payload),
  login: (payload: { username: string; password: string }) => api.post('/auth/login', payload),

  // Protected user/profile calls (require Authorization header)
  getProfile: () => api.get(`/users/me`),
  getStats: () => api.get(`/users/stats`),
  checkIn: () => api.post(`/users/check-in`),
  getProgress: () => api.get(`/users/progress`),

  // Language management
  addUserLanguage: (payload: { code: string; name: string }) =>
    api.post(`/users/languages`, payload),
  removeUserLanguage: (code: string) =>
    api.delete(`/users/languages/${encodeURIComponent(code)}`),
  setDefaultLanguage: (code: string) =>
    api.post(`/users/default-language`, { code }),

  // Settings persistence
  getSettings: () => api.get(`/users/settings`),
  updateSettings: (payload: any) => api.post(`/users/settings`, payload),
  updateReaderSettings: (payload: any) => api.post(`/users/reader-settings`, payload),
};

export const templateService = {
  getTemplates: async () => {
    const res = await api.get(`/templates/`);
    return res as any;
  },
  createTemplate: async (templateData: any) => {
    const res = await api.post(`/templates/`, templateData);
    return res as any;
  },
  updateTemplate: async (templateId: ID, templateData: any) => {
    const res = await api.patch(`/templates/${templateId}`, templateData);
    return res as any;
  },
  deleteTemplate: async (templateId: ID) => {
    const res = await api.delete(`/templates/${templateId}`);
    return res as any;
  },
  previewTemplate: async (templateId: ID) => {
    const res = await api.get(`/templates/${templateId}/preview`);
    return res as any;
  },
};

export const wordService = {
  getAllWords: async () => {
    const res = await api.get(`/words/`);
    return res as any;
  },
  getWordsByDeck: async (deckId: ID) => {
    const res = await api.get(`/words/deck/${deckId}`);
    return res as any;
  },
  addWord: async (wordData: any) => {
    const res = await api.post("/words/", wordData);
    return res as any;
  },
  deleteWord: async (wordId: ID) => {
    const res = await api.delete(`/words/${wordId}`);
    return res as any;
  },
  bulkDeleteWords: async (wordIds: ID[]) => {
    const res = await api.post(`/words/bulk_delete`, { word_ids: wordIds });
    return res as any;
  },
  updateWord: async (wordId: ID, data: any) => {
    const res = await api.patch(`/words/${wordId}`, data);
    return res as any;
  },
  reviewWord: async (wordId: ID, rating: number) => {
    const res = await api.patch(`/words/${wordId}/review`, null, { params: { rating } });
    return res as any;
  },
  // Deck import (multipart)
  importDeck: async (formData: FormData) => {
    const res = await api.post(`/words/decks/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res as any;
  },
  // Decks
  getDecks: async () => {
    const res = await api.get(`/words/decks`);
    return res as any;
  },
  createDeck: async (payload: any) => {
    // Remove user_id from payload as it will come from current_user
    const { user_id, ...rest } = payload;
    const res = await api.post(`/words/decks`, rest);
    return res as any;
  },
  updateDeck: async (deckId: ID, payload: any) => {
    const res = await api.patch(`/words/decks/${deckId}`, payload);
    return res as any;
  },
  // Study session
  createStudySession: async (payload: any) => {
    const res = await api.post(`/practice/session`, payload);
    return res as any;
  },

  // Cards and templates
  getDueCards: async (deckId: ID) => {
    const res = await api.get(`/words/cards/due/${deckId}`);
    return res as any;
  },
  getCardsForDeck: async (deckId: ID) => {
    const res = await api.get(`/words/cards/deck/${deckId}`);
    return res as any;
  },
  reviewCard: async (cardId: ID, rating: number, session_id?: number | null) => {
    const payload: any = { rating };
    if (session_id) payload.session_id = session_id;
    const res = await api.post(`/words/cards/${cardId}/review`, payload);
    return res as any;
  },
  createCardFromWord: async (wordId: ID, templateId?: ID) => {
    const res = await api.post(`/words/cards/from_word/${wordId}`, { template_id: templateId });
    return res as any;
  },
  bulkCreateFromDeck: async (deckId: ID, templateId?: ID) => {
    const res = await api.post(`/words/cards/from_deck/${deckId}`, { template_id: templateId });
    return res as any;
  },
  // New utility to bulk-create cards from a list of word IDs (server will link word_id)
  bulkCreateFromWordIds: async (wordIds: ID[], templateId?: ID, deckId?: ID) => {
    const res = await api.post(`/words/cards/bulk_from_words`, { word_ids: wordIds, template_id: templateId, deck_id: deckId });
    return res as any;
  },
  getTemplates: async () => {
    const res = await api.get(`/words/templates`);
    return res as any;
  },
  createTemplate: async (data: any) => {
    const res = await api.post(`/words/templates`, data);
    return res as any;
  },
};

export const aiService = {
  analyzeText: (text: string, lang: string, contextSentence?: string) =>
    api.post("/ai/analyze", {
      text,
      target_language: lang,
      context_sentence: contextSentence
    }),

  textToSpeech: (text: string, lang: string) =>
    api.post("/ai/tts", { text, language: lang }),

  // Conversation endpoints
  sendMessage: (payload: any) => api.post(`/conversation/message`, payload),
  sendAudio: (formData: FormData) => api.post(`/conversation/audio`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Dictionary lookup via backend cache
  lookup: (term: string, targetLanguage: string, nativeLanguage?: string) =>
    api.get(`/dictionary/lookup`, { params: { term, target_language: targetLanguage, native_language: nativeLanguage } }),
};

export const dashboardService = {
  getDashboard: () => api.get(`/users/dashboard`),
};

export const contentService = {
  // Import from URL (Scraper)
  importUrl: (url: string, targetLanguage?: string) =>
    api.post("/content/import", { url, target_language: targetLanguage }),

  // Get all saved articles
  getUserContent: () => api.get(`/content/`),

  // Save manually pasted text
  saveManualContent: (title: string, content: string) =>
    api.post("/content/", { title, content }),

  deleteContent: (contentId: ID) => {
    return api.delete(`/content/${contentId}`);
  },
};

export const grammarService = {
  // Generate exercises from text
  generateExercises: (payload: any) =>
    api.post("/grammar/generate", payload),

  // Get all exercise sets
  getExerciseSets: () => api.get("/grammar/sets"),

  // Get specific exercise set with exercises
  getExerciseSet: (setId: ID) => api.get(`/grammar/sets/${setId}`),

  // Check answer
  checkAnswer: (payload: { exercise_id: ID; user_answer: string }) =>
    api.post("/grammar/check", payload),

  // Delete exercise set
  deleteExerciseSet: (setId: ID) => api.delete(`/grammar/sets/${setId}`),
  // Get progress for exercise set
  getProgress: (setId: ID) => api.get(`/grammar/sets/${setId}/progress`),
};

export const analyticsService = {
  // Get comprehensive progress insights
  getProgressInsights: (days: number = 30) =>
    api.get("/analytics/progress", { params: { days } }),

  // Get weak areas analysis
  getWeakAreas: () => api.get("/analytics/weak-areas"),

  // Get activity heatmap data
  getActivityHeatmap: (days: number = 90) =>
    api.get("/analytics/heatmap", { params: { days } }),

  // Get practice statistics (legacy endpoint)
  getPracticeStats: (userId: ID, dateFrom?: string, dateTo?: string) =>
    api.get("/analytics/practice", {
      params: { user_id: userId, date_from: dateFrom, date_to: dateTo },
    }),
};

export const conversationService = {
  // Create a new conversation session
  createSession: (payload: { scenario: string; target_language: string }) =>
    api.post("/conversation/sessions", payload),

  // List user's conversation sessions
  listSessions: (limit: number = 20, offset: number = 0) =>
    api.get("/conversation/sessions", { params: { limit, offset } }),

  // Get a specific session with messages
  getSession: (sessionId: string) =>
    api.get(`/conversation/sessions/${sessionId}`),

  // Save messages to a session
  saveMessages: (sessionId: string, messages: Array<{ author: string; text: string }>) =>
    api.post(`/conversation/sessions/${sessionId}/messages`, messages),

  // Delete a session
  deleteSession: (sessionId: string) =>
    api.delete(`/conversation/sessions/${sessionId}`),

  // Get live config (API key and model)
  getLiveConfig: () => api.get("/conversation/live-config"),
};

export default api;
