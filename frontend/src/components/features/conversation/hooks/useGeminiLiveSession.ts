import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import api from '../../../../services/api';
import { ConnectionStatus, SessionConfig, SessionCallbacks } from '../types';

interface UseGeminiLiveSessionOptions {
  onUserTranscript: (text: string) => void;
  onAiTranscript: (text: string) => void;
  onAudioData: (data: ArrayBuffer) => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
}

interface UseGeminiLiveSessionReturn {
  status: ConnectionStatus;
  isActive: boolean;
  error: string | null;
  startSession: (config: SessionConfig) => Promise<void>;
  stopSession: () => void;
  sendTextMessage: (text: string) => void;
  sendAudioData: (base64Audio: string) => void;
}

export const useGeminiLiveSession = (options: UseGeminiLiveSessionOptions): UseGeminiLiveSessionReturn => {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const isClosingRef = useRef(false);

  // Keep callback refs to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        // Ignore close errors
      }
      sessionRef.current = null;
    }
    setIsActive(false);
    setStatus('idle');
  }, []);

  const stopSession = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    cleanup();
  }, [cleanup]);

  const startSession = useCallback(async (config: SessionConfig) => {
    if (isActive) return;

    setStatus('connecting');
    setError(null);
    isClosingRef.current = false;

    try {
      const liveConfig = await api.get('/conversation/live-config') as any;
      const apiKey = liveConfig.apiKey;
      const model = liveConfig.model;

      if (!apiKey) {
        throw new Error('API key not configured on server');
      }

      const client = new GoogleGenAI({ apiKey });

      const systemInstruction = `You are a language tutor helping a student learn ${config.targetLanguage}.

${config.scenario}

RULES:
- Respond ONLY in ${config.targetLanguage}
- Keep responses conversational (1-3 sentences)
- For minor mistakes: model correct form naturally in your response
- For significant errors: briefly pause to correct, then continue
- Be encouraging and supportive`;

      const session = await client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setStatus('listening');
          },
          onmessage: (message: any) => {
            const serverContent = message.serverContent;
            if (!serverContent) return;

            // User transcription
            if (serverContent.inputTranscription?.text) {
              optionsRef.current.onUserTranscript(serverContent.inputTranscription.text);
            }

            // AI transcription
            if (serverContent.outputTranscription?.text) {
              optionsRef.current.onAiTranscript(serverContent.outputTranscription.text);
              setStatus('speaking');
            }

            // Audio output
            if (serverContent.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  setStatus('speaking');
                  const audioData = Uint8Array.from(atob(part.inlineData.data), c => c.charCodeAt(0));
                  optionsRef.current.onAudioData(audioData.buffer);
                }
              }
            }

            // Turn complete
            if (serverContent.turnComplete) {
              optionsRef.current.onTurnComplete();
              setStatus('listening');
            }

            // Interruption
            if (serverContent.interrupted) {
              optionsRef.current.onInterrupted();
              setStatus('listening');
            }
          },
          onerror: (e: any) => {
            console.error('[Gemini] Error:', e);
            setError('Connection error: ' + (e.message || e.toString() || 'Unknown error'));
            setStatus('error');
          },
          onclose: (e: any) => {
            console.log('[Gemini] Session closed - code:', e?.code, 'reason:', e?.reason);
            if (!isClosingRef.current) {
              cleanup();
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: config.voiceName || 'Aoede' }
            }
          },
          systemInstruction: { parts: [{ text: systemInstruction }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      sessionRef.current = session;

    } catch (err: any) {
      console.error('Failed to start session:', err);
      setStatus('error');
      setError(err.message || 'Failed to start conversation');
      cleanup();
    }
  }, [isActive, cleanup]);

  const sendTextMessage = useCallback((text: string) => {
    if (!sessionRef.current || !text.trim()) return;

    sessionRef.current.sendClientContent({
      turns: [{ role: 'user', parts: [{ text }] }],
      turnComplete: true,
    });
  }, []);

  const sendAudioData = useCallback((base64Audio: string) => {
    if (!sessionRef.current) return;

    try {
      sessionRef.current.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    } catch (e) {
      // Session might be closed
    }
  }, []);

  return {
    status,
    isActive,
    error,
    startSession,
    stopSession,
    sendTextMessage,
    sendAudioData,
  };
};
