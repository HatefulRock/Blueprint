import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioCaptureOptions {
  targetSampleRate?: number;
  onAudioData?: (base64Audio: string) => void;
}

interface UseAudioCaptureReturn {
  isCapturing: boolean;
  audioLevel: number;
  error: string | null;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
}

export const useAudioCapture = (options: UseAudioCaptureOptions = {}): UseAudioCaptureReturn => {
  const { targetSampleRate = 16000, onAudioData } = options;

  const [isCapturing, setIsCapturing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const onAudioDataRef = useRef(onAudioData);

  // Keep callback ref updated
  useEffect(() => {
    onAudioDataRef.current = onAudioData;
  }, [onAudioData]);

  // Resample audio from input rate to target rate
  const resample = useCallback((input: Float32Array, fromRate: number, toRate: number): Int16Array => {
    const ratio = fromRate / toRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Int16Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const srcIdx = Math.floor(i * ratio);
      const s = Math.max(-1, Math.min(1, input[srcIdx]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }, []);

  // Update audio level from analyser
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const level = Math.min(1, rms / 128); // Normalize to 0-1

    setAudioLevel(level);
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startCapture = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const inputSampleRate = audioContext.sampleRate;

      // Create analyser for audio level visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Create script processor for capturing audio data
      const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (event) => {
        if (onAudioDataRef.current) {
          const inputData = event.inputBuffer.getChannelData(0);
          const resampled = resample(inputData, inputSampleRate, targetSampleRate);
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(resampled.buffer)));
          onAudioDataRef.current(base64Audio);
        }
      };

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      // Start audio level monitoring
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

      setIsCapturing(true);
    } catch (err: any) {
      console.error('Failed to start audio capture:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError(err.message || 'Failed to access microphone');
      }
    }
  }, [targetSampleRate, resample, updateAudioLevel]);

  const stopCapture = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect script processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsCapturing(false);
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    isCapturing,
    audioLevel,
    error,
    startCapture,
    stopCapture,
  };
};
