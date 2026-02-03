import React, { useState, useCallback, useEffect } from 'react';
import { CONVERSATION_SCENARIOS, ConversationScenario } from '../../../data/conversationScenarios';
import { ChatBubbleIcon } from '../../common/icons/ChatBubbleIcon';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';

// Hooks
import { useGeminiLiveSession } from './hooks/useGeminiLiveSession';
import { usePCMAudioPlayer } from './hooks/usePCMAudioPlayer';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useConversationTranscript } from './hooks/useConversationTranscript';
import { useConversationReview } from './hooks/useConversationReview';

// Components
import { StatusIndicator } from './components/StatusIndicator';
import { ScenarioSelector } from './components/ScenarioSelector';
import { TranscriptArea } from './components/TranscriptArea';
import { AudioVisualizer } from './components/AudioVisualizer';
import { ConversationControls } from './components/ConversationControls';
import { ConversationReviewPanel } from './components/ConversationReviewPanel';

interface ConversationViewProps {
  targetLanguage: string;
}

export const ConversationView = ({ targetLanguage }: ConversationViewProps) => {
  const [selectedScenario, setSelectedScenario] = useState<ConversationScenario>(CONVERSATION_SCENARIOS[0]);
  const [textInput, setTextInput] = useState('');

  // Initialize hooks
  const transcript = useConversationTranscript();
  const player = usePCMAudioPlayer();
  const review = useConversationReview();

  // Session handlers need transcript methods
  const session = useGeminiLiveSession({
    onUserTranscript: transcript.appendUserText,
    onAiTranscript: transcript.appendAiText,
    onAudioData: (data) => player.play(data),
    onTurnComplete: () => {
      transcript.commitLiveTexts();
    },
    onInterrupted: () => {
      player.stop();
      transcript.commitAiText();
    },
  });

  // Audio capture with session binding
  const capture = useAudioCapture({
    onAudioData: session.sendAudioData,
  });

  // Combined error from session or capture
  const error = session.error || capture.error;

  // Start session handler
  const handleStartSession = useCallback(async () => {
    transcript.clear();
    review.resetReview();
    await player.resume();

    await session.startSession({
      scenario: selectedScenario.getPrompt(targetLanguage),
      targetLanguage,
    });

    // Start audio capture after session connects
    await capture.startCapture();
  }, [selectedScenario, targetLanguage, transcript, review, player, session, capture]);

  // Stop session handler
  const handleStopSession = useCallback(() => {
    capture.stopCapture();
    session.stopSession();
    player.stop();

    // Commit any remaining live text
    const finalMessages = transcript.commitLiveTexts();
    const allMessages = transcript.getMessagesRef();

    // Trigger review if we have messages
    if (allMessages.length >= 2) {
      review.analyzeConversation(allMessages, targetLanguage);
    }
  }, [capture, session, player, transcript, review, targetLanguage]);

  // Toggle session
  const handleToggleSession = useCallback(() => {
    if (session.isActive) {
      handleStopSession();
    } else {
      handleStartSession();
    }
  }, [session.isActive, handleStartSession, handleStopSession]);

  // Send text message
  const handleSendText = useCallback(() => {
    const text = textInput.trim();
    if (!text) return;

    setTextInput('');
    transcript.appendUserText(text);
    session.sendTextMessage(text);
  }, [textInput, transcript, session]);

  // Select scenario
  const handleSelectScenario = useCallback((scenario: ConversationScenario) => {
    if (session.isActive) {
      handleStopSession();
    }
    setSelectedScenario(scenario);
    transcript.clear();
    review.resetReview();
  }, [session.isActive, handleStopSession, transcript, review]);

  // New conversation from review panel
  const handleNewConversation = useCallback(() => {
    review.resetReview();
    transcript.clear();
  }, [review, transcript]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: ' ', handler: handleToggleSession, description: 'Toggle session' },
    { key: 'Escape', handler: handleStopSession, description: 'End session', disabled: !session.isActive },
  ], true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      capture.stopCapture();
      session.stopSession();
      player.stop();
    };
  }, []);

  return (
    <div className="flex-1 p-6 md:p-8 flex gap-6 h-[calc(100vh-80px)] overflow-hidden">
      {/* Sidebar: Scenario Selection */}
      <ScenarioSelector
        scenarios={CONVERSATION_SCENARIOS}
        selected={selectedScenario}
        onSelect={handleSelectScenario}
        disabled={session.isActive}
      />

      {/* Main: Chat Interface */}
      <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-2xl flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ChatBubbleIcon className="w-6 h-6 text-sky-400" />
            <h3 className="font-bold text-white">
              {selectedScenario.name} ({targetLanguage})
            </h3>
          </div>
          <StatusIndicator status={session.status} />
        </div>

        {/* Transcript */}
        <TranscriptArea
          messages={transcript.messages}
          liveUserText={transcript.liveUserText}
          liveAiText={transcript.liveAiText}
          error={error}
        />

        {/* Review Panel Overlay */}
        {review.showReview && (
          <ConversationReviewPanel
            feedback={review.feedback}
            isLoading={review.isLoading}
            onClose={review.closeReview}
            onNewConversation={handleNewConversation}
          />
        )}

        {/* Audio Visualizer */}
        {session.isActive && (
          <AudioVisualizer
            audioLevel={capture.audioLevel}
            isActive={capture.isCapturing}
          />
        )}

        {/* Controls Footer */}
        <ConversationControls
          isActive={session.isActive}
          onToggle={handleToggleSession}
          onSendText={handleSendText}
          textValue={textInput}
          onTextChange={setTextInput}
        />
      </div>
    </div>
  );
};
