import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

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
  getUser: (id: number) => api.get(`/users/${id}`),
  checkIn: (id: number) => api.post(`/users/${id}/check-in`),
  getProgress: (id: number) => api.get(`/users/${id}/progress`),

  // Language management
  addUserLanguage: (userId: number, payload: { code: string; name: string }) =>
    api.post(`/users/${userId}/languages`, payload),
  removeUserLanguage: (userId: number, code: string) =>
    api.delete(`/users/${userId}/languages/${encodeURIComponent(code)}`),
  setDefaultLanguage: (userId: number, code: string) =>
    api.post(`/users/${userId}/default-language`, { code }),

  // Settings persistence
  getSettings: (userId: number) => api.get(`/users/${userId}/settings`),
  updateSettings: (userId: number, payload: any) => api.post(`/users/${userId}/settings`, payload),
  updateReaderSettings: (userId: number, payload: any) => api.post(`/users/${userId}/reader-settings`, payload),
};

export const wordService = {
  getWordsByDeck: async (deckId: number) => {
    const res = await api.get(`/words/deck/${deckId}`);
    return res as any;
  },
  addWord: async (wordData: any) => {
    const res = await api.post("/words/", wordData);
    return res as any;
  },
  reviewWord: async (wordId: number, rating: number) => {
    const res = await api.patch(`/words/${wordId}/review`, null, { params: { rating } });
    return res as any;
  },
  // Deck import (multipart)
  importDeck: async (formData: FormData) => {
    const res = await api.post(`/words/decks/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res as any;
  },
  // Decks
  getDecks: async (userId: number) => {
    const res = await api.get(`/words/decks/${userId}`);
    return res as any;
  },
  createDeck: async (payload: any) => {
    const res = await api.post(`/words/decks`, payload);
    return res as any;
  },
  // Study session
  createStudySession: async (payload: any) => {
    const res = await api.post(`/practice/session`, payload);
    return res as any;
  },

  // Cards and templates
  getDueCards: async (deckId: number) => {
    const res = await api.get(`/words/cards/due/${deckId}`);
    return res as any;
  },
  getCardsForDeck: async (deckId: number) => {
    const res = await api.get(`/words/cards/deck/${deckId}`);
    return res as any;
  },
  reviewCard: async (cardId: number, rating: number, session_id?: number | null) => {
    const payload: any = { rating };
    if (session_id) payload.session_id = session_id;
    const res = await api.post(`/words/cards/${cardId}/review`, payload);
    return res as any;
  },
  createCardFromWord: async (wordId: number, templateId?: number) => {
    const res = await api.post(`/words/cards/from_word/${wordId}`, { template_id: templateId });
    return res as any;
  },
  bulkCreateFromDeck: async (deckId: number, templateId?: number) => {
    const res = await api.post(`/words/cards/from_deck/${deckId}`, { template_id: templateId });
    return res as any;
  },
  getTemplates: async (userId: number) => {
    const res = await api.get(`/words/templates/${userId}`);
    return res as any;
  },
  createTemplate: async (data: any) => {
    const res = await api.post(`/words/templates`, data);
    return res as any;
  },
};

export const aiService = {
  analyzeText: (text: string, lang: string) =>
    api.post("/ai/analyze", { text, target_language: lang }),

  textToSpeech: (text: string, lang: string) =>
    api.post("/ai/tts", { text, language: lang }),

  // Conversation endpoints
  sendMessage: (payload: any) => api.post(`/conversation/message`, payload),
  sendAudio: (formData: FormData) => api.post(`/conversation/audio`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const dashboardService = {
  getDashboard: (userId: number) => api.get(`/users/${userId}/dashboard`),
};

export const contentService = {
  // Import from URL (Scraper)
  importUrl: (url: string, userId: number) =>
    api.post("/content/import", { url, user_id: userId }),

  // Get all saved articles
  getUserContent: (userId: number) => api.get(`/content/user/${userId}`),

  // Save manually pasted text
  saveManualContent: (title: string, content: string, userId: number) =>
    api.post("/content/", { title, content, user_id: userId }),

  deleteContent: (contentId: number) => {
    return api.delete(`/content/${contentId}`);
  },
};

export default api;
