import React from "react";
import { Selection, Word, AnalysisResult, AnalysisDisplayMode } from "../types";
import { HighlightedText } from "./HighlightedText";
import { MarginaliaPanel } from "./MarginaliaPanel";
import { AnalysisPopup } from "./AnalysisPopup";
import { ArrowLeftIcon } from "./icons/ArrowLeftIcon";

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
  // Adjusted type for onSaveWord to make it flexible for UI components
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

    // NEW: Extract surrounding sentence as context for single words
    let contextSentence = selectedText;
    if (type === "word") {
      try {
        const range = windowSelection?.getRangeAt(0);
        const container = range?.commonAncestorContainer;

        // Get the text content from the parent element or text node
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

            // Find sentence boundaries (period, exclamation, question mark, or Chinese equivalents)
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

    // Call prop method to update parent state
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

  // FIX: This function was problematic.
  // 1. It accessed 'props.selection' incorrectly.
  // 2. It called API directly instead of using the Context action.
  // 3. We now use the `onSaveWord` prop which connects to `ViewRenderer` -> `addWord` (Context).
  const handleSaveToDeck = (wordData: any) => {
    // Construct the payload expected by onSaveWord
    onSaveWord({
      ...wordData,
      // Use the selection prop passed to the component if context isn't in wordData
      context: wordData.context || selection?.text,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-slate-700/50 flex-shrink-0 sticky top-0 z-20">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="hidden md:inline">Back to Library</span>
        </button>

        <h1 className="text-lg font-bold text-white text-center flex-grow truncate px-4">
          {typeof title === "string" ? title : "Reading Session"}
        </h1>

        <div className="flex items-center gap-3">
          {onGenerateExercises && (
            <button
              onClick={onGenerateExercises}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all"
              title="Generate grammar exercises from this text"
            >
              <span className="hidden md:inline">Generate Exercises</span>
              <span className="md:hidden">Exercises</span>
            </button>
          )}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">READER MODE</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>
      </header>

      <div className="flex-grow flex flex-col lg:flex-row gap-0 lg:gap-8 p-0 md:p-8 overflow-hidden">
        <div
          onMouseUp={handleSelection}
          className="w-full lg:flex-[2] overflow-y-auto p-6 md:p-0 custom-scrollbar"
        >
          <div className="max-w-3xl mx-auto">
            <HighlightedText
              text={content}
              wordBank={wordBank}
              onFirstHighlight={onFirstHighlight}
              onWordClick={handleKnownWordClick}
            />
            <div className="h-64"></div>
          </div>
        </div>

        {analysisDisplayMode === "panel" && (
          <div className="hidden lg:block w-full lg:flex-[1] overflow-y-auto h-full bg-slate-800/30 border-l border-slate-700/50 rounded-t-3xl lg:rounded-none">
            <MarginaliaPanel
              selection={selection}
              analysisResult={analysisResult}
              isLoading={isLoading}
              isDeepLoading={isDeepLoading}
              onRequestDeepAnalysis={onRequestDeepAnalysis}
              onPlayAudio={onPlayAudio}
              onSaveWord={handleSaveToDeck} // Connect local handler to Panel
              isWordInBank={isWordInBank}
              wordBank={wordBank}
            />
          </div>
        )}
      </div>

      {isPopupOpen && analysisDisplayMode === "popup" && (
        <AnalysisPopup
          selection={selection}
          analysisResult={analysisResult}
          isLoading={isLoading}
          isDeepLoading={isDeepLoading}
          onRequestDeepAnalysis={onRequestDeepAnalysis}
          onPlayAudio={onPlayAudio}
          onClose={() => setIsPopupOpen(false)}
          onSaveWord={handleSaveToDeck} // Connect local handler to Popup
          isWordInBank={isWordInBank}
          wordBank={wordBank}
        />
      )}
    </div>
  );
};
