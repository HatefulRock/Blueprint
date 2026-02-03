import React, { useState, useRef, useEffect } from 'react';
import { getDeepAnalysis } from '../../../services/geminiService';
import { Selection, ReadingContent } from '../../../types';

// --- Types (Same as before) ---
interface Subtitle {
  start_time: string;
  end_time: string;
  text: string;
  speaker?: string;
}

interface VocabularyItem {
  word: string;
  translation: string;
  context: string;
  timestamp: string;
  part_of_speech?: string;
  difficulty?: string;
}

interface GrammarPoint {
  pattern: string;
  explanation: string;
  examples: string[];
  difficulty?: string;
}

interface VideoAnalysis {
  transcript: Subtitle[];
  vocabulary: VocabularyItem[];
  grammar_points: GrammarPoint[];
  difficulty_level: string;
  cultural_notes?: string;
}

interface Exercise {
  comprehension?: Array<{
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
    timestamp?: string;
  }>;
  vocabulary?: Array<{
    sentence: string;
    correct_answer: string;
    hint: string;
    translation: string;
  }>;
  grammar?: Array<{
    type: string;
    question: string;
    correct_answer: string;
    grammar_point: string;
    explanation: string;
  }>;
  speaking?: Array<{
    phrase: string;
    phonetic: string;
    translation: string;
    timestamp: string;
    tip: string;
  }>;
  writing?: Array<{
    prompt: string;
    suggested_vocabulary: string[];
    suggested_grammar: string[];
    min_words: number;
  }>;
}

// --- Icons ---
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

const VideoIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

// --- Analysis Popup ---
interface AnalysisPopupProps {
  word: string;
  onClose: () => void;
  targetLanguage: string;
  nativeLanguage: string;
  contextSentence: string;
}

