import { useState, useEffect } from 'react';
import { View } from '../types';

const STORAGE_KEY = 'lastVisitedViews';

interface LastVisitedViews {
  learn?: View;
  practice?: View;
  progress?: View;
}

const viewGroups: Record<string, View[]> = {
  learn: [View.Reader, View.Vocabulary, View.Conversation],
  practice: [View.Flashcards, View.Grammar, View.Pronunciation, View.Practice],
  progress: [View.Analytics],
};

const getGroupForView = (view: View): string | null => {
  for (const [group, views] of Object.entries(viewGroups)) {
    if (views.includes(view)) {
      return group;
    }
  }
  return null;
};

export const useLastVisitedView = (currentView: View) => {
  const [lastVisitedViews, setLastVisitedViews] = useState<LastVisitedViews>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Update last visited view when view changes
  useEffect(() => {
    const group = getGroupForView(currentView);
    if (group) {
      setLastVisitedViews((prev) => {
        const updated = { ...prev, [group]: currentView };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore storage errors
        }
        return updated;
      });
    }
  }, [currentView]);

  const getLastVisitedView = (group: 'learn' | 'practice' | 'progress'): View | undefined => {
    return lastVisitedViews[group];
  };

  const isViewInGroup = (view: View, group: 'learn' | 'practice' | 'progress'): boolean => {
    return viewGroups[group]?.includes(view) || false;
  };

  return {
    getLastVisitedView,
    isViewInGroup,
  };
};
