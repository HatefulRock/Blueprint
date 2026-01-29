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
  onSaveWord: (wordData: any) => void; // Relaxed type slightly to allow Partial<Word> creation
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
  const [isSaving, setIsSaving] = React.useState(false);

  const hasDeepAnalysis = !!analysisResult?.grammaticalBreakdown;
  const showDeepAnalysisButton = analysisResult && !hasDeepAnalysis && !isDeepLoading;
  const canSave = selection?.type === 'word' && !!analysisResult && !isWordInBank;

  const handleSave = async () => {
    if (!selection || !analysisResult || selection.type !== 'word' || isWordInBank) return;

    setIsSaving(true);

    // FIX: Flatten the structure and map camelCase to snake_case to match 'Word' type
    await onSaveWord({
        term: selection.text,
        translation: analysisResult.translation,
        literal_translation: analysisResult.literalTranslation || "N/A",
        grammatical_breakdown: analysisResult.grammaticalBreakdown || "No detailed breakdown available.",
        part_of_speech: analysisResult.partOfSpeech || null,
        context: analysisResult.contextSentence || ""
    });

    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  const handleSaveBreakdownWord = (term: string, translation: string, partOfSpeech: string) => {
      // FIX: Flatten the structure and map camelCase to snake_case to match 'Word' type
      onSaveWord({
          term: term,
          context: selection?.text || "",
          translation: translation,
          literal_translation: translation, // Simplified for breakdown items
          grammatical_breakdown: `${partOfSpeech}. Found in sentence: "${selection?.text}"`,
          part_of_speech: partOfSpeech
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

                {/* Context Section */}
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
              </div>
            ) : (
                !isLoading && <p className="text-amber-400 bg-amber-400/10 p-3 rounded-md border border-amber-400/30">Could not retrieve analysis.</p>
            )}
          </div>
        )}
      </div>
      
      {/* Footer Action Button */}
      {selection && selection.type === 'word' && !isWordInBank && (
        <div className="p-4 bg-slate-900/50 border-t border-slate-700 mt-auto">
             <button
                onClick={handleSave}
                disabled={!canSave || isSaving}
                className={`w-full py-3 px-4 font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    isSaving
                        ? 'bg-emerald-500 text-white scale-95'
                        : canSave
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/20'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
            >
                {isSaving ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 animate-bounce">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    <span>Save to Vocabulary</span>
                  </>
                )}
            </button>
        </div>
      )}
    </aside>
  );
};