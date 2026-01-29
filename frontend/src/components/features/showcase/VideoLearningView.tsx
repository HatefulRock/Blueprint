/**
 * Interactive video learning interface showcasing Gemini 3 multimodal capabilities.
 *
 * Features:
 * - Video upload and playback
 * - Synchronized subtitles (clickable for word analysis)
 * - Vocabulary extraction with timestamps
 * - Auto-generated exercises
 * - Progress tracking
 * - Grammar pattern identification
 *
 * Powered by Gemini 3 Vision + Gemini 3 Pro
 */

import React, { useState, useRef, useEffect } from 'react';
import { getDeepAnalysis } from '../../../services/geminiService';
import { Selection } from '../../../types';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-bold text-gray-800">{word}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin text-4xl">⚙️</div>
            <span className="ml-3 text-gray-600">Analyzing with Gemini 3...</span>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Translation</div>
              <div className="text-lg font-semibold text-gray-800">{analysis.translation}</div>
            </div>

            {analysis.partOfSpeech && (
              <div className="bg-purple-50 p-3 rounded-lg">
                <span className="text-sm text-gray-600">Part of Speech: </span>
                <span className="font-semibold text-purple-700">{analysis.partOfSpeech}</span>
              </div>
            )}

            {analysis.grammaticalBreakdown && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-semibold text-gray-700 mb-2">Grammar Breakdown</div>
                <div className="text-gray-700">{analysis.grammaticalBreakdown}</div>
              </div>
            )}

            {analysis.wordBreakdown && analysis.wordBreakdown.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-sm font-semibold text-gray-700 mb-2">Word Components</div>
                <div className="space-y-2">
                  {analysis.wordBreakdown.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-mono font-bold text-yellow-800">{item.term}</span>
                      <span className="text-gray-600">→</span>
                      <span className="text-gray-700">{item.translation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">
            Failed to load analysis. Please try again.
          </div>
        )}
      </div>
    </div>
  );
};

interface VideoLearningViewProps {
  targetLanguage?: string;
  nativeLanguage?: string;
  onNavigateBack?: () => void;
}

