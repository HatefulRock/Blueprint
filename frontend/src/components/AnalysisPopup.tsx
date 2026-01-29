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
  onSaveWord: (wordData: any) => void; // Relaxed type to allow Partial<Word> creation
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
  const [isSaving, setIsSaving] = React.useState(false);

  if (!selection) return null;

  const handleSave = async () => {
    if (!selection || !analysisResult || selection.type !== 'word' || isWordInBank) return;

    setIsSaving(true);

    // FIX: Flatten structure and use snake_case to match backend 'Word' model
    await onSaveWord({
        term: selection.text,
        translation: analysisResult.translation,
        literal_translation: analysisResult.literalTranslation || "N/A",
        grammatical_breakdown: analysisResult.grammaticalBreakdown || "No detailed breakdown available.",
        part_of_speech: analysisResult.partOfSpeech || null,
        context: analysisResult.contextSentence || ""
    });

    // Brief delay to show the success state
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 500);
  };

  const handleSaveBreakdownWord = (term: string, translation: string, partOfSpeech: string) => {
      // FIX: Flatten structure and use snake_case to match backend 'Word' model
      onSaveWord({
          term: term,
          context: selection?.text || "",
          translation: translation,
          literal_translation: translation,
          grammatical_breakdown: `${partOfSpeech}. Found in sentence: "${selection?.text}"`,
          part_of_speech: partOfSpeech
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

                {/* Context Section - PROMINENTLY DISPLAYED for single words */}
                {selection.type === 'word' && analysisResult.contextSentence && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📝</span>
                      <h3 className="text-sm font-semibold text-amber-400">Context</h3>
                    </div>
                    <p className="text-slate-200 italic leading-relaxed">
                      "{analysisResult.contextSentence}"
                    </p>
                  </div>
                )}

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

                {/* Usage Examples Section */}
                {analysisResult.usageExamples && analysisResult.usageExamples.length > 0 && (
                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">💡</span>
                      <h3 className="text-sm font-semibold text-sky-400">Usage Examples</h3>
                    </div>
                    <div className="space-y-3">
                      {analysisResult.usageExamples.map((example, idx) => (
                        <div key={idx} className="bg-slate-700/20 rounded-lg p-3 border border-slate-700">
                          <p className="text-emerald-300 font-medium mb-1">{example.example}</p>
                          <p className="text-slate-400 text-sm">{example.translation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Memory Aid Section */}
                {analysisResult.memoryAid && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎯</span>
                      <h3 className="text-sm font-semibold text-purple-400">Memory Aid</h3>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{analysisResult.memoryAid}</p>
                  </div>
                )}

                {/* Related Words Section */}
                {analysisResult.relatedWords && analysisResult.relatedWords.length > 0 && (
                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🔗</span>
                      <h3 className="text-sm font-semibold text-sky-400">Related Words</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.relatedWords.map((word, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-700/50 hover:bg-slate-700 px-3 py-1.5 rounded-full text-sm text-slate-300 border border-slate-600 transition-colors cursor-pointer"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sentence Word Breakdown Section */}
                {analysisResult.wordBreakdown && analysisResult.wordBreakdown.length > 0 && (
                    <div className="pt-4 border-t border-slate-700">
                        <h3 className="text-sm font-semibold text-sky-400 mb-3">Vocabulary in this Sentence</h3>
                        <div className="space-y-2">
                            {analysisResult.wordBreakdown.map((wb, idx) => {
                                const isBreakdownWordSaved = wordBank.some(w => w.term.toLowerCase() === wb.term.toLowerCase());
                                return (
                                    <div key={idx} className="flex items-center justify-between bg-slate-700/30 p-3 rounded-lg border border-slate-700 hover:bg-slate-700/50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <p className="font-bold text-emerald-300">{wb.term}</p>
                                                {wb.pinyin && wb.pinyin.trim() && (
                                                    <p className="text-xs text-pink-400 font-mono">{wb.pinyin}</p>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400">{wb.partOfSpeech} • {wb.translation}</p>
                                        </div>
                                        <button
                                            onClick={() => handleSaveBreakdownWord(wb.term, wb.translation, wb.partOfSpeech)}
                                            disabled={isBreakdownWordSaved}
                                            className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
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
                    disabled={!canSave || isSaving}
                    className={`px-4 py-2 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                      isSaving
                        ? 'bg-emerald-500 scale-95'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                    {isSaving ? (
                      <>
                        <CheckCircleIcon className="w-5 h-5 animate-bounce" />
                        <span>Saved!</span>
                      </>
                    ) : isWordInBank ? (
                      'Word in Vocabulary'
                    ) : (
                      'Save to Vocabulary'
                    )}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};