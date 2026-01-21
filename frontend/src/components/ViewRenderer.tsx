import React, { useEffect } from "react";
import { useApp } from "../context/AppContext";
import { View, Selection } from "../types";
import { findContextSentence } from "../utils";

// Components
import { DashboardView } from "./DashboardView";
import { ReadingSessionView } from "./ReadingSessionView";
import { FlashcardView } from "./FlashcardView";
import { PracticeView } from "./PracticeView";
import { VocabularyView } from "./VocabularyView";
import { ReaderView } from "./ReaderView";
//import { ProfileView } from "./ProfileView";
import { ConversationView } from "./ConversationView";
import { AnalyticsView } from "./AnalyticsView";
import { SettingsPage } from "./SettingsPage";

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
  const handleSaveWordFromReader = async (wordData: any) => {
    if (!activeReadingText) return;

    // Ensure we have context. If not provided, find it in the text.
    const context =
      wordData.context ||
      findContextSentence(activeReadingText.content, wordData.term);

    // Prepare payload for /vocab/capture (backwards-compatible with older POST /words)
    const payload = {
      term: wordData.term,
      deck_id: wordData.deck_id || wordData.deckId || 1,
      context: context,
      reading_content_id: activeReadingText.id || undefined,
      analysis: wordData.analysis || undefined,
    };

    try {
      // Try new endpoint first
      await fetch(`/vocab/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // Fallback to legacy endpoint
      try {
        await fetch(`/words`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, deck_id: payload.deck_id }),
        });
      } catch (err) {
        console.error('Failed to save word to server', err);
        // Also update locally via Context action if needed
      }
    }

    // Refresh local word bank
    await (addWord as any)( { ...wordData, context } );
  };

  // Helper: Handle selection within the Reading Session
  const handleTextSelect = (newSelection: Selection) => {
    setSelection(newSelection);
    // No-op for basic analysis here; deep analysis requires context and is triggered from the panel.
  };

  // Wrapper to adapt Context deep-analysis action (expects text + context)
  const requestDeepAnalysis = async () => {
    if (!selection) return;
    const context =
      selection.type === "word"
        ? findContextSentence(activeReadingText?.content ?? "", selection.text)
        : selection.text;
    try {
      await handleRequestDeepAnalysis(selection.text, context);
    } catch (e) {
      console.error("Deep analysis request failed", e);
    }
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
           onRequestDeepAnalysis={requestDeepAnalysis}
          onPlayAudio={handlePlayAudio}
          isPopupOpen={!!selection} // Simple state derivation or pass explicit state
          setIsPopupOpen={(isOpen) => !isOpen && setSelection(null)}
          onFirstHighlight={() => {}}
           isWordInBank={wordBank?.some(
             (w) => w.term.toLowerCase() === selection?.text.toLowerCase(),
           ) ?? false}
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

    case View.Settings:
      return <SettingsPage />;

    default:
      return <div>View Not Found</div>;
  }
};
