/*
import React from 'react';
import { Achievement, Goals, GoalProgress } from '../../../types';
import { ACHIEVEMENTS_LIST } from '../data/achievements';

interface ProfileViewProps {
  points: number;
  streak: number;
  unlockedAchievements: Record<string, boolean>;
  goals: Goals | null;
  goalProgress: GoalProgress | null;
  onEditGoals: () => void;
}

const StatCard = ({ label, value, icon }: { label: string, value: string | number, icon: string }) => (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex items-center gap-4">
        <span className="text-4xl">{icon}</span>
        <div>
            <p className="text-slate-400 text-sm">{label}</p>
            <p className="text-white font-bold text-2xl">{value}</p>
        </div>
    </div>
);

// FIX: Changed AchievementCard to be a React.FC to correctly handle the `key` prop provided during list rendering.
const AchievementCard: React.FC<{ achievement: Achievement, isUnlocked: boolean }> = ({ achievement, isUnlocked }) => (
    <div className={`p-4 rounded-lg border transition-opacity ${isUnlocked ? 'bg-slate-800 border-slate-700' : 'bg-slate-800/50 border-slate-700/50 opacity-50'}`}>
        <h4 className={`font-bold ${isUnlocked ? 'text-amber-400' : 'text-slate-400'}`}>{achievement.name}</h4>
        <p className="text-sm text-slate-400">{achievement.description}</p>
    </div>
);

const GoalProgressCard = ({ label, current, goal }: { label: string, current: number, goal: number }) => {
    const percentage = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
    return (
        <div className="bg-slate-800/60 p-4 rounded-lg">
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-slate-300">{label}</span>
                <span className="text-sm font-semibold text-white">{current} / {goal}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    )
}

export const ProfileView = ({ points, streak, unlockedAchievements, goals, goalProgress, onEditGoals }: ProfileViewProps) => {
  return (
    <div className="flex-1 p-6 md:p-8">
      <h2 className="text-3xl font-bold text-white mb-8">My Progress</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard label="Total Points" value={points} icon="✨" />
          <StatCard label="Current Streak" value={`${streak} days`} icon="🔥" />
          <StatCard label="Achievements Unlocked" value={`${Object.keys(unlockedAchievements).length} / ${ACHIEVEMENTS_LIST.length}`} icon="🏆" />
      </div>

      {goals && goalProgress && (
        <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">This Week's Goals</h3>
                <button onClick={onEditGoals} className="px-4 py-2 text-sm font-medium bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Edit Goals</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GoalProgressCard label="New Words Learned" current={goalProgress.newWordsThisWeek} goal={goals.wordsPerWeek} />
                <GoalProgressCard label="Practice Sessions" current={goalProgress.practiceSessionsThisWeek} goal={goals.practiceSessionsPerWeek} />
            </div>
        </div>
      )}

      <div>
        <h3 className="text-2xl font-bold text-white mb-6">Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACHIEVEMENTS_LIST.map(ach => (
                <AchievementCard key={ach.id} achievement={ach} isUnlocked={!!unlockedAchievements[ach.id]} />
            ))}
        </div>
      </div>
    </div>
  );
};
*/
