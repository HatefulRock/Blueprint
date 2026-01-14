
import { Exercise, Word, ExerciseType } from '../types';
import { shuffleArray } from '../utils';

// Now a pure function that takes the word bank as input
export const generatePracticeSession = async (words: Word[]): Promise<Exercise[]> => {
    if (words.length === 0) return Promise.resolve([]);
    
    // Create a copy to avoid mutating state
    const wordsForPractice = shuffleArray([...words]).slice(0, 5);
    const exerciseTypes: ExerciseType[] = ['fill-the-blank', 'scramble', 'translate'];
    
    const session: Exercise[] = wordsForPractice.map((word, index) => ({
        word,
        type: exerciseTypes[index % exerciseTypes.length],
    }));
    
    return Promise.resolve(shuffleArray(session));
};

type ReviewMode = 'word-to-def' | 'def-to-word' | 'cloze';

// Now a pure function that takes the word bank as input
export const generateFlashcardSession = async (mode: ReviewMode, words: Word[]): Promise<Word[]> => {
    if (words.length === 0) return Promise.resolve([]);

    // Prioritize words with lower familiarity
    const sortedWords = [...words].sort((a, b) => a.familiarityScore - b.familiarityScore);
    const queue = shuffleArray(sortedWords).slice(0, 10);
    
    return Promise.resolve(queue);
};
