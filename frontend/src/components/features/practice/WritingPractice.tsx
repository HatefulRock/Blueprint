import React, { useState, useEffect } from 'react';

interface WritingPracticeProps {
  targetLanguage: string;
}

interface GrammarCorrection {
  position: string;
  original: string;
  correction: string;
  explanation: string;
}

interface GrammarCheckResult {
  original_text: string;
  corrected_text: string;
  corrections: GrammarCorrection[];
  feedback: string;
}

interface EssayFeedback {
  score: number;
  strengths: string[];
  areas_for_improvement: string[];
  vocabulary_suggestions: Array<{
    word: string;
    suggestion: string;
    context: string;
  }>;
  grammar_notes: string;
  overall_feedback: string;
}

interface WritingSubmission {
  id: number;
  title: string | null;
  content: string;
  prompt: string | null;
  word_count: number;
  language: string;
  submission_type: string;
  grammar_feedback: string | null;
  corrected_text: string | null;
  overall_feedback: string | null;
  score: number | null;
  created_at: string;
  updated_at: string;
}

const WRITING_PROMPTS = {
  journal: [
    "Describe your day today in detail.",
    "Write about a memorable experience from your childhood.",
    "What are three things you're grateful for today?",
    "Describe your ideal weekend.",
    "Write about a person who has influenced your life."
  ],
  essay: [
    "Discuss the importance of learning a second language.",
    "Describe the benefits and challenges of technology in modern life.",
    "Explain how travel can broaden one's perspective.",
    "Discuss a current event and your opinion about it.",
    "Describe your hometown and what makes it special."
  ],
  letter: [
    "Write a letter to a friend inviting them to visit your city.",
    "Write a thank you letter to someone who helped you.",
    "Write a letter describing your vacation plans.",
    "Write a letter to introduce yourself to a potential language partner.",
    "Write a letter recommending a book or movie."
  ],
  story: [
    "Write a short story that begins with: 'The door slowly opened...'",
    "Tell a story about an unexpected adventure.",
    "Write about a day in the life of your pet (or imaginary pet).",
    "Create a story involving a mysterious object.",
    "Write a story with the moral: 'Honesty is the best policy.'"
  ]
};

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

