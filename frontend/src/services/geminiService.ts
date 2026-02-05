import { Selection, PronunciationFeedback, AnalysisResult, TranslationEvaluation, GrammarCheckResult } from '../types';
import api from './api';

interface LanguageParams {
  targetLanguage: string;
  nativeLanguage: string;
}

const base64ToBlob = (base64: string, contentType: string) => {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];
  const sliceSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i += 1) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
};

const mapAnalysisResponse = (res: any): AnalysisResult => ({
  translation: res.translation || '',
  partOfSpeech: res.part_of_speech || res.partOfSpeech || undefined,
  literalTranslation: res.literal_translation || res.literalTranslation || undefined,
  grammaticalBreakdown: res.grammar_breakdown || res.grammaticalBreakdown || undefined,
  wordBreakdown:
    res.vocabulary?.map((v: any) => ({
      term: v.term,
      translation: v.translation,
      partOfSpeech: v.pos || v.part_of_speech || v.partOfSpeech || '',
      pinyin: v.pinyin ?? undefined,
    })) || undefined,
  difficultyLevel: res.difficulty_level || res.difficultyLevel || undefined,
  usageExamples: res.usage_examples || res.usageExamples || undefined,
  memoryAid: res.memory_aid || res.memoryAid || undefined,
  relatedWords: res.related_words || res.relatedWords || undefined,
  contextSentence: res.context_sentence || res.contextSentence || undefined,
});

export const getDictionaryLookup = async (
  selection: Selection,
  { targetLanguage, nativeLanguage }: LanguageParams
): Promise<AnalysisResult> => {
  const data: any = await api.get('/dictionary/lookup', {
    params: {
      term: selection.text,
      target_language: targetLanguage,
      native_language: nativeLanguage || '',
    },
  });

  const entry = data.entry || {};
  return {
    translation: entry.translation || '',
    partOfSpeech: entry.part_of_speech || '',
  } as AnalysisResult;
};

export const getDeepAnalysis = async (
  selection: Selection,
  { targetLanguage }: LanguageParams
): Promise<AnalysisResult> => {
  const res: any = await api.post('/ai/analyze', {
    text: selection.text,
    target_language: targetLanguage,
    context_sentence: selection.contextSentence,
  });

  return mapAnalysisResponse(res);
};

export const checkGrammar = async (
  text: string,
  targetLanguage: string
): Promise<GrammarCheckResult> => {
  const res: any = await api.post('/ai/grammar-check', {
    text,
    language: targetLanguage,
  });

  return {
    corrected: res.corrected || text,
    explanation: res.explanation || '',
    isCorrect: !!res.is_correct,
  };
};

export const textToSpeech = async (
  text: string,
  { targetLanguage }: { targetLanguage: string }
): Promise<string> => {
  const res: any = await api.post('/ai/tts', {
    text,
    language: targetLanguage,
  });
  return res.audio_base64 || '';
};

export const getPronunciationFeedback = async (
  text: string,
  audioBase64: string,
  targetLanguage: string
): Promise<PronunciationFeedback> => {
  const formData = new FormData();
  const audioBlob = base64ToBlob(audioBase64, 'audio/wav');
  formData.append('audio_file', audioBlob, 'audio.wav');
  formData.append('target_language', targetLanguage);
  formData.append('expected_text', text);

  const res: any = await api.post('/ai/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const analysis = res.pronunciation_analysis || {};
  const mismatched = analysis.mismatched_words || [];
  const mappedMismatches = mismatched.map((item: any) => ({
    word: item.expected || '',
    error: item.actual ? `Heard "${item.actual}"` : 'Missing word',
    correction: item.expected || '',
  }));

  return {
    score: analysis.score || 0,
    feedbackText: res.feedback || 'Could not analyze audio.',
    mispronouncedWords: mappedMismatches,
    intonationTip: undefined,
    fluencyScore: analysis.accuracy,
  };
};

export const fetchAndCleanArticle = async (url: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        `[Content fetched from ${url}]\n\nThis is a simulated extraction. In a production environment, this would require a backend service to bypass CORS policies or a Gemini tool with web access capabilities.`
      );
    }, 1000);
  });
};

export const evaluateTranslation = async (
  originalText: string,
  userTranslation: string,
  { targetLanguage, nativeLanguage }: LanguageParams
): Promise<TranslationEvaluation> => {
  const res: any = await api.post('/ai/translation-eval', {
    original_text: originalText,
    user_translation: userTranslation,
    target_language: targetLanguage,
    native_language: nativeLanguage,
  });

  return {
    isCorrect: !!res.is_correct,
    feedback: res.feedback || '',
  };
};
