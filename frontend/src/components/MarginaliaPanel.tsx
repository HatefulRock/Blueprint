
import React from 'react';
import { AnalysisResult, Selection, Word } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon'; // Used as save icon

interface MarginaliaPanelProps {
  selection: Selection | null;
  analysisResult: AnalysisResult | null;
  isLoading: boolean;
  isDeepLoading: boolean;
  onRequestDeepAnalysis: () => void;
  onPlayAudio: (text: string) => void;
  onSaveWord: (wordData: Omit<Word, 'familiarityScore' | 'language' | 'context'> & { context?: string }) => void;
  isWordInBank: boolean;
  wordBank?: Word[]; // Pass the full bank to check individual words in sentence mode
}

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-slate-700 rounded w-1/3"></div>
    <div className="h-3 bg-slate-700 rounded w-full"></div>
    <div className="h-3 bg-slate-700 rounded w-5/6"></div>
  </div>
);

const AnalysisSection = ({ title, content }: { title: string, content: string | undefined }) => {
  if (!content) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-sky-400 mb-1">{title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed">{content}</p>
    </div>
  );
};

export const MarginaliaPanel = ({ 
  selection, 
  analysisResult, 
  isLoading, 
  isDeepLoading, 
  onRequestDeepAnalysis, 
  onPlayAudio,
  onSaveWord,
  isWordInBank,
  wordBank = []
}: MarginaliaPanelProps) => {
  
  const hasDeepAnalysis = !!analysisResult?.grammaticalBreakdown;
  const showDeepAnalysisButton = analysisResult && !hasDeepAnalysis && !isDeepLoading;
  const canSave = selection?.type === 'word' && !!analysisResult && !isWordInBank;

  const handleSave = () => {
    if (!selection || !analysisResult || selection.type !== 'word' || isWordInBank) return;
    onSaveWord({ 
        term: selection.text,
        analysis: {
            translation: analysisResult.translation,
            literalTranslation: analysisResult.literalTranslation || "N/A",
            grammaticalBreakdown: analysisResult.grammaticalBreakdown || "No detailed breakdown available."
        }
    });
  };

  const handleSaveBreakdownWord = (term: string, translation: string, partOfSpeech: string) => {
      // When saving a word from a sentence breakdown, use the full sentence (selection.text) as the context
      onSaveWord({
          term: term,
          context: selection?.text || "",
          analysis: {
              translation: translation,
              literalTranslation: translation, // Simplified for breakdown items
              grammaticalBreakdown: `${partOfSpeech}. Found in sentence: "${selection?.text}"`
          }
      });
  };

  return (
    <aside className="w-full h-full flex flex-col bg-slate-800/80 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-6 h-6 text-sky-400" />
          <h2 className="text-lg font-bold text-white">AI Analysis</h2>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {!selection ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-4 opacity-60">
            <div className="p-4 bg-slate-700/50 rounded-full">
                <span className="text-4xl">👆</span>
            </div>
            <p>Select a word or sentence from the text to view its meaning, grammar, and pronunciation.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selection Header */}
            <div className="pb-4 border-b border-slate-700">
                <div className="flex justify-between items-start gap-4">
                    <p className="font-mono text-2xl font-bold text-emerald-300 break-words leading-tight">
                        {selection.text}
                    </p>
                    <button 
                        onClick={() => onPlayAudio(selection.text)} 
                        className="p-2 rounded-full bg-slate-700 hover:bg-sky-500 text-slate-300 hover:text-white transition-colors flex-shrink-0 shadow-md"
                        title="Listen"
                    >
                        <SpeakerWaveIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Analysis Content */}
            {isLoading ? (
              <>
                <SkeletonLoader />
                <SkeletonLoader />
              </>
            ) : analysisResult ? (
              <div className="space-y-6 animate-fade-in">
                <AnalysisSection title="Translation" content={analysisResult.translation} />
                <AnalysisSection title="Part of Speech" content={analysisResult.partOfSpeech} />

                {showDeepAnalysisButton && (
                  <div className="pt-2">
                    <button 
                        onClick={onRequestDeepAnalysis}
                        className="w-full bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/50 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 group"
                    >
                        <SparklesIcon className="w-5 h-5 group-hover:text-white transition-colors" />
                        <span>Get Deeper Analysis</span>
                    </button>
                  </div>
                )}

                {isDeepLoading && (
                  <div className="space-y-4 pt-2">
                    <div className="h-1 bg-sky-500/30 rounded overflow-hidden">
                        <div className="w-full h-full bg-sky-500 animate-progress"></div>
                    </div>
                    <p className="text-xs text-sky-400 text-center">Analyzing grammar and context...</p>
                  </div>
                )}
                
                <AnalysisSection title="Literal Translation" content={analysisResult.literalTranslation} />
                <AnalysisSection title="Grammatical Breakdown" content={analysisResult.grammaticalBreakdown} />

                {/* Sentence Word Breakdown Section */}
                {analysisResult.wordBreakdown && analysisResult.wordBreakdown.length > 0 && (
                    <div className="pt-4 border-t border-slate-700">
                        <h3 className="text-sm font-semibold text-sky-400 mb-3">Vocabulary in this Sentence</h3>
                        <div className="space-y-2">
                            {analysisResult.wordBreakdown.map((wb, idx) => {
                                const isBreakdownWordSaved = wordBank.some(w => w.term.toLowerCase() === wb.term.toLowerCase());
                                return (
                                    <div key={idx} className="flex items-center justify-between bg-slate-700/30 p-3 rounded-lg border border-slate-700 hover:bg-slate-700/50 transition-colors">
                                        <div>
                                            <p className="font-bold text-emerald-300">{wb.term}</p>
                                            <p className="text-xs text-slate-400">{wb.partOfSpeech} • {wb.translation}</p>
                                        </div>
                                        <button
                                            onClick={() => handleSaveBreakdownWord(wb.term, wb.translation, wb.partOfSpeech)}
                                            disabled={isBreakdownWordSaved}
                                            className={`p-1.5 rounded-md transition-colors ${
                                                isBreakdownWordSaved 
                                                ? 'text-emerald-500' 
                                                : 'text-slate-400 hover:bg-emerald-600 hover:text-white'
                                            }`}
                                            title={isBreakdownWordSaved ? "Already in vocabulary" : "Add to vocabulary"}
                                        >
                                            {isBreakdownWordSaved ? <CheckCircleIcon className="w-5 h-5" /> : (
                                                 <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
              </div>
            ) : (
                !isLoading && <p className="text-amber-400 bg-amber-400/10 p-3 rounded-md border border-amber-400/30">Could not retrieve analysis.</p>
            )}
          </div>
        )}
      </div>
      
      {/* Footer Action Button (Only for single words, sentences use the breakdown list above) */}
      {selection && selection.type === 'word' && !isWordInBank && (
        <div className="p-4 bg-slate-900/50 border-t border-slate-700 mt-auto">
             <button 
                onClick={handleSave}
                disabled={!canSave}
                className={`w-full py-3 px-4 font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    canSave
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/20'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Save to Vocabulary</span>
            </button>
        </div>
      )}
    </aside>
  );
};
