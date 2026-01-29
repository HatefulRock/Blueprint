import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ActiveReadingText, Selection, AnalysisResult } from '../types';
import { aiService } from '../services/api';
import { useSettings } from './SettingsContext';

interface ReadingContextType {
  activeReadingText: ActiveReadingText | null;
  setActiveReadingText: (text: ActiveReadingText | null) => void;
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  isLoadingAnalysis: boolean;
  setIsLoadingAnalysis: (loading: boolean) => void;
  isDeepLoading: boolean;
  requestDeepAnalysis: (text: string, context: string) => Promise<void>;
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

export const ReadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { targetLanguage } = useSettings();
  const [activeReadingText, setActiveReadingText] = useState<ActiveReadingText | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isDeepLoading, setIsDeepLoading] = useState(false);

  const requestDeepAnalysis = useCallback(
    async (text: string, context: string) => {
      setIsDeepLoading(true);
      try {
        // aiService.analyzeText returns the structure via axios interceptor
        // Pass the context sentence for deeper analysis
        const deep = await aiService.analyzeText(text, targetLanguage, context);

        // Map the response to handle both snake_case and camelCase
        const mapped = {
          translation: deep.translation || '',
          partOfSpeech: deep.part_of_speech || deep.partOfSpeech || undefined,
          literalTranslation: deep.literal_translation || deep.literalTranslation || undefined,
          grammaticalBreakdown: deep.grammar_breakdown || deep.grammaticalBreakdown || undefined,
          wordBreakdown:
            deep.vocabulary?.map((v: any) => ({
              term: v.term,
              translation: v.translation,
              partOfSpeech: v.pos || v.part_of_speech || v.partOfSpeech || '',
              pinyin: v.pinyin ?? undefined,
            })) || undefined,
          difficultyLevel: deep.difficulty_level || deep.difficultyLevel || undefined,
          usageExamples: deep.usage_examples || deep.usageExamples || undefined,
          memoryAid: deep.memory_aid || deep.memoryAid || undefined,
          relatedWords: deep.related_words || deep.relatedWords || undefined,
          contextSentence: deep.context_sentence || deep.contextSentence || context || undefined,
        };

        // Merge new deep analysis into existing analysis result
        setAnalysisResult((prev) => (prev ? { ...prev, ...mapped } : mapped));
      } catch (error) {
        console.error('Deep analysis failed', error);
        throw error;
      } finally {
        setIsDeepLoading(false);
      }
    },
    [targetLanguage]
  );

  // When selection changes we should attempt a quick analysis with context
  useEffect(() => {
    if (!selection) return;
    let cancelled = false;

    const doLookup = async () => {
      setIsLoadingAnalysis(true);
      try {
        // Use analyzeText with optional contextSentence for enhanced analysis
        const res: any = await aiService
          .analyzeText(selection.text, targetLanguage, selection.contextSentence)
          .catch(() => null);

        if (!res) {
          // no result, clear or keep previous
          if (!cancelled) setAnalysisResult(null);
          return;
        }

        // Map the response to AnalysisResult format
        // Handle both snake_case (from backend) and camelCase
        const mapped: AnalysisResult = {
          translation: res.translation || '',
          partOfSpeech: res.part_of_speech || res.partOfSpeech || undefined,
          literalTranslation: res.literal_translation || res.literalTranslation || undefined,
          grammaticalBreakdown: res.grammar_breakdown || res.grammaticalBreakdown || undefined,
          wordBreakdown:
            res.vocabulary?.map((v: any) => ({
              term: v.term,
              translation: v.translation,
              partOfSpeech: v.pos || v.part_of_speech || v.partOfSpeech || '',
            })) || undefined,
          difficultyLevel: res.difficulty_level || res.difficultyLevel || undefined,
          usageExamples: res.usage_examples || res.usageExamples || undefined,
          memoryAid: res.memory_aid || res.memoryAid || undefined,
          relatedWords: res.related_words || res.relatedWords || undefined,
          contextSentence:
            res.context_sentence || res.contextSentence || selection.contextSentence || undefined,
        };

        if (!cancelled) setAnalysisResult(mapped);
      } catch (e) {
        console.error('Analysis failed', e);
        if (!cancelled) setAnalysisResult(null);
      } finally {
        if (!cancelled) setIsLoadingAnalysis(false);
      }
    };

    doLookup();
    return () => {
      cancelled = true;
    };
  }, [selection, targetLanguage]);

  return (
    <ReadingContext.Provider
      value={{
        activeReadingText,
        setActiveReadingText,
        selection,
        setSelection,
        analysisResult,
        setAnalysisResult,
        isLoadingAnalysis,
        setIsLoadingAnalysis,
        isDeepLoading,
        requestDeepAnalysis,
      }}
    >
      {children}
    </ReadingContext.Provider>
  );
};

export const useReading = () => {
  const context = useContext(ReadingContext);
  if (!context) {
    throw new Error('useReading must be used within ReadingProvider');
  }
  return context;
};
