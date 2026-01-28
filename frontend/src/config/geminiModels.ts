/**
 * Centralized Gemini 3 model configuration.
 *
 * This module provides a single source of truth for all Gemini model references
 * across the Blueprint frontend. All API calls should use these constants
 * instead of hardcoded model names.
 *
 * Gemini 3 Capabilities Showcased:
 * - default: General-purpose fast model (Flash)
 * - reasoning: Advanced reasoning for complex analysis (Pro)
 * - audio: Audio transcription and processing
 * - vision: Video and image analysis (NEW - multimodal capability)
 * - tts: Text-to-speech generation
 * - live: Real-time conversation streaming
 */

export const GEMINI_MODELS = {
  default: "gemini-3-flash-preview",
  reasoning: "gemini-3-flash-preview",      // For complex grammar/writing analysis
  audio: "gemini-3-flash-preview",        // Audio transcription
  vision: "gemini-3-flash-preview",       // NEW - For video/image analysis
  tts: "gemini-3-flash-preview",      // Text-to-speech
  live: "gemini-3-flash-preview",    // Real-time conversation
} as const;

export type GeminiModelType = keyof typeof GEMINI_MODELS;

/**
 * Get the appropriate Gemini 3 model for a specific task type.
 *
 * @param taskType - One of 'default', 'reasoning', 'audio', 'vision', 'tts', 'live'
 * @returns The Gemini 3 model identifier
 * @throws Error if taskType is not recognized
 */
export function getModelForTask(taskType: GeminiModelType): string {
  if (!(taskType in GEMINI_MODELS)) {
    throw new Error(
      `Unknown task type: ${taskType}. Must be one of ${Object.keys(GEMINI_MODELS).join(', ')}`
    );
  }
  return GEMINI_MODELS[taskType];
}

/**
 * Get all available Gemini 3 models.
 *
 * @returns Object containing all model configurations
 */
export function getAllModels(): typeof GEMINI_MODELS {
  return { ...GEMINI_MODELS };
}
