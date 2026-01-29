import React from "react";
import { Selection, Word, AnalysisResult, AnalysisDisplayMode } from "../types";
import { HighlightedText } from "./HighlightedText";
import { MarginaliaPanel } from "./MarginaliaPanel";
import { AnalysisPopup } from "./AnalysisPopup";
import { ArrowLeftIcon } from "./icons/ArrowLeftIcon";
import { BookOpenIcon } from "@heroicons/react/24/outline";

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
  onSaveWord: (wordData: any) => void;
  isWordInBank: boolean;
  onGenerateExercises?: () => void;
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
  isWordInBank,
  onGenerateExercises,
}: ReadingSessionViewProps) => {
  const handleSelection = () => {
    const windowSelection = window.getSelection();
    const selectedText = windowSelection?.toString().trim();

    if (!selectedText || selectedText.length < 1 || isLoading) return;

    // Detect type
    const type =
      selectedText.includes(" ") || selectedText.length > 20
        ? "sentence"
        : "word";

    // Extract surrounding sentence as context for single words
    let contextSentence = selectedText;
    if (type === "word") {
      try {
        const range = windowSelection?.getRangeAt(0);
        const container = range?.commonAncestorContainer;

        let fullText = "";
        if (container?.nodeType === Node.TEXT_NODE) {
          fullText = container.parentElement?.textContent || container.textContent || "";
        } else if (container?.nodeType === Node.ELEMENT_NODE) {
          fullText = (container as Element).textContent || "";
        }

        if (fullText) {
          const wordIndex = fullText.indexOf(selectedText);
          if (wordIndex !== -1) {
            const beforeWord = fullText.substring(0, wordIndex);
            const afterWord = fullText.substring(wordIndex + selectedText.length);

            const sentenceEnders = ['.', '!', '?', '。', '！', '？'];
            let sentenceStart = 0;
            for (const ender of sentenceEnders) {
              const lastIndex = beforeWord.lastIndexOf(ender);
              if (lastIndex > sentenceStart) {
                sentenceStart = lastIndex + 1;
              }
            }

            let sentenceEnd = afterWord.length;
            for (const ender of sentenceEnders) {
              const firstIndex = afterWord.indexOf(ender);
              if (firstIndex !== -1 && firstIndex < sentenceEnd) {
                sentenceEnd = firstIndex + 1;
              }
            }

            contextSentence = fullText.substring(
              sentenceStart,
              wordIndex + selectedText.length + sentenceEnd
            ).trim();
          }
        }
      } catch (e) {
        console.warn("Failed to extract context sentence:", e);
        contextSentence = selectedText;
      }
    }

    onTextSelect({
      text: selectedText,
      type: type,
      contextSentence: type === "word" ? contextSentence : undefined,
    });

    setIsPopupOpen(true);
  };

  const handleKnownWordClick = (word: Word) => {
    onTextSelect({
      text: word.term,
      type: "word",
    });
    setIsPopupOpen(true);
  };

  const handleSaveToDeck = (wordData: any) => {
    onSaveWord({
      ...wordData,
      context: wordData.context || selection?.text,
    });
  };

  return (
    // Changed bg to a subtle gradient for depth
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 to-[#0f172a] text-slate-200 selection:bg-sky-500/30 selection:text-sky-200">
      
      {/* Header - Made simpler, removed the big title to reduce distraction */}
      <header className="flex-shrink-0 px-6 py-4 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm z-20 border-b border-white/5">
        <button
          onClick={onGoBack}
          className="group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <ArrowLeftIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden md:inline">Back to Library</span>
        </button>

        {/* Small breadcrumb title for context */}
        <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
           <span className="truncate max-w-[200px]">{typeof title === "string" ? title : "Reading Session"}</span>
        </div>

        <div className="flex items-center gap-3">
          {onGenerateExercises && (
            <button
              onClick={onGenerateExercises}
              className="px-4 py-2 rounded-lg text-sm font-medium text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all hover:shadow-[0_0_15px_rgba(14,165,233,0.15)]"
            >
              <span className="hidden md:inline">Generate Exercises</span>
              <span className="md:hidden">Exercises</span>
            </button>
          )}
          
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Reader Mode</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Added padding to create a floating effect */}
      <div className="flex-grow flex flex-col lg:flex-row gap-6 p-4 md:p-6 lg:p-8 overflow-hidden">
        
        {/* Text Container - The "Paper" */}
        <div
          onMouseUp={handleSelection}
          className="w-full lg:flex-[2] overflow-y-auto custom-scrollbar rounded-2xl bg-slate-800/40 border border-white/5 shadow-xl relative"
        >
          <div className="max-w-3xl mx-auto py-12 px-8 md:px-12 min-h-full">
            
            {/* Title moved inside the document for a book-like feel */}
            <div className="mb-10 border-b border-slate-700/50 pb-6">
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 leading-tight">
                {typeof title === "string" ? title : "Reading Session"}
              </h1>
            </div>

            {/* Typography adjustments for the content */}
            <div className="font-serif text-lg md:text-xl leading-loose tracking-wide text-slate-300">
              <HighlightedText
                text={content}
                wordBank={wordBank}
                onFirstHighlight={onFirstHighlight}
                onWordClick={handleKnownWordClick}
              />
            </div>
            
            {/* Footer space */}
            <div className="h-32 flex items-center justify-center text-slate-600 italic text-sm mt-12">
               End of text
            </div>
          </div>
        </div>

        {/* Sidebar - Floating Glass Card */}
        {analysisDisplayMode === "panel" && (
          <div className="hidden lg:block w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 h-full">
            <div className="h-full bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Optional: Add a subtle header to the panel if needed, or leave it to MarginaliaPanel */}
              <div className="flex-grow overflow-y-auto custom-scrollbar p-1">
                <MarginaliaPanel
                  selection={selection}
                  analysisResult={analysisResult}
                  isLoading={isLoading}
                  isDeepLoading={isDeepLoading}
                  onRequestDeepAnalysis={onRequestDeepAnalysis}
                  onPlayAudio={onPlayAudio}
                  onSaveWord={handleSaveToDeck}
                  isWordInBank={isWordInBank}
                  wordBank={wordBank}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Popup Handling */}
      {isPopupOpen && analysisDisplayMode === "popup" && (
        <AnalysisPopup
          selection={selection}
          analysisResult={analysisResult}
          isLoading={isLoading}
          isDeepLoading={isDeepLoading}
          onRequestDeepAnalysis={onRequestDeepAnalysis}
          onPlayAudio={onPlayAudio}
          onClose={() => setIsPopupOpen(false)}
          onSaveWord={handleSaveToDeck}
          isWordInBank={isWordInBank}
          wordBank={wordBank}
        />
      )}
    </div>
  );
};