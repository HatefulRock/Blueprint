import React, { useEffect, useState } from 'react';
import { analyticsService } from '../services/api';
import { ProgressChart } from './ProgressChart';
import { WeakAreasPanel } from './WeakAreasPanel';
import { ActivityHeatmap } from './ActivityHeatmap';

interface ProgressData {
  date_range: {
    from: string;
    to: string;
    days: number;
  };
  vocabulary_progress: Array<{
    date: string;
    words_reviewed: number;
  }>;
  practice_progress: Array<{
    date: string;
    sessions: number;
    avg_score: number;
  }>;
  grammar_progress: Array<{
    date: string;
    attempts: number;
    correct: number;
    accuracy: number;
  }>;
  totals: {
    total_words: number;
    total_practice_sessions: number;
    total_grammar_attempts: number;
  };
}

interface WeakAreasData {
  weak_vocabulary: Array<{
    id: number;
    term: string;
    translation: string | null;
    familiarity_score: number;
    context: string | null;
  }>;
  weak_grammar_points: Array<{
    grammar_point: string;
    exercise_type: string;
    total_exercises: number;
    total_correct: number;
    total_attempts: number;
    accuracy: number;
  }>;
  struggling_cards: Array<{
    card_id: number;
    front: string;
    back: string;
    review_count: number;
    avg_quality: number;
  }>;
}

interface HeatmapData {
  date_range: {
    from: string;
    to: string;
    days: number;
  };
  heatmap: Array<{
    date: string;
    vocabulary: number;
    grammar: number;
    writing: number;
  }>;
}

export const AnalyticsView = () => {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [weakAreasData, setWeakAreasData] = useState<WeakAreasData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [progress, weakAreas, heatmap] = await Promise.all([
        analyticsService.getProgressInsights(timeRange),
        analyticsService.getWeakAreas(),
        analyticsService.getActivityHeatmap(timeRange),
      ]);

      setProgressData(progress as ProgressData);
      setWeakAreasData(weakAreas as WeakAreasData);
      setHeatmapData(heatmap as HeatmapData);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500 mx-auto mb-4"></div>
          <div className="text-slate-400">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <div className="text-red-400 text-lg mb-2">Error Loading Analytics</div>
          <div className="text-slate-300">{error}</div>
          <button
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Progress Insights</h1>
          <p className="text-slate-400">
            Track your learning journey and identify areas for improvement
          </p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days as 30 | 60 | 90)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === days
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {progressData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-sky-500/20 to-sky-500/5 p-6 rounded-lg border border-sky-500/30">
            <div className="text-sm text-sky-300 mb-2">Total Vocabulary</div>
            <div className="text-4xl font-bold text-white mb-1">
              {progressData.totals.total_words}
            </div>
            <div className="text-xs text-slate-400">words learned</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-6 rounded-lg border border-purple-500/30">
            <div className="text-sm text-purple-300 mb-2">Practice Sessions</div>
            <div className="text-4xl font-bold text-white mb-1">
              {progressData.totals.total_practice_sessions}
            </div>
            <div className="text-xs text-slate-400">sessions completed</div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 p-6 rounded-lg border border-green-500/30">
            <div className="text-sm text-green-300 mb-2">Grammar Exercises</div>
            <div className="text-4xl font-bold text-white mb-1">
              {progressData.totals.total_grammar_attempts}
            </div>
            <div className="text-xs text-slate-400">exercises attempted</div>
          </div>
        </div>
      )}

      {/* Activity Heatmap */}
      {heatmapData && (
        <div className="mb-8">
          <ActivityHeatmap
            data={heatmapData.heatmap}
            title={`Activity Overview (Last ${timeRange} Days)`}
          />
        </div>
      )}

      {/* Progress Charts */}
      {progressData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Vocabulary Progress */}
          <ProgressChart
            data={progressData.vocabulary_progress.map((d) => ({
              date: d.date,
              value: d.words_reviewed,
            }))}
            title="Vocabulary Progress"
            color="#0ea5e9"
            valueFormatter={(v) => Math.round(v).toString()}
          />

          {/* Practice Sessions */}
          <ProgressChart
            data={progressData.practice_progress.map((d) => ({
              date: d.date,
              value: d.sessions,
            }))}
            title="Practice Sessions"
            color="#a855f7"
            valueFormatter={(v) => Math.round(v).toString()}
          />

          {/* Grammar Accuracy */}
          {progressData.grammar_progress.length > 0 && (
            <ProgressChart
              data={progressData.grammar_progress.map((d) => ({
                date: d.date,
                value: d.accuracy,
              }))}
              title="Grammar Exercise Accuracy"
              color="#10b981"
              valueFormatter={(v) => `${Math.round(v)}%`}
            />
          )}

          {/* Average Practice Score */}
          {progressData.practice_progress.some((d) => d.avg_score > 0) && (
            <ProgressChart
              data={progressData.practice_progress
                .filter((d) => d.avg_score > 0)
                .map((d) => ({
                  date: d.date,
                  value: d.avg_score,
                }))}
              title="Average Practice Score"
              color="#f59e0b"
              valueFormatter={(v) => v.toFixed(1)}
            />
          )}
        </div>
      )}

      {/* Weak Areas Analysis */}
      {weakAreasData && (
        <div className="mb-8">
          <WeakAreasPanel data={weakAreasData} loading={false} />
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={loadAnalytics}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Data
        </button>
      </div>
    </div>
  );
};
