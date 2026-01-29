import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { SettingsProvider } from './SettingsContext';
import { NavigationProvider } from './NavigationContext';
import { VocabularyProvider } from './VocabularyContext';
import { ReadingProvider } from './ReadingContext';
import { ProgressProvider } from './ProgressContext';
import { ToastProvider } from './ToastContext';

/**
 * Combined AppProvider that wraps all context providers in proper hierarchy.
 *
 * Hierarchy:
 * - Toast (outermost, no dependencies)
 * - Auth (needs to be available to all other contexts)
 * - Settings (depends on Auth)
 * - Progress (depends on Auth)
 * - Reading (depends on Settings)
 * - Navigation (depends on Reading)
 * - Vocabulary (depends on Auth)
 */
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <ProgressProvider>
            <ReadingProvider>
              <NavigationProvider>
                <VocabularyProvider>
                  {children}
                </VocabularyProvider>
              </NavigationProvider>
            </ReadingProvider>
          </ProgressProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

// Re-export all hooks for convenience
export { useAuth } from './AuthContext';
export { useSettings } from './SettingsContext';
export { useNavigation } from './NavigationContext';
export { useVocabulary } from './VocabularyContext';
export { useReading } from './ReadingContext';
export { useProgress } from './ProgressContext';
export { useToast } from './ToastContext';
