import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Header } from "./components/Header";
import { ViewRenderer } from "./components/ViewRenderer";
import { ErrorToast } from "./components/ErrorToast";
import { Toast } from "./components/Toast";
import { LoginPage } from "./components/LoginPage";
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from "./components/KeyboardShortcutsHelp";
import { View } from "./types";

// We create a sub-component to consume the Context
const AppContent = () => {
  const {
    isLoading,
    user,
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

  // Keyboard shortcuts help
  const keyboardHelp = useKeyboardShortcutsHelp();


  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  // Show login page if user is not authenticated
  if (!user) {
    return <LoginPage />;
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

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={keyboardHelp.isOpen}
        onClose={keyboardHelp.close}
        currentView={currentView}
      />

      {/* Keyboard Shortcuts Indicator */}
      <button
        onClick={keyboardHelp.open}
        className="fixed bottom-6 right-6 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full shadow-lg transition-all hover:shadow-xl hover:scale-110 group z-30 animate-pulse"
        title="Keyboard shortcuts (Press ?)"
      >
        <svg
          className="w-6 h-6 text-slate-400 group-hover:text-sky-400 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-sky-500 text-white text-xs font-bold rounded-full">
          ?
        </span>
      </button>

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
