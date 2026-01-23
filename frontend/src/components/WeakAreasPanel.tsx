import React from 'react';

interface WeakWord {
  id: number;
  term: string;
  translation: string | null;
  familiarity_score: number;
  context: string | null;
}

interface WeakGrammarPoint {
  grammar_point: string;
  exercise_type: string;
  total_exercises: number;
  total_correct: number;
  total_attempts: number;
  accuracy: number;
}

interface StrugglingCard {
  card_id: number;
  front: string;
  back: string;
  review_count: number;
  avg_quality: number;
}

interface WeakAreasData {
  weak_vocabulary: WeakWord[];
  weak_grammar_points: WeakGrammarPoint[];
  struggling_cards: StrugglingCard[];
}

interface WeakAreasPanelProps {
  data: WeakAreasData | null;
  loading: boolean;
}

export const WeakAreasPanel: React.FC<WeakAreasPanelProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Weak Areas Analysis</h2>
        <div className="text-center py-8 text-slate-400">Loading weak areas...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Weak Areas Analysis</h2>
        <div className="text-center py-8 text-slate-400">No data available</div>
      </div>
    );
  }

  const hasWeakAreas =
    data.weak_vocabulary.length > 0 ||
    data.weak_grammar_points.length > 0 ||
    data.struggling_cards.length > 0;

  if (!hasWeakAreas) {
    return (
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Weak Areas Analysis</h2>
        <div className="text-center py-8">
          <div className="text-green-400 text-lg mb-2">✓ Great job!</div>
          <div className="text-slate-400">
            No weak areas detected. Keep up the excellent work!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Weak Areas Analysis</h2>
      <p className="text-slate-400">
        Focus on these areas to improve your language skills faster.
      </p>

      {/* Weak Vocabulary */}
      {data.weak_vocabulary.length > 0 && (
        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-red-400">📚</span>
            Vocabulary Needing Review ({data.weak_vocabulary.length})
          </h3>
          <div className="space-y-3">
            {data.weak_vocabulary.slice(0, 10).map((word) => (
              <div
                key={word.id}
                className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white font-medium text-lg">{word.term}</div>
                    {word.translation && (
                      <div className="text-slate-400 text-sm">{word.translation}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Familiarity</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-2 h-6 rounded ${
                            level <= word.familiarity_score
                              ? 'bg-sky-500'
                              : 'bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {word.context && (
                  <div className="text-sm text-slate-400 italic">"{word.context}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak Grammar Points */}
      {data.weak_grammar_points.length > 0 && (
        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-orange-400">📝</span>
            Grammar Points to Practice ({data.weak_grammar_points.length})
          </h3>
          <div className="space-y-3">
            {data.weak_grammar_points.map((point, idx) => (
              <div
                key={idx}
                className="bg-slate-700/50 p-4 rounded-lg border border-slate-600"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-medium">{point.grammar_point}</div>
                    <div className="text-slate-400 text-sm capitalize">
                      {point.exercise_type.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-2xl font-bold ${
                        point.accuracy >= 50 ? 'text-orange-400' : 'text-red-400'
                      }`}
                    >
                      {point.accuracy}%
                    </div>
                    <div className="text-xs text-slate-500">accuracy</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative w-full bg-slate-600 rounded-full h-2">
                  <div
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${
                      point.accuracy >= 50 ? 'bg-orange-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${point.accuracy}%` }}
                  />
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  {point.total_correct} / {point.total_attempts} attempts correct
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Struggling Cards */}
      {data.struggling_cards.length > 0 && (
        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-yellow-400">🎴</span>
            Flashcards to Review ({data.struggling_cards.length})
          </h3>
          <div className="space-y-3">
            {data.struggling_cards.slice(0, 10).map((card) => (
              <div
                key={card.card_id}
                className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-white font-medium mb-1">{card.front}</div>
                    <div className="text-slate-400 text-sm">{card.back}</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-yellow-400 font-bold text-lg">
                      {card.avg_quality.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-500">avg quality</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Reviewed {card.review_count} times
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation Section */}
      <div className="bg-gradient-to-r from-sky-500/10 to-purple-500/10 p-6 rounded-lg border border-sky-500/30">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <span>💡</span>
          Recommendations
        </h3>
        <ul className="space-y-2 text-slate-300">
          {data.weak_vocabulary.length > 0 && (
            <li className="flex items-start gap-2">
              <span className="text-sky-400 mt-1">•</span>
              <span>
                Review your weak vocabulary in the <strong>Flashcards</strong> section
                to improve retention.
              </span>
            </li>
          )}
          {data.weak_grammar_points.length > 0 && (
            <li className="flex items-start gap-2">
              <span className="text-sky-400 mt-1">•</span>
              <span>
                Practice your weak grammar points with targeted exercises in the{' '}
                <strong>Grammar</strong> section.
              </span>
            </li>
          )}
          {data.struggling_cards.length > 0 && (
            <li className="flex items-start gap-2">
              <span className="text-sky-400 mt-1">•</span>
              <span>
                Create new example sentences for difficult cards to strengthen your
                understanding.
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};
