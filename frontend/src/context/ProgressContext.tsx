import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Goals, GoalProgress } from '../types';
import { userService } from '../services/api';
import { useAuth } from './AuthContext';

interface ProgressContextType {
  goals: Goals | null;
  goalProgress: GoalProgress | null;
  updateGoalProgress: () => Promise<void>;
  isLoading: boolean;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [goals, setGoals] = useState<Goals | null>(null);
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateGoalProgress = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const res = await userService.getProgress().catch(() => null);
      const data = res ?? null;
      setGoalProgress(data);
      setGoals({
        wordsPerWeek: data?.wordsGoal ?? 20,
        practiceSessionsPerWeek: data?.sessionsGoal ?? 3,
      });
    } catch (e) {
      console.error('Failed to fetch progress', e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load progress when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      updateGoalProgress();
      // Also perform check-in
      userService.checkIn().catch(() => null);
    } else {
      setGoals(null);
      setGoalProgress(null);
    }
  }, [isAuthenticated, updateGoalProgress]);

  return (
    <ProgressContext.Provider
      value={{
        goals,
        goalProgress,
        updateGoalProgress,
        isLoading,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within ProgressProvider');
  }
  return context;
};