export const VideoLearningView: React.FC<VideoLearningViewProps> = ({
  targetLanguage = 'Spanish',
  nativeLanguage = 'English',
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

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

      setUploadProgress(30);

      const response = await fetch('/video/upload', {
        method: 'POST',
        body: formData,
        headers: {
          // Add auth token if needed
          // 'Authorization': `Bearer ${token}`
        },
      });

      setUploadProgress(70);

      if (!response.ok) {
        throw new Error('Video upload failed');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setExercises(data.exercises);
      setUploadProgress(100);
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
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert('File too large. Maximum size is 50MB.');
        return;
      }

      // Check file type
      if (!['video/mp4', 'video/webm', 'video/mov'].includes(file.type)) {
        alert('Unsupported file type. Please upload MP4, WEBM, or MOV.');
        return;
      }

      handleVideoUpload(file);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !analysis) return;

    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Find active subtitle
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

  const handleSubtitleClick = (subtitle: Subtitle) => {
    // Extract words from subtitle for analysis
    const words = subtitle.text.split(/\s+/);
    if (words.length > 0) {
      setSelectedWord({ word: words[0], context: subtitle.text });
    }
  };

  const handleWordClick = (word: string, context: string) => {
    setSelectedWord({ word, context });
  };

  const saveAllVocabulary = async () => {
    // TODO: Implement save to user's vocabulary list
    alert('Vocabulary save feature coming soon!');
  };

  const generateExercises = async () => {
    if (!analysis) return;

    setLoading(true);
    try {
      // Exercises are already generated during upload
      // This could trigger regeneration if needed
      alert('Exercises already generated! Check the Exercises tab.');
      setActiveTab('exercises');
    } catch (error) {
      console.error('Exercise generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="video-learning-container min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {onNavigateBack && (
              <button
                onClick={onNavigateBack}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                <span>←</span>
                <span>Back to Showcase</span>
              </button>
            )}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Video Learning Lab</h1>
          <p className="text-purple-200">Powered by Gemini 3 Multimodal AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Video Player + Subtitles */}
          <div className="lg:col-span-2 space-y-4">
            {!videoUrl ? (
              <div
                className="upload-zone border-2 border-dashed border-purple-400 rounded-2xl p-12 text-center bg-slate-800/50 backdrop-blur cursor-pointer hover:border-purple-300 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/mov"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="text-6xl mb-4">🎥</div>
                <div className="text-2xl font-semibold text-white mb-2">Upload Video</div>
                <div className="text-purple-300 mb-4">MP4, WEBM, MOV (max 50MB)</div>
                <div className="text-sm text-purple-400 bg-purple-900/30 inline-block px-4 py-2 rounded-full">
                  ✨ Powered by Gemini 3 Multimodal AI
                </div>
                <div className="mt-6 text-sm text-gray-400">
                  Click to select or drag and drop your video
                </div>
              </div>
            ) : (
              <>
                {/* Video Player */}
                <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    className="w-full rounded-2xl"
                  />

                  {/* Active Subtitle Overlay */}
                  {activeSubtitle && (
                    <div className="absolute bottom-16 left-0 right-0 flex justify-center px-4">
                      <div className="bg-black/80 text-white px-6 py-3 rounded-lg text-lg backdrop-blur max-w-3xl">
                        {activeSubtitle.text}
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Subtitles Panel */}
                <div className="bg-slate-800/80 backdrop-blur rounded-2xl shadow-xl">
                  <div className="p-4 border-b border-slate-700">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <span className="text-2xl">💬</span>
                      Interactive Subtitles
                      <span className="text-xs text-purple-400 ml-2">Click any word to analyze</span>
                    </h3>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto space-y-2">
                    {analysis?.transcript.map((sub, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          activeSubtitle === sub
                            ? 'bg-purple-600 text-white shadow-lg scale-105'
                            : 'bg-slate-700/50 text-slate-200 hover:bg-slate-700'
                        }`}
                        onClick={() => jumpToTimestamp(sub.start_time)}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-sm text-purple-300 font-mono min-w-[50px]">
                            {sub.start_time}
                          </span>
                          <div className="flex-1">
                            <p className="leading-relaxed">{sub.text}</p>
                            {sub.speaker && (
                              <span className="text-xs text-purple-400 mt-1 inline-block">
                                — {sub.speaker}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Loading Overlay */}
            {loading && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                  <div className="text-center">
                    <div className="animate-spin text-6xl mb-4">⚙️</div>
                    <div className="text-2xl font-semibold text-white mb-2">
                      Gemini 3 is analyzing your video...
                    </div>
                    <div className="text-purple-300 mb-6">
                      Extracting subtitles, vocabulary, and grammar patterns
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-400 mt-2">{uploadProgress}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Analysis Results */}
          <div className="lg:col-span-1">
            {analysis && (
              <div className="space-y-4">
                {/* Difficulty Badge */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-2xl shadow-xl">
                  <div className="text-sm opacity-90 mb-1">Difficulty Level</div>
                  <div className="text-4xl font-bold">{analysis.difficulty_level}</div>
                  <div className="text-sm mt-2 opacity-75">
                    {analysis.vocabulary.length} words • {analysis.grammar_points.length} grammar patterns
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-slate-800/80 backdrop-blur rounded-2xl shadow-xl overflow-hidden">
                  <div className="flex border-b border-slate-700">
                    <button
                      onClick={() => setActiveTab('vocabulary')}
                      className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                        activeTab === 'vocabulary'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      📚 Vocabulary
                    </button>
                    <button
                      onClick={() => setActiveTab('grammar')}
                      className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                        activeTab === 'grammar'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      📝 Grammar
                    </button>
                    <button
                      onClick={() => setActiveTab('exercises')}
                      className={`flex-1 px-4 py-3 font-semibold transition-colors ${
                        activeTab === 'exercises'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ✏️ Exercises
                    </button>
                  </div>

                  <div className="p-4 max-h-96 overflow-y-auto">
                    {/* Vocabulary Tab */}
                    {activeTab === 'vocabulary' && (
                      <div className="space-y-2">
                        {analysis.vocabulary.map((word, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-700/50 p-3 rounded-lg cursor-pointer hover:bg-slate-700 transition-all"
                            onClick={() => handleWordClick(word.word, word.context)}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <div className="font-semibold text-white">{word.word}</div>
                              <span
                                className="text-xs px-2 py-1 rounded-full bg-purple-600/50 text-purple-200 cursor-pointer hover:bg-purple-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  jumpToTimestamp(word.timestamp);
                                }}
                              >
                                🕐 {word.timestamp}
                              </span>
                            </div>
                            <div className="text-sm text-purple-300">{word.translation}</div>
                            {word.part_of_speech && (
                              <div className="text-xs text-gray-400 mt-1">
                                {word.part_of_speech} • {word.difficulty || 'Unknown'}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1 italic line-clamp-1">
                              "{word.context}"
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Grammar Tab */}
                    {activeTab === 'grammar' && (
                      <div className="space-y-3">
                        {analysis.grammar_points.map((point, idx) => (
                          <div key={idx} className="bg-slate-700/50 p-4 rounded-lg">
                            <div className="font-semibold text-white mb-2 flex items-center gap-2">
                              <span className="text-yellow-400">→</span>
                              {point.pattern}
                            </div>
                            <div className="text-sm text-gray-300 mb-2">
                              {point.explanation}
                            </div>
                            {point.examples && point.examples.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {point.examples.map((example, exIdx) => (
                                  <div key={exIdx} className="text-xs text-purple-300 bg-slate-800/50 p-2 rounded">
                                    • {example}
                                  </div>
                                ))}
                              </div>
                            )}
                            {point.difficulty && (
                              <div className="text-xs text-gray-500 mt-2">
                                Level: {point.difficulty}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Exercises Tab */}
                    {activeTab === 'exercises' && exercises && (
                      <div className="space-y-4">
                        {/* Comprehension */}
                        {exercises.comprehension && exercises.comprehension.length > 0 && (
                          <div>
                            <h4 className="text-white font-semibold mb-2">🎯 Comprehension</h4>
                            <div className="text-sm text-purple-300">
                              {exercises.comprehension.length} questions available
                            </div>
                          </div>
                        )}

                        {/* Vocabulary Exercises */}
                        {exercises.vocabulary && exercises.vocabulary.length > 0 && (
                          <div>
                            <h4 className="text-white font-semibold mb-2">📖 Fill in the Blank</h4>
                            <div className="text-sm text-purple-300">
                              {exercises.vocabulary.length} exercises available
                            </div>
                          </div>
                        )}

                        {/* Grammar Exercises */}
                        {exercises.grammar && exercises.grammar.length > 0 && (
                          <div>
                            <h4 className="text-white font-semibold mb-2">✍️ Grammar Practice</h4>
                            <div className="text-sm text-purple-300">
                              {exercises.grammar.length} exercises available
                            </div>
                          </div>
                        )}

                        {/* Speaking */}
                        {exercises.speaking && exercises.speaking.length > 0 && (
                          <div>
                            <h4 className="text-white font-semibold mb-2">🎤 Pronunciation</h4>
                            <div className="space-y-2">
                              {exercises.speaking.map((item, idx) => (
                                <div key={idx} className="bg-slate-700/50 p-3 rounded-lg">
                                  <div className="text-white font-semibold">{item.phrase}</div>
                                  <div className="text-xs text-purple-300 mt-1">{item.phonetic}</div>
                                  <div className="text-xs text-gray-400 mt-1">{item.tip}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Writing */}
                        {exercises.writing && exercises.writing.length > 0 && (
                          <div>
                            <h4 className="text-white font-semibold mb-2">✏️ Writing Prompts</h4>
                            <div className="space-y-2">
                              {exercises.writing.map((item, idx) => (
                                <div key={idx} className="bg-slate-700/50 p-3 rounded-lg">
                                  <div className="text-sm text-gray-300">{item.prompt}</div>
                                  <div className="text-xs text-gray-500 mt-2">
                                    Min {item.min_words} words
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={saveAllVocabulary}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-lg"
                  >
                    💾 Save All Vocabulary
                  </button>
                  <button
                    onClick={generateExercises}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg"
                  >
                    ✏️ View Exercises
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all font-semibold shadow-lg"
                  >
                    🎥 Upload New Video
                  </button>
                </div>

                {/* Cultural Notes */}
                {analysis.cultural_notes && (
                  <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 p-4 rounded-2xl border border-yellow-700/50">
                    <h4 className="text-yellow-300 font-semibold mb-2 flex items-center gap-2">
                      <span className="text-xl">🌍</span>
                      Cultural Notes
                    </h4>
                    <p className="text-yellow-100 text-sm leading-relaxed">
                      {analysis.cultural_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Word Analysis Popup */}
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
