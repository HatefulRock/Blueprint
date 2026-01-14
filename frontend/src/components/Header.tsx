import React, { useState, useRef, useEffect } from 'react';
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
            setIsSettingsOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        
        <div className="relative" ref={settingsRef}>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-2 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
            {isSettingsOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-2">
                    <div className="p-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase px-2 py-1">Reader Settings</p>
                        <div className="text-sm text-slate-300 px-2 py-2">Analysis Display</div>
                        <div className="flex flex-col gap-1 p-1">
                            <button onClick={() => { onDisplayModeChange('panel'); setIsSettingsOpen(false); }} className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${displayMode === 'panel' ? 'bg-sky-600 text-white' : 'hover:bg-slate-700'}`}>Side Panel</button>
                            <button onClick={() => { onDisplayModeChange('popup'); setIsSettingsOpen(false); }} className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${displayMode === 'popup' ? 'bg-sky-600 text-white' : 'hover:bg-slate-700'}`}>Popup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};