import { useState } from 'react';
import { wordService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Deck } from '../types';

type ID = string | number;

interface ExtendedDeck extends Omit<Deck, 'id'> {
  id: ID;
  [key: string]: any;
}

export const useVocabularyOperations = (refreshWords?: () => Promise<void>) => {
  const { showToast } = useToast();
  const [selectedWords, setSelectedWords] = useState<Record<string, boolean>>({});
  const [decks, setDecks] = useState<ExtendedDeck[]>([]);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [wordsToAssign, setWordsToAssign] = useState<ID[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);

  const toggleSelectWord = (wordId?: ID) => {
    if (!wordId) return;
    const key = String(wordId);
    setSelectedWords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearSelection = () => setSelectedWords({});

  const getSelectedWordIds = (): string[] => {
    return Object.keys(selectedWords).filter((k) => selectedWords[k]);
  };

  const handleDeleteWord = async (wordId: ID, wordTerm: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${wordTerm}"? This will also delete any flashcards associated with this word.`
      )
    ) {
      return;
    }

    try {
      await wordService.deleteWord(wordId);

      showToast({
        type: 'success',
        message: `Deleted "${wordTerm}" and associated cards`,
      });

      // Refresh the word list
      if (refreshWords) {
        await refreshWords();
      }
    } catch (e) {
      console.error('Failed to delete word', e);
      showToast({ type: 'error', message: 'Failed to delete word' });
    }
  };

  const handleBulkDelete = async () => {
    const selectedIds = getSelectedWordIds();
    if (selectedIds.length === 0) {
      showToast({ type: 'info', message: 'No words selected' });
      return;
    }

    const wordCount = selectedIds.length;
    if (
      !window.confirm(
        `Are you sure you want to delete ${wordCount} word${wordCount !== 1 ? 's' : ''}? This will also delete any associated flashcards.`
      )
    ) {
      return;
    }

    try {
      const result = await wordService.bulkDeleteWords(selectedIds);

      showToast({
        type: 'success',
        message: `Deleted ${result.words_deleted} word${result.words_deleted !== 1 ? 's' : ''} and ${result.cards_deleted} card${result.cards_deleted !== 1 ? 's' : ''}`,
      });

      // Clear selection
      clearSelection();

      // Refresh the word list
      if (refreshWords) {
        await refreshWords();
      }
    } catch (e) {
      console.error('Failed to bulk delete words', e);
      showToast({ type: 'error', message: 'Failed to delete words' });
    }
  };

  const handleAssignToDeck = async (wordIds: ID[]) => {
    setWordsToAssign(wordIds);

    if (decks.length === 0) {
      setIsLoadingDecks(true);
      try {
        const fetchedDecks = await wordService.getDecks();
        setDecks(fetchedDecks as unknown as Deck[]);
      } catch (e) {
        console.error('Failed to fetch decks', e);
        showToast({ type: 'error', message: 'Failed to load decks' });
      } finally {
        setIsLoadingDecks(false);
      }
    }

    setShowDeckModal(true);
  };

  const handleDeckSelection = async (deckId: ID) => {
    try {
      // Move words to selected deck by updating their deck_id
      for (const wordId of wordsToAssign) {
        await wordService.updateWord(wordId, { deck_id: deckId });
      }

      showToast({
        type: 'success',
        message: `${wordsToAssign.length} word${wordsToAssign.length !== 1 ? 's' : ''} assigned to deck`,
      });

      setShowDeckModal(false);
      setWordsToAssign([]);
      clearSelection();

      // Refresh the word bank to show updated deck assignments
      if (refreshWords) {
        await refreshWords();
      }
    } catch (e) {
      console.error('Failed to assign words to deck', e);
      showToast({ type: 'error', message: 'Failed to assign words' });
    }
  };

  return {
    selectedWords,
    toggleSelectWord,
    clearSelection,
    getSelectedWordIds,
    handleDeleteWord,
    handleBulkDelete,
    handleAssignToDeck,
    handleDeckSelection,
    decks,
    showDeckModal,
    setShowDeckModal,
    wordsToAssign,
    setWordsToAssign,
    isLoadingDecks,
  };
};
