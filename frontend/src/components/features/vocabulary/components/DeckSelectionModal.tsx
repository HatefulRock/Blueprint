import React from 'react';
import { Deck } from '../../../../types';

type ID = string | number;

interface ExtendedDeck extends Omit<Deck, 'id'> {
  id: ID;
  [key: string]: any;
}

interface DeckSelectionModalProps {
  decks: ExtendedDeck[];
  onClose: () => void;
  onSelect: (deckId: ID) => void;
}

export const DeckSelectionModal: React.FC<DeckSelectionModalProps> = ({
  decks,
  onClose,
  onSelect,
}) => {
  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md m-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-white mb-4">Select Deck</h3>
        <p className="text-sm text-slate-400 mb-4">
          Choose which deck to add the selected words to:
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
          {decks.length === 0 ? (
            <p className="text-slate-500 text-center py-4">
              No decks available. Create a deck in the Flashcards view first.
            </p>
          ) : (
            decks.map((deck) => (
              <button
                key={deck.id}
                onClick={() => onSelect(deck.id)}
                className="w-full text-left px-4 py-3 bg-slate-700 hover:bg-sky-600 text-white rounded-lg transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold">{deck.name}</div>
                  <div className="text-xs text-slate-400">{deck.language}</div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
