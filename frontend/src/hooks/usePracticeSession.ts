import { useState, useCallback } from 'react';
import { useReading } from '../context/ReadingContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigation } from '../context/NavigationContext';
import { useToast } from '../context/ToastContext';
import { grammarService } from '../services/api';
import { View } from '../types';

/**
 * Custom hook for managing practice sessions and exercise generation
 */
export const usePracticeSession = () => {
  const { activeReadingText } = useReading();
  const { targetLanguage } = useSettings();
  const { setCurrentView } = useNavigation();
  const { showToast } = useToast();
  const [isGeneratingExercises, setIsGeneratingExercises] = useState(false);

  const generateExercisesFromReading = useCallback(async () => {
    if (!activeReadingText || isGeneratingExercises) return;

    try {
      setIsGeneratingExercises(true);

      await grammarService.generateExercises({
        text: activeReadingText.content,
        language: targetLanguage,
        num_exercises: 10,
        exercise_types: ['fill_blank', 'transformation', 'multiple_choice', 'correction'],
      });

      showToast({
        type: 'success',
        message: 'Grammar exercises generated successfully!',
      });

      // Switch to Grammar view
      setCurrentView(View.Grammar);
    } catch (error) {
      console.error('Failed to generate exercises:', error);
      showToast({
        type: 'error',
        message: 'Failed to generate exercises. Please try again.',
      });
    } finally {
      setIsGeneratingExercises(false);
    }
  }, [activeReadingText, targetLanguage, isGeneratingExercises, showToast, setCurrentView]);

  return {
    generateExercisesFromReading,
    isGeneratingExercises,
  };
};
