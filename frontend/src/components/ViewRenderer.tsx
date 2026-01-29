import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { View, Selection } from "../types";
import { findContextSentence } from "../utils";
import { grammarService } from "../services/api";

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
import { PronunciationPractice } from "./PronunciationPractice";
import { WritingPractice } from "./WritingPractice";
import { GrammarExercises } from "./GrammarExercises";

// Gemini 3 Showcase Components
import { GeminiShowcase } from "./GeminiShowcase";
import { VideoLearningView } from "./VideoLearningView";
import { DeepReadingAnalysis } from "./DeepReadingAnalysis";

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
    refreshWords,
  } = useApp();

  const [isGeneratingExercises, setIsGeneratingExercises] = useState(false);

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
      deck_id: wordData.deck_id || wordData.deckId || null,
      context: context,
      reading_content_id: activeReadingText.id || undefined,
      analysis: wordData.analysis || undefined,
    };

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Try new endpoint first
      const response = await fetch(`http://localhost:8000/vocab/capture`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Show success toast
        if ((window as any).appSetToast) {
          (window as any).appSetToast({
            type: 'success',
            message: `✓ "${wordData.term}" added to vocabulary`
          });
        }
      } else {
        throw new Error('Failed to save word');
      }
    } catch (e) {
      // Fallback to legacy endpoint
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`http://localhost:8000/words`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...payload, deck_id: payload.deck_id }),
        });

        if (response.ok) {
          // Show success toast
          if ((window as any).appSetToast) {
            (window as any).appSetToast({
              type: 'success',
              message: `✓ "${wordData.term}" added to vocabulary`
            });
          }
        } else {
          throw new Error('Failed to save word');
        }
      } catch (err) {
        console.error('Failed to save word to server', err);
        // Show error toast
        if ((window as any).appSetToast) {
          (window as any).appSetToast({
            type: 'error',
            message: `Failed to save "${wordData.term}"`
          });
        }
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

  // Handler for generating grammar exercises from reading content
  const handleGenerateExercisesFromReading = async () => {
    if (!activeReadingText || isGeneratingExercises) return;

    try {
      setIsGeneratingExercises(true);

      await grammarService.generateExercises({
        text: activeReadingText.content,
        language: targetLanguage,
        num_exercises: 10,
        exercise_types: ['fill_blank', 'transformation', 'multiple_choice', 'correction']
      });

      // Show success toast
      if ((window as any).appSetToast) {
        (window as any).appSetToast({
          type: 'success',
          message: 'Grammar exercises generated successfully!'
        });
      }

      // Switch to Grammar view
      setCurrentView(View.Grammar);
    } catch (error) {
      console.error("Failed to generate exercises:", error);
      if ((window as any).appSetToast) {
        (window as any).appSetToast({
          type: 'error',
          message: 'Failed to generate exercises. Please try again.'
        });
      }
    } finally {
      setIsGeneratingExercises(false);
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
          setCurrentView={setCurrentView} // NEW: Enable video navigation
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
          onGenerateExercises={handleGenerateExercisesFromReading}
        />
      );

    case View.Vocabulary:
      return (
        <VocabularyView
          wordBank={wordBank}
          onFamiliarityChange={() => {}} // Connect to updateWord in context
          onPlayAudio={handlePlayAudio}
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

    case View.Pronunciation:
      return <PronunciationPractice targetLanguage={targetLanguage} />;

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