const AnalysisPopup: React.FC<AnalysisPopupProps> = ({ word, onClose, targetLanguage, nativeLanguage, contextSentence }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const selection: Selection = {
          text: word,
          type: 'word',
          contextSentence: contextSentence
        };
        const result = await getDeepAnalysis(selection, { targetLanguage, nativeLanguage });
        setAnalysis(result);
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [word, targetLanguage, nativeLanguage, contextSentence]);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto custom-scrollbar" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-2xl font-serif font-bold text-white">{word}</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin text-2xl">⚡</div>
              <span className="text-sm text-slate-400">Analyzing context...</span>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Translation</div>
                <div className="text-lg text-indigo-300 font-medium">{analysis.translation}</div>
              </div>

              {analysis.partOfSpeech && (
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/20">
                    {analysis.partOfSpeech}
                  </span>
                </div>
              )}

              {analysis.grammaticalBreakdown && (
                <div className="space-y-2">
                   <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Grammar</div>
                   <div className="text-slate-300 text-sm leading-relaxed">{analysis.grammaticalBreakdown}</div>
                </div>
              )}

              {analysis.wordBreakdown && analysis.wordBreakdown.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                   <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Components</div>
                  <div className="space-y-2">
                    {analysis.wordBreakdown.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-slate-800/30 p-2 rounded-lg">
                        <span className="font-medium text-amber-200/80">{item.term}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-slate-300">{item.translation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Analysis unavailable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface VideoLearningViewProps {
  targetLanguage?: string;
  nativeLanguage?: string;
  initialVideoContent?: ReadingContent | null;
  onNavigateBack?: () => void;
}

export const VideoLearningView: React.FC<VideoLearningViewProps> = ({
  targetLanguage = 'Chinese',
  nativeLanguage = 'English',
  initialVideoContent,
  onNavigateBack
}) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [exercises, setExercises] = useState<Exercise | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSubtitle, setActiveSubtitle] = useState<Subtitle | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedWord, setSelectedWord] = useState<{ word: string; context: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'grammar' | 'exercises'>('vocabulary');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialVideoContent) {
      // 1. Set the URL (Assuming source_url is the path to the video)
      if (initialVideoContent.source_url) {
        setVideoUrl(initialVideoContent.source_url);
        
        // 2. If the backend already analyzed it, we could pass that data too.
        // For now, we might need to trigger an analysis fetch based on the ID.
        fetchVideoAnalysis(initialVideoContent.id);
      }
    }
  }, [initialVideoContent]);

  const fetchVideoAnalysis = async (contentId: string) => {
    setLoading(true);
    try {
      // In reality: await fetch(`/api/content/${contentId}/analysis`)
      await new Promise(resolve => setTimeout(resolve, 1500)); // Fake network
      
      // Load the data (Mocked here, but would come from DB)
      // You would replace this with actual backend data retrieval
      const mockData = {
          analysis: {
              difficulty_level: "Intermediate B1",
              transcript: [
                  { start_time: "00:01", end_time: "00:05", text: "Example transcript loaded from library.", speaker: "Host" },
                  // ...
              ],
              vocabulary: [],
              grammar_points: []
          },
          exercises: {}
      };
      setAnalysis(mockData.analysis as any);
      setExercises(mockData.exercises as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  const handleVideoUpload = async (file: File) => {
    setLoading(true);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_language', targetLanguage);
      formData.append('native_language', nativeLanguage);
      
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 200);

      await new Promise(resolve => setTimeout(resolve, 2000));
      clearInterval(interval);
      setUploadProgress(100);

      const mockData = {
          analysis: {
              difficulty_level: "Intermediate B1",
              transcript: [
                  { start_time: "00:01", end_time: "00:05", text: "Hola a todos, bienvenidos a mi canal.", speaker: "Host" },
                  { start_time: "00:06", end_time: "00:10", text: "Hoy vamos a preparar una receta muy especial.", speaker: "Host" },
                  { start_time: "00:11", end_time: "00:15", text: "Necesitaremos tres ingredientes básicos.", speaker: "Host" },
                  { start_time: "00:16", end_time: "00:20", text: "Primero, vamos a cortar las verduras.", speaker: "Host" },
                  { start_time: "00:21", end_time: "00:25", text: "Es importante que el cuchillo esté afilado.", speaker: "Host" },
                  { start_time: "00:26", end_time: "00:30", text: "Ten cuidado con los dedos.", speaker: "Host" }
              ],
              vocabulary: [
                  { word: "Bienvenidos", translation: "Welcome", context: "Bienvenidos a mi canal", timestamp: "00:01", part_of_speech: "Adjective" },
                  { word: "Receta", translation: "Recipe", context: "Una receta muy especial", timestamp: "00:06", part_of_speech: "Noun" },
                  { word: "Afilado", translation: "Sharp", context: "El cuchillo esté afilado", timestamp: "00:21", part_of_speech: "Adjective" }
              ],
              grammar_points: [
                  { pattern: "Vamos a + Infinitive", explanation: "Used to express future plans.", examples: ["Vamos a preparar", "Vamos a comer"] }
              ],
              cultural_notes: "Cooking shows in Spain often emphasize fresh, local ingredients (Km 0)."
          },
          exercises: {
              vocabulary: [{ sentence: "Hoy vamos a ___ una receta.", correct_answer: "preparar", hint: "To prepare", translation: "Today we are going to prepare a recipe." }]
          }
      };
      
      setAnalysis(mockData.analysis);
      setExercises(mockData.exercises);

    } catch (error) {
      console.error('Video analysis failed:', error);
      alert('Failed to analyze video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert('File too large. Maximum size is 50MB.');
        return;
      }
      handleVideoUpload(file);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !analysis) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    const active = analysis.transcript.find(sub => {
      const start = parseTime(sub.start_time);
      const end = parseTime(sub.end_time);
      return time >= start && time <= end;
    });
    setActiveSubtitle(active || null);
  };

  const jumpToTimestamp = (timestamp: string) => {
    if (videoRef.current) {
      videoRef.current.currentTime = parseTime(timestamp);
      videoRef.current.play();
    }
  };

  return (
    // FIX: Use 'fixed inset-0' to lock layout to viewport, preventing body scroll issues.
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-slate-900 to-[#0f172a] text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      
      {/* FIX: Header z-index 50 and stronger background opacity to ensure content slides BEHIND it */}
      <header className="flex-shrink-0 h-16 px-6 flex items-center justify-between bg-slate-900/95 backdrop-blur-md z-50 border-b border-white/5 shadow-sm relative">
        <button
          onClick={onNavigateBack}
          className="group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <ArrowLeftIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden md:inline">Back to Library</span>
        </button>

        <div className="text-sm font-medium text-slate-500 flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
           <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
           <span>Video Session</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {targetLanguage}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content: z-0 relative to keep it below header. flex-grow to fill space. */}
      <div className="flex-grow flex flex-col lg:flex-row gap-6 p-4 md:p-6 lg:p-8 overflow-hidden relative z-0">
        
        {/* Left Column: Video + Transcript */}
        <div className="w-full lg:flex-[2] flex flex-col gap-6 h-full overflow-hidden">
            
            {/* Video Area: Flex-shrink-0 so it doesn't get squashed, but also doesn't scroll independently */}
            <div className="flex-shrink-0 relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                {!videoUrl ? (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-slate-800/20 hover:bg-slate-800/40 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/mov"
                    onChange={handleFileSelect}
                    className="hidden"
                    />
                    <div className="w-20 h-20 bg-slate-800/80 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <VideoIcon className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">Upload Video</h3>
                    <p className="text-slate-500">MP4, WEBM or MOV</p>
                </div>
                ) : (
                <>
                    <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    className="w-full h-full object-contain"
                    />
                    
                    {/* Floating Subtitle Overlay */}
                    {activeSubtitle && (
                    <div className="absolute bottom-12 left-0 right-0 flex justify-center px-4 pointer-events-none">
                        <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-4 rounded-xl text-lg md:text-xl font-medium max-w-3xl text-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
                        {activeSubtitle.text}
                        </div>
                    </div>
                    )}
                </>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center z-20">
                        <div className="w-64 space-y-4">
                            <div className="flex justify-between text-xs uppercase tracking-wider text-indigo-300 font-bold">
                                <span>Analyzing</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-500 transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p className="text-center text-slate-500 text-sm">Extracting linguistics...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Transcript Area: Scrolls independently */}
            {analysis && (
                <div className="flex-1 min-h-0 bg-slate-800/40 border border-white/5 rounded-2xl shadow-xl overflow-hidden flex flex-col relative">
                    <div className="px-6 py-4 border-b border-white/5 bg-slate-800/50 backdrop-blur flex justify-between items-center z-10 relative">
                        <h3 className="font-medium text-slate-200">Transcript</h3>
                        <span className="text-xs text-slate-500">Click words to analyze</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1 z-0">
                        {analysis.transcript.map((sub, idx) => (
                            <div
                                key={idx}
                                className={`group flex gap-4 p-3 rounded-xl transition-all ${
                                    activeSubtitle === sub
                                    ? 'bg-indigo-500/10 border border-indigo-500/20'
                                    : 'hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <button 
                                    onClick={() => jumpToTimestamp(sub.start_time)}
                                    className={`text-xs font-mono mt-1 ${activeSubtitle === sub ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'}`}
                                >
                                    {sub.start_time}
                                </button>
                                <p className={`leading-relaxed text-lg ${activeSubtitle === sub ? 'text-indigo-100' : 'text-slate-300'}`}>
                                    {sub.text.split(' ').map((word, wIdx) => (
                                        <span 
                                            key={wIdx}
                                            className="cursor-pointer hover:text-indigo-300 hover:underline decoration-indigo-500/50 underline-offset-4 decoration-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedWord({ word: word.replace(/[.,!?]/g, ''), context: sub.text });
                                            }}
                                        >
                                            {word}{' '}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Right: Analysis Sidebar */}
        {analysis && (
            <div className="hidden lg:flex w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 flex-col gap-4 h-full overflow-hidden">
                
                {/* Stats Card */}
                <div className="bg-slate-800/60 backdrop-blur border border-white/5 rounded-2xl p-5 shadow-lg flex-shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Level</div>
                            <div className="text-2xl font-serif text-white">{analysis.difficulty_level}</div>
                        </div>
                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold">
                            Analyzed
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-slate-900/50 rounded-lg p-3 border border-white/5">
                            <div className="text-indigo-400 font-bold text-lg">{analysis.vocabulary.length}</div>
                            <div className="text-xs text-slate-500">Keywords</div>
                        </div>
                        <div className="flex-1 bg-slate-900/50 rounded-lg p-3 border border-white/5">
                            <div className="text-amber-400 font-bold text-lg">{analysis.grammar_points.length}</div>
                            <div className="text-xs text-slate-500">Patterns</div>
                        </div>
                    </div>
                </div>

                {/* Tabs & Content - Scrolls internally */}
                <div className="flex-1 min-h-0 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="flex p-2 gap-1 border-b border-white/5 flex-shrink-0">
                        {['vocabulary', 'grammar', 'exercises'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === tab 
                                    ? 'bg-indigo-500/20 text-indigo-200 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                        {activeTab === 'vocabulary' && (
                            <div className="space-y-3">
                                {analysis.vocabulary.map((item, idx) => (
                                    <div key={idx} className="group bg-slate-800/40 hover:bg-slate-800/60 border border-white/5 hover:border-indigo-500/30 p-3 rounded-xl transition-all cursor-pointer"
                                         onClick={() => jumpToTimestamp(item.timestamp)}>
                                        <div className="flex justify-between items-start">
                                            <span className="font-medium text-slate-200 text-lg">{item.word}</span>
                                            <span className="text-xs font-mono text-slate-600 bg-slate-900/50 px-2 py-1 rounded">{item.timestamp}</span>
                                        </div>
                                        <div className="text-indigo-300 text-sm mt-1">{item.translation}</div>
                                        <div className="text-xs text-slate-500 mt-2 line-clamp-1 italic group-hover:text-slate-400 transition-colors">
                                            "{item.context}"
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'grammar' && (
                            <div className="space-y-4">
                                {analysis.grammar_points.map((point, idx) => (
                                    <div key={idx} className="bg-slate-800/40 border border-white/5 p-4 rounded-xl">
                                        <div className="text-amber-200 font-medium mb-2 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                            {point.pattern}
                                        </div>
                                        <div className="text-sm text-slate-400 leading-relaxed mb-3">
                                            {point.explanation}
                                        </div>
                                        {point.examples.map((ex, i) => (
                                            <div key={i} className="text-xs text-slate-500 bg-slate-900/30 p-2 rounded border border-white/5">
                                                {ex}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'exercises' && (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
                                <div className="mb-4 text-4xl">✏️</div>
                                <h4 className="text-slate-300 font-medium mb-2">Practice Mode</h4>
                                <p className="text-sm mb-6">Interactive exercises generated from the video content.</p>
                                <button className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg transition-all text-sm font-medium">
                                    Start Exercises
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cultural Note Card */}
                {analysis.cultural_notes && (
                    <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/10 p-4 rounded-xl flex-shrink-0">
                         <div className="text-xs text-amber-500/80 uppercase tracking-wider font-bold mb-2 flex items-center gap-2">
                            <span>🌍</span> Cultural Context
                         </div>
                         <p className="text-sm text-amber-200/70 leading-relaxed">
                             {analysis.cultural_notes}
                         </p>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Popups */}
      {selectedWord && (
        <AnalysisPopup
          word={selectedWord.word}
          contextSentence={selectedWord.context}
          targetLanguage={targetLanguage}
          nativeLanguage={nativeLanguage}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
};