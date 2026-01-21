import React from 'react';
import { View, AnalysisDisplayMode, LanguageOption } from '../types';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { CollectionIcon } from './icons/CollectionIcon';
import { BoltIcon } from './icons/BoltIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { HomeIcon } from './icons/HomeIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { AdjustmentsHorizontalIcon } from './icons/AdjustmentsHorizontalIcon';
// import { TrophyIcon } from './icons/TrophyIcon';
// import { UserIcon } from './icons/UserIcon';


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

  // Build language list combining defaults + custom ones from parent (from App)
  // The header receives supportedLanguages prop; App will include customTargetLanguages there.
  const targetLangOptions = supportedLanguages.target;

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
        <NavButton isActive={currentView === View.Reader} onClick={() => setCurrentView(View.Reader)}>
          <BookOpenIcon className="w-5 h-5" />
          Reader
        </NavButton>
        <NavButton isActive={currentView === View.Vocabulary} onClick={() => setCurrentView(View.Vocabulary)}>
          <CollectionIcon className="w-5 h-5" />
          Vocabulary
        </NavButton>
        <NavButton isActive={currentView === View.Flashcards} onClick={() => setCurrentView(View.Flashcards)}>
          <BoltIcon className="w-5 h-5" />
          Flashcards
        </NavButton>
        <NavButton isActive={currentView === View.Practice} onClick={() => setCurrentView(View.Practice)}>
          <PencilSquareIcon className="w-5 h-5" />
          Practice
        </NavButton>
         <NavButton isActive={currentView === View.Conversation} onClick={() => setCurrentView(View.Conversation)}>
          <ChatBubbleIcon className="w-5 h-5" />
          Conversation
        </NavButton>
      </nav>
      <div className="flex items-center gap-6 text-sm">
         <div className="flex items-center gap-4">
            <div>
                <label htmlFor="target-lang-header" className="text-xs text-slate-400 mr-2">Target:</label>
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
            <div>
                <button onClick={() => setCurrentView(View.Settings)} className="ml-2 text-xs px-2 py-1 bg-slate-700 rounded text-slate-200">Settings</button>
            </div>
            <div>
                <label htmlFor="ui-lang-header" className="text-xs text-slate-400 mr-2">UI:</label>
                <select 
                    id="ui-lang-header" 
                    value={uiLanguage} 
                    onChange={e => onUiLanguageChange(e.target.value)} 
                    className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                     {supportedLanguages.ui.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
            </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="font-bold text-sky-400 text-lg">{wordCount}</span>
          <span className="text-slate-400">Words</span>
        </div>
        
        <div>
            <button onClick={openSettings} className="p-2 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </header>
  );
};