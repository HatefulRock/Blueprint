import React, { useMemo, useEffect } from "react";
import { Word } from "../types";

interface HighlightedTextProps {
  text: string;
  wordBank: Word[];
  onFirstHighlight: () => void;
  onWordClick?: (word: Word) => void; // Added to allow re-viewing known words
}

export const HighlightedText = ({
  text,
  wordBank,
  onFirstHighlight,
  onWordClick,
}: HighlightedTextProps) => {
  // 1. Efficient lookup map
  const knownWordsMap = useMemo(() => {
    const map = new Map<string, Word>();
    wordBank.forEach((word) => {
      map.set(word.term.toLowerCase(), word);
    });
    return map;
  }, [wordBank]);

  // 2. Fix: Move the "First Highlight" logic to useEffect
  useEffect(() => {
    if (wordBank.length > 0 && text) {
      // Simple check to see if any word in the text exists in the wordBank
      const wordsInText = text.toLowerCase().split(/\s+/);
      const hasMatch = wordsInText.some((w) => knownWordsMap.has(w));
      if (hasMatch) {
        onFirstHighlight();
      }
    }
  }, [text, knownWordsMap, wordBank.length]); // onFirstHighlight removed from deps to prevent loops

  const renderedText = useMemo(() => {
    if (wordBank.length === 0) return text;

    // 3. Robust Regex for international languages (supports accents/unicode)
    // Splits by word boundaries but captures the delimiters
    const parts = text.split(/([\p{L}\d'-]+|[^\p{L}\d'-]+)/u);

    return parts.map((part, index) => {
      const wordData = knownWordsMap.get(part.toLowerCase());

      if (wordData) {
        // 4. Dynamic styling based on familiarity
        const isMastered = wordData.familiarityScore >= 4;
        const colorClass = isMastered
          ? "border-emerald-500/60 hover:bg-emerald-500/10"
          : "border-amber-500/60 hover:bg-amber-500/10";

        return (
          <span key={index} className="relative group inline-block">
            <span
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering general text selection
                onWordClick?.(wordData);
              }}
              className={`border-b-2 border-dashed cursor-pointer transition-colors ${colorClass}`}
            >
              {part}
            </span>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-slate-800 border border-slate-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl">
               <div className="font-bold text-sky-400">
                 {wordData.analysis?.translation ?? '—'}
               </div>
              <div className="text-slate-400 mt-1">
                Mastery: {wordData.familiarityScore}/5
              </div>
            </div>
          </span>
        );
      }
      return part;
    });
  }, [text, knownWordsMap, onWordClick]);

  return (
    <div className="w-full h-full p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none text-lg leading-relaxed text-slate-300 whitespace-pre-wrap">
      {renderedText}
    </div>
  );
};
