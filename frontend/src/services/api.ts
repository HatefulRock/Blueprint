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
  getWordsByDeck: (deckId: number) => api.get(`/words/deck/${deckId}`),
  addWord: (wordData: any) => api.post("/words/", wordData),
  reviewWord: (wordId: number, rating: number) =>
    api.patch(`/words/${wordId}/review`, null, { params: { rating } }),
  // Deck import (multipart)
  importDeck: (formData: FormData) => api.post(`/words/decks/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Cards and templates
  getDueCards: (deckId: number) => api.get(`/words/cards/due/${deckId}`),
  getCardsForDeck: (deckId: number) => api.get(`/words/cards/deck/${deckId}`),
  reviewCard: (cardId: number, rating: number) => api.post(`/words/cards/${cardId}/review`, { rating }),
  createCardFromWord: (wordId: number, templateId?: number) => api.post(`/words/cards/from_word/${wordId}`, { template_id: templateId }),
  bulkCreateFromDeck: (deckId: number, templateId?: number) => api.post(`/words/cards/from_deck/${deckId}`, { template_id: templateId }),
  getTemplates: (userId: number) => api.get(`/words/templates/${userId}`),
  createTemplate: (data: any) => api.post(`/words/templates`, data),
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
