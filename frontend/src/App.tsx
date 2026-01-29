import React from 'react';
import {
  AppProvider,
  useAuth,
  useNavigation,
  useVocabulary,
  useSettings,
  useToast,
} from './context';
import { Header } from './components/common/layout/Header';
import { ViewRenderer } from './components/navigation/ViewRenderer';
import { ErrorToast } from './components/common/feedback/ErrorToast';
import { Toast } from './components/common/feedback/Toast';
import { LoginPage } from './components/features/auth/LoginPage';
import {
  KeyboardShortcutsHelp,
  useKeyboardShortcutsHelp,
} from './components/KeyboardShortcutsHelp';
import { View } from './types';

// We create a sub-component to consume the Context
const AppContent = () => {
  const { isLoading: authLoading, user } = useAuth();
  const { currentView, setCurrentView } = useNavigation();
  const { wordBank } = useVocabulary();
  const {
    analysisDisplayMode,
    setAnalysisDisplayMode,
    targetLanguage,
    setTargetLanguage,
    uiLanguage,
    setUiLanguage,
    customTargetLanguages,
  } = useSettings();
  const { toast, hideToast } = useToast();

  // Error state (keep local for now)
  const [error, setError] = React.useState<string | null>(null);

  // Keyboard shortcuts help
  const keyboardHelp = useKeyboardShortcutsHelp();

  if (authLoading) {
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
    { code: 'Chinese', name: 'Chinese' },
    { code: 'Spanish', name: 'Spanish' },
    { code: 'French', name: 'French' },
  ];

  const supportedLanguages = {
    target: [...builtInTargetLanguages, ...(customTargetLanguages || [])],
    ui: [{ code: 'English', name: 'English' }],
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
        className={currentView === View.ReadingSession ? '' : 'max-w-screen-2xl mx-auto'}
      >
        <ViewRenderer />
      </main>

      {/* Error toast */}
      {error && <ErrorToast message={error} onClose={() => setError(null)} />}

      {/* Toast */}
      <Toast toast={toast} onClose={hideToast} />

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
