
import React, { useState, useEffect, useCallback } from 'react';
import { Word, Deck } from '../types';
import { generateFlashcardSession } from '../services/practiceService';
import api, { wordService } from '../services/api';

import { BoltIcon } from './icons/BoltIcon';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon';
import { ClockIcon } from './icons/ClockIcon';

type ReviewMode = 'word-to-def' | 'def-to-word' | 'cloze';

interface FlashcardViewProps {
  wordBank: Word[]; // Note: These are ALL words. We might filter them by deck locally for the fallback mode.
  onFamiliarityChange: (term: string, change: 1 | -1) => void;
  onSessionComplete: (mode: ReviewMode) => void;
  targetLanguage: string;
}

const Flashcard = ({ word, isFlipped, onFlip, mode }: { word: Word, isFlipped: boolean, onFlip: () => void, mode: ReviewMode }) => {
    let frontContent: string | React.ReactNode;
    let frontClass: string;
    
    switch(mode) {
        case 'word-to-def':
            frontContent = word.term;
            frontClass = 'text-5xl font-bold text-emerald-300 font-mono';
            break;
        case 'def-to-word':
            frontContent = word.analysis.translation;
            frontClass = 'text-3xl text-slate-200';
            break;
        case 'cloze':
            frontContent = word.context.replace(new RegExp(`\\b${word.term}\\b`, 'gi'), '_________');
            frontClass = 'text-2xl italic text-slate-200 leading-relaxed';
            break;
    }

    return (
        <div className="w-full max-w-2xl h-96 perspective-1000 cursor-pointer" onClick={onFlip}>
            <div className={`relative w-full h-full transform-style-preserve-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute w-full h-full backface-hidden bg-slate-700 border border-slate-600 rounded-xl flex flex-col items-center justify-center p-6 gap-4 hover:border-sky-500 transition-colors shadow-lg">
                    <h3 className={`${frontClass} text-center break-all`}>{frontContent}</h3>
                    <p className="text-slate-400 text-sm absolute bottom-6">Click to flip</p>
                </div>
                {/* Back */}
                <div className="absolute w-full h-full backface-hidden bg-slate-800 border border-slate-700 rounded-xl p-6 overflow-y-auto transform rotate-y-180 scrollbar-thin scrollbar-thumb-slate-600 shadow-lg">
                    <div className="flex flex-col gap-4 h-full justify-center">
                        <div className="space-y-4 text-center">
                            <div>
                                <h4 className="text-sm font-semibold text-sky-400 mb-1 uppercase tracking-wide">Word</h4>
                                <p className="text-2xl font-bold text-emerald-300 font-mono">{word.term}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-sky-400 mb-1 uppercase tracking-wide">Translation</h4>
                                <p className="text-xl text-slate-200">{word.analysis.translation}</p>
                            </div>
                            {word.context && (
                                <div className="bg-slate-900/30 p-3 rounded-lg">
                                    <h4 className="text-xs font-semibold text-sky-400 mb-1 uppercase">Context</h4>
                                    <p className="text-slate-300 italic">"{word.context}"</p>
                                </div>
                            )}
                            {word.analysis.grammaticalBreakdown && (
                                <div>
                                    <h4 className="text-xs font-semibold text-sky-400 mb-1 uppercase">Notes</h4>
                                    <p className="text-slate-400 text-sm">{word.analysis.grammaticalBreakdown}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ModeButton = ({ label, isActive, onClick, disabled }: { label: string, isActive: boolean, onClick: () => void, disabled: boolean }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
            isActive ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
    >
        {label}
    </button>
)

const ReviewButton = ({ label, onClick, colorClass }: { label: string, onClick: () => void, colorClass: string }) => (
    <button onClick={onClick} className={`px-6 py-3 rounded-lg font-bold ${colorClass} text-white`}>{label}</button>
)

const ImportModal = ({ onClose, onImport, language }: { onClose: () => void, onImport: (file: File, name: string) => void, language: string }) => {
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (file && name) {
            onImport(file, name);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md m-4 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Import Deck</h3>
                <p className="text-sm text-slate-400 mb-4">Upload a CSV or Text file exported from Anki or similar tools. Format: <code>Term, Translation, [Context]</code></p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Deck Name</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-sky-500 outline-none"
                            placeholder="e.g., Core Vocabulary"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">CSV/TXT File</label>
                        <input 
                            type="file" 
                            accept=".csv,.txt"
                            onChange={e => setFile(e.target.files?.[0] || null)} 
                            className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" disabled={!file || !name} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50">Import Deck</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export const FlashcardView = ({ wordBank, onFamiliarityChange, onSessionComplete, targetLanguage }: FlashcardViewProps) => {
    // View State: 'decks' (selection) or 'study' (active session)
    const [viewState, setViewState] = useState<'decks' | 'study'>('decks');
    
    // Deck State
    const [decks, setDecks] = useState<Deck[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    
    // Study Session State
    const [reviewQueue, setReviewQueue] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [reviewMode, setReviewMode] = useState<ReviewMode>('word-to-def');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch Decks on Mount
    useEffect(() => {
        const loadDecks = async () => {
            try {
                const fetchedDecks = await wordService.getDecks(1);
                setDecks(fetchedDecks as unknown as Deck[]);
            } catch (e) {
                console.error('Failed to fetch decks', e);
            }
        };
        loadDecks();
    }, [targetLanguage]);

    // Animation Styles
    useEffect(() => {
        const styleId = 'flashcard-animations';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out forwards;
                }
                .perspective-1000 { perspective: 1000px; }
                .transform-style-preserve-3d { transform-style: preserve-3d; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const getDeckStats = useCallback((deckId: number | null) => {
        const relevantWords = deckId === null 
            ? wordBank 
            : wordBank.filter(w => w.deckId === deckId);
        
        const now = new Date();
        const total = relevantWords.length;
        const due = relevantWords.filter(w => !w.nextReviewDate || new Date(w.nextReviewDate) <= now).length;
        
        return { total, due };
    }, [wordBank]);
    
    const handleStartSession = useCallback(async (deckId: number | null) => {
        setIsLoading(true);
        setSelectedDeckId(deckId);

        // Filter words based on deck selection (used for client fallback only)
        let sessionWords = wordBank;
        if (deckId !== null) {
            sessionWords = wordBank.filter(w => w.deckId === deckId);
        }

        try {
            // Use server-curated study session when 'All Vocabulary' is requested
            let queue: any[] = [];
            if (deckId !== null) {
                const res: any = await wordService.getDueCards(deckId);
                queue = Array.isArray(res) ? res : [];
            } else {
                // Create a cross-deck session via /practice/session
                const payload = { deck_id: null, user_id: 1, limit: 20 };
                const res: any = await wordService.createStudySession(payload);
                queue = res.cards || [];
            }

            setReviewQueue(queue);
            setCurrentIndex(0);
            setIsFlipped(false);
            setViewState('study');
        } catch (error) {
            console.error("Failed to start session", error);
        } finally {
            setIsLoading(false);
        }
    }, [wordBank, reviewMode]);

    const handleImport = async (file: File, name: string) => {
        setIsLoading(true);
        setShowImportModal(false);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', name);
            formData.append('language', targetLanguage);

            const result: any = await wordService.importDeck(formData);
            // API returns { deck: {id,name,language}, importedCount }
            const deck = result?.deck || result;
            setDecks(prev => [...prev, deck]);
            alert(`Imported ${result?.importedCount ?? 0} words into "${deck?.name ?? 'deck'}".`);
        } catch (e) {
            console.error(e);
            alert("Import failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateDeck = async () => {
        const name = prompt("Enter name for new deck:");
        if (name) {
            try {
                const payload = { name, language: targetLanguage, user_id: 1 };
                const newDeck = await wordService.createDeck(payload);
                setDecks(prev => [...prev, newDeck]);
            } catch (e) {
                console.error(e);
            }
        }
    }

    const handleAssessment = async (isPositive: boolean, mode: 'Again' | 'Hard' | 'Good' | 'Easy' = 'Good') => {
        const currentItem: any = reviewQueue[currentIndex];
        if (!currentItem) return;

        // Map review buttons to SM-2 quality scores
        let quality = 3; // default
        switch(mode) {
            case 'Again': quality = 0; break;
            case 'Hard': quality = 3; break;
            case 'Good': quality = 4; break;
            case 'Easy': quality = 5; break;
        }

        try {
            if (currentItem.id) {
                try {
                    const updatedCard: any = await wordService.reviewCard(currentItem.id, quality);
                    const newQueue = [...reviewQueue];
                    newQueue[currentIndex] = updatedCard as any;
                    setReviewQueue(newQueue);
                } catch (apiErr) {
                    console.error('Failed to submit card review', apiErr);
                }
            } else {
                // fallback
                onFamiliarityChange(currentItem.term, isPositive ? 1 : -1);
            }
        } finally {
            setTimeout(() => {
                setIsFlipped(false);
                setCurrentIndex(prev => prev + 1);
            }, 300);
        }
    };

    const handleComplete = () => {
        onSessionComplete(reviewMode);
        setViewState('decks');
    }

    // --- VIEW: DECKS ---
    if (viewState === 'decks') {
        const allStats = getDeckStats(null);

         return (
            <div className="flex-1 p-6 md:p-8">
                {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} language={targetLanguage} />}
                
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white">Flashcard Decks</h2>
                        <p className="text-slate-400">Select a deck to start reviewing.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleCreateDeck} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
                            + New Deck
                        </button>
                        <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                            <DocumentArrowUpIcon className="w-4 h-4" />
                            Import Deck
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* "All Words" Deck */}
                    <div 
                        onClick={() => handleStartSession(null)}
                        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-sky-500 hover:shadow-lg hover:shadow-sky-900/20 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-slate-700 rounded-lg group-hover:bg-sky-600 transition-colors">
                                <BoltIcon className="w-6 h-6 text-white" />
                            </div>
                            <span className="bg-slate-700 text-xs font-bold px-2 py-1 rounded text-slate-300">Default</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">All Vocabulary</h3>
                        <p className="text-slate-400 text-sm mb-4">Review all words in your {targetLanguage} library.</p>
                        
                         <div className="mb-4 flex gap-2">
                             {allStats.due > 0 ? (
                                <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-amber-500/20">
                                    <ClockIcon className="w-3 h-3" /> {allStats.due} Due
                                </span>
                             ) : (
                                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-500/20">
                                    <ClockIcon className="w-3 h-3" /> All caught up
                                </span>
                             )}
                             <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
                                {allStats.total} Total
                             </span>
                        </div>

                        <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-700 pt-4">
                            <span>{allStats.due > 0 ? 'Ready to practice?' : 'Review anyway'}</span>
                            <span className="text-sky-400 group-hover:translate-x-1 transition-transform">Study &rarr;</span>
                        </div>
                    </div>

                    {/* User Decks */}
                    {decks.map(deck => {
                        const stats = getDeckStats(deck.id);
                        return (
                            <div 
                                key={deck.id}
                                onClick={() => handleStartSession(deck.id)}
                                className="bg-slate-800 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-900/20 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-700 rounded-lg group-hover:bg-emerald-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{deck.name}</h3>
                                <p className="text-slate-400 text-sm mb-4">Custom deck</p>
                                
                                <div className="mb-4 flex gap-2">
                                    {stats.due > 0 ? (
                                        <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-amber-500/20">
                                            <ClockIcon className="w-3 h-3" /> {stats.due} Due
                                        </span>
                                    ) : (
                                        <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-500/20">
                                            <ClockIcon className="w-3 h-3" /> All caught up
                                        </span>
                                    )}
                                    <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
                                        {stats.total} Total
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-700 pt-4">
                                    <span>{stats.due > 0 ? 'Words Due' : 'Practice Mode'}</span>
                                    <span className="text-emerald-400 group-hover:translate-x-1 transition-transform">Study &rarr;</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
         )
    }

    // --- VIEW: STUDY ---
    
    if (isLoading) {
        return (
            <div className="flex-1 p-6 md:p-8 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400">Preparing your session...</p>
                </div>
            </div>
        )
    }

    if (reviewQueue.length === 0 || currentIndex >= reviewQueue.length) {
         return (
          <div className="flex-1 p-6 md:p-8 text-center text-slate-400 flex flex-col items-center justify-center">
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 max-w-md w-full">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4">Session Complete!</h2>
                <p className="mb-6">You've reviewed all available cards in this deck.</p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => handleStartSession(selectedDeckId)}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg transition-colors w-full"
                    >
                        Restart Session
                    </button>
                     <button 
                        onClick={() => setViewState('decks')}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors w-full"
                    >
                        Back to Decks
                    </button>
                </div>
            </div>
          </div>
        );
    }

    const currentWord = reviewQueue[currentIndex];

    return (
        <div className="flex-1 p-6 md:p-8 flex flex-col items-center justify-start gap-8">
            <div className="w-full max-w-2xl">
                 <button onClick={() => setViewState('decks')} className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-1">
                    &larr; Back to Decks
                 </button>
                 
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-4">
                        {selectedDeckId === null ? "All Vocabulary" : decks.find(d => d.id === selectedDeckId)?.name || "Deck Review"}
                    </h2>
                    <div className="flex justify-center items-center gap-4">
                        <ModeButton label="Word → Definition" isActive={reviewMode === 'word-to-def'} onClick={() => setReviewMode('word-to-def')} disabled={isLoading} />
                        <ModeButton label="Definition → Word" isActive={reviewMode === 'def-to-word'} onClick={() => setReviewMode('def-to-word')} disabled={isLoading} />
                        <ModeButton label="Cloze" isActive={reviewMode === 'cloze'} onClick={() => setReviewMode('cloze')} disabled={isLoading} />
                    </div>
                </div>

                <div className="w-full bg-slate-700 rounded-full h-2.5 mb-2">
                    <div className="bg-sky-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / reviewQueue.length) * 100}%` }}></div>
                </div>
                <p className="text-sm text-slate-400 text-center">{currentIndex + 1} / {reviewQueue.length}</p>
            </div>

            <Flashcard 
                word={currentWord} 
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(!isFlipped)}
                mode={reviewMode}
            />

            {isFlipped && (
                <div className="flex items-center gap-4 animate-fade-in">
                    <ReviewButton label="Again" onClick={() => handleAssessment(false, 'Again')} colorClass="bg-red-600/80 hover:bg-red-600 shadow-lg shadow-red-900/20" />
                    <ReviewButton label="Hard" onClick={() => handleAssessment(false, 'Hard')} colorClass="bg-orange-600/80 hover:bg-orange-600 shadow-lg shadow-orange-900/20" />
                    <ReviewButton label="Good" onClick={() => handleAssessment(true, 'Good')} colorClass="bg-emerald-600/80 hover:bg-emerald-600 shadow-lg shadow-emerald-900/20" />
                    <ReviewButton label="Easy" onClick={() => handleAssessment(true, 'Easy')} colorClass="bg-sky-600/80 hover:bg-sky-600 shadow-lg shadow-sky-900/20" />
                </div>
            )}
        </div>
    );
};
