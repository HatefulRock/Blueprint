
import React, { useState } from 'react';
import { AnalysisResult, Selection, Word } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface AnalysisPopupProps {
  selection: Selection | null;
  analysisResult: AnalysisResult | null;
  isLoading: boolean;
  isDeepLoading: boolean;
  onRequestDeepAnalysis: () => void;
  onPlayAudio: (text: string) => void;
  onClose: () => void;
  onSaveWord: (wordData: Omit<Word, 'familiarityScore' | 'language' | 'context'> & { context?: string }) => void;
  isWordInBank: boolean;
  wordBank?: Word[];
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
        <p className="text-slate-300 text-sm">{content}</p>
      </div>
    );
};

export const AnalysisPopup = ({ selection, analysisResult, isLoading, isDeepLoading, onRequestDeepAnalysis, onPlayAudio, onClose, onSaveWord, isWordInBank, wordBank = [] }: AnalysisPopupProps) => {

  if (!selection) return null;

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
    onClose();
  };

  const handleSaveBreakdownWord = (term: string, translation: string, partOfSpeech: string) => {
      onSaveWord({
          term: term,
          context: selection?.text || "",
          analysis: {
              translation: translation,
              literalTranslation: translation,
              grammaticalBreakdown: `${partOfSpeech}. Found in sentence: "${selection?.text}"`
          }
      });
  };

  const hasDeepAnalysis = !!analysisResult?.grammaticalBreakdown;
  const canSave = selection.type === 'word' && !!analysisResult && !isWordInBank;
  const showDeepAnalysisButton = analysisResult && !hasDeepAnalysis && !isDeepLoading;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-40" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-lg m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
                <SparklesIcon className="w-6 h-6 text-sky-400" />
                <h2 className="text-lg font-bold text-white">AI Analysis</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow">
            <div className="mb-6 pb-4 border-b border-slate-700">
                <div className="flex justify-between items-start">
                    <p className="font-mono text-lg text-emerald-300 break-words pr-2">"{selection.text}"</p>
                    <button 
                        onClick={() => onPlayAudio(selection.text)} 
                        className="p-2 rounded-full bg-slate-700 hover:bg-sky-500 text-slate-300 hover:text-white transition-colors flex-shrink-0">
                        <SpeakerWaveIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="space-y-6">
            {isLoading ? (
              <>
                <SkeletonLoader />
              </>
            ) : analysisResult ? (
              <>
                <AnalysisSection title="Translation" content={analysisResult.translation} />
                <AnalysisSection title="Part of Speech" content={analysisResult.partOfSpeech} />
                
                {showDeepAnalysisButton && (
                   <button 
                    onClick={onRequestDeepAnalysis}
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <SparklesIcon className="w-5 h-5" />
                    Get Deeper Analysis
                  </button>
                )}

                {isDeepLoading && (
                    <>
                        <SkeletonLoader />
                        <SkeletonLoader />
                    </>
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

              </>
            ) : (
                !isLoading && <p className="text-amber-400">Could not retrieve analysis.</p>
            )}
            </div>
        </div>

        {selection.type === 'word' && (
            <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end mt-auto flex-shrink-0">
                <button 
                    onClick={handleSave}
                    disabled={!canSave}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isWordInBank ? 'Word in Vocabulary' : 'Save to Vocabulary'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
