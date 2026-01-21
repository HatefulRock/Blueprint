import api from './api'

export const vocabService = {
  getWordDetail: async (wordId: number) => {
    const res = await api.get(`/vocab/${wordId}/detail`)
    return res as any
  },
  invalidateWordCache: async (wordId: number) => {
    const res = await api.post(`/vocab/${wordId}/invalidate_cache`)
    return res as any
  },
  bulkCreateCards: async (wordIds: number[], templateId?: number, deckId?: number) => {
    const res = await api.post(`/words/cards/bulk_from_words`, { word_ids: wordIds, template_id: templateId, deck_id: deckId })
    return res as any
  }
}
