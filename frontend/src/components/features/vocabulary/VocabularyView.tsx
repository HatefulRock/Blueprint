import React, { useState } from 'react';
import { Word } from '../../../types';
import { useVocabularyFilters } from '../../../hooks/useVocabularyFilters';
import { useVocabularyOperations } from '../../../hooks/useVocabularyOperations';
import { VocabularyFilters } from './components/VocabularyFilters';
import { VocabularyCard } from './components/VocabularyCard';
import { DeckSelectionModal } from './components/DeckSelectionModal';

type ID = string | number;

interface ExtendedWord extends Omit<Word, 'id' | 'deck_id'> {
  id: ID;
  deck_id: ID;
  [key: string]: any;
}

interface VocabularyViewProps {
  wordBank: ExtendedWord[];
  onFamiliarityChange: (term: string, change: 1 | -1) => void;
  onPlayAudio: (text: string) => void;
  refreshWords?: () => Promise<void>;
}

export const VocabularyView = ({
  wordBank,
  onFamiliarityChange,
  onPlayAudio,
  refreshWords,
}: VocabularyViewProps) => {
  console.log('[VocabularyView] Rendered with wordBank:', wordBank?.length, 'words');

  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  // Custom hooks for filtering and operations
  const { searchTerm, setSearchTerm, sortKey, sortDirection, handleSort, filteredAndSortedWords } =
    useVocabularyFilters(wordBank);

  const {
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
  } = useVocabularyOperations(refreshWords);

  const handleToggleExpand = (term: string) => {
    setExpandedTerm((prev) => (prev === term ? null : term));
  };

  const handleAddToDeck = () => {
    const ids = getSelectedWordIds();
    handleAssignToDeck(ids);
  };

  if (wordBank.length === 0) {
    return (
      <div className="flex-1 p-6 md:p-8 text-center text-slate-400">
        <h2 className="text-2xl font-bold text-white mb-4">Your Word Bank is Empty</h2>
        <p>Start reading in the Reader view and select words to add them here.</p>
      </div>
    );
  }

  return (
    <>
      {showDeckModal && (
        <DeckSelectionModal
          decks={decks}
          onClose={() => {
            setShowDeckModal(false);
            setWordsToAssign([]);
          }}
          onSelect={handleDeckSelection}
        />
      )}

      <div className="flex-1 p-6 md:p-8">
        <VocabularyFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          selectedCount={getSelectedWordIds().length}
          onAddToDeck={handleAddToDeck}
          onBulkDelete={handleBulkDelete}
          onClearSelection={clearSelection}
        />

        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {filteredAndSortedWords.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Word
                  </th>
                  <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider hidden md:table-cell">
                    Context
                  </th>
                  <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Review
                  </th>
                  <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider text-center">
                    Audio
                  </th>
                  <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider text-right">
                    Familiarity
                  </th>
                  <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider text-center">
                    Actions
                  </th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredAndSortedWords.map((word, index) => (
                  <VocabularyCard
                    key={`${word.term}-${index}`}
                    word={word}
                    isExpanded={expandedTerm === word.term}
                    isSelected={selectedWords[word.id] || false}
                    onToggleExpand={handleToggleExpand}
                    onToggleSelect={toggleSelectWord}
                    onFamiliarityChange={onFamiliarityChange}
                    onPlayAudio={onPlayAudio}
                    onDelete={handleDeleteWord}
                    onAssignToDeck={handleAssignToDeck}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <p>No words match your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
