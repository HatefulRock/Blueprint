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
  customTargetLanguages: LanguageOption[];
  setCustomTargetLanguages: (langs: LanguageOption[]) => void;
  addCustomTargetLanguage: (opt: LanguageOption) => Promise<void>;
  removeCustomTargetLanguage: (code: string) => Promise<void>;
  user: { id: number; username?: string } | null;
  setUser: (u: { id: number; username?: string } | null) => void;

  // Actions
  refreshWords: () => Promise<void>;
  updateGoalProgress: (idParam?: number) => Promise<void>;
  addWord: (word: Partial<Word>) => Promise<void>;
  handleRequestDeepAnalysis: (text: string, context: string) => Promise<void>;
  handlePlayAudio: (text: string, lang?: string) => Promise<void>;
  isPlayingAudio: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<{ id: number; username?: string } | null>(null);
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
  const [targetLanguage, setTargetLanguage] = useState("Chinese");
  const [uiLanguage, setUiLanguage] = useState("English");

  // Allow users to add custom target languages (persisted locally for now)
  const [customTargetLanguages, setCustomTargetLanguages] = useState<LanguageOption[]>([]);
  const [analysisDisplayMode, setAnalysisDisplayMode] =
    useState<AnalysisDisplayMode>("panel");

  // Audio Hook
  const { playAudio, isPlaying: isPlayingAudio } = useAudio();

  // Load settings from server (server is source-of-truth)
  const loadSettings = async (id: number) => {
    try {
      const server = await userService.getSettings(id).catch(() => null);
      if (server) {
        setCustomTargetLanguages(server.customTargetLanguages || []);
        if (server.targetLanguage) setTargetLanguage(server.targetLanguage);
        if (server.readerSettings) setAnalysisDisplayMode(server.readerSettings.analysisDisplayMode || "panel");
      }
    } catch (e) {
      console.warn("Failed to load settings from server", e);
    }
  };

  // Persist actions now call server directly; localStorage fallback removed
  const addCustomTargetLanguage = async (opt: LanguageOption) => {
    try {
      const id = user?.id ?? 1;
      const res = await userService.addUserLanguage(id, opt).catch(() => null);
      if (res) {
        setCustomTargetLanguages(res || []);
      } else {
        setCustomTargetLanguages((prev) => (prev.find((p) => p.code === opt.code) ? prev : [...prev, opt]));
      }
    } catch (e) {
      console.warn("Failed to add custom language on server", e);
    }
  };

  const removeCustomTargetLanguage = async (code: string) => {
    try {
      const id = user?.id ?? 1;
      const res = await userService.removeUserLanguage(id, code).catch(() => null);
      if (res) {
        setCustomTargetLanguages(res || []);
      } else {
        setCustomTargetLanguages((prev) => prev.filter((p) => p.code !== code));
      }
    } catch (e) {
      console.warn("Failed to remove custom language on server", e);
    }
  };

  // Persist target language to server
  const persistTargetLanguage = async (code: string) => {
    try {
      const id = user?.id ?? 1;
      const res = await userService.setDefaultLanguage(id, code).catch(() => null);
      if (res && res.targetLanguage) setTargetLanguage(res.targetLanguage);
      else setTargetLanguage(code);
    } catch (e) {
      console.warn("Failed to persist default language", e);
      setTargetLanguage(code);
    }
  };

  // Persist reader settings to server
  const persistReaderSettings = async (cfg: { analysisDisplayMode: AnalysisDisplayMode }) => {
    try {
      const id = user?.id ?? 1;
      const res = await userService.updateReaderSettings(id, cfg).catch(() => null);
      if (res) setAnalysisDisplayMode(res.analysisDisplayMode || cfg.analysisDisplayMode);
      else setAnalysisDisplayMode(cfg.analysisDisplayMode);
    } catch (e) {
      console.warn("Failed to persist reader settings", e);
      setAnalysisDisplayMode(cfg.analysisDisplayMode);
    }
  };


  const updateGoalProgress = useCallback(async (idParam?: number) => {
    const idToUse = idParam ?? user?.id ?? 1;
    try {
      const res = await userService.getProgress(idToUse).catch(() => null);
      const data = res ?? null;
      setGoalProgress(data);
      setGoals({
        wordsPerWeek: data?.wordsGoal ?? 20,
        practiceSessionsPerWeek: data?.sessionsGoal ?? 3,
      });
    } catch (e) {
      console.error("Failed to fetch progress", e);
    }
  }, [user]);

  const refreshWords = useCallback(async () => {
    try {
      const response = await wordService.getWordsByDeck(1);
      // Ensure we always set an array to avoid runtime errors when backend returns undefined/null
      setWordBank(response?.data ?? []);
    } catch (e) {
      console.error("Failed to fetch words", e);
      // Keep wordBank as an array on error
      setWordBank((prev) => prev ?? []);
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
    // Run initial load once on mount. Avoid adding functions like updateGoalProgress to deps
    const init = async () => {
      setIsLoading(true);
      try {
        // Attempt to get current user from server
        const u = await userService.getUser(1).catch(() => null);
        if (u) {
          setUser({ id: u.id || 1, username: u.username });
        } else {
          setUser({ id: 1 });
        }
        const id = (u && u.id) || 1;
        await userService.checkIn(id).catch(() => null);
        // Call update functions with explicit id to avoid stale deps
        await updateGoalProgress(id);
        await refreshWords();

        // Load settings from server after user is set
        await loadSettings(id);
      } catch (error) {
        console.error("Initialization failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
    // Intentionally run only once
  }, []);

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
        setTargetLanguage: persistTargetLanguage,
        uiLanguage,
        setUiLanguage,
        analysisDisplayMode,
        setAnalysisDisplayMode: (mode) => persistReaderSettings({ analysisDisplayMode: mode }),
        customTargetLanguages,
        setCustomTargetLanguages,
        addCustomTargetLanguage,
        removeCustomTargetLanguage,

        // User
        user,
        setUser,

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
