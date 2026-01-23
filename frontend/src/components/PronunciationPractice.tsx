import React, { useState } from 'react';
import { useMicrophoneRecorder } from '../hooks/useMicrophoneRecorder';

interface PronunciationPracticeProps {
  targetLanguage: string;
}

interface TranscriptionResult {
  transcription: string;
  feedback: string;
  pronunciation_analysis?: {
    accuracy: number;
    score: number;
    expected_text: string;
    transcribed_text: string;
    mismatched_words: Array<{
      expected: string;
      actual: string;
      position: number;
    }>;
    gemini_feedback: string;
  };
}

const MicrophoneIcon = ({ isRecording }: { isRecording: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`w-8 h-8 ${isRecording ? 'text-red-400 animate-pulse' : 'text-white'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
    />
  </svg>
);

const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const PRACTICE_PHRASES = {
  Spanish: [
    "Buenos días, ¿cómo estás?",
    "Me llamo María",
    "¿Dónde está el baño?",
    "La manzana roja",
    "Quiero un café, por favor"
  ],
  French: [
    "Bonjour, comment allez-vous?",
    "Je m'appelle Pierre",
    "Où sont les toilettes?",
    "La pomme rouge",
    "Je voudrais un café, s'il vous plaît"
  ],
  German: [
    "Guten Tag, wie geht es Ihnen?",
    "Ich heiße Hans",
    "Wo ist die Toilette?",
    "Der rote Apfel",
    "Ich möchte einen Kaffee, bitte"
  ],
  Italian: [
    "Buongiorno, come stai?",
    "Mi chiamo Marco",
    "Dove è il bagno?",
    "La mela rossa",
    "Vorrei un caffè, per favore"
  ],
  Portuguese: [
    "Bom dia, como você está?",
    "Meu nome é João",
    "Onde fica o banheiro?",
    "A maçã vermelha",
    "Quero um café, por favor"
  ]
};

export const PronunciationPractice: React.FC<PronunciationPracticeProps> = ({
  targetLanguage
}) => {
  const {
    recordingState,
    startRecording,
    stopRecording,
    clearRecording,
    isSupported
  } = useMicrophoneRecorder();

  const [practicePhrase, setPracticePhrase] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const phrases = PRACTICE_PHRASES[targetLanguage as keyof typeof PRACTICE_PHRASES] || PRACTICE_PHRASES.Spanish;

  const handleSelectPhrase = (phrase: string) => {
    setPracticePhrase(phrase);
    setResult(null);
    setError(null);
    clearRecording();
  };

  const handleStartRecording = async () => {
    if (!practicePhrase) {
      setError('Please select a phrase to practice first');
      return;
    }

    try {
      setError(null);
      await startRecording();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      const audioBlob = await stopRecording();

      if (!audioBlob) {
        setError('No audio recorded');
        return;
      }

      // Send to backend for transcription
      setIsAnalyzing(true);
      setError(null);

      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      formData.append('target_language', targetLanguage);
      formData.append('expected_text', practicePhrase);

      const response = await fetch('http://localhost:8000/ai/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data: TranscriptionResult = await response.json();
      setResult(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
      console.error('Transcription error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayRecording = () => {
    if (recordingState.audioURL) {
      const audio = new Audio(recordingState.audioURL);
      audio.play();
    }
  };

  if (!isSupported) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400 font-semibold mb-2">Microphone Not Supported</p>
          <p className="text-slate-400 text-sm">
            Your browser does not support audio recording. Please try a modern browser like Chrome, Firefox, or Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Pronunciation Practice</h2>
          <p className="text-slate-400">
            Select a phrase, record yourself saying it, and get instant feedback on your pronunciation.
          </p>
        </div>

        {/* Phrase Selection */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Select a Phrase to Practice</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {phrases.map((phrase, index) => (
              <button
                key={index}
                onClick={() => handleSelectPhrase(phrase)}
                className={`p-4 rounded-lg border transition-all text-left ${
                  practicePhrase === phrase
                    ? 'bg-sky-600/20 border-sky-500/50 text-white ring-1 ring-sky-500/50'
                    : 'bg-slate-700/30 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
                }`}
              >
                <p className="font-medium">{phrase}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recording Controls */}
        {practicePhrase && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">
            <div className="text-center space-y-6">
              {/* Practice Phrase Display */}
              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Practice This:</p>
                <p className="text-2xl font-bold text-white">{practicePhrase}</p>
              </div>

              {/* Recording Button */}
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={recordingState.isRecording ? handleStopRecording : handleStartRecording}
                  disabled={isAnalyzing}
                  className={`relative p-8 rounded-full transition-all duration-300 shadow-lg ${
                    recordingState.isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-500/20 animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white ring-4 ring-emerald-500/20 hover:scale-105'
                  } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <MicrophoneIcon isRecording={recordingState.isRecording} />
                </button>

                <div className="text-center">
                  {recordingState.isRecording ? (
                    <p className="text-red-400 font-semibold">Recording... ({recordingState.recordingTime}s)</p>
                  ) : isAnalyzing ? (
                    <p className="text-sky-400 font-semibold">Analyzing your pronunciation...</p>
                  ) : recordingState.audioBlob ? (
                    <div className="space-y-2">
                      <p className="text-emerald-400 font-semibold">Recording complete!</p>
                      <button
                        onClick={handlePlayRecording}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      >
                        <PlayIcon />
                        Play Recording
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-400">Click the microphone to start recording</p>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Results</h3>

            {/* Transcription */}
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">What You Said:</p>
              <p className="text-lg text-white">{result.transcription}</p>
            </div>

            {/* Pronunciation Analysis */}
            {result.pronunciation_analysis && (
              <div className="space-y-3">
                {/* Score */}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-300">Accuracy Score</p>
                    <p className={`text-2xl font-bold ${
                      result.pronunciation_analysis.score >= 80 ? 'text-emerald-400' :
                      result.pronunciation_analysis.score >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {result.pronunciation_analysis.score}%
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        result.pronunciation_analysis.score >= 80 ? 'bg-emerald-500' :
                        result.pronunciation_analysis.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${result.pronunciation_analysis.score}%` }}
                    />
                  </div>
                </div>

                {/* Mismatched Words */}
                {result.pronunciation_analysis.mismatched_words.length > 0 && (
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-sm font-semibold text-slate-300 mb-3">Words to Improve:</p>
                    <div className="space-y-2">
                      {result.pronunciation_analysis.mismatched_words.map((word, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <span className="text-red-400 font-mono">✗ {word.expected}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-slate-400">You said: <span className="font-mono">{word.actual}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Feedback */}
                {result.feedback && (
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                    <p className="text-sm font-semibold text-sky-400 mb-2">AI Feedback</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{result.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {/* Try Again Button */}
            <button
              onClick={() => {
                setResult(null);
                clearRecording();
              }}
              className="w-full px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
