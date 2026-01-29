import { RefObject, useCallback } from 'react';
import { Selection } from '../types';
import { useReading } from '../context/ReadingContext';
import { findContextSentence } from '../utils';

/**
 * Custom hook for handling text selection in reading sessions
 */
export const useTextSelection = (contentRef?: RefObject<HTMLElement>) => {
  const { selection, setSelection, activeReadingText } = useReading();

  const handleTextSelect = useCallback(() => {
    const windowSelection = window.getSelection();
    const selectedText = windowSelection?.toString().trim();

    if (!selectedText) {
      setSelection(null);
      return;
    }

    const type = selectedText.includes(' ') ? 'sentence' : 'word';

    // Extract context sentence from the active reading content
    const contextSentence = activeReadingText
      ? findContextSentence(activeReadingText.content, selectedText)
      : selectedText;

    const newSelection: Selection = {
      text: selectedText,
      type: type as 'word' | 'sentence',
      contextSentence,
    };

    setSelection(newSelection);
  }, [setSelection, activeReadingText]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [setSelection]);

  return {
    selection,
    handleTextSelect,
    clearSelection,
  };
};
