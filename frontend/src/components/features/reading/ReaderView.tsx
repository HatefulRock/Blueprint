import React, { useState, useEffect } from "react";
import { CuratedText, ActiveReadingText, ReadingContent, View } from "../../../types";
import { CURATED_CONTENT } from "../../../data/curatedContent";
import { DocumentArrowUpIcon } from "../../common/icons/DocumentArrowUpIcon";
import { ClipboardDocumentIcon } from "../../common/icons/ClipboardDocumentIcon";
import { BookOpenIcon } from "../../common/icons/BookOpenIcon";
import { contentService } from "../../../services/api";
import { TrashIcon, VideoCameraIcon, FileArrowUpIcon, PlayCircleIcon } from '@phosphor-icons/react';

// --- ContentLibrary Component ---
const ContentLibrary = ({
  onSelectCuratedText,
  onDeleteArticle,
  onSelectVideo,
  targetLanguage,
  userArticles,
}: {
  onSelectCuratedText: (text: CuratedText | ReadingContent) => void;
  onSelectVideo: (video: ReadingContent) => void;
  onDeleteArticle: (id: string) => void;
  targetLanguage: string;
  userArticles: ReadingContent[];
}) => {
  const contentForLanguage = (CURATED_CONTENT || []).filter(
    (c) => c.language === targetLanguage,
  );

  const levels: CuratedText["level"][] = ["A1", "A2", "B1", "B2", "C1", "C2"];

  const isVideoContent = (article: ReadingContent) => {
    return article.source_url?.match(/\.(mp4|webm|mov)$/i) || article.title?.includes("(Video)");
  };

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
              {(userArticles || []).map((article) => {
                const isVideo = isVideoContent(article);
                
                return (
                  <div key={article.id} className="relative group">
                    <button
                      onClick={() => isVideo ? onSelectVideo(article) : onSelectCuratedText(article)}
                      className={`w-full border p-4 rounded-xl text-left transition-all ${
                          isVideo 
                          ? 'bg-slate-800/60 border-indigo-500/30 hover:bg-slate-700/60 hover:border-indigo-500/50' 
                          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 pr-6">
                        {isVideo ? (
                            <div className="flex items-center gap-2 bg-indigo-500/20 px-2 py-1 rounded text-indigo-300 border border-indigo-500/20">
                                <VideoCameraIcon className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase">Video</span>
                            </div>
                        ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-700 text-slate-400">
                                Text
                            </span>
                        )}
                      </div>
                      <div className="font-bold text-white group-hover:text-sky-400 transition-colors flex items-center gap-2">
                        {isVideo && <PlayCircleIcon className="w-5 h-5 text-indigo-400" />}
                        {article.title || 'Untitled'}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1 mt-1">
                        {isVideo ? "Interactive video session" : (article.content.substring(0, 100) + "...")}
                      </div>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this item?")) {
                          onDeleteArticle(article.id);
                        }
                      }}
                      className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
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
  onStartVideoSession: (videoData: ReadingContent) => void;
  onFetchArticle: (url: string) => Promise<string | null>;
  onFileUpload: (file: File) => Promise<string | null>;
  isFileProcessing: boolean;
  targetLanguage: string;
  setCurrentView?: (view: View) => void;
}

export const ReaderView = ({
  onStartReadingSession,
  onStartVideoSession,
  targetLanguage,
  isFileProcessing: externalIsProcessing,
  setCurrentView,
}: ReaderViewProps) => {
  const [url, setUrl] = useState("");
  const [userArticles, setUserArticles] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [localFileProcessing, setLocalFileProcessing] = useState(false);

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const response = await contentService.getUserContent();
        // contentService may return axios response or already-unwrapped data depending on interceptor
        const articles = (response && (response.data ?? response)) ?? [];
        setUserArticles(articles);
      } catch (err) {
        console.error("Failed to load library", err);
        setUserArticles([]);
      }
    };
    loadLibrary();
  }, []);

  // --- NEW: Handle Delete ---
  const handleDelete = async (id: string) => {
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = ""; // Reset input

    // Validation
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
    if (!isVideo) {
      alert("Please upload a video file (MP4, WEBM, or MOV)");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert("Video file is too large. Maximum size is 50MB.");
      return;
    }

    setLocalFileProcessing(true);

    try {
      // 1. Prepare FormData
      const formData = new FormData();
      formData.append('file', file);
      // Optional: Add metadata like target_language if your backend supports it on upload
      formData.append('target_language', targetLanguage); 

      // 2. Upload to Backend (Assuming an endpoint exists, otherwise use a generic content upload)
      // If you don't have a specific video endpoint, this might need adjustment based on your API
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('http://localhost:8000/content/upload-video', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const newContent: ReadingContent = await response.json();

      // 3. Update Library UI
      setUserArticles((prev) => [newContent, ...prev]);

      // 4. Start Session
      onStartVideoSession(newContent);

    } catch (err: any) {
      console.error("Video upload error:", err);
      alert(`Failed to upload video: ${err.message || 'Unknown error'}`);
    } finally {
      setLocalFileProcessing(false);
    }
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFetching(true);
    try {
      const response = await contentService.importUrl(url, targetLanguage);
      const newArticle = (response && (response.data ?? response)) || null;
      if (newArticle) {
        setUserArticles((prev) => [newArticle, ...prev]);
        onStartReadingSession({
          title: newArticle.title || newArticle.title || 'Untitled',
          content: newArticle.content || ''
        });
      }
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

  // Handle text file upload
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
          content
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

  // NEW: Handle PDF file upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    // Check if it's a PDF file
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      alert("Please upload a PDF file");
      return;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("PDF file is too large. Maximum size is 10MB.");
      return;
    }

    setLocalFileProcessing(true);

    try {
      // Create FormData to send the file
      const formData = new FormData();
      formData.append('file', file);

      // Get auth token
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Upload to backend
      const response = await fetch('http://localhost:8000/content/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Upload failed');
      }

      const newArticle = await response.json();
      setUserArticles((prev) => [newArticle, ...prev]);

      // Start reading session with the uploaded PDF content
      onStartReadingSession({
        title: newArticle.title,
        content: newArticle.content,
      });

      alert('PDF uploaded successfully!');
    } catch (err: any) {
      console.error("PDF upload error:", err);
      alert(`Failed to upload PDF: ${err.message || 'Unknown error'}`);
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
          clipboardText
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div className="relative group">
                  <div className="relative flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg p-4 text-center transition-all h-full">
                    <FileArrowUpIcon className="w-6 h-6 text-indigo-400 mb-2" />
                    <span className="text-xs font-bold text-slate-300 mb-0.5">
                      Upload Text
                    </span>
                    <span className="text-[10px] text-slate-500">
                      .txt
                    </span>
                    <label
                      className="absolute inset-0 cursor-pointer"
                      title="Upload Text File"
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

                <div className="relative group">
                  <div className="relative flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg p-4 text-center transition-all h-full">
                    <FileArrowUpIcon className="w-6 h-6 text-red-400 mb-2" />
                    <span className="text-xs font-bold text-slate-300 mb-0.5">
                      Upload PDF
                    </span>
                    <span className="text-[10px] text-slate-500">
                      .pdf
                    </span>
                    <label
                      className="absolute inset-0 cursor-pointer"
                      title="Upload PDF File"
                    >
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                        disabled={isProcessing}
                      />
                    </label>
                    {isProcessing && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg z-10">
                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
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

              <div className="relative group">
                <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/30 to-pink-900/30 hover:from-purple-800/40 hover:to-pink-800/40 border border-purple-500/30 rounded-lg p-4 text-center transition-all h-full">
                  <VideoCameraIcon className="w-6 h-6 text-purple-400 mb-2" />
                  <span className="text-xs font-bold text-purple-300 mb-0.5">
                    Upload Video
                  </span>
                  <span className="text-[10px] text-purple-400/70">
                    MP4, WEBM (max 50MB)
                  </span>
                  <label
                    className="absolute inset-0 cursor-pointer"
                    title="Upload Video for Multimodal Learning"
                  >
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/mov"
                      onChange={handleVideoUpload}
                      className="hidden"
                      disabled={localFileProcessing}
                    />
                  </label>
                  {localFileProcessing && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg z-10">
                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                </div>
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
            onSelectVideo={(video) => onStartVideoSession(video)}
            onDeleteArticle={handleDelete}
            targetLanguage={targetLanguage}
            userArticles={userArticles}
          />
        </div>
      </div>
    </div>
  );
};