export const WritingPractice: React.FC<WritingPracticeProps> = ({ targetLanguage }) => {
  const [writingType, setWritingType] = useState<'journal' | 'essay' | 'letter' | 'story'>('journal');
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [grammarResult, setGrammarResult] = useState<GrammarCheckResult | null>(null);
  const [essayFeedback, setEssayFeedback] = useState<EssayFeedback | null>(null);
  const [submissions, setSubmissions] = useState<WritingSubmission[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Update word count as user types
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [content]);

  // Load previous submissions
  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8000/writing/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    }
  };

  const handleCheckGrammar = async () => {
    if (!content.trim()) {
      setError('Please write some text first');
      return;
    }

    setIsCheckingGrammar(true);
    setError(null);
    setGrammarResult(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8000/writing/check-grammar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: content,
          language: targetLanguage
        })
      });

      if (!response.ok) {
        throw new Error('Grammar check failed');
      }

      const data = await response.json();
      setGrammarResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grammar check failed');
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  const handleGetFeedback = async () => {
    if (!content.trim()) {
      setError('Please write some text first');
      return;
    }

    setIsGettingFeedback(true);
    setError(null);
    setEssayFeedback(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8000/writing/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: content,
          language: targetLanguage,
          submission_type: writingType
        })
      });

      if (!response.ok) {
        throw new Error('Feedback generation failed');
      }

      const data = await response.json();
      setEssayFeedback(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback generation failed');
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Please write some text first');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:8000/writing/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title || null,
          content,
          prompt: selectedPrompt || null,
          language: targetLanguage,
          submission_type: writingType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save submission');
      }

      // Reload submissions
      await loadSubmissions();

      // Show success message
      alert('Submission saved successfully!');

      // Clear form
      setContent('');
      setTitle('');
      setSelectedPrompt('');
      setGrammarResult(null);
      setEssayFeedback(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save submission');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSubmission = (submission: WritingSubmission) => {
    setContent(submission.content);
    setTitle(submission.title || '');
    setSelectedPrompt(submission.prompt || '');
    setWritingType(submission.submission_type as any);
    setShowHistory(false);

    // Restore feedback if available
    if (submission.grammar_feedback && submission.corrected_text) {
      try {
        const corrections = JSON.parse(submission.grammar_feedback);
        setGrammarResult({
          original_text: submission.content,
          corrected_text: submission.corrected_text,
          corrections,
          feedback: ''
        });
      } catch (e) {
        console.error('Failed to parse grammar feedback');
      }
    }
  };

  const prompts = WRITING_PROMPTS[writingType];

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Writing Practice</h2>
            <p className="text-slate-400">Improve your writing skills with AI-powered feedback</p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {showHistory ? 'Hide' : 'Show'} History
          </button>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Submissions</h3>
            {submissions.length === 0 ? (
              <p className="text-slate-400">No submissions yet. Start writing!</p>
            ) : (
              <div className="space-y-3">
                {submissions.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => handleLoadSubmission(sub)}
                    className="w-full text-left p-4 bg-slate-700/30 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white">
                        {sub.title || `${sub.submission_type} - ${new Date(sub.created_at).toLocaleDateString()}`}
                      </h4>
                      {sub.score && (
                        <span className={`text-sm font-bold ${
                          sub.score >= 80 ? 'text-emerald-400' :
                          sub.score >= 60 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {sub.score}/100
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-2">{sub.content.substring(0, 150)}...</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs text-slate-500">{sub.word_count} words</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-500">{sub.submission_type}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Writing Type & Prompts */}
          <div className="space-y-6">
            {/* Writing Type Selection */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Writing Type</h3>
              <div className="space-y-2">
                {(['journal', 'essay', 'letter', 'story'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setWritingType(type);
                      setSelectedPrompt('');
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      writingType === type
                        ? 'bg-sky-600/20 border-sky-500/50 text-white ring-1 ring-sky-500/50'
                        : 'bg-slate-700/30 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="font-medium capitalize">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompts */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Writing Prompts</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {prompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPrompt(prompt)}
                    className={`w-full text-left p-3 text-sm rounded-lg border transition-all ${
                      selectedPrompt === prompt
                        ? 'bg-emerald-600/20 border-emerald-500/50 text-white'
                        : 'bg-slate-700/30 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Panel - Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Text Editor */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {selectedPrompt && (
                <div className="mb-4 p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg">
                  <p className="text-sm text-sky-300">
                    <span className="font-semibold">Prompt:</span> {selectedPrompt}
                  </p>
                </div>
              )}

              <textarea
                placeholder={`Start writing in ${targetLanguage}...`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-96 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />

              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-slate-400">
                  {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </span>

                <div className="flex gap-3">
                  <button
                    onClick={handleCheckGrammar}
                    disabled={isCheckingGrammar || !content.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    <CheckCircleIcon />
                    {isCheckingGrammar ? 'Checking...' : 'Check Grammar'}
                  </button>

                  <button
                    onClick={handleGetFeedback}
                    disabled={isGettingFeedback || !content.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    <SparklesIcon />
                    {isGettingFeedback ? 'Analyzing...' : 'Get Feedback'}
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={isSaving || !content.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    <PencilIcon />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Grammar Check Results */}
            {grammarResult && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white">Grammar Check Results</h3>

                {grammarResult.corrections.length === 0 ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p className="text-emerald-400 font-semibold">Perfect! No grammar errors found.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Corrected Text:</p>
                      <p className="text-slate-300 leading-relaxed">{grammarResult.corrected_text}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-300">Corrections ({grammarResult.corrections.length}):</p>
                      {grammarResult.corrections.map((correction, idx) => (
                        <div key={idx} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                          <div className="flex items-start gap-3 mb-2">
                            <span className="text-red-400 font-mono text-sm">✗ {correction.original}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-emerald-400 font-mono text-sm">✓ {correction.correction}</span>
                          </div>
                          <p className="text-slate-400 text-sm">{correction.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {grammarResult.feedback && (
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-sm text-slate-300">{grammarResult.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {/* Essay Feedback */}
            {essayFeedback && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">Comprehensive Feedback</h3>
                  <span className={`text-3xl font-bold ${
                    essayFeedback.score >= 80 ? 'text-emerald-400' :
                    essayFeedback.score >= 60 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {essayFeedback.score}/100
                  </span>
                </div>

                {/* Strengths */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-emerald-400 mb-2">Strengths:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {essayFeedback.strengths.map((strength, idx) => (
                      <li key={idx} className="text-slate-300 text-sm">{strength}</li>
                    ))}
                  </ul>
                </div>

                {/* Areas for Improvement */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-sm font-semibold text-amber-400 mb-2">Areas for Improvement:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {essayFeedback.areas_for_improvement.map((area, idx) => (
                      <li key={idx} className="text-slate-300 text-sm">{area}</li>
                    ))}
                  </ul>
                </div>

                {/* Vocabulary Suggestions */}
                {essayFeedback.vocabulary_suggestions.length > 0 && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <p className="text-sm font-semibold text-purple-400 mb-3">Vocabulary Suggestions:</p>
                    <div className="space-y-2">
                      {essayFeedback.vocabulary_suggestions.map((sug, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="text-slate-400">{sug.word}</span>
                          <span className="text-slate-500 mx-2">→</span>
                          <span className="text-purple-300 font-semibold">{sug.suggestion}</span>
                          <p className="text-slate-500 text-xs mt-1 ml-4">{sug.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grammar Notes */}
                {essayFeedback.grammar_notes && (
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-sm font-semibold text-sky-400 mb-2">Grammar Notes:</p>
                    <p className="text-slate-300 text-sm">{essayFeedback.grammar_notes}</p>
                  </div>
                )}

                {/* Overall Feedback */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <p className="text-sm font-semibold text-white mb-2">Overall Feedback:</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{essayFeedback.overall_feedback}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
