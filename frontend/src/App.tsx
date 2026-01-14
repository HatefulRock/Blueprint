
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { ReaderView } from './components/ReaderView';
import { VocabularyView } from './components/VocabularyView';
import { FlashcardView } from './components/FlashcardView';
import { ConversationView } from './components/ConversationView';
import { DashboardView } from './components/DashboardView';
// import { ProfileView } from './components/ProfileView';
import { PracticeView } from './components/PracticeView';
// import { LeaderboardView } from './components/LeaderboardView';
import { ReadingSessionView } from './components/ReadingSessionView';
// import { AchievementToast } from './components/AchievementToast';
import { ErrorToast } from './components/ErrorToast';
import { GoalSettingModal } from './components/GoalSettingModal';
import { Word, AnalysisResult, View, Selection, /*Achievement,*/ Goals, GoalProgress, AnalysisDisplayMode, ActiveReadingText, LanguageOption } from './types';
import { getDictionaryLookup, getDeepAnalysis, textToSpeech, fetchAndCleanArticle } from './services/geminiService';
import { apiUploadFile } from './services/api';
import { getUserProfile, getGoals, saveGoals, /*getAchievements, unlockAchievement as unlockAchievementService,*/ completeSession } from './services/userService';
import { getWords, addWord, updateFamiliarity } from './services/wordService';
import { decode, decodeAudioData, findContextSentence } from './utils';
// import { ACHIEVEMENTS_LIST } from './data/achievements';
// import { CURATED_CONTENT } from './data/curatedContent';

const defaultGoals: Goals = { wordsPerWeek: 20, practiceSessionsPerWeek: 3 };

const supportedLanguages: { target: LanguageOption[], ui: LanguageOption[] } = {
    target: [
        { code: 'Spanish', name: 'Spanish' },
        { code: 'French', name: 'French' },
        { code: 'German', name: 'German' },
        { code: 'Chinese', name: 'Chinese' },
    ],
    ui: [
        { code: 'English', name: 'English' },
        { code: 'Spanish', name: 'Español' },
    ]
};

const translations: Record<string, Record<string, string>> = {
    English: {
        welcomeBack: 'Welcome Back!',
        dashboardSubtitle: "Here's your status and personalized plan for today.",
    },
    Spanish: {
        welcomeBack: '¡Bienvenido de Nuevo!',
        dashboardSubtitle: 'Aquí tienes tu estado y plan personalizado para hoy.',
    }
};

