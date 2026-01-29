import React from 'react';
import { SortButton } from './VocabularyUIComponents';

type SortKey = 'term' | 'familiarity_score' | 'next_review_date';
type SortDirection = 'asc' | 'desc';

interface VocabularyFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  selectedCount: number;
  onAddToDeck: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export const VocabularyFilters: React.FC<VocabularyFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  sortKey,
  sortDirection,
  onSort,
  selectedCount,
  onAddToDeck,
  onBulkDelete,
  onClearSelection,
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
      <h2 className="text-3xl font-bold text-white">My Vocabulary</h2>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Bulk action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAddToDeck}
            className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors"
          >
            Add to Deck {selectedCount > 0 && `(${selectedCount})`}
          </button>

          <button
            onClick={onBulkDelete}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            title="Delete selected words and their flashcards"
          >
            Delete Selected {selectedCount > 0 && `(${selectedCount})`}
          </button>

          <button
            onClick={onClearSelection}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
          >
            Clear Selection
          </button>
        </div>

        {/* Search input */}
        <input
          type="text"
          placeholder="Search words..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-64 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        {/* Sort buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Sort by:</span>
          <SortButton
            label="Word"
            sortKey="term"
            activeSortKey={sortKey}
            activeDirection={sortDirection}
            onClick={onSort}
          />
          <SortButton
            label="Review"
            sortKey="next_review_date"
            activeSortKey={sortKey}
            activeDirection={sortDirection}
            onClick={onSort}
          />
          <SortButton
            label="Familiarity"
            sortKey="familiarity_score"
            activeSortKey={sortKey}
            activeDirection={sortDirection}
            onClick={onSort}
          />
        </div>
      </div>
    </div>
  );
};
