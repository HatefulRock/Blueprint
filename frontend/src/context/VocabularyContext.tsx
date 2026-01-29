import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Word } from '../types';
import { wordService } from '../services/api';
import { useAuth } from './AuthContext';

interface VocabularyContextType {
  wordBank: Word[];
  addWord: (word: Partial<Word>) => Promise<void>;
  updateWord: (id: string, updates: Partial<Word>) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  refreshWords: () => Promise<void>;
  isLoading: boolean;
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined);

export const VocabularyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [wordBank, setWordBank] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshWords = useCallback(async () => {
    if (!isAuthenticated) {
      setWordBank([]);
      return;
    }

    setIsLoading(true);
    try {
      console.log('[VocabularyContext] Fetching words...');
      const response = await wordService.getAllWords();
      console.log('[VocabularyContext] Raw response from getAllWords:', response);
      // The axios interceptor already unwraps response.data, so response IS the data
      // Handle both unwrapped (array) and wrapped ({ data: array }) formats
      const words = Array.isArray(response) ? response : (response?.data ?? []);
      console.log('[VocabularyContext] Processed words:', words.length, 'words');
      setWordBank(words);
    } catch (e) {
      console.error('[VocabularyContext] Failed to fetch words:', e);
      // Keep wordBank as an array on error
      setWordBank((prev) => prev ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const addWord = async (wordData: Partial<Word>) => {
    await wordService.addWord(wordData);
    await refreshWords();
  };

  const updateWord = async (id: string, updates: Partial<Word>) => {
    await wordService.updateWord(id, updates);
    await refreshWords();
  };

  const deleteWord = async (id: string) => {
    await wordService.deleteWord(id);
    await refreshWords();
  };

  // Load words when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      refreshWords();
    } else {
      setWordBank([]);
    }
  }, [isAuthenticated, refreshWords]);

  return (
    <VocabularyContext.Provider
      value={{
        wordBank,
        addWord,
        updateWord,
        deleteWord,
        refreshWords,
        isLoading,
      }}
    >
      {children}
    </VocabularyContext.Provider>
  );
};

export const useVocabulary = () => {
  const context = useContext(VocabularyContext);
  if (!context) {
    throw new Error('useVocabulary must be used within VocabularyProvider');
  }
  return context;
};
