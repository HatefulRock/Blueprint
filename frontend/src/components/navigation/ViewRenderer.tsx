import React from 'react';
import {
  useNavigation,
  useVocabulary,
  useReading,
  useSettings,
  useProgress,
} from '../../context';
import { useWordManagement } from '../../hooks/useWordManagement';
import { usePracticeSession } from '../../hooks/usePracticeSession';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useTextSelection } from '../../hooks/useTextSelection';
import { useAudio } from '../../hooks/useAudio';
import { View, ActiveReadingText } from '../../types';

// Dashboard
import { DashboardView } from '../features/dashboard/DashboardView';

// Reading
import { ReadingSessionView } from '../features/reading/ReadingSessionView';
import { ReaderView } from '../features/reading/ReaderView';
import { DeepReadingAnalysis } from '../features/reading/DeepReadingAnalysis';

// Vocabulary
import { VocabularyView } from '../features/vocabulary/VocabularyView';
import { FlashcardView } from '../features/flashcards/FlashcardView';

// Practice
import { PracticeView } from '../features/practice/PracticeView';
import { WritingPractice } from '../features/practice/WritingPractice';
import { GrammarExercises } from '../features/practice/GrammarExercises';

// Conversation
import { ConversationView } from '../features/conversation/ConversationView';

// Other
import { AnalyticsView } from '../features/analytics/AnalyticsView';
import { SettingsPage } from '../features/settings/SettingsPage';

// Gemini Showcase
import { GeminiShowcase } from '../features/showcase/GeminiShowcase';
import { VideoLearningView } from '../features/showcase/VideoLearningView';

export const ViewRenderer: React.FC = () => {
  const { currentView, setCurrentView, navigateToReading } = useNavigation();
  const { wordBank, refreshWords } = useVocabulary();
  const {
    activeReadingText,
    setActiveReadingText,
    selection,
    setSelection,
    analysisResult,
    isLoadingAnalysis,
    isDeepLoading,
  } = useReading();
  const { targetLanguage, uiLanguage, analysisDisplayMode } = useSettings();
  const { goals, goalProgress } = useProgress();

  // Custom hooks for business logic
  const { saveWordFromReader } = useWordManagement();
  const { generateExercisesFromReading } = usePracticeSession();
  const { requestDeepAnalysis } = useAnalysis();
  const { handleTextSelect } = useTextSelection();
  const { playAudio } = useAudio();

  // Helper: Start reading session
  const handleStartReadingSession = (data: ActiveReadingText) => {
    navigateToReading(data);
  };

  // Helper: Handle text selection
  const handleTextSelectWrapper = (newSelection: any) => {
    setSelection(newSelection);
  };

  // Helper: Go back from reading session
  const handleGoBack = () => {
    setCurrentView(View.Reader);
    setSelection(null);
  };

  switch (currentView) {
    case View.Dashboard:
      return (
        <DashboardView
          wordCount={wordBank?.length ?? 0}
          setCurrentView={setCurrentView}
          onStartReadingSession={handleStartReadingSession}
          goals={goals}
          goalProgress={goalProgress}
          uiStrings={{
            welcome: uiLanguage === 'Spanish' ? '¡Bienvenido!' : 'Welcome Back',
            subtitle: 'Ready to study?',
          }}
        />
      );

    case View.Reader:
      return (
        <ReaderView
          onStartReadingSession={handleStartReadingSession}
          onFetchArticle={async () => null}
          onFileUpload={async () => null}
          isFileProcessing={false}
          targetLanguage={targetLanguage}
          setCurrentView={setCurrentView}
        />
      );

    case View.ReadingSession:
      // Safety check with immediate redirect
      if (!activeReadingText) {
        setTimeout(() => setCurrentView(View.Reader), 0);
        return null;
      }
      return (
        <ReadingSessionView
          title={activeReadingText.title}
          content={activeReadingText.content}
          wordBank={wordBank}
          selection={selection}
          analysisResult={analysisResult}
          isLoading={isLoadingAnalysis}
          isDeepLoading={isDeepLoading}
          analysisDisplayMode={analysisDisplayMode}
          onGoBack={handleGoBack}
          onTextSelect={handleTextSelectWrapper}
          onSaveWord={saveWordFromReader}
          onRequestDeepAnalysis={requestDeepAnalysis}
          onPlayAudio={playAudio}
          isPopupOpen={!!selection}
          setIsPopupOpen={(isOpen) => !isOpen && setSelection(null)}
          onFirstHighlight={() => {}}
          isWordInBank={
            wordBank?.some((w) => w.term.toLowerCase() === selection?.text.toLowerCase()) ?? false
          }
          onGenerateExercises={generateExercisesFromReading}
        />
      );

    case View.Vocabulary:
      return (
        <VocabularyView
          wordBank={wordBank}
          onFamiliarityChange={() => {}}
          onPlayAudio={playAudio}
          refreshWords={refreshWords}
        />
      );

    case View.Flashcards:
      return (
        <FlashcardView
          wordBank={wordBank}
          onFamiliarityChange={() => {}}
          onSessionComplete={() => setCurrentView(View.Dashboard)}
          targetLanguage={targetLanguage}
        />
      );

    case View.Practice:
      return (
        <PracticeView
          wordBank={wordBank}
          onFamiliarityChange={() => {}}
          onSessionComplete={() => setCurrentView(View.Dashboard)}
          targetLanguage={targetLanguage}
          nativeLanguage={uiLanguage}
          onError={(msg) => console.error(msg)}
        />
      );

    case View.Conversation:
      return <ConversationView targetLanguage={targetLanguage} />;

    case View.Writing:
      return <WritingPractice targetLanguage={targetLanguage} />;

    case View.Grammar:
      return <GrammarExercises targetLanguage={targetLanguage} />;

    case View.Analytics:
      return <AnalyticsView />;

    case View.Settings:
      return <SettingsPage />;

    // Gemini 3 Showcase Features
    case View.Showcase:
      return <GeminiShowcase onNavigate={setCurrentView} />;

    case View.VideoLearning:
      return (
        <VideoLearningView
          targetLanguage={targetLanguage}
          nativeLanguage={uiLanguage}
          onNavigateBack={() => setCurrentView(View.Showcase)}
        />
      );

    case View.DeepReading:
      return (
        <DeepReadingAnalysis
          targetLanguage={targetLanguage}
          nativeLanguage={uiLanguage}
          onNavigateBack={() => setCurrentView(View.Showcase)}
        />
      );

    default:
      return <div>View Not Found</div>;
  }
};
