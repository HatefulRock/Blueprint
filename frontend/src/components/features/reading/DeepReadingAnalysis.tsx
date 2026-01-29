/**
 * Deep Reading Analysis Component
 *
 * Showcases Gemini 3's long-context capabilities (2M token window) for
 * comprehensive article analysis. Processes entire documents without chunking
 * and provides deep insights including vocabulary ranking, grammar patterns,
 * cultural context, and difficulty progression.
 *
 * Powered by Gemini 3 Pro with extended context.
 */

import React, { useState } from 'react';

interface VocabularyWord {
  word: string;
  translation: string;
  part_of_speech: string;
  level: string;
  frequency: number;
  example: string;
  usefulness_reason: string;
  rank: number;
}

interface GrammarPattern {
  pattern_name: string;
  description: string;
  difficulty: string;
  examples: string[];
  importance: string;
}

interface DiscussionQuestion {
  question: string;
  type: string;
  suggested_vocabulary: string[];
}

interface AnalysisResult {
  text_stats: {
    total_characters: number;
    total_words: number;
    estimated_reading_time_minutes: string;
  };
  summary: {
    main_theme: string;
    key_points: string[];
    author_purpose: string;
    tone: string;
    target_audience: string;
    overview: string;
  };
  vocabulary: VocabularyWord[];
  grammar_patterns: GrammarPattern[];
  cultural_context: {
    references: string[];
    idioms: Array<{ expression: string; meaning: string }>;
    regional_features: string;
    background_knowledge: string;
  };
  difficulty_progression: {
    beginning: string;
    middle: string;
    end: string;
    challenging_sections: string[];
    reading_strategy: string;
  };
  discussion_questions: DiscussionQuestion[];
  related_content: {
    similar_texts: string[];
    topics: string[];
    authors: string[];
    easier_alternatives: string[];
    harder_alternatives: string[];
  };
}

const DifficultyChart: React.FC<{
  data: { beginning: string; middle: string; end: string };
}> = ({ data }) => {
  const levelToHeight = (level: string): number => {
    const match = level.match(/([ABC])([12])/);
    if (!match) return 50;
    const letter = match[1];
    const number = parseInt(match[2]);
    const base = { A: 0, B: 2, C: 4 }[letter] || 0;
    return ((base + number) / 6) * 100;
  };

  return (
    <div className="flex items-end justify-around h-48 bg-slate-800/50 rounded-lg p-6">
      <div className="flex flex-col items-center gap-2 flex-1">
        <div
          className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t-lg transition-all"
          style={{ height: `${levelToHeight(data.beginning)}%` }}
        />
        <div className="text-center">
          <div className="font-bold text-green-400">{data.beginning}</div>
          <div className="text-xs text-slate-400">Beginning</div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 flex-1">
        <div
          className="w-full bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg transition-all"
          style={{ height: `${levelToHeight(data.middle)}%` }}
        />
        <div className="text-center">
          <div className="font-bold text-yellow-400">{data.middle}</div>
          <div className="text-xs text-slate-400">Middle</div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 flex-1">
        <div
          className="w-full bg-gradient-to-t from-orange-500 to-orange-300 rounded-t-lg transition-all"
          style={{ height: `${levelToHeight(data.end)}%` }}
        />
        <div className="text-center">
          <div className="font-bold text-orange-400">{data.end}</div>
          <div className="text-xs text-slate-400">End</div>
        </div>
      </div>
    </div>
  );
};

