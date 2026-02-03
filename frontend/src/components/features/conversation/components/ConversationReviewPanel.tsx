import React from 'react';
import { ReviewFeedback } from '../types';

interface ConversationReviewPanelProps {
  feedback: ReviewFeedback | null;
  isLoading: boolean;
  onClose: () => void;
  onNewConversation: () => void;
}

export const ConversationReviewPanel: React.FC<ConversationReviewPanelProps> = ({
  feedback,
  isLoading,
  onClose,
  onNewConversation,
}) => {
  return (
    <div className="absolute inset-0 bg-slate-900/95 z-10 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Conversation Review</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close review"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Analyzing your conversation...</p>
          </div>
        )}

        {/* Feedback content */}
        {!isLoading && feedback && (
          <div className="space-y-6">
            {/* Overall assessment */}
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4">
              <h4 className="font-semibold text-emerald-400 mb-2">Overall</h4>
              <p className="text-slate-200">{feedback.overall}</p>
            </div>

            {/* Pronunciation feedback */}
            {feedback.pronunciation.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <h4 className="font-semibold text-sky-400 mb-3">Pronunciation</h4>
                <ul className="space-y-2">
                  {feedback.pronunciation.map((item, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-sky-400">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Grammar feedback */}
            {feedback.grammar.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <h4 className="font-semibold text-amber-400 mb-3">Grammar</h4>
                <ul className="space-y-2">
                  {feedback.grammar.map((item, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-amber-400">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Vocabulary feedback */}
            {feedback.vocabulary.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <h4 className="font-semibold text-purple-400 mb-3">Vocabulary</h4>
                <ul className="space-y-2">
                  {feedback.vocabulary.map((item, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-purple-400">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {feedback.tips.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <h4 className="font-semibold text-rose-400 mb-3">Tips for Improvement</h4>
                <ul className="space-y-2">
                  {feedback.tips.map((item, i) => (
                    <li key={i} className="text-slate-300 text-sm flex gap-2">
                      <span className="text-rose-400">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No issues message */}
            {feedback.pronunciation.length === 0 &&
             feedback.grammar.length === 0 &&
             feedback.vocabulary.length === 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                <p className="text-emerald-400">Excellent work! No major issues detected.</p>
              </div>
            )}

            {/* New conversation button */}
            <button
              onClick={onNewConversation}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors"
            >
              Start New Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
