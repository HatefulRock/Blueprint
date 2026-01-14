
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Word, Exercise, ExerciseType, GrammarCheckResult } from '../types';
import { evaluateTranslation, checkGrammar } from '../services/geminiService';
import { generatePracticeSession } from '../services/practiceService';
import { shuffleArray, normalizeString } from '../utils';
import { SparklesIcon } from './icons/SparklesIcon';
import { PencilSquareIcon } from './icons/PencilSquareIcon';

interface PracticeViewProps {
  wordBank: Word[];
  onFamiliarityChange: (term: string, change: 1 | -1) => void;
  onSessionComplete: () => void;
  onError: (message: string) => void;
  targetLanguage: string;
  nativeLanguage: string;
}

interface PracticeExercise extends Exercise {
    scrambledSentence?: string;
}

type FeedbackState = {
  status: 'idle' | 'correct' | 'incorrect';
  message?: string;
}

type PracticeMode = 'standard' | 'grammar-clinic';

export const PracticeView = ({ wordBank, onFamiliarityChange, onSessionComplete, onError, targetLanguage, nativeLanguage }: PracticeViewProps) => {
  const [mode, setMode] = useState<PracticeMode>('standard');
  
  const [practiceQueue, setPracticeQueue] = useState<PracticeExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle' });
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [grammarInput, setGrammarInput] = useState('');
  const [grammarResult, setGrammarResult] = useState<GrammarCheckResult | null>(null);
  const [isGrammarChecking, setIsGrammarChecking] = useState(false);

  const startNewSession = useCallback(async () => {
    if (mode === 'grammar-clinic') {
        setIsLoading(false);
        return;
    }

    if (wordBank.length === 0) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
        // Pass the current wordBank to the service
        const queue = await generatePracticeSession(wordBank);
        
        const augmentedQueue = queue.map(exercise => {
            if (exercise.type === 'scramble') {
                return {
                    ...exercise,
                    scrambledSentence: shuffleArray(exercise.word.context.split(' ')).join(' ')
                };
            }
            return exercise;
        });
        setPracticeQueue(augmentedQueue);
        setCurrentIndex(0);
        setUserAnswer('');
        setFeedback({ status: 'idle' });
    } catch(e) {
        onError("Failed to load a new practice session.");
    } finally {
        setIsLoading(false);
    }
  }, [wordBank, onError, mode]);

  useEffect(() => {
    startNewSession();
  }, [startNewSession]);

  useEffect(() => {
    if (mode === 'standard' && practiceQueue.length > 0 && currentIndex >= practiceQueue.length) {
      onSessionComplete();
    }
  }, [currentIndex, practiceQueue.length, onSessionComplete, mode]);

  const currentExercise = useMemo(() => {
    if (!practiceQueue || currentIndex >= practiceQueue.length) {
      return null;
    }
    return practiceQueue[currentIndex];
  }, [practiceQueue, currentIndex]);

  const handleCheckAnswer = async () => {
    if (!currentExercise || feedback.status !== 'idle' || isChecking) return;

    setIsChecking(true);
    let isCorrect = false;

    try {
        switch (currentExercise.type) {
            case 'fill-the-blank':
                isCorrect = normalizeString(userAnswer) === normalizeString(currentExercise.word.term);
                setFeedback({ status: isCorrect ? 'correct' : 'incorrect' });
                break;
            case 'scramble':
                isCorrect = normalizeString(userAnswer) === normalizeString(currentExercise.word.context);
                setFeedback({ status: isCorrect ? 'correct' : 'incorrect' });
                break;
            case 'translate':
                const result = await evaluateTranslation(
                    currentExercise.word.analysis.translation,
                    userAnswer,
                    { targetLanguage, nativeLanguage }
                );
                isCorrect = result.isCorrect;
                setFeedback({ status: result.isCorrect ? 'correct' : 'incorrect', message: result.feedback });
                break;
        }

        onFamiliarityChange(currentExercise.word.term, isCorrect ? 1 : -1);

    } catch (error) {
        console.error("Error checking answer:", error);
        onError("Failed to evaluate your answer. Please try again.");
        setFeedback({ status: 'idle' });
    } finally {
        setIsChecking(false);
    }
  };

  const handleGrammarCheck = async () => {
      if(!grammarInput.trim() || isGrammarChecking) return;
      setIsGrammarChecking(true);
      setGrammarResult(null);
      try {
          const result = await checkGrammar(grammarInput, targetLanguage);
          setGrammarResult(result);
      } catch (e) {
          onError("Failed to check grammar.");
      } finally {
          setIsGrammarChecking(false);
      }
  }

  const handleNext = () => {
    setCurrentIndex(prev => prev + 1);
    setUserAnswer('');
    setFeedback({ status: 'idle' });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (mode === 'grammar-clinic') {
              handleGrammarCheck();
          } else {
            if (feedback.status === 'idle') {
                handleCheckAnswer();
            } else {
                handleNext();
            }
          }
      }
  }

  const renderExercise = () => {
    if (!currentExercise) return null;

    switch(currentExercise.type) {
        case 'fill-the-blank':
            const contextSentence = currentExercise.word.context.replace(new RegExp(`\\b${currentExercise.word.term}\\b`, 'gi'), '_________');
            return <>
                <p className="text-slate-400 text-center">Fill in the blank with the correct word.</p>
                <div className="mt-12 bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
                    <p className="text-2xl text-slate-300 leading-relaxed italic">"{contextSentence}"</p>
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={feedback.status !== 'idle' || isChecking}
                      className="mt-8 font-mono text-center w-full max-w-xs px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-emerald-300 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-70"
                      placeholder="Type the word..."
                      autoFocus
                    />
                </div>
            </>;
        
        case 'scramble':
            return <>
                 <p className="text-slate-400 text-center">Unscramble the following sentence.</p>
                <div className="mt-12 bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
                    <p className="text-2xl text-amber-300/80 leading-relaxed font-mono select-none">{currentExercise.scrambledSentence}</p>
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      disabled={feedback.status !== 'idle' || isChecking}
                      className="mt-8 text-lg w-full max-w-xl px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-70"
                      placeholder="Type the unscrambled sentence..."
                      autoFocus
                    />
                </div>
            </>;

        case 'translate':
            const translationText = currentExercise.word.analysis.translation;
            const noun = translationText.includes(' ') || translationText.length > 20 ? 'sentence' : 'word';
            return <>
                <p className="text-slate-400 text-center">Translate the following {noun} into {targetLanguage}.</p>
                <div className="mt-12 bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
                    <p className="text-2xl text-slate-300 leading-relaxed italic">"{translationText}"</p>
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={3}
                      disabled={feedback.status !== 'idle' || isChecking}
                      className="mt-8 text-lg w-full max-w-xl px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-70"
                      placeholder="Type your translation..."
                      autoFocus
                    />
                </div>
            </>;
    }
  }
  
  const getFeedbackMessage = () => {
    if (!currentExercise) return null;
    if (feedback.message) return <p>{feedback.message}</p>;
    
    if (feedback.status === 'correct') {
      return <p className="font-bold">Correct! Well done.</p>;
    }
    
    if (feedback.status === 'incorrect') {
      let correctAnswer = '';
      switch (currentExercise.type) {
        case 'fill-the-blank': correctAnswer = currentExercise.word.term; break;
        case 'scramble': correctAnswer = currentExercise.word.context; break;
        case 'translate': correctAnswer = currentExercise.word.term; break;
      }
      return <p><span className="font-bold">Not quite.</span> The correct answer was: <span className="font-mono text-amber-300">{correctAnswer}</span></p>;
    }
    return null;
  }

  const renderStandardView = () => {
      if (isLoading) {
        return (
            <div className="flex flex-col items-center gap-4 py-20">
                <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400">Loading exercises...</p>
            </div>
        )
      }
      
      if (wordBank.length === 0) {
        return (
          <div className="text-center text-slate-400 py-12">
            <h2 className="text-2xl font-bold text-white mb-4">No {targetLanguage} Words to Practice</h2>
            <p>Go to the Reader to find and save new words to start practicing.</p>
          </div>
        );
      }

      if (!currentExercise) {
        return (
          <div className="text-center text-slate-400 py-12">
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">Practice Session Complete!</h2>
            <p>You've reviewed all available exercises for now. Well done!</p>
            <div className="flex gap-4 justify-center mt-6">
                <button
                  onClick={startNewSession}
                  className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Start Another Session
                </button>
            </div>
          </div>
        );
      }

      return (
          <>
            <div className="relative w-full">
                <h2 className="text-3xl font-bold text-white mb-2 text-center">Practice Exercises</h2>
                <div className="mt-4 w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${((currentIndex + 1) / practiceQueue.length) * 100}%` }}></div>
                </div>
                <p className="text-sm text-slate-400 mt-2 text-center">{currentIndex + 1} / {practiceQueue.length}</p>
            </div>

            {renderExercise()}

            <div className="mt-6 flex flex-col items-center">
                {feedback.status === 'idle' ? (
                    <button
                        onClick={handleCheckAnswer}
                        disabled={isChecking || !userAnswer.trim()}
                        className="px-8 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isChecking && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        Check Answer
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="px-8 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
                    >
                        Next Question →
                    </button>
                )}
            </div>
            
            {feedback.status !== 'idle' && (
                <div className={`mt-6 p-4 rounded-lg text-center w-full max-w-xl animate-fade-in ${feedback.status === 'correct' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                    {getFeedbackMessage()}
                </div>
            )}
          </>
      );
  }

  const renderGrammarClinic = () => {
      return (
          <div className="w-full animate-fade-in">
              <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center p-3 bg-purple-500/20 rounded-full mb-4">
                    <SparklesIcon className="w-8 h-8 text-purple-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white">Grammar Clinic</h2>
                  <p className="text-slate-400 mt-2">Type a sentence in <span className="text-sky-400 font-bold">{targetLanguage}</span>. The AI will correct it and explain the rules.</p>
              </div>
              
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
                  <textarea
                      value={grammarInput}
                      onChange={(e) => setGrammarInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={4}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-200 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-slate-600"
                      placeholder={`E.g., I goes to the store yesterday...`}
                  />
                  <div className="mt-4 flex justify-end">
                      <button
                          onClick={handleGrammarCheck}
                          disabled={isGrammarChecking || !grammarInput.trim()}
                          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-900/20"
                      >
                          {isGrammarChecking ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Analyzing...
                              </>
                          ) : (
                              <>
                                <SparklesIcon className="w-5 h-5" />
                                Check My Grammar
                              </>
                          )}
                      </button>
                  </div>
              </div>

              {grammarResult && (
                  <div className={`mt-8 p-6 rounded-xl border shadow-lg animate-fade-in ${grammarResult.isCorrect ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-800 border-slate-600'}`}>
                      <div className="flex items-start gap-5">
                          <div className={`p-3 rounded-full flex-shrink-0 ${grammarResult.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {grammarResult.isCorrect ? (
                                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              )}
                          </div>
                          <div className="flex-1 space-y-4">
                              <div>
                                <h3 className={`text-xl font-bold mb-1 ${grammarResult.isCorrect ? 'text-emerald-400' : 'text-white'}`}>
                                    {grammarResult.isCorrect ? 'Perfect! No errors found.' : 'Correction Suggested'}
                                </h3>
                              </div>
                              
                              {!grammarResult.isCorrect && (
                                  <div className="space-y-2">
                                      <p className="text-sm text-slate-400 uppercase tracking-wide font-semibold">Improved Version</p>
                                      <div className="bg-slate-900/80 p-4 rounded-lg border border-emerald-500/30 shadow-inner">
                                          <p className="text-xl font-mono text-emerald-300">{grammarResult.corrected}</p>
                                      </div>
                                  </div>
                              )}
                              
                              <div className="bg-slate-900/40 p-5 rounded-lg border border-slate-700/50">
                                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">AI Explanation</h4>
                                  <p className="text-slate-300 leading-relaxed">{grammarResult.explanation}</p>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        {/* Tabs */}
        <div className="flex space-x-1 rounded-xl bg-slate-800/80 p-1 mb-8 border border-slate-700">
             <button 
                onClick={() => setMode('standard')}
                className={`flex items-center justify-center gap-2 w-full rounded-lg py-3 text-sm font-bold leading-5 transition-all duration-200 ${
                    mode === 'standard' 
                    ? 'bg-sky-600 text-white shadow-md ring-1 ring-white/10' 
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
             >
                <PencilSquareIcon className="w-5 h-5" />
                Vocabulary Exercises
             </button>
             <button 
                onClick={() => setMode('grammar-clinic')}
                className={`flex items-center justify-center gap-2 w-full rounded-lg py-3 text-sm font-bold leading-5 transition-all duration-200 ${
                    mode === 'grammar-clinic' 
                    ? 'bg-purple-600 text-white shadow-md ring-1 ring-white/10' 
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
             >
                <SparklesIcon className="w-5 h-5" />
                Grammar Clinic
             </button>
        </div>

        {mode === 'standard' ? renderStandardView() : renderGrammarClinic()}
      </div>
    </div>
  );
};
