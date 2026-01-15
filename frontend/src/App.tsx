import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Header } from "./components/Header";
import { ViewRenderer } from "./components/ViewRenderer";
import { ErrorToast } from "./components/ErrorToast";
// import { GoalSettingModal } from "./components/GoalSettingModal";
import { View } from "./types";

// We create a sub-component to consume the Context
const AppContent = () => {
  const {
    isLoading,
    currentView,
    setCurrentView,
    wordBank,
    analysisDisplayMode,
    setAnalysisDisplayMode,
    targetLanguage,
    setTargetLanguage,
    uiLanguage,
    setUiLanguage,
    // 1. ADD THESE FROM CONTEXT
    error,
    setError,
  } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  const supportedLanguages = {
    target: [
      { code: "Chinese", name: "Chinese" },
      { code: "Spanish", name: "Spanish" },
      { code: "French", name: "French" },
    ],
    ui: [{ code: "English", name: "English" }],
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {currentView !== View.ReadingSession && (
        <Header
          currentView={currentView}
          setCurrentView={setCurrentView}
          wordCount={wordBank.length}
          displayMode={analysisDisplayMode}
          onDisplayModeChange={setAnalysisDisplayMode}
          supportedLanguages={supportedLanguages}
          targetLanguage={targetLanguage}
          onTargetLanguageChange={setTargetLanguage}
          uiLanguage={uiLanguage}
          onUiLanguageChange={setUiLanguage}
        />
      )}

      <main
        className={
          currentView === View.ReadingSession ? "" : "max-w-screen-2xl mx-auto"
        }
      >
        <ViewRenderer />
      </main>

      {/* 2. ONLY RENDER IF ERROR EXISTS */}
      {error && <ErrorToast message={error} onClose={() => setError(null)} />}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
