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
  logout: () => void;

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
  const loadSettings = async (id?: number) => {
    try {
      const server = await userService.getSettings().catch(() => null);
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
      const res = await userService.addUserLanguage(opt).catch(() => null);
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
      const res = await userService.removeUserLanguage(code).catch(() => null);
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
      const res = await userService.setDefaultLanguage(code).catch(() => null);
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
      const res = await userService.updateReaderSettings(cfg).catch(() => null);
      if (res) setAnalysisDisplayMode(res.analysisDisplayMode || cfg.analysisDisplayMode);
      else setAnalysisDisplayMode(cfg.analysisDisplayMode);
    } catch (e) {
      console.warn("Failed to persist reader settings", e);
      setAnalysisDisplayMode(cfg.analysisDisplayMode);
    }
  };


  const updateGoalProgress = useCallback(async (idParam?: number) => {
    try {
      const res = await userService.getProgress().catch(() => null);
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
      console.log('[AppContext] Fetching words...');
      const response = await wordService.getAllWords();
      console.log('[AppContext] Raw response from getAllWords:', response);
      // The axios interceptor already unwraps response.data, so response IS the data
      // Handle both unwrapped (array) and wrapped ({ data: array }) formats
      const words = Array.isArray(response) ? response : (response?.data ?? []);
      console.log('[AppContext] Processed words:', words.length, 'words');
      setWordBank(words);
    } catch (e) {
      console.error("[AppContext] Failed to fetch words:", e);
      // Keep wordBank as an array on error
      setWordBank((prev) => prev ?? []);
    }
  }, []);


  const addWord = async (wordData: Partial<Word>) => {
    await wordService.addWord(wordData);
    await refreshWords();
  };

  const handleRequestDeepAnalysis = async (text: string, context: string) => {
    setIsDeepLoading(true);
    try {
      // aiService.analyzeText returns the structure via axios interceptor
      // Pass the context sentence for deeper analysis
      const deep = await aiService.analyzeText(text, targetLanguage, context);

      // Map the response to handle both snake_case and camelCase
      const mapped = {
        translation: deep.translation || "",
        partOfSpeech: deep.part_of_speech || deep.partOfSpeech || undefined,
        literalTranslation: deep.literal_translation || deep.literalTranslation || undefined,
        grammaticalBreakdown: deep.grammar_breakdown || deep.grammaticalBreakdown || undefined,
        wordBreakdown: deep.vocabulary?.map((v: any) => ({
          term: v.term,
          translation: v.translation,
          partOfSpeech: v.pos || v.part_of_speech || v.partOfSpeech || ""
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
      console.error("Deep analysis failed", error);
      setError?.("Deep analysis failed");
    } finally {
      setIsDeepLoading(false);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem('authToken');
    } catch (e) {}
    setUser(null);
    setWordBank([]);
    setGoals(null);
    setGoalProgress(null);
  };

  // When selection changes we should attempt a quick analysis with context
  useEffect(() => {
    if (!selection) return;
    let cancelled = false;

    const doLookup = async () => {
      setIsLoadingAnalysis(true);
      try {
        // Use analyzeText with optional contextSentence for enhanced analysis
        const res: any = await aiService.analyzeText(
          selection.text,
          targetLanguage,
          selection.contextSentence
        ).catch(() => null);

        if (!res) {
          // no result, clear or keep previous
          if (!cancelled) setAnalysisResult(null);
          return;
        }

        // Map the response to AnalysisResult format
        // Handle both snake_case (from backend) and camelCase
        const mapped: AnalysisResult = {
          translation: res.translation || "",
          partOfSpeech: res.part_of_speech || res.partOfSpeech || undefined,
          literalTranslation: res.literal_translation || res.literalTranslation || undefined,
          grammaticalBreakdown: res.grammar_breakdown || res.grammaticalBreakdown || undefined,
          wordBreakdown: res.vocabulary?.map((v: any) => ({
            term: v.term,
            translation: v.translation,
            partOfSpeech: v.pos || v.part_of_speech || v.partOfSpeech || ""
          })) || undefined,
          difficultyLevel: res.difficulty_level || res.difficultyLevel || undefined,
          usageExamples: res.usage_examples || res.usageExamples || undefined,
          memoryAid: res.memory_aid || res.memoryAid || undefined,
          relatedWords: res.related_words || res.relatedWords || undefined,
          contextSentence: res.context_sentence || res.contextSentence || selection.contextSentence || undefined,
        };

        if (!cancelled) setAnalysisResult(mapped);
      } catch (e) {
        console.error("Analysis failed", e);
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


  // Initial Load
  useEffect(() => {
    // Run initial load once on mount. Avoid adding functions like updateGoalProgress to deps
    const init = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('authToken');

        if (token) {
          // Validate token by fetching current user
          try {
            const profile = await userService.getProfile().catch(() => null);
            if (profile) {
              setUser({ id: profile.id, username: profile.username });

              // Load user data
              await userService.checkIn().catch(() => null);
              await updateGoalProgress(profile.id);
              await refreshWords();
              await loadSettings(profile.id);
            } else {
              // Token invalid
              setUser(null);
              localStorage.removeItem('authToken');
            }
          } catch (error) {
            console.error('Token validation failed', error);
            setUser(null);
            localStorage.removeItem('authToken');
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Initialization failed", error);
        setUser(null);
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
        logout,

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
