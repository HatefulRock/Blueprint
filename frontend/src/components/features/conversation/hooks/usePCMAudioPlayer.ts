import { useRef, useCallback, useState, useEffect } from 'react';

interface UsePCMAudioPlayerOptions {
  sampleRate?: number;
}

interface UsePCMAudioPlayerReturn {
  play: (pcmData: ArrayBuffer) => Promise<void>;
  stop: () => void;
  resume: () => Promise<void>;
  isPlaying: boolean;
}

export const usePCMAudioPlayer = (options: UsePCMAudioPlayerOptions = {}): UsePCMAudioPlayerReturn => {
  const { sampleRate = 24000 } = options;

  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const scheduledTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const ensureContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const play = useCallback(async (pcmData: ArrayBuffer) => {
    await ensureContext();
    const audioContext = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    if (!audioContext || !gainNode) return;

    const int16Array = new Int16Array(pcmData);
    if (int16Array.length === 0) return;

    // Convert Int16 PCM to Float32
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);

    const currentTime = audioContext.currentTime;
    const startTime = Math.max(scheduledTimeRef.current, currentTime + 0.01);

    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setIsPlaying(false);
      }
    };

    activeSourcesRef.current.add(source);
    setIsPlaying(true);

    source.start(startTime);
    scheduledTimeRef.current = startTime + audioBuffer.duration;
  }, [sampleRate, ensureContext]);

  const stop = useCallback(() => {
    scheduledTimeRef.current = 0;

    // Stop all active sources
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors from already stopped sources
      }
    });
    activeSourcesRef.current.clear();

    // Quick gain fade to avoid clicks
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNodeRef.current.gain.setValueAtTime(1, audioContextRef.current.currentTime + 0.05);
    }

    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    await ensureContext();
  }, [ensureContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeSourcesRef.current.forEach(source => {
        try {
          source.stop();
        } catch (e) {
          // Ignore
        }
      });
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    play,
    stop,
    resume,
    isPlaying,
  };
};
