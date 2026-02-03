import { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import api from '../../../../services/api';
import { TranscriptMessage, ReviewFeedback } from '../types';

interface UseConversationReviewReturn {
  isLoading: boolean;
  feedback: ReviewFeedback | null;
  showReview: boolean;
  analyzeConversation: (messages: TranscriptMessage[], targetLanguage: string) => Promise<void>;
  closeReview: () => void;
  resetReview: () => void;
}

const DEFAULT_FEEDBACK: ReviewFeedback = {
  overall: 'Great practice session! Keep up the good work.',
  pronunciation: [],
  grammar: [],
  vocabulary: [],
  tips: ['Continue practicing regularly'],
};

export const useConversationReview = (): UseConversationReviewReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<ReviewFeedback | null>(null);
  const [showReview, setShowReview] = useState(false);

  const analyzeConversation = useCallback(async (messages: TranscriptMessage[], targetLanguage: string) => {
    if (messages.length < 2) return;

    setIsLoading(true);
    setShowReview(true);

    try {
      const config = await api.get('/conversation/live-config') as any;
      const client = new GoogleGenAI({ apiKey: config.apiKey });

      const conversationText = messages
        .map(m => `${m.author === 'user' ? 'Student' : 'Tutor'}: ${m.text}`)
        .join('\n');

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          role: 'user',
          parts: [{ text: `Analyze this ${targetLanguage} language learning conversation and provide feedback.

CONVERSATION:
${conversationText}

Respond with JSON only:
{
  "overall": "Brief encouraging assessment (1-2 sentences)",
  "pronunciation": ["List pronunciation issues if any"],
  "grammar": ["List grammar mistakes with corrections"],
  "vocabulary": ["Vocabulary suggestions"],
  "tips": ["2-3 improvement tips"]
}` }]
        }]
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setFeedback({
          overall: parsed.overall || DEFAULT_FEEDBACK.overall,
          pronunciation: parsed.pronunciation || [],
          grammar: parsed.grammar || [],
          vocabulary: parsed.vocabulary || [],
          tips: parsed.tips || DEFAULT_FEEDBACK.tips,
        });
      } else {
        setFeedback(DEFAULT_FEEDBACK);
      }
    } catch (e) {
      console.error('Failed to analyze conversation:', e);
      setFeedback(DEFAULT_FEEDBACK);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeReview = useCallback(() => {
    setShowReview(false);
  }, []);

  const resetReview = useCallback(() => {
    setShowReview(false);
    setFeedback(null);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    feedback,
    showReview,
    analyzeConversation,
    closeReview,
    resetReview,
  };
};
