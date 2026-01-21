
import React, { useState, useMemo } from 'react';
import { Word } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SortAscendingIcon } from './icons/SortAscendingIcon';
import { SortDescendingIcon } from './icons/SortDescendingIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { ClockIcon } from './icons/ClockIcon';

type SortKey = 'term' | 'familiarityScore' | 'nextReviewDate';
type SortDirection = 'asc' | 'desc';

interface VocabularyViewProps {
  wordBank: Word[];
  onFamiliarityChange: (term: string, change: 1 | -1) => void;
  onPlayAudio: (text: string) => void;
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

export const VocabularyView = ({ wordBank, onFamiliarityChange, onPlayAudio }: VocabularyViewProps) => {
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [wordDetail, setWordDetail] = useState<any | null>(null);

  // Multi-select for bulk operations
  const [selectedWords, setSelectedWords] = useState<Record<number, boolean>>({});

  const toggleSelectWord = (wordId?: number) => {
    if (!wordId) return;
    setSelectedWords(prev => ({ ...prev, [wordId]: !prev[wordId] }));
  }

  const clearSelection = () => setSelectedWords({});

  const getSelectedWordIds = () => Object.keys(selectedWords).filter(k => selectedWords[Number(k)]).map(k => Number(k));

  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('term');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleToggleExpand = (term: string) => {
      setExpandedTerm(prev => prev === term ? null : term);
  }

  const openDetailDrawer = async (wordId: number) => {
      setSelectedWordId(wordId);
      setDetailDrawerOpen(true);
      try {
          const res: any = await (await import('../services/vocabService')).vocabService.getWordDetail(wordId);
          setWordDetail(res);
      } catch (e) {
          console.error('Failed to load word detail', e);
          setWordDetail(null);
      }
  }

  const closeDetailDrawer = () => {
      setSelectedWordId(null);
      setDetailDrawerOpen(false);
      setWordDetail(null);
  }

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
      word.context.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      // Handle dates specifically
      if (sortKey === 'nextReviewDate') {
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
    <div className="flex-1 p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <h2 className="text-3xl font-bold text-white">My Vocabulary</h2>
              <div className="flex items-center gap-4 flex-wrap"> 
              <div className="flex items-center gap-2">
                <button onClick={async () => {
                  const ids = getSelectedWordIds();
                  if (ids.length === 0) { alert('No words selected'); return; }
                  try {
                    const vs = await import('../services/vocabService');
                    const resp = await vs.vocabService.bulkCreateCards(ids);
                    // show as a toast instead of alert
                    (window as any).appSetToast?.({ type: 'success', message: `Created ${resp?.length || 0} cards` });
                    clearSelection();
                  } catch (e) { console.error(e); (window as any).appSetToast?.({ type: 'error', message: 'Bulk create failed' }); }
                }} className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md">Bulk Create Cards</button>

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
            <SortButton label="Review" sortKey="nextReviewDate" activeSortKey={sortKey} activeDirection={sortDirection} onClick={handleSort} />
            <SortButton label="Familiarity" sortKey="familiarityScore" activeSortKey={sortKey} activeDirection={sortDirection} onClick={handleSort} />
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
                       <input type="checkbox" checked={selectedWords[(word as any).id || 0] || false} onChange={(e) => { e.stopPropagation(); toggleSelectWord((word as any).id); }} />
                     </td>
                    <td className="p-4 font-mono text-emerald-300 align-top">
                        <div className="flex items-center gap-2">
                            {word.term}
                        </div>
                    </td>
                    <td className="p-4 text-slate-400 italic align-top hidden md:table-cell">"{word.context}"</td>
                    <td className="p-4 align-top">
                        <ReviewStatus dateStr={word.nextReviewDate} />
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
                                disabled={word.familiarityScore <= 1}
                                label={`Decrease familiarity for ${word.term}`}
                                className="hover:bg-red-600"
                            >
                              -
                            </ActionButton>
                            <FamiliarityMeter score={word.familiarityScore} />
                            <ActionButton 
                                onClick={(e) => { e.stopPropagation(); onFamiliarityChange(word.term, 1); }}
                                disabled={word.familiarityScore >= 5}
                                label={`Increase familiarity for ${word.term}`}
                                className="hover:bg-emerald-500"
                            >
                              +
                            </ActionButton>
                        </div>
                    </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); openDetailDrawer((word as any).id || 0); }} className="px-3 py-1 bg-slate-700 rounded-md text-slate-300 hover:bg-sky-600">Details</button>
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
                             <AnalysisSection title="Translation" content={word.analysis.translation} />
                             <AnalysisSection title="Literal Translation" content={word.analysis.literalTranslation} />
                             <AnalysisSection title="Grammatical Breakdown" content={word.analysis.grammaticalBreakdown} />
                             <div className="md:hidden mt-4">
                                 <h3 className="text-sm font-semibold text-sky-400 mb-1">Context</h3>
                                 <p className="text-slate-300 text-sm italic">"{word.context}"</p>
                             </div>
                           </div>
                           <div className="w-80">
                             <h4 className="text-sm font-semibold text-sky-400 mb-2">Actions</h4>
                             <div className="flex flex-col gap-2">
                                 <button onClick={(e) => { e.stopPropagation(); (async () => { const vs = await import('../services/vocabService'); const resp = await vs.vocabService.bulkCreateCards([(word as any).id]); alert(`Created ${resp?.length || 0} cards`); })(); }} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md">Create Card</button>
                                 <button onClick={(e) => { e.stopPropagation(); (async () => { const vs = await import('../services/vocabService'); await vs.vocabService.invalidateWordCache((word as any).id); alert('Cache invalidated'); })(); }} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md">Invalidate Cache</button>
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
  );
};