const VocabularyByLevel: React.FC<{ vocabulary: VocabularyWord[] }> = ({
  vocabulary,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const filteredVocab =
    selectedLevel === 'all'
      ? vocabulary
      : vocabulary.filter((w) => w.level === selectedLevel);

  const levelColors: Record<string, string> = {
    A1: 'bg-green-600',
    A2: 'bg-lime-600',
    B1: 'bg-yellow-600',
    B2: 'bg-orange-600',
    C1: 'bg-red-600',
    C2: 'bg-purple-600',
  };

  return (
    <div className="space-y-4">
      {/* Level Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLevel('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            selectedLevel === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          All ({vocabulary.length})
        </button>
        {levels.map((level) => {
          const count = vocabulary.filter((w) => w.level === level).length;
          return (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedLevel === level
                  ? `${levelColors[level]} text-white`
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {level} ({count})
            </button>
          );
        })}
      </div>

      {/* Vocabulary List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {filteredVocab.slice(0, 50).map((word, idx) => (
          <div
            key={idx}
            className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-purple-500 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="font-bold text-white text-lg">{word.word}</div>
                <div className="text-purple-400 text-sm">{word.translation}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    levelColors[word.level]
                  } text-white font-bold`}
                >
                  {word.level}
                </span>
                <span className="text-xs text-slate-500">#{word.rank}</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 mb-2">
              {word.part_of_speech} • Used {word.frequency}×
            </div>
            <div className="text-sm text-slate-300 italic mb-2">
              "{word.example}"
            </div>
            <div className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded">
              💡 {word.usefulness_reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface DeepReadingAnalysisProps {
  contentId?: number;
  initialText?: string;
  targetLanguage?: string;
  nativeLanguage?: string;
  onNavigateBack?: () => void;
}

export const DeepReadingAnalysis: React.FC<DeepReadingAnalysisProps> = ({
  contentId,
  initialText = '',
  targetLanguage = 'Spanish',
  nativeLanguage = 'English',
  onNavigateBack,
}) => {
  const [text, setText] = useState(initialText);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'summary' | 'vocabulary' | 'grammar' | 'discussion' | 'progression'
  >('summary');

  const analyzeFullArticle = async () => {
    if (!text || text.length < 100) {
      setError('Please provide at least 100 characters of text to analyze.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call backend long-context analysis endpoint
      const response = await fetch('/api/content/analyze-long', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if needed
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text,
          target_language: targetLanguage,
          native_language: nativeLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError('Failed to analyze text. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
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
          <h1 className="text-4xl font-bold text-white mb-2">
            Deep Reading Analysis
          </h1>
          <p className="text-purple-200">
            Powered by Gemini 3 Pro with 2M Token Context Window
          </p>
        </div>

        {!analysis ? (
          /* Input Section */
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                Upload or Paste Your Text
              </h2>
              <p className="text-slate-400 mb-4">
                Analyze articles, stories, or any long-form content. Gemini 3's extended
                context processes the entire text without chunking.
              </p>

              {/* File Upload */}
              <div className="mb-4">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  📄 Upload Text File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Text Area */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Or paste your text here... (minimum 100 characters)"
                className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />

              {/* Stats */}
              <div className="flex gap-6 mt-4 text-sm text-slate-400">
                <span>Characters: {text.length.toLocaleString()}</span>
                <span>Words: {text.split(/\s+/).filter(Boolean).length.toLocaleString()}</span>
                <span>
                  Est. Reading Time: {Math.ceil(text.split(/\s+/).filter(Boolean).length / 200)} min
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg">
                {error}
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={analyzeFullArticle}
              disabled={loading || text.length < 100}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 text-white py-4 rounded-xl font-bold text-lg transition-all disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin text-2xl">⚙️</span>
                  Analyzing with Gemini 3 Pro...
                </span>
              ) : (
                '🧠 Analyze Full Article with Gemini 3 Pro'
              )}
            </button>

            {/* Info Box */}
            <div className="mt-6 bg-purple-900/30 border border-purple-700/50 rounded-lg p-4">
              <h3 className="font-semibold text-purple-200 mb-2">
                What You'll Get:
              </h3>
              <ul className="space-y-1 text-sm text-purple-300">
                <li>✓ 50+ vocabulary words ranked by usefulness</li>
                <li>✓ 15+ grammar patterns with examples</li>
                <li>✓ Cultural context and idioms explained</li>
                <li>✓ Difficulty progression throughout text</li>
                <li>✓ 10 discussion questions</li>
                <li>✓ Related content suggestions</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Analysis Results */
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur border border-purple-700/50 rounded-2xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Analysis Complete
                  </h2>
                  <div className="flex gap-4 text-sm text-purple-200">
                    <span>
                      {analysis.text_stats.total_words.toLocaleString()} words
                    </span>
                    <span>•</span>
                    <span>{analysis.text_stats.estimated_reading_time_minutes}</span>
                    <span>•</span>
                    <span>{analysis.vocabulary.length} vocabulary words</span>
                  </div>
                </div>
                <button
                  onClick={() => setAnalysis(null)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
                >
                  New Analysis
                </button>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-purple-200 mb-3">
                  {analysis.summary.main_theme}
                </h3>
                <p className="text-slate-300 leading-relaxed mb-4">
                  {analysis.summary.overview}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Tone:</span>{' '}
                    <span className="text-white">{analysis.summary.tone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Audience:</span>{' '}
                    <span className="text-white">
                      {analysis.summary.target_audience}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl overflow-hidden border border-slate-700">
              <div className="flex border-b border-slate-700 overflow-x-auto">
                {[
                  { id: 'summary', label: '📋 Summary', icon: '📋' },
                  { id: 'vocabulary', label: '📚 Vocabulary', icon: '📚' },
                  { id: 'grammar', label: '📝 Grammar', icon: '📝' },
                  { id: 'progression', label: '📈 Difficulty', icon: '📈' },
                  { id: 'discussion', label: '💭 Discussion', icon: '💭' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 min-w-fit px-6 py-4 font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-8">
                {/* Summary Tab */}
                {activeTab === 'summary' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-3">
                        Key Points
                      </h3>
                      <ul className="space-y-2">
                        {analysis.summary.key_points.map((point, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 text-slate-300"
                          >
                            <span className="text-purple-400 mt-1">→</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-900/50 p-6 rounded-xl">
                      <h4 className="font-semibold text-purple-200 mb-2">
                        Author's Purpose
                      </h4>
                      <p className="text-slate-300">
                        {analysis.summary.author_purpose}
                      </p>
                    </div>

                    {analysis.cultural_context && (
                      <div className="bg-slate-900/50 p-6 rounded-xl">
                        <h4 className="font-semibold text-purple-200 mb-3">
                          Cultural Context
                        </h4>
                        {analysis.cultural_context.idioms.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-slate-400 mb-2">
                              Idioms & Expressions
                            </h5>
                            <div className="space-y-2">
                              {analysis.cultural_context.idioms.map((idiom, idx) => (
                                <div
                                  key={idx}
                                  className="bg-slate-800/50 p-3 rounded"
                                >
                                  <div className="font-semibold text-yellow-400">
                                    {idiom.expression}
                                  </div>
                                  <div className="text-sm text-slate-400">
                                    {idiom.meaning}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {analysis.cultural_context.regional_features && (
                          <p className="text-slate-300 text-sm">
                            {analysis.cultural_context.regional_features}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Vocabulary Tab */}
                {activeTab === 'vocabulary' && (
                  <VocabularyByLevel vocabulary={analysis.vocabulary} />
                )}

                {/* Grammar Tab */}
                {activeTab === 'grammar' && (
                  <div className="space-y-4">
                    {analysis.grammar_patterns.map((pattern, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/50 p-6 rounded-xl border border-slate-700"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-xl font-bold text-white">
                            {pattern.pattern_name}
                          </h3>
                          <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                            {pattern.difficulty}
                          </span>
                        </div>
                        <p className="text-slate-300 mb-4">
                          {pattern.description}
                        </p>
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-400">
                            Examples:
                          </h4>
                          {pattern.examples.map((example, exIdx) => (
                            <div
                              key={exIdx}
                              className="bg-slate-800/50 p-3 rounded text-sm text-purple-300"
                            >
                              • {example}
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 text-sm text-slate-500 bg-slate-800/30 p-3 rounded">
                          💡 {pattern.importance}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Difficulty Progression Tab */}
                {activeTab === 'progression' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">
                        Difficulty Throughout Text
                      </h3>
                      <DifficultyChart
                        data={analysis.difficulty_progression}
                      />
                    </div>

                    <div className="bg-slate-900/50 p-6 rounded-xl">
                      <h4 className="font-semibold text-purple-200 mb-3">
                        Recommended Reading Strategy
                      </h4>
                      <p className="text-slate-300">
                        {analysis.difficulty_progression.reading_strategy}
                      </p>
                    </div>

                    {analysis.difficulty_progression.challenging_sections.length >
                      0 && (
                      <div className="bg-slate-900/50 p-6 rounded-xl">
                        <h4 className="font-semibold text-orange-400 mb-3">
                          Challenging Sections
                        </h4>
                        <ul className="space-y-2">
                          {analysis.difficulty_progression.challenging_sections.map(
                            (section, idx) => (
                              <li
                                key={idx}
                                className="text-slate-300 flex items-start gap-2"
                              >
                                <span className="text-orange-400">⚠️</span>
                                <span>{section}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                    {analysis.related_content && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-900/30 p-6 rounded-xl border border-green-700/50">
                          <h4 className="font-semibold text-green-400 mb-3">
                            Easier Alternatives
                          </h4>
                          <ul className="space-y-1 text-sm text-slate-300">
                            {analysis.related_content.easier_alternatives.map(
                              (alt, idx) => (
                                <li key={idx}>• {alt}</li>
                              )
                            )}
                          </ul>
                        </div>
                        <div className="bg-orange-900/30 p-6 rounded-xl border border-orange-700/50">
                          <h4 className="font-semibold text-orange-400 mb-3">
                            Harder Alternatives
                          </h4>
                          <ul className="space-y-1 text-sm text-slate-300">
                            {analysis.related_content.harder_alternatives.map(
                              (alt, idx) => (
                                <li key={idx}>• {alt}</li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Discussion Tab */}
                {activeTab === 'discussion' && (
                  <div className="space-y-4">
                    {analysis.discussion_questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/50 p-6 rounded-xl border border-slate-700"
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs bg-purple-600/50 text-purple-200 px-2 py-1 rounded">
                                {q.type}
                              </span>
                            </div>
                            <p className="text-white text-lg mb-3">
                              {q.question}
                            </p>
                            {q.suggested_vocabulary.length > 0 && (
                              <div className="text-sm text-slate-400">
                                <span className="font-semibold">
                                  Suggested vocabulary:{' '}
                                </span>
                                {q.suggested_vocabulary.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
