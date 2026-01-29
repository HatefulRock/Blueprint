import { useCallback } from 'react';
import { useVocabulary } from '../context';
import { useToast } from '../context/ToastContext';
import { useReading } from '../context/ReadingContext';
import { findContextSentence } from '../utils';

/**
 * Custom hook for managing word operations like saving from reader
 */
export const useWordManagement = () => {
  const { refreshWords } = useVocabulary();
  const { showToast } = useToast();
  const { activeReadingText } = useReading();

  const saveWordFromReader = useCallback(
    async (wordData: any) => {
      if (!activeReadingText) return;

      // Ensure we have context. If not provided, find it in the text.
      const context =
        wordData.context || findContextSentence(activeReadingText.content, wordData.term);

      // Prepare payload for /vocab/capture
      const payload = {
        term: wordData.term,
        deck_id: wordData.deck_id || wordData.deckId || null,
        context: context,
        reading_content_id: activeReadingText.id || undefined,
        analysis: wordData.analysis || undefined,
      };

      try {
        // Get auth token from localStorage
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Try new endpoint first
        const response = await fetch(`http://localhost:8000/vocab/capture`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          showToast({
            type: 'success',
            message: `✓ "${wordData.term}" added to vocabulary`,
          });
          await refreshWords();
          return;
        }
        throw new Error('Failed to save word');
      } catch (e) {
        // Fallback to legacy endpoint
        try {
          const token = localStorage.getItem('authToken');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`http://localhost:8000/words`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...payload, deck_id: payload.deck_id }),
          });

          if (response.ok) {
            showToast({
              type: 'success',
              message: `✓ "${wordData.term}" added to vocabulary`,
            });
            await refreshWords();
          } else {
            throw new Error('Failed to save word');
          }
        } catch (err) {
          console.error('Failed to save word to server', err);
          showToast({
            type: 'error',
            message: `Failed to save "${wordData.term}"`,
          });
        }
      }
    },
    [activeReadingText, refreshWords, showToast]
  );

  return { saveWordFromReader };
};
