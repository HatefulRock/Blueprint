import React from 'react';
import { View, AnalysisDisplayMode, LanguageOption } from '../types';
import { HeaderDropdown } from './HeaderDropdown';
import { UserProfileDropdown } from './UserProfileDropdown';
import { useLastVisitedView } from '../hooks/useLastVisitedView';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { CollectionIcon } from './icons/CollectionIcon';
import { BoltIcon } from './icons/BoltIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { AdjustmentsHorizontalIcon } from './icons/AdjustmentsHorizontalIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';


interface HeaderProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  wordCount: number;
  // points: number;
  // streak: number;
  displayMode: AnalysisDisplayMode;
  onDisplayModeChange: (mode: AnalysisDisplayMode) => void;
  supportedLanguages: { target: LanguageOption[], ui: LanguageOption[] };
  targetLanguage: string;
  uiLanguage: string;
  onTargetLanguageChange: (langCode: string) => void;
  onUiLanguageChange: (langCode: string) => void;
}

const NavButton = ({ isActive, onClick, children }: { isActive: boolean, onClick: () => void, children?: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-sky-500 text-white'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`}
  >
    {children}
  </button>
);


export const Header = ({
    currentView, setCurrentView, wordCount, /*points, streak,*/ displayMode, onDisplayModeChange,
    supportedLanguages, targetLanguage, uiLanguage, onTargetLanguageChange, onUiLanguageChange
}: HeaderProps) => {
  // Settings navigation — open full Settings view
  const openSettings = () => setCurrentView(View.Settings);

  // Track last visited views for each group
  const { getLastVisitedView, isViewInGroup } = useLastVisitedView(currentView);

  // Build language list combining defaults + custom ones from parent (from App)
  // The header receives supportedLanguages prop; App will include customTargetLanguages there.
  const targetLangOptions = supportedLanguages.target;

  // Define navigation groups
  const learnOptions = [
    { label: 'Library', view: View.Reader, icon: BookOpenIcon }, // Handles both text & video
    { label: 'Vocabulary', view: View.Vocabulary, icon: CollectionIcon },
    { label: 'Conversation', view: View.Conversation, icon: ChatBubbleIcon },
    { label: 'Deep Analysis', view: View.DeepReading, icon: DocumentTextIcon }, // NEW: Advanced analysis
  ];

  const practiceOptions = [
    { label: 'Flashcards', view: View.Flashcards, icon: BoltIcon },
    { label: 'Grammar', view: View.Grammar, icon: AcademicCapIcon },
    { label: 'Pronunciation', view: View.Pronunciation, icon: MicrophoneIcon },
    { label: 'Exercises', view: View.Practice, icon: PencilSquareIcon },
  ];

  const progressOptions = [
    { label: 'Analytics', view: View.Analytics, icon: ChartBarIcon },
  ];

  return (
    <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4 flex justify-between items-center sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-white">Blueprint</h1>
      </div>
      <nav className="flex items-center gap-2">
        <NavButton isActive={currentView === View.Dashboard} onClick={() => setCurrentView(View.Dashboard)}>
          <HomeIcon className="w-5 h-5" />
          Dashboard
        </NavButton>

        <HeaderDropdown
          label="Learn"
          icon={BookOpenIcon}
          options={learnOptions}
          currentView={currentView}
          onNavigate={setCurrentView}
          isActive={isViewInGroup(currentView, 'learn')}
          lastVisitedView={getLastVisitedView('learn')}
        />

        <HeaderDropdown
          label="Practice"
          icon={BoltIcon}
          options={practiceOptions}
          currentView={currentView}
          onNavigate={setCurrentView}
          isActive={isViewInGroup(currentView, 'practice')}
          lastVisitedView={getLastVisitedView('practice')}
        />

        <NavButton isActive={currentView === View.Writing} onClick={() => setCurrentView(View.Writing)}>
          <DocumentTextIcon className="w-5 h-5" />
          Write
        </NavButton>

        <HeaderDropdown
          label="Progress"
          icon={ChartBarIcon}
          options={progressOptions}
          currentView={currentView}
          onNavigate={setCurrentView}
          isActive={isViewInGroup(currentView, 'progress')}
          lastVisitedView={getLastVisitedView('progress')}
        />
      </nav>
      <div className="flex items-center gap-4 text-sm">
        {/* Target Language Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="target-lang-header" className="text-xs text-slate-400">Target:</label>
          <select
            id="target-lang-header"
            value={targetLanguage}
            onChange={e => onTargetLanguageChange(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {supportedLanguages.target.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>

        {/* Word Count */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-700/30 rounded-md">
          <span className="font-bold text-sky-400 text-base">{wordCount}</span>
          <span className="text-slate-400 text-xs">Words</span>
        </div>

        {/* User Profile Dropdown */}
        <UserProfileDropdown onNavigateToSettings={openSettings} />
      </div>
    </header>
  );
};