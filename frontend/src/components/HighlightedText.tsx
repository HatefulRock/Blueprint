import React, { useMemo } from 'react';
import { Word } from '../types';

interface HighlightedTextProps {
  text: string;
  wordBank: Word[];
  onFirstHighlight: () => void;
}

export const HighlightedText = ({ text, wordBank, onFirstHighlight }: HighlightedTextProps) => {
  const knownWords = useMemo(() => {
    const map = new Map<string, { score: number }>();
    wordBank.forEach(word => {
      map.set(word.term.toLowerCase(), { score: word.familiarityScore });
    });
    return map;
  }, [wordBank]);

  const renderedText = useMemo(() => {
    if (wordBank.length === 0) {
      return text;
    }
    
    // Regex to split by word boundaries, keeping delimiters
    const parts = text.split(/(\b[\w'-]+\b|[^\w'-]+)/);
    let hasHighlighted = false;

    const result = parts.map((part, index) => {
      const lowerCasePart = part.toLowerCase();
      if (knownWords.has(lowerCasePart)) {
        if (!hasHighlighted) {
            hasHighlighted = true;
            onFirstHighlight();
        }
        const { score } = knownWords.get(lowerCasePart)!;
        return (
          <span key={index} className="relative group">
            <span className="border-b-2 border-emerald-500/60 border-dashed cursor-pointer">
              {part}
            </span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-700 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Familiarity: {score}/5
            </div>
          </span>
        );
      }
      return part;
    });

    return result;

  }, [text, knownWords, onFirstHighlight]);

  return (
    <div 
        className="w-full h-full p-4 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-lg leading-relaxed text-slate-300"
    >
      {renderedText}
    </div>
  );
};