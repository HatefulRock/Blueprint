import { useState, useMemo } from 'react';
import { Word } from '../types';

type SortKey = 'term' | 'familiarity_score' | 'next_review_date';
type SortDirection = 'asc' | 'desc';

type ID = string | number;

interface ExtendedWord extends Omit<Word, 'id' | 'deck_id'> {
  id: ID;
  deck_id: ID;
  [key: string]: any;
}

export const useVocabularyFilters = (wordBank: ExtendedWord[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('term');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedWords = useMemo(() => {
    const filtered = wordBank.filter(
      (word) =>
        word.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (word.context?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      // Handle dates specifically
      if (sortKey === 'next_review_date') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [wordBank, searchTerm, sortKey, sortDirection]);

  return {
    searchTerm,
    setSearchTerm,
    sortKey,
    sortDirection,
    handleSort,
    filteredAndSortedWords,
  };
};