export default function App() {
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [wordBank, setWordBank] = useState<Word[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [isDeepLoading, setIsDeepLoading] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isFileProcessing, setIsFileProcessing] = useState<boolean>(false);
  
  const [activeReadingText, setActiveReadingText] = useState<ActiveReadingText | null>(null);

  // Settings
  const [analysisDisplayMode, setAnalysisDisplayMode] = useState<AnalysisDisplayMode>('panel');
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [targetLanguage, setTargetLanguage] = useState<string>('Chinese');
  const [uiLanguage, setUiLanguage] = useState<string>('English');
  
  // Gamification state
  // const [points, setPoints] = useState<number>(0);
  // const [streak, setStreak] = useState<number>(1);
  // const [unlockedAchievements, setUnlockedAchievements] = useState<Record<string, boolean>>({});
  // const [achievementToast, setAchievementToast] = useState<Achievement | null>(null);

  // Goal state
  const [goals, setGoals] = useState<Goals | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);

  const uiStrings = translations[uiLanguage] || translations.English;
  
  /*
  const unlockAchievement = useCallback(async (id: string) => {
    if (!unlockedAchievements[id]) {
      const achievement = ACHIEVEMENTS_LIST.find(a => a.id === id);
      if (achievement) {
        setUnlockedAchievements(prev => ({...prev, [id]: true}));
        setAchievementToast(achievement);
        await unlockAchievementService(id);
        // setPoints(p => p + 50); // Award points for achievement
      }
    }
  }, [unlockedAchievements]);
  */


  // Load all data from backend on initial mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [profile, /*achievementsData,*/ goalsData] = await Promise.all([
          getUserProfile(),
          // getAchievements(),
          getGoals(),
        ]);
        
        // setPoints(profile.points);
        // setStreak(profile.streak);
        setGoalProgress(profile.goalProgress);
        // setUnlockedAchievements(achievementsData);

        setGoals(goalsData);
        if (!goalsData) {
            setShowGoalModal(true);
        }

      } catch (error) {
        console.error("Failed to load user data from backend", error);
        setErrorToast("Could not connect to the server.");
      } finally {
        setIsLoadingApp(false);
      }
    };
    loadData();
  }, []);

  // Fetch word bank whenever target language changes
  useEffect(() => {
    const loadWords = async () => {
        try {
            const words = await getWords(targetLanguage);
            setWordBank(words);
        } catch (error) {
            console.error(`Failed to load words for ${targetLanguage}`, error);
            setErrorToast(`Could not load vocabulary for ${targetLanguage}.`);
        }
    };
    if (!isLoadingApp) {
        loadWords();
    }
  }, [targetLanguage, isLoadingApp]);

  const saveWordToBank = useCallback(async (wordData: Omit<Word, 'familiarityScore' | 'language'>) => {
    if (wordBank.some(w => w.term.toLowerCase() === wordData.term.toLowerCase())) return;

    try {
      const newWord = await addWord(wordData, targetLanguage);
      setWordBank(prev => [...prev, newWord]);
      // setPoints(p => p + 10);
      if (goalProgress) {
        setGoalProgress(gp => ({...gp!, newWordsThisWeek: gp!.newWordsThisWeek + 1}));
      }
      
      // await unlockAchievement('FIRST_WORD');
      // if (wordBank.length + 1 >= 10) await unlockAchievement('TEN_WORDS');
      // if (wordBank.length + 1 >= 50) await unlockAchievement('FIFTY_WORDS');

    } catch (error) {
      setErrorToast("Failed to save word.");
    }
  }, [wordBank, goalProgress, targetLanguage]);

  const handleTextSelect = useCallback(async (selected: Selection) => {
    if (selected.text === selection?.text) return;

    setSelection(selected);
    setIsLoadingAnalysis(true);
    setAnalysisResult(null);
    setIsDeepLoading(false);
    
    try {
      const langParams = { targetLanguage, nativeLanguage: uiLanguage };
      if (selected.type === 'word') {
        const result = await getDictionaryLookup(selected, langParams);
        setAnalysisResult(result);
      } else {
        const result = await getDeepAnalysis(selected, langParams);
        setAnalysisResult(result);
      }
      
      if (analysisDisplayMode === 'popup') {
          setIsPopupOpen(true);
      }

    } catch (e) {
      setErrorToast("Failed to get analysis. Please try again.");
      console.error(e);
      if (analysisDisplayMode === 'popup') {
          setIsPopupOpen(true);
      }
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [selection, analysisDisplayMode, targetLanguage, uiLanguage]);
  
  const handleRequestDeepAnalysis = useCallback(async () => {
    if (!selection || isDeepLoading) return;
    
    setIsDeepLoading(true);
    try {
        const result = await getDeepAnalysis(selection, { targetLanguage, nativeLanguage: uiLanguage });
        setAnalysisResult(prev => ({...prev, ...result }));

        /*
        if (CURATED_CONTENT.some(content => content.id === activeReadingText?.id)) {
            await unlockAchievement('LIBRARY_USER');
        }
        */
       
    } catch(e) {
        setErrorToast("Failed to get deep analysis. Please try again.");
        console.error(e);
    } finally {
        setIsDeepLoading(false);
    }
  }, [selection, isDeepLoading, /* saveWordToBank, activeReadingText, analysisDisplayMode, */ targetLanguage, uiLanguage]);


  const handlePlayAudio = useCallback(async (text: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const base64Audio = await textToSpeech(text, { targetLanguage });
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (e) {
      console.error("Failed to play audio:", e);
      setErrorToast("Could not generate or play audio at this time.");
    }
  }, [targetLanguage]);

  const handleFamiliarityChange = useCallback(async (term: string, change: 1 | -1) => {
    try {
      const updatedWord = await updateFamiliarity(term, change, targetLanguage);
      setWordBank(wb => wb.map(w => w.term === term ? updatedWord : w));

      // if (updatedWord.familiarityScore === 5) await unlockAchievement('MASTER_WORD');
      // if (change > 0) setPoints(p => p + (5 * change));

      // const totalMastered = wordBank.filter(w => w.familiarityScore === 5).length;
      // if (totalMastered >= 10) await unlockAchievement('TEN_MASTERED');
    } catch (error) {
      setErrorToast("Failed to update word familiarity.");
    }
  }, [targetLanguage]);

  const handleSaveGoals = async (newGoals: Goals) => {
    try {
      const updatedGoals = await saveGoals(newGoals);
      setGoals(updatedGoals);
      // await unlockAchievement('GOAL_SETTER');
      setShowGoalModal(false);
    } catch (error) {
      setErrorToast("Failed to save goals.");
    }
  }

  const handleSessionComplete = async (type: 'flashcard' | 'practice', mode?: string) => {
      try {
        const updatedProfile = await completeSession(type);
        // setPoints(updatedProfile.points);
        setGoalProgress(updatedProfile.goalProgress);

        /*
        if(type === 'flashcard') {
            if (mode === 'def-to-word') await unlockAchievement('REVERSE_FLASHCARD');
            else if (mode === 'cloze') await unlockAchievement('CLOZE_MASTER');
            else await unlockAchievement('FIRST_FLASHCARD');
        } else if (type === 'practice') {
            await unlockAchievement('FIRST_PRACTICE');
        }
        */
      } catch (error) {
        setErrorToast("Failed to record session completion.");
      }
  }
  
  const handleDisplayModeChange = (mode: AnalysisDisplayMode) => {
      setAnalysisDisplayMode(mode);
      // In a real app, this would be saved to user preferences on the backend.
  }

  const handleFetchArticle = async (url: string): Promise<string | null> => {
    try {
      const articleText = await fetchAndCleanArticle(url);
      // await unlockAchievement('FIRST_ARTICLE_IMPORT');
      return articleText;
    } catch (e) {
      setErrorToast("Failed to fetch the article.");
      console.error(e);
      return null;
    }
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    setIsFileProcessing(true);
    try {
        // FIX: Added explicit generic type to apiUploadFile to correctly type the response.
        const { text } = await apiUploadFile<{ text: string }>('/upload-file', file);
        // await unlockAchievement('FIRST_FILE_UPLOAD');
        return text;
    } catch (error) {
        console.error("Error processing file:", error);
        
        // Fallback for text files if backend is offline
        if (file.type === 'text/plain') {
            try {
                return await file.text();
            } catch (readError) {
                console.error("Failed to read file locally", readError);
            }
        }

        setErrorToast("There was an error processing the selected file.");
        return null;
    } finally {
        setIsFileProcessing(false);
    }
  };
  
  const handleStartReadingSession = (textData: ActiveReadingText) => {
    setActiveReadingText(textData);
    setCurrentView(View.ReadingSession);
  }

  const handleSetCurrentView = useCallback(async (view: View) => {
    setCurrentView(view);
    /*
    if (view === View.Leaderboard) {
      await unlockAchievement('FIRST_LEADERBOARD_VIEW');
    }
    */
  }, []);


  if (isLoadingApp) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl text-slate-400">Loading Blueprint...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch(currentView) {
      case View.ReadingSession:
        if (!activeReadingText) {
          setCurrentView(View.Reader);
          return null;
        }
        return (
          <ReadingSessionView
            title={activeReadingText.title}
            content={activeReadingText.content}
            wordBank={wordBank}
            onTextSelect={handleTextSelect}
            onFirstHighlight={() => { /* unlockAchievement('SEEING_THE_PICTURE') */ }}
            onGoBack={() => { setCurrentView(View.Reader); setSelection(null); }}
            selection={selection}
            analysisResult={analysisResult}
            isLoading={isLoadingAnalysis}
            isDeepLoading={isDeepLoading}
            onRequestDeepAnalysis={handleRequestDeepAnalysis}
            onPlayAudio={handlePlayAudio}
            analysisDisplayMode={analysisDisplayMode}
            isPopupOpen={isPopupOpen}
            setIsPopupOpen={setIsPopupOpen}
            onSaveWord={(wordData) => saveWordToBank({ ...wordData, context: wordData.context || findContextSentence(activeReadingText.content, wordData.term)})}
            isWordInBank={wordBank.some(w => w.term.toLowerCase() === selection?.text.toLowerCase())}
          />
        );
      case View.Reader:
        return (
          <ReaderView 
            onStartReadingSession={handleStartReadingSession}
            onFetchArticle={handleFetchArticle}
            onFileUpload={handleFileUpload}
            isFileProcessing={isFileProcessing}
            targetLanguage={targetLanguage}
          />
        );
      case View.Vocabulary:
        return <VocabularyView wordBank={wordBank} onFamiliarityChange={handleFamiliarityChange} onPlayAudio={handlePlayAudio} />;
      case View.Flashcards:
        return <FlashcardView wordBank={wordBank} onFamiliarityChange={handleFamiliarityChange} onSessionComplete={(mode) => handleSessionComplete('flashcard', mode)} targetLanguage={targetLanguage} />;
       case View.Practice:
        return <PracticeView 
            wordBank={wordBank} 
            onFamiliarityChange={handleFamiliarityChange} 
            onSessionComplete={() => handleSessionComplete('practice')} 
            // unlockAchievement={unlockAchievement}
            onError={setErrorToast}
            targetLanguage={targetLanguage}
            nativeLanguage={uiLanguage}
        />;
      case View.Conversation:
        return <ConversationView targetLanguage={targetLanguage} />;
      /*
      case View.Leaderboard:
        return <LeaderboardView userPoints={points} />;
      case View.Profile:
        return <ProfileView 
                    points={points} 
                    streak={streak} 
                    unlockedAchievements={unlockedAchievements} 
                    goals={goals} 
                    goalProgress={goalProgress} 
                    onEditGoals={() => setShowGoalModal(true)}
                />;
      */
      case View.Dashboard:
        return <DashboardView 
                  wordCount={wordBank.length}
                  setCurrentView={setCurrentView}
                  onStartReadingSession={handleStartReadingSession}
                  goals={goals}
                  goalProgress={goalProgress}
                  uiStrings={{welcome: uiStrings.welcomeBack, subtitle: uiStrings.dashboardSubtitle }}
                />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {showGoalModal && <GoalSettingModal initialGoals={goals || defaultGoals} onSave={handleSaveGoals} onClose={() => {if(goals){setShowGoalModal(false)}}} />}
      {currentView !== View.ReadingSession && <Header 
        currentView={currentView} 
        setCurrentView={handleSetCurrentView} 
        wordCount={wordBank.length}
        displayMode={analysisDisplayMode}
        onDisplayModeChange={handleDisplayModeChange}
        supportedLanguages={supportedLanguages}
        targetLanguage={targetLanguage}
        uiLanguage={uiLanguage}
        onTargetLanguageChange={setTargetLanguage}
        onUiLanguageChange={setUiLanguage}
      />}
      {/* {achievementToast && <AchievementToast achievement={achievementToast} onClose={() => setAchievementToast(null)} />} */}
      {errorToast && <ErrorToast message={errorToast} onClose={() => setErrorToast(null)} />}
      <main className={currentView === View.ReadingSession ? '' : "max-w-screen-2xl mx-auto"}>
        {renderView()}
      </main>
    </div>
  );
}
