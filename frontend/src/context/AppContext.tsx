import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Word,
  Goals,
  GoalProgress,
  LanguageOption,
  AnalysisDisplayMode,
  ActiveReadingText, // Added
  Selection, // Added
  AnalysisResult, // Added
} from "../types";
import { userService, wordService, aiService } from "../services/api";
import { useAudio } from "../hooks/useAudio"; // Import the hook we made

interface AppContextType {
  // Navigation
  currentView: View;
  setCurrentView: (view: View) => void;

  // Global Data
  wordBank: Word[];
  goals: Goals | null;
  goalProgress: GoalProgress | null;
  isLoading: boolean;

  error: string | null;
  setError: (error: string | null) => void;

  // Reading Session State (Persisted across views)
  activeReadingText: ActiveReadingText | null;
  setActiveReadingText: (text: ActiveReadingText | null) => void;
  selection: Selection | null;
  setSelection: (s: Selection | null) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (r: AnalysisResult | null) => void;
  isLoadingAnalysis: boolean;
  setIsLoadingAnalysis: (loading: boolean) => void;
  isDeepLoading: boolean;

  // Settings
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  uiLanguage: string;
  setUiLanguage: (lang: string) => void;
  analysisDisplayMode: AnalysisDisplayMode;
  setAnalysisDisplayMode: (mode: AnalysisDisplayMode) => void;

  // Actions
  refreshWords: () => Promise<void>;
  updateGoalProgress: () => Promise<void>;
  addWord: (word: Partial<Word>) => Promise<void>;
  handleRequestDeepAnalysis: (text: string, context: string) => Promise<void>;
  handlePlayAudio: (text: string, lang?: string) => Promise<void>;
  isPlayingAudio: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userId] = useState(1);
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [wordBank, setWordBank] = useState<Word[]>([]);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reading State
  const [activeReadingText, setActiveReadingText] =
    useState<ActiveReadingText | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isDeepLoading, setIsDeepLoading] = useState(false);

  // Settings
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [uiLanguage, setUiLanguage] = useState("English");
  const [analysisDisplayMode, setAnalysisDisplayMode] =
    useState<AnalysisDisplayMode>("panel");

  // Audio Hook
  const { playAudio, isPlaying: isPlayingAudio } = useAudio();

  const updateGoalProgress = useCallback(async () => {
    try {
      const res = await userService.getProgress(userId);
      setGoalProgress(res.data);
      setGoals({
        wordsPerWeek: res.data.wordsGoal || 20,
        practiceSessionsPerWeek: res.data.sessionsGoal || 3,
      });
    } catch (e) {
      console.error("Failed to fetch progress", e);
    }
  }, [userId]);

  const refreshWords = useCallback(async () => {
    try {
      const response = await wordService.getWordsByDeck(1);
      setWordBank(response.data);
    } catch (e) {
      console.error("Failed to fetch words", e);
    }
  }, []);

  const addWord = async (wordData: Partial<Word>) => {
    await wordService.addWord(wordData as any);
    await refreshWords();
  };

  const handleRequestDeepAnalysis = async (text: string, context: string) => {
    setIsDeepLoading(true);
    try {
      // Assuming aiService.analyzeText returns the structure you need
      // You might need to adjust parameters based on your backend definition
      const response = await aiService.analyzeText(text, targetLanguage);

      // Merge new deep analysis into existing analysis result
      // This logic depends on what your backend returns.
      // Example:
      setAnalysisResult((prev) =>
        prev ? { ...prev, ...response.data } : response.data,
      );
    } catch (error) {
      console.error("Deep analysis failed", error);
    } finally {
      setIsDeepLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await userService.checkIn(userId);
        await Promise.all([updateGoalProgress(), refreshWords()]);
      } catch (error) {
        console.error("Initialization failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [userId, updateGoalProgress, refreshWords]);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        wordBank,
        goals,
        goalProgress,
        isLoading,
        error,
        setError,

        // Reading State
        activeReadingText,
        setActiveReadingText,
        selection,
        setSelection,
        analysisResult,
        setAnalysisResult,
        isLoadingAnalysis,
        setIsLoadingAnalysis,
        isDeepLoading,

        // Settings
        targetLanguage,
        setTargetLanguage,
        uiLanguage,
        setUiLanguage,
        analysisDisplayMode,
        setAnalysisDisplayMode,

        // Actions
        refreshWords,
        updateGoalProgress,
        addWord,
        handleRequestDeepAnalysis,
        handlePlayAudio: playAudio,
        isPlayingAudio,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
