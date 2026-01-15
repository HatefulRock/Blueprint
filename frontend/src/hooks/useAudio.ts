import { useState, useCallback, useRef, useEffect } from "react";
import { aiService } from "../services/api";

interface UseAudioReturn {
  playAudio: (text: string, language?: string) => Promise<void>;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAudio = (): UseAudioReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to keep track of the current audio instance so we can stop it
  // if the user clicks a new word before the old one finishes.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(
    async (text: string, language: string = "Spanish") => {
      // 1. Cleanup previous audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 2. Fetch audio data (Assuming backend returns { audio_data: "base64string..." })
        const response = await aiService.textToSpeech(text, language);

        const base64Audio = response.data.audio_data; // Adjust based on your actual API response structure

        if (!base64Audio) {
          throw new Error("No audio data received");
        }

        // 3. Create audio object from base64
        const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
        const audio = new Audio(audioSrc);

        // 4. Setup event listeners
        audio.onended = () => {
          setIsPlaying(false);
        };

        audio.onerror = () => {
          setError("Error occurred during playback");
          setIsPlaying(false);
          setIsLoading(false);
        };

        // 5. Play
        // We wait for 'canplaythrough' or just call play() which returns a promise
        await audio.play();

        audioRef.current = audio;
        setIsPlaying(true);
      } catch (err) {
        console.error("Audio playback error:", err);
        setError("Could not play audio. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return { playAudio, isPlaying, isLoading, error };
};
