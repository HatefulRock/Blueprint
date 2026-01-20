import React, { useEffect } from "react";
import { useApp } from "../context/AppContext";
import { View, Selection } from "../types";
import { findContextSentence } from "../utils";

// Components
import { DashboardView } from "./DashboardView";
import { ReaderView } from "./ReaderView";
import { ReadingSessionView } from "./ReadingSessionView";
import { VocabularyView } from "./VocabularyView";
import { FlashcardView } from "./FlashcardView";
import { PracticeView } from "./PracticeView";
import { VocabularyView } from "./VocabularyView";
import { ReaderView } from "./ReaderView";
import { DashboardView } from "./DashboardView";
import { ProfileView } from "./ProfileView";
import { ConversationView } from "./ConversationView";
import { AnalyticsView } from "./AnalyticsView";


export const ViewRenderer: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    wordBank,
    goals,
    goalProgress,

    // Reading State
    activeReadingText,
    setActiveReadingText,
    selection,
    setSelection,
    analysisResult,
    isLoadingAnalysis,
    isDeepLoading,
    analysisDisplayMode,

    // Settings
    targetLanguage,
    uiLanguage,

    // Actions
    addWord,
    handleRequestAnalysis, // Assuming you have a basic analysis handler
    handleRequestDeepAnalysis,
    handlePlayAudio,
  } = useApp();

  // Helper: Start session
  const handleStartReadingSession = (data: {
    title: string;
    content: string;
  }) => {
    setActiveReadingText(data);
    setCurrentView(View.ReadingSession);
  };

  // Helper: Save word from Reader
  const handleSaveWordFromReader = (wordData: any) => {
    if (!activeReadingText) return;

    // Ensure we have context. If not provided, find it in the text.
    const context =
      wordData.context ||
      findContextSentence(activeReadingText.content, wordData.term);

    addWord({
      ...wordData,
      context: context,
    });
  };

  // Helper: Handle selection within the Reading Session
  const handleTextSelect = (newSelection: Selection) => {
    setSelection(newSelection);
    // Optional: Trigger basic analysis immediately on selection
    if (handleRequestAnalysis) {
      handleRequestAnalysis(newSelection.text);
    }
  };

  switch (currentView) {
    case View.Dashboard:
      return (
        <DashboardView
          wordCount={wordBank.length}
          setCurrentView={setCurrentView}
          onStartReadingSession={handleStartReadingSession}
          goals={goals}
          goalProgress={goalProgress}
          uiStrings={{
            welcome: uiLanguage === "Spanish" ? "¡Bienvenido!" : "Welcome Back",
            subtitle: "Ready to study?",
          }}
        />
      );

    case View.Reader:
      return (
        <ReaderView
          onStartReadingSession={handleStartReadingSession}
          // Pass empty/dummy functions if logic is handled internally in ReaderView
          onFetchArticle={async () => null}
          onFileUpload={async () => null}
          isFileProcessing={false}
          targetLanguage={targetLanguage}
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
          // View Logic
          onGoBack={() => {
            setCurrentView(View.Reader);
            setSelection(null);
          }}
          onTextSelect={handleTextSelect} // FIXED: Passed the handler
          onSaveWord={handleSaveWordFromReader}
          onRequestDeepAnalysis={handleRequestDeepAnalysis}
          onPlayAudio={handlePlayAudio}
          isPopupOpen={!!selection} // Simple state derivation or pass explicit state
          setIsPopupOpen={(isOpen) => !isOpen && setSelection(null)}
          onFirstHighlight={() => {}}
          isWordInBank={wordBank.some(
            (w) => w.term.toLowerCase() === selection?.text.toLowerCase(),
          )}
        />
      );

    case View.Vocabulary:
      return (
        <VocabularyView
          wordBank={wordBank}
          onFamiliarityChange={() => {}} // Connect to updateWord in context
          onPlayAudio={handlePlayAudio}
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

    default:
      return <div>View Not Found</div>;
  }
};
