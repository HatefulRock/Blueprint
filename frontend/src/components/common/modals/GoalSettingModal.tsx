import React, { useState } from 'react';
import { Goals } from '../../../types';

interface GoalSettingModalProps {
  initialGoals: Goals;
  onSave: (goals: Goals) => void;
  onClose: () => void;
}

export const GoalSettingModal = ({ initialGoals, onSave, onClose }: GoalSettingModalProps) => {
  const [words, setWords] = useState(initialGoals.wordsPerWeek);
  const [sessions, setSessions] = useState(initialGoals.practiceSessionsPerWeek);

  const handleSave = () => {
    onSave({
      wordsPerWeek: Number(words),
      practiceSessionsPerWeek: Number(sessions),
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-8 w-full max-w-md m-4">
        <h2 className="text-2xl font-bold text-white mb-4">Set Your Weekly Goals</h2>
        <p className="text-slate-400 mb-6">Setting clear goals is a great way to stay motivated. How much would you like to achieve this week?</p>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="words-goal" className="block text-sm font-medium text-slate-300 mb-2">New Words to Learn</label>
            <div className="flex items-center gap-4">
              <input
                id="words-goal"
                type="range"
                min="5"
                max="50"
                step="5"
                value={words}
                onChange={(e) => setWords(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="font-bold text-sky-400 text-lg w-12 text-center">{words}</span>
            </div>
          </div>

          <div>
            <label htmlFor="sessions-goal" className="block text-sm font-medium text-slate-300 mb-2">Practice Sessions to Complete</label>
             <div className="flex items-center gap-4">
              <input
                id="sessions-goal"
                type="range"
                min="1"
                max="10"
                step="1"
                value={sessions}
                onChange={(e) => setSessions(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="font-bold text-sky-400 text-lg w-12 text-center">{sessions}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-md text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 transition-colors"
          >
            Save Goals
          </button>
        </div>
      </div>
    </div>
  );
};