import React, { useState, useEffect } from 'react';
import { grammarService } from '../services/api';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  GrammarExerciseSet,
  GrammarExercise,
  GrammarExerciseType,
  CheckAnswerResponse
} from '../types';

interface GrammarExercisesProps {
  targetLanguage: string;
}

export const GrammarExercises: React.FC<GrammarExercisesProps> = ({ targetLanguage }) => {
  const [view, setView] = useState<'list' | 'create' | 'practice'>('list');
  const [sets, setSets] = useState<GrammarExerciseSet[]>([]);
  const [currentSet, setCurrentSet] = useState<GrammarExerciseSet | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create exercise form
  const [createText, setCreateText] = useState('');
  const [numExercises, setNumExercises] = useState(10);
  const [selectedTypes, setSelectedTypes] = useState<GrammarExerciseType[]>([
    'fill_blank',
    'transformation',
    'multiple_choice',
    'correction'
  ]);

  // Exercise interaction
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<CheckAnswerResponse | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    loadExerciseSets();
  }, []);

  const loadExerciseSets = async () => {
    try {
      setLoading(true);
      const response = await grammarService.getExerciseSets();
      setSets(response as GrammarExerciseSet[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load exercise sets');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExercises = async () => {
    if (!createText.trim()) {
      setError('Please enter some text to generate exercises from');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await grammarService.generateExercises({
        text: createText,
        language: targetLanguage,
        num_exercises: numExercises,
        exercise_types: selectedTypes
      });

      const newSet = response as GrammarExerciseSet;
      setSets([newSet, ...sets]);
      setCreateText('');
      setView('list');
    } catch (err: any) {
      setError(err.message || 'Failed to generate exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSet = async (setId: number) => {
    try {
      setLoading(true);
      const response = await grammarService.getExerciseSet(setId);
      const exerciseSet = response as GrammarExerciseSet;
      setCurrentSet(exerciseSet);
      setCurrentExerciseIndex(0);
      setUserAnswer('');
      setFeedback(null);
      setShowExplanation(false);
      setView('practice');
    } catch (err: any) {
      setError(err.message || 'Failed to load exercise set');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSet = async (setId: number) => {
    if (!confirm('Are you sure you want to delete this exercise set?')) return;

    try {
      await grammarService.deleteExerciseSet(setId);
      setSets(sets.filter(s => s.id !== setId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete exercise set');
    }
  };

  const handleCheckAnswer = async () => {
    if (!currentSet || !userAnswer.trim()) return;

    const currentExercise = currentSet.exercises[currentExerciseIndex];

    try {
      setLoading(true);
      const response = await grammarService.checkAnswer({
        exercise_id: currentExercise.id,
        user_answer: userAnswer
      });

      setFeedback(response as CheckAnswerResponse);
      setShowExplanation(true);
    } catch (err: any) {
      setError(err.message || 'Failed to check answer');
    } finally {
      setLoading(false);
    }
  };

  const handleNextExercise = () => {
    if (!currentSet) return;

    if (currentExerciseIndex < currentSet.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setUserAnswer('');
      setFeedback(null);
      setShowExplanation(false);
    } else {
      // Finished all exercises
      setView('list');
      setCurrentSet(null);
      loadExerciseSets(); // Reload to get updated stats
    }
  };

  // Keyboard shortcuts for grammar exercises
  useKeyboardShortcuts(
    [
      {
        key: 'Enter',
        handler: () => {
          if (view === 'practice' && !showExplanation && userAnswer.trim()) {
            handleCheckAnswer();
          } else if (showExplanation) {
            handleNextExercise();
          }
        },
        description: 'Check answer or continue',
        disabled: view !== 'practice',
      },
      {
        key: 'ArrowLeft',
        handler: () => {
          if (view === 'practice' && currentExerciseIndex > 0 && !showExplanation) {
            setCurrentExerciseIndex(currentExerciseIndex - 1);
            setUserAnswer('');
            setFeedback(null);
          }
        },
        description: 'Previous exercise',
        disabled: view !== 'practice' || currentExerciseIndex === 0 || showExplanation,
      },
    ],
    true
  );

  const toggleExerciseType = (type: GrammarExerciseType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter(t => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const renderExerciseTypeLabel = (type: GrammarExerciseType): string => {
    const labels: Record<GrammarExerciseType, string> = {
      fill_blank: 'Fill in the Blank',
      transformation: 'Transformation',
      multiple_choice: 'Multiple Choice',
      correction: 'Correction'
    };
    return labels[type];
  };

  const renderExercise = (exercise: GrammarExercise) => {
    const parsedOptions = exercise.options ? JSON.parse(exercise.options) : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-sky-400 uppercase tracking-wide">
            {renderExerciseTypeLabel(exercise.exercise_type)}
          </span>
          {exercise.grammar_point && (
            <span className="text-xs text-slate-400">
              {exercise.grammar_point}
            </span>
          )}
        </div>

        <div className="text-lg text-slate-200 leading-relaxed">
          {exercise.question}
        </div>

        {exercise.exercise_type === 'multiple_choice' && parsedOptions && (
          <div className="space-y-2">
            {parsedOptions.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setUserAnswer(option)}
                disabled={showExplanation}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  userAnswer === option
                    ? 'border-sky-500 bg-sky-500/20 text-white'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                } ${showExplanation ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {String.fromCharCode(65 + idx)}. {option}
              </button>
            ))}
          </div>
        )}

        {exercise.exercise_type !== 'multiple_choice' && (
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={showExplanation}
            placeholder={
              exercise.exercise_type === 'fill_blank'
                ? 'Fill in the blank...'
                : exercise.exercise_type === 'transformation'
                ? 'Transform the sentence...'
                : 'Correct the sentence...'
            }
            className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            rows={3}
          />
        )}

        {!showExplanation && (
          <button
            onClick={handleCheckAnswer}
            disabled={!userAnswer.trim() || loading}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Checking...' : (
              <>
                Check Answer
                <kbd className="px-2 py-1 bg-sky-700 rounded text-xs">Enter</kbd>
              </>
            )}
          </button>
        )}

        {feedback && showExplanation && (
          <div className={`p-4 rounded-lg border ${
            feedback.is_correct
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {feedback.is_correct ? (
                <span className="text-green-400 font-bold">✓ Correct!</span>
              ) : (
                <span className="text-red-400 font-bold">✗ Incorrect</span>
              )}
            </div>

            {!feedback.is_correct && (
              <div className="mb-2">
                <div className="text-sm text-slate-400">Your answer:</div>
                <div className="text-slate-300">{feedback.user_answer}</div>
              </div>
            )}

            <div className="mb-2">
              <div className="text-sm text-slate-400">Correct answer:</div>
              <div className="text-white font-medium">{feedback.correct_answer}</div>
            </div>

            {feedback.explanation && (
              <div>
                <div className="text-sm text-slate-400">Explanation:</div>
                <div className="text-slate-300">{feedback.explanation}</div>
              </div>
            )}

            <button
              onClick={handleNextExercise}
              className="mt-4 w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {currentSet && currentExerciseIndex < currentSet.exercises.length - 1
                ? 'Next Exercise'
                : 'Finish'}
              <kbd className="px-2 py-1 bg-sky-700 rounded text-xs">Enter</kbd>
            </button>
          </div>
        )}
      </div>
    );
  };

  if (view === 'create') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button
          onClick={() => setView('list')}
          className="mb-6 text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Exercise Sets
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">
          Generate Grammar Exercises
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-6 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Source Text
            </label>
            <textarea
              value={createText}
              onChange={(e) => setCreateText(e.target.value)}
              placeholder="Paste or type the text you want to generate exercises from..."
              className="w-full h-48 p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Number of Exercises
            </label>
            <input
              type="number"
              min="5"
              max="20"
              value={numExercises}
              onChange={(e) => setNumExercises(parseInt(e.target.value) || 10)}
              className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Exercise Types
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['fill_blank', 'transformation', 'multiple_choice', 'correction'] as GrammarExerciseType[]).map(type => (
                <button
                  key={type}
                  onClick={() => toggleExerciseType(type)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    selectedTypes.includes(type)
                      ? 'border-sky-500 bg-sky-500/20 text-sky-400'
                      : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {renderExerciseTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerateExercises}
            disabled={loading || !createText.trim()}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Generating Exercises...' : 'Generate Exercises'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'practice' && currentSet) {
    const currentExercise = currentSet.exercises[currentExerciseIndex];
    const progress = ((currentExerciseIndex + 1) / currentSet.exercises.length) * 100;

    return (
      <div className="max-w-3xl mx-auto p-6">
        <button
          onClick={() => {
            setView('list');
            setCurrentSet(null);
          }}
          className="mb-6 text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Exercise Sets
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {currentSet.title}
          </h2>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Exercise {currentExerciseIndex + 1} of {currentSet.exercises.length}</span>
            {currentSet.difficulty_level && (
              <span className="px-2 py-1 bg-slate-700 rounded text-xs">
                {currentSet.difficulty_level}
              </span>
            )}
          </div>
          <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-sky-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          {renderExercise(currentExercise)}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Grammar Exercises</h2>
        <button
          onClick={() => setView('create')}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors"
        >
          + Generate Exercises
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading && sets.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          Loading exercise sets...
        </div>
      ) : sets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            No exercise sets yet. Generate some exercises from text!
          </div>
          <button
            onClick={() => setView('create')}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors"
          >
            Generate Your First Exercises
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sets.map(set => {
            const completionPercentage = set.total_exercises > 0
              ? Math.round((set.completed_exercises / set.total_exercises) * 100)
              : 0;

            return (
              <div
                key={set.id}
                className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {set.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span>{set.total_exercises} exercises</span>
                      {set.difficulty_level && (
                        <span className="px-2 py-1 bg-slate-700 rounded text-xs">
                          {set.difficulty_level}
                        </span>
                      )}
                      <span>{new Date(set.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSet(set.id)}
                    className="text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {set.source_text && (
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                    {set.source_text}
                  </p>
                )}

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-slate-300 font-medium">
                      {set.completed_exercises} / {set.total_exercises} ({completionPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleStartSet(set.id)}
                  className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  {set.completed_exercises === 0 ? 'Start Practice' : 'Continue Practice'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
