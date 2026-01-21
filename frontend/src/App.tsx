import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Header } from "./components/Header";
import { ViewRenderer } from "./components/ViewRenderer";
import { ErrorToast } from "./components/ErrorToast";
import { Toast } from "./components/Toast";
import { AuthEntry } from "./components/AuthEntry";
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
    // custom languages from settings
    customTargetLanguages,
    addCustomTargetLanguage,
    removeCustomTargetLanguage,
    // 1. ADD THESE FROM CONTEXT
    error,
    setError,
  } = useApp();

  const [toast, setToast] = React.useState<{ type: 'success'|'error'|'info', message: string } | null>(null);
  // expose a global setter for quick use in ad-hoc places
  React.useEffect(() => { (window as any).appSetToast = (t: any) => setToast(t); return () => { (window as any).appSetToast = undefined }; }, []);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  const builtInTargetLanguages = [
    { code: "Chinese", name: "Chinese" },
    { code: "Spanish", name: "Spanish" },
    { code: "French", name: "French" },
  ];

  const supportedLanguages = {
    target: [...builtInTargetLanguages, ...(customTargetLanguages || [])],
    ui: [{ code: "English", name: "English" }],
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {currentView !== View.ReadingSession && (
          <Header
          currentView={currentView}
          setCurrentView={setCurrentView}
          wordCount={wordBank?.length ?? 0}
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

      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Auth Modal entry point */}
      <AuthEntry />
      
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
