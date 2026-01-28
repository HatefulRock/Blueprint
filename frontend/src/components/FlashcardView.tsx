
import React, { useState, useEffect, useCallback } from 'react';
import { Word, Deck } from '../types';
import { generateFlashcardSession } from '../services/practiceService';
import api, { wordService, templateService } from '../services/api';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { TemplateEditor } from './TemplateEditor';

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
            frontContent = word.translation;
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
                    <p className="text-slate-400 text-sm absolute bottom-6">
                        Press <kbd className="px-2 py-1 bg-slate-600 rounded text-xs">Space</kbd> to flip
                    </p>
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
                                <p className="text-xl text-slate-200">{word.translation}</p>
                            </div>
                            {word.context && (
                                <div className="bg-slate-900/30 p-3 rounded-lg">
                                    <h4 className="text-xs font-semibold text-sky-400 mb-1 uppercase">Context</h4>
                                    <p className="text-slate-300 italic">"{word.context}"</p>
                                </div>
                            )}
                            {word.grammatical_breakdown && (
                                <div>
                                    <h4 className="text-xs font-semibold text-sky-400 mb-1 uppercase">Notes</h4>
                                    <p className="text-slate-400 text-sm">{word.grammatical_breakdown}</p>
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

const ReviewButton = ({ label, onClick, colorClass, shortcut }: { label: string, onClick: () => void, colorClass: string, shortcut?: string }) => (
    <button onClick={onClick} className={`px-6 py-3 rounded-lg font-bold ${colorClass} text-white relative group`}>
        {label}
        {shortcut && (
            <kbd className="absolute -top-2 -right-2 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                {shortcut}
            </kbd>
        )}
    </button>
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
    // View State: 'decks' (selection), 'study' (active session), or 'manage' (view deck contents)
    const [viewState, setViewState] = useState<'decks' | 'study' | 'manage'>('decks');

    // Deck State
    const [decks, setDecks] = useState<Deck[]>([]);
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [deckWords, setDeckWords] = useState<Word[]>([]);

    // Template State
    const [templates, setTemplates] = useState<any[]>([]);
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [showTemplateManager, setShowTemplateManager] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);

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
                const fetchedDecks = await wordService.getDecks();
                setDecks(fetchedDecks as unknown as Deck[]);
            } catch (e) {
                console.error('Failed to fetch decks', e);
            }
        };
        loadDecks();
    }, [targetLanguage]);

    // Fetch Templates on Mount
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const fetchedTemplates = await templateService.getTemplates();
                setTemplates(fetchedTemplates || []);
            } catch (e) {
                console.error('Failed to fetch templates', e);
            }
        };
        loadTemplates();
    }, []);

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

    const getDeckStats = useCallback((deckId: string | null) => {
        const relevantWords = deckId === null 
            ? wordBank 
            : wordBank.filter(w => w.deck_id === deckId);
        
        const now = new Date();
        const total = relevantWords.length;
        const due = relevantWords.filter(w => !w.next_review_date || new Date(w.next_review_date) <= now).length;
        
        return { total, due };
    }, [wordBank]);
    
    const handleStartSession = useCallback(async (deckId: string | null) => {
        setIsLoading(true);
        setSelectedDeckId(deckId);

        // Filter words based on deck selection (used for client fallback only)
        let sessionWords = wordBank;
        if (deckId !== null) {
            sessionWords = wordBank.filter(w => w.deck_id === deckId);
        }

        try {
            // Use server-curated study session when 'All Vocabulary' is requested
            let queue: any[] = [];
            if (deckId !== null) {
                const res: any = await wordService.getDueCards(deckId);
                queue = Array.isArray(res) ? res : [];
            } else {
                // Create a cross-deck session via /practice/session
                const payload = { deck_id: null, limit: 20 };
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
                const payload = { name, language: targetLanguage};
                const newDeck = await wordService.createDeck(payload);
                setDecks(prev => [...prev, newDeck]);
            } catch (e) {
                console.error(e);
            }
        }
    }

    const handleViewDeck = (deckId: string | null) => {
        setSelectedDeckId(deckId);
        // Filter words by deck
        const filtered = deckId === null ? wordBank : wordBank.filter(w => w.deck_id === deckId);
        setDeckWords(filtered);
        setViewState('manage');
    };

    const handleDeleteWord = async (wordId: string) => {
        if (!confirm('Are you sure you want to remove this word from your vocabulary?')) return;
        try {
            await wordService.deleteWord(wordId);
            setDeckWords(prev => prev.filter(w => w.id !== wordId));
            if ((window as any).appSetToast) {
                (window as any).appSetToast({ type: 'success', message: 'Word removed from vocabulary' });
            }
        } catch (e) {
            console.error(e);
            if ((window as any).appSetToast) {
                (window as any).appSetToast({ type: 'error', message: 'Failed to delete word' });
            }
        }
    };

    // Template Management Functions
    const handleSaveTemplate = async (template: any) => {
        try {
            if (template.id) {
                // Update existing template
                const updated = await templateService.updateTemplate(template.id, template);
                setTemplates(prev => prev.map(t => t.id === template.id ? updated : t));
                if ((window as any).appSetToast) {
                    (window as any).appSetToast({ type: 'success', message: 'Template updated successfully' });
                }
            } else {
                // Create new template
                const created = await templateService.createTemplate(template);
                setTemplates(prev => [...prev, created]);
                if ((window as any).appSetToast) {
                    (window as any).appSetToast({ type: 'success', message: 'Template created successfully' });
                }
            }
            setShowTemplateEditor(false);
            setEditingTemplate(null);
        } catch (e) {
            console.error(e);
            if ((window as any).appSetToast) {
                (window as any).appSetToast({ type: 'error', message: 'Failed to save template' });
            }
        }
    };

    const handleDeleteTemplate = async (templateId: number) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await templateService.deleteTemplate(templateId);
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            if ((window as any).appSetToast) {
                (window as any).appSetToast({ type: 'success', message: 'Template deleted successfully' });
            }
        } catch (e) {
            console.error(e);
            if ((window as any).appSetToast) {
                (window as any).appSetToast({ type: 'error', message: 'Failed to delete template' });
            }
        }
    };

    const handleEditTemplate = (template: any) => {
        setEditingTemplate(template);
        setShowTemplateEditor(true);
    };

    const handleSetDeckTemplate = async (deckId: string, templateId: string | null) => {
        try {
            await wordService.updateDeck(deckId, { default_template_id: templateId });
            setDecks(prev => prev.map(d => d.id === deckId ? { ...d, default_template_id: templateId } : d));
            if ((window as any).appSetToast) {
                (window as any).appSetToast({ type: 'success', message: 'Deck template updated' });
            }
        } catch (e) {
            console.error(e);
            if ((window as any).appSetToast) {
                (window as any).appSetToast({ type: 'error', message: 'Failed to update deck template' });
            }
        }
    };

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

    const handleFlip = useCallback(() => {
        setIsFlipped(prev => !prev);
    }, []);

    // Keyboard shortcuts for study session
    useKeyboardShortcuts(
        [
            {
                key: ' ',
                handler: handleFlip,
                description: 'Flip card',
                disabled: viewState !== 'study' || currentIndex >= reviewQueue.length,
            },
            {
                key: '1',
                handler: () => handleAssessment(false, 'Again'),
                description: 'Rate: Again',
                disabled: viewState !== 'study' || !isFlipped || currentIndex >= reviewQueue.length,
            },
            {
                key: '2',
                handler: () => handleAssessment(false, 'Hard'),
                description: 'Rate: Hard',
                disabled: viewState !== 'study' || !isFlipped || currentIndex >= reviewQueue.length,
            },
            {
                key: '3',
                handler: () => handleAssessment(true, 'Good'),
                description: 'Rate: Good',
                disabled: viewState !== 'study' || !isFlipped || currentIndex >= reviewQueue.length,
            },
            {
                key: '4',
                handler: () => handleAssessment(true, 'Easy'),
                description: 'Rate: Easy',
                disabled: viewState !== 'study' || !isFlipped || currentIndex >= reviewQueue.length,
            },
        ],
        true
    );

    // --- VIEW: DECKS ---
    if (viewState === 'decks') {
        const allStats = getDeckStats(null);

         return (
            <div className="flex-1 p-6 md:p-8">
                {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} language={targetLanguage} />}

                {/* Template Editor Modal */}
                {showTemplateEditor && (
                    <TemplateEditor
                        onClose={() => {
                            setShowTemplateEditor(false);
                            setEditingTemplate(null);
                        }}
                        onSave={handleSaveTemplate}
                        existingTemplate={editingTemplate}
                    />
                )}

                {/* Template Manager Modal */}
                {showTemplateManager && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTemplateManager(false)}>
                        <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-4xl my-8 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="p-6 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800 z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Card Templates</h2>
                                    <p className="text-sm text-slate-400 mt-1">Manage how your flashcards appear</p>
                                </div>
                                <button onClick={() => setShowTemplateManager(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <button
                                    onClick={() => {
                                        setEditingTemplate(null);
                                        setShowTemplateEditor(true);
                                    }}
                                    className="mb-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    + Create New Template
                                </button>

                                {templates.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-slate-400">No templates yet. Create your first template!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {templates.map(template => (
                                            <div key={template.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-sky-500 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-bold text-white">{template.name}</h3>
                                                        {template.language && (
                                                            <span className="inline-block mt-1 px-2 py-0.5 bg-slate-600 text-xs text-slate-300 rounded">
                                                                {template.language}
                                                            </span>
                                                        )}
                                                        <div className="mt-3 grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-xs text-slate-400 mb-1">FRONT</p>
                                                                <pre className="text-xs text-slate-300 bg-slate-900 p-2 rounded overflow-x-auto">{template.front_template}</pre>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-400 mb-1">BACK</p>
                                                                <pre className="text-xs text-slate-300 bg-slate-900 p-2 rounded overflow-x-auto">{template.back_template}</pre>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 ml-4">
                                                        <button
                                                            onClick={() => handleEditTemplate(template)}
                                                            className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-sm rounded transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTemplate(template.id)}
                                                            className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-sm rounded transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white">Flashcard Decks</h2>
                        <p className="text-slate-400">Select a deck to start reviewing.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowTemplateManager(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            Templates
                        </button>
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
                                className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-900/20 transition-all group"
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

                                <div className="flex gap-2 border-t border-slate-700 pt-4">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleViewDeck(deck.id); }}
                                        className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                                    >
                                        View Deck
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleStartSession(deck.id); }}
                                        className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
                                    >
                                        Study
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
         )
    }

    // --- VIEW: MANAGE DECK ---
    if (viewState === 'manage') {
        const currentDeck = selectedDeckId !== null ? decks.find(d => d.id === selectedDeckId) : null;
        const deckName = selectedDeckId === null
            ? 'All Vocabulary'
            : currentDeck?.name || 'Unknown Deck';

        return (
            <div className="flex-1 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setViewState('decks')}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-3xl font-bold text-white">{deckName}</h2>
                            <p className="text-slate-400">{deckWords.length} word{deckWords.length !== 1 ? 's' : ''} in this deck</p>
                        </div>
                    </div>

                    {/* Template Selection for Custom Decks */}
                    {selectedDeckId !== null && currentDeck && (
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-slate-400">Card Template:</label>
                            <select
                                value={currentDeck.default_template_id || ''}
                                onChange={(e) => {
                                    const templateId = e.target.value ? e.target.value : null;
                                    handleSetDeckTemplate(selectedDeckId, templateId);
                                }}
                                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                            >
                                <option value="">Default Template</option>
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {deckWords.length === 0 ? (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                        <p className="text-slate-400 mb-4">This deck is empty.</p>
                        <p className="text-sm text-slate-500">Add words from the Reader view or import a deck to get started.</p>
                    </div>
                ) : (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-700/50">
                                    <tr>
                                        <th className="p-4 text-left text-sm font-semibold text-slate-300">Word</th>
                                        <th className="p-4 text-left text-sm font-semibold text-slate-300">Translation</th>
                                        <th className="p-4 text-left text-sm font-semibold text-slate-300">Context</th>
                                        <th className="p-4 text-right text-sm font-semibold text-slate-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deckWords.map((word, idx) => (
                                        <tr
                                            key={word.id || idx}
                                            className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                                        >
                                            <td className="p-4 text-emerald-300 font-bold">{word.term}</td>
                                            <td className="p-4 text-slate-300">{word.translation || word.translation || 'N/A'}</td>
                                            <td className="p-4 text-slate-400 text-sm max-w-md truncate">
                                                {word.context || 'No context'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => word.id && handleDeleteWord(word.id)}
                                                    className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-sm font-medium rounded transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
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
        const isSessionJustStarted = currentIndex === 0 && reviewQueue.length === 0;
        const isSessionComplete = currentIndex >= reviewQueue.length && reviewQueue.length > 0;

         return (
          <div className="flex-1 p-6 md:p-8 text-center text-slate-400 flex flex-col items-center justify-center">
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 max-w-md w-full">
                {isSessionJustStarted ? (
                    <>
                        <h2 className="text-2xl font-bold text-sky-400 mb-4">No Cards to Review</h2>
                        <p className="mb-2">This deck has no cards ready for review right now.</p>
                        <p className="text-sm text-slate-500 mb-6">
                            {selectedDeckId === null
                                ? "Add words from the Reader view or import a deck to get started."
                                : "All cards in this deck are up to date, or the deck is empty."}
                        </p>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">Session Complete!</h2>
                        <p className="mb-6">You've reviewed all {reviewQueue.length} card{reviewQueue.length !== 1 ? 's' : ''} in this session.</p>
                    </>
                )}
                <div className="flex flex-col gap-3">
                    {isSessionComplete && (
                        <button
                            onClick={() => handleStartSession(selectedDeckId)}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg transition-colors w-full"
                        >
                            Restart Session
                        </button>
                    )}
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
                    <ReviewButton label="Again" onClick={() => handleAssessment(false, 'Again')} colorClass="bg-red-600/80 hover:bg-red-600 shadow-lg shadow-red-900/20" shortcut="1" />
                    <ReviewButton label="Hard" onClick={() => handleAssessment(false, 'Hard')} colorClass="bg-orange-600/80 hover:bg-orange-600 shadow-lg shadow-orange-900/20" shortcut="2" />
                    <ReviewButton label="Good" onClick={() => handleAssessment(true, 'Good')} colorClass="bg-emerald-600/80 hover:bg-emerald-600 shadow-lg shadow-emerald-900/20" shortcut="3" />
                    <ReviewButton label="Easy" onClick={() => handleAssessment(true, 'Easy')} colorClass="bg-sky-600/80 hover:bg-sky-600 shadow-lg shadow-sky-900/20" shortcut="4" />
                </div>
            )}
        </div>
    );
};
