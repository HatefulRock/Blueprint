
import React, { useState, useMemo, useEffect } from 'react';
import { Word, Deck } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SortAscendingIcon } from './icons/SortAscendingIcon';
import { SortDescendingIcon } from './icons/SortDescendingIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { ClockIcon } from './icons/ClockIcon';
import { wordService } from '../services/api';

type SortKey = 'term' | 'familiarity_score' | 'next_review_date';
type SortDirection = 'asc' | 'desc';

type ID = string | number;

interface ExtendedWord extends Omit<Word, 'id' | 'deck_id'> {
  id: ID;
  deck_id: ID;
  [key: string]: any;
}

interface ExtendedDeck extends Omit<Deck, 'id'> {
  id: ID;
  [key: string]: any;
}

interface VocabularyViewProps {
  wordBank: ExtendedWord[];
  onFamiliarityChange: (term: string, change: 1 | -1) => void;
  onPlayAudio: (text: string) => void;
  refreshWords?: () => Promise<void>;
}

const FamiliarityMeter = ({ score }: { score: number }) => (
    <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`w-6 h-2 rounded-full ${i < score ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
        ))}
    </div>
);

const ActionButton = ({ onClick, disabled, children, label, className }: { onClick: (e: React.MouseEvent) => void, disabled: boolean, children?: React.ReactNode, label: string, className?: string }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-7 h-7 flex items-center justify-center font-bold bg-slate-700 rounded-md text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
        aria-label={label}
    >
        {children}
    </button>
)

const AnalysisSection = ({ title, content }: { title: string, content: string }) => (
  <div>
    <h3 className="text-sm font-semibold text-sky-400 mb-1">{title}</h3>
    <p className="text-slate-300 text-sm">{content}</p>
  </div>
);

const SortButton = ({ label, sortKey, activeSortKey, activeDirection, onClick }: { label: string, sortKey: SortKey, activeSortKey: SortKey, activeDirection: SortDirection, onClick: (key: SortKey) => void }) => {
    const isActive = sortKey === activeSortKey;
    return (
        <button 
            onClick={() => onClick(sortKey)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
        >
            {label}
            {isActive && (activeDirection === 'asc' ? <SortAscendingIcon className="w-4 h-4" /> : <SortDescendingIcon className="w-4 h-4" />)}
        </button>
    );
};

const ReviewStatus = ({ dateStr }: { dateStr?: string }) => {
    if (!dateStr) return <span className="text-slate-500 text-xs font-medium px-2 py-1 bg-slate-800 rounded-full">New</span>;

    const now = new Date();
    const reviewDate = new Date(dateStr);
    const isDue = reviewDate <= now;

    if (isDue) {
        return (
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold px-2 py-1 bg-amber-500/10 rounded-full w-fit border border-amber-500/20">
                <ClockIcon className="w-3 h-3" />
                Due
            </div>
        )
    }

    const diffTime = Math.abs(reviewDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return (
        <span className="text-slate-400 text-xs font-medium px-2 py-1 bg-slate-800 rounded-full">
            in {diffDays}d
        </span>
    );
}

const DeckSelectionModal = ({ decks, onClose, onSelect }: { decks: ExtendedDeck[], onClose: () => void, onSelect: (deckId: ID) => void }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white mb-4">Select Deck</h3>
        <p className="text-sm text-slate-400 mb-4">Choose which deck to add the selected words to:</p>

        <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
          {decks.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No decks available. Create a deck in the Flashcards view first.</p>
          ) : (
            decks.map(deck => (
              <button
                key={deck.id}
                onClick={() => onSelect(deck.id)}
                className="w-full text-left px-4 py-3 bg-slate-700 hover:bg-sky-600 text-white rounded-lg transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold">{deck.name}</div>
                  <div className="text-xs text-slate-400">{deck.language}</div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export const VocabularyView = ({ wordBank, onFamiliarityChange, onPlayAudio, refreshWords }: VocabularyViewProps) => {
  console.log('[VocabularyView] Rendered with wordBank:', wordBank?.length, 'words');
  const [words, setWords] = useState<ExtendedWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  

  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<ID | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [wordDetail, setWordDetail] = useState<any | null>(null);

  // Multi-select for bulk operations
  const [selectedWords, setSelectedWords] = useState<Record<string, boolean>>({});

  // Deck management
  const [decks, setDecks] = useState<ExtendedDeck[]>([]);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [wordsToAssign, setWordsToAssign] = useState<ID[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);

  const toggleSelectWord = (wordId?: ID) => {
    if (!wordId) return;
    const key = String(wordId);
    setSelectedWords(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const clearSelection = () => setSelectedWords({});

  const getSelectedWordIds = (): string[] => {
  return Object.keys(selectedWords).filter(k => selectedWords[k]);
};

  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('term');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');


  const handleToggleExpand = (term: string) => {
      setExpandedTerm(prev => prev === term ? null : term);
  }

  const closeDetailDrawer = () => {
      setSelectedWordId(null);
      setDetailDrawerOpen(false);
      setWordDetail(null);
  }

  const handleAssignToDeck = async (wordIds: ID[]) => {
    setWordsToAssign(wordIds);
    
    if (decks.length === 0) {
        setIsLoadingDecks(true);
        try {
            const fetchedDecks = await wordService.getDecks();
            setDecks(fetchedDecks as unknown as Deck[]);
        } catch (e) {
            console.error('Failed to fetch decks', e);
            (window as any).appSetToast?.({ type: 'error', message: 'Failed to load decks' });
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

      if ((window as any).appSetToast) {
        (window as any).appSetToast({
          type: 'success',
          message: `${wordsToAssign.length} word${wordsToAssign.length !== 1 ? 's' : ''} assigned to deck`
        });
      }

      setShowDeckModal(false);
      setWordsToAssign([]);
      clearSelection();

      // Refresh the word bank to show updated deck assignments
      if (refreshWords) {
        await refreshWords();
      }
    } catch (e) {
      console.error('Failed to assign words to deck', e);
      if ((window as any).appSetToast) {
        (window as any).appSetToast({ type: 'error', message: 'Failed to assign words' });
      }
    }
  };

  const handleSort = (key: SortKey) => {
      if (key === sortKey) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortKey(key);
          setSortDirection('asc');
      }
  }

  const filteredAndSortedWords = useMemo(() => {
    const filtered = wordBank.filter(word =>
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
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <h2 className="text-3xl font-bold text-white">My Vocabulary</h2>
              <div className="flex items-center gap-4 flex-wrap"> 
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const ids = getSelectedWordIds();
                  if (ids.length === 0) {
                    (window as any).appSetToast?.({ type: 'info', message: 'No words selected' });
                    return;
                  }
                  handleAssignToDeck(ids);
                }} className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md">Add to Deck</button>

                <button onClick={() => { clearSelection(); }} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md">Clear Selection</button>
              </div>
          <input
            type="text"
            placeholder="Search words..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Sort by:</span>
            <SortButton label="Word" sortKey="term" activeSortKey={sortKey} activeDirection={sortDirection} onClick={handleSort} />
            <SortButton label="Review" sortKey="next_review_date" activeSortKey={sortKey} activeDirection={sortDirection} onClick={handleSort} />
            <SortButton label="Familiarity" sortKey="familiarity_score" activeSortKey={sortKey} activeDirection={sortDirection} onClick={handleSort} />
          </div>
        </div>
      </div>
      
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
        {filteredAndSortedWords.length > 0 ? (
          <table className="w-full text-left">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider w-1/4">Select</th>
                <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider w-1/4">Word</th>
                <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider hidden md:table-cell w-1/3">Context</th>
                <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider w-1/6">Review</th>
                <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider w-1/12 text-center">Audio</th>
                <th className="p-4 text-sm font-semibold text-slate-300 uppercase tracking-wider text-right w-1/4">Familiarity</th>
                <th className="p-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredAndSortedWords.map((word, index) => (
                <React.Fragment key={`${word.term}-${index}`}>
                   <tr
                     className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                     onClick={() => handleToggleExpand(word.term)}
                   >
                     <td className="p-4 font-mono text-emerald-300 align-top">
                       <input type="checkbox" checked={selectedWords[word.id] || false} onChange={(e) => { e.stopPropagation(); toggleSelectWord(word.id); }} />
                     </td>
                    <td className="p-4 font-mono text-emerald-300 align-top">
                        <div className="flex items-center gap-2">
                            {word.term}
                        </div>
                    </td>
                    <td className="p-4 text-slate-400 italic align-top hidden md:table-cell">"{word.context || ''}"</td>
                    <td className="p-4 align-top">
                        <ReviewStatus dateStr={word.next_review_date} />
                    </td>
                    <td className="p-4 align-top text-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); onPlayAudio(word.term); }}
                            className="p-1.5 rounded-md bg-slate-700 text-slate-300 hover:bg-sky-600 hover:text-white transition-colors"
                            title={`Listen to ${word.term}`}
                        >
                            <SpeakerWaveIcon className="w-5 h-5" />
                        </button>
                    </td>
                    <td className="p-4 align-top">
                        <div className="flex justify-end items-center gap-3">
                            <ActionButton
                                onClick={(e) => { e.stopPropagation(); onFamiliarityChange(word.term, -1); }}
                                disabled={word.familiarity_score <= 1}
                                label={`Decrease familiarity for ${word.term}`}
                                className="hover:bg-red-600"
                            >
                              -
                            </ActionButton>
                            <FamiliarityMeter score={word.familiarity_score} />
                            <ActionButton
                                onClick={(e) => { e.stopPropagation(); onFamiliarityChange(word.term, 1); }}
                                disabled={word.familiarity_score >= 5}
                                label={`Increase familiarity for ${word.term}`}
                                className="hover:bg-emerald-500"
                            >
                              +
                            </ActionButton>
                        </div>
                    </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform ${expandedTerm === word.term ? 'rotate-180' : ''}`} />
                        </div>
                      </td>
                  </tr>
                   {expandedTerm === word.term && (
                     <tr className="bg-slate-900/50">
                       <td colSpan={6} className="p-0">
                         <div className="p-6 flex flex-col md:flex-row gap-6">
                           <div className="space-y-4 flex-grow">
                             <h3 className="text-md font-bold text-white">Analysis Details</h3>
                             {word.translation && <AnalysisSection title="Translation" content={word.translation} />}
                             {word.literal_translation && <AnalysisSection title="Literal Translation" content={word.literal_translation} />}
                             {word.grammatical_breakdown && <AnalysisSection title="Grammatical Breakdown" content={word.grammatical_breakdown} />}
                             {word.part_of_speech && <AnalysisSection title="Part of Speech" content={word.part_of_speech} />}
                             <div className="md:hidden mt-4">
                                 <h3 className="text-sm font-semibold text-sky-400 mb-1">Context</h3>
                                 <p className="text-slate-300 text-sm italic">"{word.context || ''}"</p>
                             </div>
                           </div>
                           <div className="w-80">
                             <h4 className="text-sm font-semibold text-sky-400 mb-2">Actions</h4>
                             <div className="flex flex-col gap-2">
                                 <button onClick={(e) => { e.stopPropagation(); handleAssignToDeck([word.id]); }} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md">Add to Deck</button>
                             </div>
                           </div>
                         </div>
                       </td>
                     </tr>
                   )}
                </React.Fragment>
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
