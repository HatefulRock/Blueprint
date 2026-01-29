import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, ActiveReadingText } from '../types';
import { useReading } from './ReadingContext';

interface NavigationContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  navigateToReading: (content: ActiveReadingText) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { setActiveReadingText } = useReading();
  const [currentView, setCurrentView] = useState<View>(View.Dashboard);
  const [previousView, setPreviousView] = useState<View | null>(null);

  const navigateToReading = useCallback(
    (content: ActiveReadingText) => {
      setPreviousView(currentView);
      setActiveReadingText(content);
      setCurrentView(View.ReadingSession);
    },
    [currentView, setActiveReadingText]
  );

  const goBack = useCallback(() => {
    if (previousView) {
      setCurrentView(previousView);
      setPreviousView(null);
    } else {
      setCurrentView(View.Dashboard);
    }
  }, [previousView]);

  const handleSetCurrentView = useCallback((view: View) => {
    setPreviousView(currentView);
    setCurrentView(view);
  }, [currentView]);

  return (
    <NavigationContext.Provider
      value={{
        currentView,
        setCurrentView: handleSetCurrentView,
        navigateToReading,
        goBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};
