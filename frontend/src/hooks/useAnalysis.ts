import { useCallback } from 'react';
import { useReading } from '../context/ReadingContext';
import { useSettings } from '../context/SettingsContext';
import { findContextSentence } from '../utils';

/**
 * Custom hook for text analysis operations
 */
export const useAnalysis = () => {
  const {
    analysisResult,
    isLoadingAnalysis,
    isDeepLoading,
    selection,
    requestDeepAnalysis: contextRequestDeepAnalysis,
    activeReadingText,
  } = useReading();
  const { targetLanguage } = useSettings();

  const requestDeepAnalysis = useCallback(async () => {
    if (!selection) return;

    const context =
      selection.type === 'word'
        ? findContextSentence(activeReadingText?.content ?? '', selection.text)
        : selection.text;

    try {
      await contextRequestDeepAnalysis(selection.text, context);
    } catch (e) {
      console.error('Deep analysis request failed', e);
      throw e;
    }
  }, [selection, activeReadingText, contextRequestDeepAnalysis]);

  return {
    analysisResult,
    isLoadingAnalysis,
    isDeepLoading,
    requestDeepAnalysis,
    targetLanguage,
  };
};
