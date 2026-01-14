
import React, { useState, useEffect } from 'react';
import { CuratedText, ActiveReadingText } from '../types';
import { CURATED_CONTENT } from '../data/curatedContent';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon';
import { ClipboardDocumentIcon } from './icons/ClipboardDocumentIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

// New Component: Library Section
const ContentLibrary = ({ onSelectCuratedText, targetLanguage }: { onSelectCuratedText: (text: CuratedText) => void, targetLanguage: string }) => {
  const contentForLanguage = CURATED_CONTENT.filter(c => c.language === targetLanguage);

  const levels: CuratedText['level'][] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const contentByLevel = contentForLanguage.reduce((acc, text) => {
    if (!acc[text.level]) {
      acc[text.level] = [];
    }
    acc[text.level].push(text);
    return acc;
  }, {} as Record<string, CuratedText[]>);

  const levelColors: Record<string, string> = {
      A1: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', 
      A2: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      B1: 'bg-sky-500/20 text-sky-400 border-sky-500/30', 
      B2: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      C1: 'bg-purple-500/20 text-purple-400 border-purple-500/30', 
      C2: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  if (contentForLanguage.length === 0) {
      return (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center h-64 animate-fade-in">
            <BookOpenIcon className="w-12 h-12 mb-4 opacity-30" />
            <h3 className="text-lg font-medium text-slate-300 mb-1">Library Empty</h3>
            <p className="text-sm">No curated content available for {targetLanguage} yet.</p>
        </div>
      );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {levels.map((level, index) => (
          contentByLevel[level] && (
            <div 
                key={level} 
                className={`bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:bg-slate-800/60 hover:border-slate-600 hover:shadow-lg animate-slide-up`}
                style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-4 border-b border-slate-700/30 flex justify-between items-center bg-slate-800/30">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${levelColors[level]}`}>
                    Level {level}
                </span>
                <span className="text-xs text-slate-500 font-medium">{contentByLevel[level].length} Texts</span>
              </div>
              <div className="p-2 flex-1 flex flex-col gap-1">
                  {contentByLevel[level].map(text => (
                    <button
                      key={text.id}
                      onClick={() => onSelectCuratedText(text)}
                      className="w-full text-left p-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-all group relative overflow-hidden"
                    >
                       <div className="font-semibold text-sm group-hover:text-sky-400 transition-colors relative z-10">{text.title}</div>
                       <div className="text-xs text-slate-500 group-hover:text-slate-400 mt-1 line-clamp-2 leading-relaxed relative z-10">{text.content.substring(0, 80)}...</div>
                    </button>
                  ))}
              </div>
            </div>
          )
        ))}
    </div>
  );
};


interface ReaderViewProps {
  onStartReadingSession: (textData: ActiveReadingText) => void;
  onFetchArticle: (url: string) => Promise<string | null>;
  onFileUpload: (file: File) => Promise<string | null>;
  isFileProcessing: boolean;
  targetLanguage: string;
}

export const ReaderView = ({ onStartReadingSession, onFetchArticle, onFileUpload, isFileProcessing, targetLanguage }: ReaderViewProps) => {
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
      const styleId = 'reader-animations';
      if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.innerHTML = `
              @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
              @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
              .animate-fade-in { animation: fadeInUp 0.6s ease-out forwards; }
              .animate-slide-up { animation: slideUp 0.5s ease-out forwards; opacity: 0; }
          `;
          document.head.appendChild(style);
      }
  }, []);
  
  const handleFetch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!url || isFetching) return;
      
      setIsFetching(true);
      try {
          const content = await onFetchArticle(url);
          if (content) {
            onStartReadingSession({ title: `Article from ${new URL(url).hostname}`, content });
            setUrl('');
          }
      } catch (error) {
          // Error is handled by the App component's toast
      } finally {
          setIsFetching(false);
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const content = await onFileUpload(file);
        if (content) {
            onStartReadingSession({ title: file.name, content });
        }
        e.target.value = '';
    }
  };

  const handlePaste = async () => {
      try {
          const clipboardText = await navigator.clipboard.readText();
          if(clipboardText) {
            onStartReadingSession({ title: 'Pasted Text', content: clipboardText });
          }
      } catch (error) {
          console.error('Failed to read clipboard contents: ', error);
      }
  }

  return (
    <div className="flex-1 p-6 md:p-10 h-full flex flex-col animate-fade-in">
        <div className="mb-10">
            <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">Library</h2>
            <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
                Explore curated texts in <span className="text-sky-400 font-semibold">{targetLanguage}</span> or import your own content to start analyzing.
            </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 flex-1 items-start">
            
            {/* LEFT COLUMN: IMPORT TOOLS */}
            <div className="xl:col-span-4 space-y-6 xl:sticky xl:top-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-1 backdrop-blur-sm">
                    <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-sky-500"></span> Import Content
                        </h3>
                        
                        <form onSubmit={handleFetch} className="mb-6">
                            <label className="block text-xs text-slate-500 mb-1.5 ml-1">From URL</label>
                            <div className="flex gap-2">
                                <input 
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all placeholder:text-slate-600"
                                    disabled={isFetching}
                                    required
                                />
                                <button 
                                    type="submit"
                                    disabled={isFetching || !url}
                                    className="px-3 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-900/20"
                                >
                                    {isFetching ? (
                                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h8v1a1 1 0 110 2h-8a1 1 0 01-1-1z" clipRule="evenodd" />
                                            <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H11a1 1 0 110-2h3.586l-4.293-4.293a1 1 0 010-1.414z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-30 transition duration-500 blur"></div>
                                <div className="relative flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg p-4 text-center transition-all h-full">
                                    <DocumentArrowUpIcon className="w-6 h-6 text-indigo-400 mb-2" />
                                    <span className="text-xs font-bold text-slate-300 mb-0.5">Upload File</span>
                                    <span className="text-[10px] text-slate-500">.txt, .pdf</span>
                                    <label className="absolute inset-0 cursor-pointer" title="Upload File">
                                        <input 
                                            type="file"
                                            accept=".txt,.pdf"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            disabled={isFileProcessing}
                                        />
                                    </label>
                                    {isFileProcessing && (
                                        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg z-10">
                                             <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={handlePaste}
                                className="relative group flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg p-4 text-center transition-all h-full active:scale-95"
                            >
                                <ClipboardDocumentIcon className="w-6 h-6 text-teal-400 mb-2" />
                                <span className="text-xs font-bold text-slate-300 mb-0.5">Paste Text</span>
                                <span className="text-[10px] text-slate-500">Clipboard</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl p-5 border border-slate-800 text-center">
                    <p className="text-xs text-slate-500 leading-relaxed">
                        💡 Pro Tip: Importing texts helps the AI understand your interests and recommend better vocabulary.
                    </p>
                </div>
            </div>

            {/* RIGHT COLUMN: LIBRARY */}
            <div className="xl:col-span-8">
                <div className="flex items-center justify-between mb-6">
                     <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <BookOpenIcon className="w-6 h-6 text-sky-500" />
                        Curated Collection
                     </h3>
                     <div className="text-xs font-medium px-2 py-1 bg-slate-800 rounded text-slate-400 border border-slate-700">
                        {targetLanguage}
                     </div>
                </div>
                <ContentLibrary onSelectCuratedText={onStartReadingSession} targetLanguage={targetLanguage} />
            </div>

        </div>
    </div>
  );
};
