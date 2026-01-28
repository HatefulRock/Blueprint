
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Selection, PronunciationFeedback, AnalysisResult, TranslationEvaluation, GrammarCheckResult } from '../types';
import { GEMINI_MODELS } from '../config/geminiModels';

interface LanguageParams {
    targetLanguage: string;
    nativeLanguage: string;
}

// Helper to get AI instance
const getAI = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY is not defined");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getDictionaryLookup = async (selection: Selection, { targetLanguage, nativeLanguage }: LanguageParams): Promise<AnalysisResult> => {
  // Prefer backend cached lookup when available
  try {
    const res: any = await fetch(`/dictionary/lookup?term=${encodeURIComponent(selection.text)}&target_language=${encodeURIComponent(targetLanguage)}&native_language=${encodeURIComponent(nativeLanguage || '')}`);
    if (!res.ok) throw new Error('Lookup failed');
    const data = await res.json();
    // Map to AnalysisResult-like shape for compatibility with components
    const entry = data.entry || {};
    return {
      translation: entry.translation || '',
      partOfSpeech: entry.part_of_speech || '',
    } as AnalysisResult;
  } catch (e) {
    // Fallback to client-side Gemini call
    const ai = getAI();
    const prompt = `
    Provide a dictionary definition for the ${selection.type} "${selection.text}".
    Target Language: ${targetLanguage}
    Output Language (for definitions): ${nativeLanguage}
    
    Return a JSON object with:
    - translation: The direct translation.
    - partOfSpeech: The part of speech (e.g., Noun, Verb).
  `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODELS.default,
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  translation: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
              },
              required: ['translation', 'partOfSpeech'],
          }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as AnalysisResult;
  }
};

export const getDeepAnalysis = async (selection: Selection, { targetLanguage, nativeLanguage }: LanguageParams): Promise<AnalysisResult> => {
  const ai = getAI();

  const prompt = `
    Provide a deep linguistic analysis for the ${selection.type} "${selection.text}".
    Target Language: ${targetLanguage}
    Explanations Language: ${nativeLanguage}
    
    Return a JSON object with:
    - translation: The meaning in ${nativeLanguage}.
    - partOfSpeech: The grammatical category.
    - literalTranslation: A literal, word-for-word translation if applicable (or same as translation).
    - grammaticalBreakdown: A detailed explanation of the grammar, tense, gender, or usage context.
    - wordBreakdown: An array breaking down the sentence into individual significant words (ignore generic punctuation like periods unless part of the word).
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.reasoning,  // Use Gemini 3 Pro for deep analysis
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                translation: { type: Type.STRING },
                partOfSpeech: { type: Type.STRING },
                literalTranslation: { type: Type.STRING },
                grammaticalBreakdown: { type: Type.STRING },
                wordBreakdown: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            term: { type: Type.STRING },
                            translation: { type: Type.STRING },
                            partOfSpeech: { type: Type.STRING }
                        }
                    }
                }
            },
            required: ['translation', 'partOfSpeech', 'grammaticalBreakdown'],
        }
    }
  });

  const result = JSON.parse(response.text || "{}");
  return result as AnalysisResult;
};

export const checkGrammar = async (text: string, targetLanguage: string): Promise<GrammarCheckResult> => {
  const ai = getAI();
  const prompt = `
    Act as a strict grammar teacher for ${targetLanguage}.
    Analyze this sentence provided by a student: "${text}"

    If it is perfectly correct, set "isCorrect" to true, "corrected" to the original text, and "explanation" to "Perfect!".
    If there are errors, provide the corrected version and explain the grammatical rule.

    Return JSON.
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.default,
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                corrected: { type: Type.STRING },
                explanation: { type: Type.STRING },
                isCorrect: { type: Type.BOOLEAN },
            },
            required: ['corrected', 'explanation', 'isCorrect'],
        }
    }
  });

  return JSON.parse(response.text || "{}") as GrammarCheckResult;
};

export const textToSpeech = async (text: string, { targetLanguage }: { targetLanguage: string }): Promise<string> => {
  const ai = getAI();
  
  // Note: Voice selection is simplified here. In a full app, map targetLanguage to specific voice names.
  const response = await ai.models.generateContent({
      model: GEMINI_MODELS.tts,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
      throw new Error("No audio data returned");
  }
  return base64Audio;
};

// UPDATED: Now performs real multimodal analysis using Gemini 2.5 Flash
export const getPronunciationFeedback = async (text: string, audioBase64: string, targetLanguage: string): Promise<PronunciationFeedback> => {
    const ai = getAI();

    const prompt = `
        You are a ${targetLanguage} pronunciation coach. 
        Listen to the attached audio. The user is trying to say: "${text}".
        
        Analyze their pronunciation, intonation, and fluency.
        
        1. Score: Give a score from 0 to 100.
        2. Feedback: Give a 1-sentence overall summary.
        3. Mispronounced Words: Identify specific words they struggled with, explain the error (e.g., "Vowel quality", "Silent letter"), and provide a tip.
        4. Intonation: Give a tip on intonation or rhythm.
        5. Fluency: Score 0-100.
        
        Return strict JSON matching the schema.
    `;

    const audioPart = {
        inlineData: {
            mimeType: 'audio/wav',
            data: audioBase64
        }
    };
    
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: GEMINI_MODELS.audio,  // Use Gemini 3 audio model
        contents: { parts: [audioPart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER },
                    feedbackText: { type: Type.STRING },
                    fluencyScore: { type: Type.NUMBER },
                    intonationTip: { type: Type.STRING },
                    mispronouncedWords: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                word: { type: Type.STRING },
                                error: { type: Type.STRING },
                                correction: { type: Type.STRING }
                            }
                        }
                    }
                },
                required: ['score', 'feedbackText', 'mispronouncedWords']
            }
        }
    });

    const result = JSON.parse(response.text || "{}");
    
    // Normalize result in case of missing optional fields
    return {
        score: result.score || 0,
        feedbackText: result.feedbackText || "Could not analyze audio.",
        mispronouncedWords: result.mispronouncedWords || [],
        intonationTip: result.intonationTip,
        fluencyScore: result.fluencyScore
    };
};

export const fetchAndCleanArticle = async (url: string): Promise<string> => {
    // For security and CORS reasons, fetching external URLs directly from the client often fails.
    // However, we can ask Gemini to summarize or extract text if we could pass the URL to a tool.
    // Since we don't have a backend proxy, we will return a placeholder or use a tool if configured.
    // For this demo, we'll stick to a mock response but simulate a smart extraction.
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(`[Content fetched from ${url}]\n\nThis is a simulated extraction. In a production environment, this would require a backend service to bypass CORS policies or a Gemini tool with web access capabilities.`);
        }, 1000);
    });
};

export const evaluateTranslation = async (originalText: string, userTranslation: string, { targetLanguage, nativeLanguage }: LanguageParams): Promise<TranslationEvaluation> => {
  const ai = getAI();

  const prompt = `
    Evaluate the user's translation of a text from ${targetLanguage} to ${nativeLanguage} (or vice versa).
    
    Original Text: "${originalText}"
    User's Translation: "${userTranslation}"
    
    Determine if the meaning is preserved and grammatically correct.
    
    Return a JSON object with:
    - isCorrect: boolean
    - feedback: A helpful, encouraging string explaining why it is correct or what can be improved.
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.default,
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                isCorrect: { type: Type.BOOLEAN },
                feedback: { type: Type.STRING },
            },
            required: ['isCorrect', 'feedback'],
        }
    }
  });

  const result = JSON.parse(response.text || "{}");
  return result as TranslationEvaluation;
};
