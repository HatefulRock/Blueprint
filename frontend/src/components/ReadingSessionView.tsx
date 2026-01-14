
import React from 'react';
import { Selection, Word, AnalysisResult, AnalysisDisplayMode } from '../types';
import { HighlightedText } from './HighlightedText';
import { MarginaliaPanel } from './MarginaliaPanel';
import { AnalysisPopup } from './AnalysisPopup';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

interface ReadingSessionViewProps {
  title: string;
  content: string;
  wordBank: Word[];
  onTextSelect: (selection: Selection) => void;
  onFirstHighlight: () => void;
  onGoBack: () => void;
  selection: Selection | null;
  analysisResult: AnalysisResult | null;
  isLoading: boolean;
  isDeepLoading: boolean;
  onRequestDeepAnalysis: () => void;
  onPlayAudio: (text: string) => void;
  analysisDisplayMode: AnalysisDisplayMode;
  isPopupOpen: boolean;
  setIsPopupOpen: (isOpen: boolean) => void;
  onSaveWord: (wordData: Omit<Word, 'familiarityScore' | 'language' | 'context'> & { context?: string }) => void;
  isWordInBank: boolean;
}

export const ReadingSessionView = ({
    title,
    content,
    wordBank,
    onTextSelect,
    onFirstHighlight,
    onGoBack,
    selection,
    analysisResult,
    isLoading,
    isDeepLoading,
    onRequestDeepAnalysis,
    onPlayAudio,
    analysisDisplayMode,
    isPopupOpen,
    setIsPopupOpen,
    onSaveWord,
    isWordInBank
}: ReadingSessionViewProps) => {

    const handleSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const selectedText = selection.toString().trim();
        if (selectedText.length === 0) return;

        const isSentence = selectedText.includes(' ') || selectedText.length > 25;

        onTextSelect({
            text: selectedText,
            type: isSentence ? 'sentence' : 'word',
        });
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
            <header className="bg-slate-800 p-4 flex items-center justify-between border-b border-slate-700 flex-shrink-0 sticky top-0 z-20">
                <button onClick={onGoBack} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to Library
                </button>
                <h1 className="text-xl font-bold text-white text-center flex-grow truncate px-4" title={title}>{title}</h1>
                <div className="w-40"></div> {/* Spacer to balance the back button and center the title */}
            </header>
            
            <div className="flex-grow flex flex-col lg:flex-row gap-8 p-4 md:p-8 overflow-hidden">
                <div onMouseUp={handleSelection} className="w-full lg:flex-[2] overflow-y-auto">
                    <HighlightedText text={content} wordBank={wordBank} onFirstHighlight={onFirstHighlight} />
                </div>
                
                {analysisDisplayMode === 'panel' && (
                    <div className="w-full lg:flex-[1] overflow-y-auto h-full">
                        <MarginaliaPanel 
                            selection={selection} 
                            analysisResult={analysisResult} 
                            isLoading={isLoading}
                            isDeepLoading={isDeepLoading}
                            onRequestDeepAnalysis={onRequestDeepAnalysis}
                            onPlayAudio={onPlayAudio}
                            onSaveWord={onSaveWord}
                            isWordInBank={isWordInBank}
                            wordBank={wordBank}
                        />
                    </div>
                )}
            </div>

            {isPopupOpen && analysisDisplayMode === 'popup' && (
                <AnalysisPopup
                    selection={selection}
                    analysisResult={analysisResult}
                    isLoading={isLoading}
                    isDeepLoading={isDeepLoading}
                    onRequestDeepAnalysis={onRequestDeepAnalysis}
                    onPlayAudio={onPlayAudio}
                    onClose={() => setIsPopupOpen(false)}
                    onSaveWord={onSaveWord}
                    isWordInBank={isWordInBank}
                    wordBank={wordBank}
                />
            )}
        </div>
    );
};
