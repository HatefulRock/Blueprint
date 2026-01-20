import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// unwrap response to return data directly
api.interceptors.response.use((response) => response.data, (error) => Promise.reject(error));
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
  getUser: (id: number) => api.get(`/users/${id}`),
  checkIn: (id: number) => api.post(`/users/${id}/check-in`),
  getProgress: (id: number) => api.get(`/users/${id}/progress`),
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
