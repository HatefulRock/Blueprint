import React, { useState, useEffect } from "react";
import { CuratedText, ActiveReadingText } from "../types";
import { CURATED_CONTENT } from "../data/curatedContent";
import { DocumentArrowUpIcon } from "./icons/DocumentArrowUpIcon";
import { ClipboardDocumentIcon } from "./icons/ClipboardDocumentIcon";
import { BookOpenIcon } from "./icons/BookOpenIcon";
import { contentService } from "../services/api";

// --- NEW: Trash Icon Component ---
const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

// --- ContentLibrary Component ---
const ContentLibrary = ({
  onSelectCuratedText,
  onDeleteArticle, // NEW PROP
  targetLanguage,
  userArticles,
}: {
  onSelectCuratedText: (text: any) => void;
  onDeleteArticle: (id: number) => void; // Defined type
  targetLanguage: string;
  userArticles: any[];
}) => {
  const contentForLanguage = (CURATED_CONTENT || []).filter(
    (c) => c.language === targetLanguage,
  );

  const levels: CuratedText["level"][] = ["A1", "A2", "B1", "B2", "C1", "C2"];

  const LEVEL_COLORS: Record<string, string> = {
    A1: "bg-green-500/20 text-green-400 border-green-500/30",
    A2: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    B1: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    B2: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    C1: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    C2: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  };

  return (
    <div className="space-y-10">
      {/* SECTION 1: PERSONAL COLLECTION */}
      {(userArticles?.length ?? 0) > 0 && (
          <div>
            <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 ml-1">
              Your Imports
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(userArticles || []).map((article) => (
                <div
                  key={article.id || Math.random()}
                  className="relative group" // Added relative for positioning delete button
                >
                <button
                  onClick={() => onSelectCuratedText(article)}
                  className="w-full bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl text-left hover:bg-slate-700/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-2 pr-6">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        LEVEL_COLORS[article.difficulty_score as string] ||
                        "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {article.difficulty_score || "New"}
                    </span>
                  </div>
                  <div className="font-bold text-white group-hover:text-sky-400 transition-colors">
                    {article.title}
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-1 mt-1">
                    {article.content?.substring(0, 100)}...
                  </div>
                </button>

                {/* DELETE BUTTON */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevents opening the article
                    if (
                      window.confirm(
                        "Are you sure you want to delete this text?",
                      )
                    ) {
                      onDeleteArticle(article.id);
                    }
                  }}
                  className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: CURATED COLLECTION (No Delete here usually) */}
      <div>
        <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 ml-1">
          Curated Library
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {levels.map((level) => {
            const levelContent = contentForLanguage.filter(
              (c) => c.level === level,
            );
            if (levelContent.length === 0) return null;

            return (
              <div
                key={level}
                className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden"
              >
                <div className="p-3 border-b border-slate-700/30 bg-slate-800/30 flex justify-between items-center">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded border ${LEVEL_COLORS[level]}`}
                  >
                    Level {level}
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {levelContent.map((text) => (
                    <button
                      key={text.id}
                      onClick={() => onSelectCuratedText(text)}
                      className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-all"
                    >
                      <div className="font-semibold text-sm text-slate-300">
                        {text.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- ReaderView Component ---
interface ReaderViewProps {
  onStartReadingSession: (textData: ActiveReadingText) => void;
  onFetchArticle: (url: string) => Promise<string | null>;
  onFileUpload: (file: File) => Promise<string | null>;
  isFileProcessing: boolean;
  targetLanguage: string;
}

export const ReaderView = ({
  onStartReadingSession,
  targetLanguage,
  isFileProcessing: externalIsProcessing,
}: ReaderViewProps) => {
  const [url, setUrl] = useState("");
  const [userArticles, setUserArticles] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [localFileProcessing, setLocalFileProcessing] = useState(false);

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const response = await contentService.getUserContent(1); // User ID 1
        setUserArticles(response.data ?? []);
      } catch (err) {
        console.error("Failed to load library", err);
        setUserArticles([]);
      }
    };
    loadLibrary();
  }, []);

  // --- NEW: Handle Delete ---
  const handleDelete = async (id: number) => {
    try {
      // 1. Call API
      await contentService.deleteContent(id);

      // 2. Remove from UI immediately
      setUserArticles((prev) => prev.filter((article) => article.id !== id));
    } catch (err) {
      console.error("Failed to delete content", err);
      alert("Failed to delete content. Please try again.");
    }
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFetching(true);
    try {
      const response = await contentService.importUrl(url, 1);
      const newArticle = response.data;
      setUserArticles((prev) => [newArticle, ...prev]);
      onStartReadingSession({
        title: newArticle.title,
        content: newArticle.content,
      });
      setUrl("");
    } catch (error) {
      console.error("Scraping failed", error);
    } finally {
      setIsFetching(false);
    }
  };

  // Helper to read file content
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
    setLocalFileProcessing(true);

    try {
      let content = "";
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        content = await readFileContent(file);
      } else {
        alert("Unsupported file type. Please upload .txt");
        setLocalFileProcessing(false);
        return;
      }

      if (content) {
        const response = await contentService.saveManualContent(
          file.name,
          content,
          1,
        );
        const newArticle = response.data;
        setUserArticles((prev) => [newArticle, ...prev]);
        onStartReadingSession({
          title: newArticle.title,
          content: newArticle.content,
        });
      }
    } catch (err) {
      console.error("File upload error:", err);
      alert("Error reading file.");
    } finally {
      setLocalFileProcessing(false);
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        const response = await contentService.saveManualContent(
          "Pasted Text " + new Date().toLocaleTimeString(),
          clipboardText,
          1,
        );
        setUserArticles([response.data, ...userArticles]);
        onStartReadingSession({
          title: response.data.title,
          content: response.data.content,
        });
      }
    } catch (error) {
      console.error("Failed to read clipboard contents: ", error);
    }
  };

  const isProcessing = localFileProcessing || externalIsProcessing;

  return (
    <div className="flex-1 p-6 md:p-10 h-full flex flex-col animate-fade-in">
      <div className="mb-10">
        <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">
          Library
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
          Explore curated texts in{" "}
          <span className="text-sky-400 font-semibold">{targetLanguage}</span>{" "}
          or import your own content to start analyzing.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 flex-1 items-start">
        {/* LEFT COLUMN: IMPORT TOOLS */}
        <div className="xl:col-span-4 space-y-6 xl:sticky xl:top-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-1 backdrop-blur-sm">
            <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span> Import
                Content
              </h3>

              <form onSubmit={handleFetch} className="mb-6">
                <label className="block text-xs text-slate-500 mb-1.5 ml-1">
                  From URL
                </label>
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
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 10a1 1 0 011-1h8v1a1 1 0 110 2h-8a1 1 0 01-1-1z"
                          clipRule="evenodd"
                        />
                        <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H11a1 1 0 110-2h3.586l-4.293-4.293a1 1 0 010-1.414z" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <div className="relative flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg p-4 text-center transition-all h-full">
                    <DocumentArrowUpIcon className="w-6 h-6 text-indigo-400 mb-2" />
                    <span className="text-xs font-bold text-slate-300 mb-0.5">
                      Upload File
                    </span>
                    <span className="text-[10px] text-slate-500">
                      .txt only
                    </span>
                    <label
                      className="absolute inset-0 cursor-pointer"
                      title="Upload File"
                    >
                      <input
                        type="file"
                        accept=".txt"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isProcessing}
                      />
                    </label>
                    {isProcessing && (
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
                  <span className="text-xs font-bold text-slate-300 mb-0.5">
                    Paste Text
                  </span>
                  <span className="text-[10px] text-slate-500">Clipboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIBRARY */}
        <div className="xl:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpenIcon className="w-6 h-6 text-sky-500" />
              Library Collection
            </h3>
          </div>
          <ContentLibrary
            onSelectCuratedText={(text) =>
              onStartReadingSession({
                title: text.title,
                content: text.content,
              })
            }
            onDeleteArticle={handleDelete} // PASSED HERE
            targetLanguage={targetLanguage}
            userArticles={userArticles}
          />
        </div>
      </div>
    </div>
  );
};
