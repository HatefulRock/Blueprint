import React, { useRef, useEffect } from 'react';
import { TranscriptMessage } from '../types';
import { MessageBubble } from './MessageBubble';

interface TranscriptAreaProps {
  messages: TranscriptMessage[];
  liveUserText: string;
  liveAiText: string;
  error: string | null;
}

const MicrophoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || 'h-6 w-6'} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm-1 3a4 4 0 108 0V4a4 4 0 10-8 0v3zM10 12a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" clipRule="evenodd" />
    <path d="M3 10a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zm13 0a1 1 0 100 2h1a1 1 0 100-2h-1zM10 15a3 3 0 01-3-3H5a5 5 0 1010 0h-2a3 3 0 01-3 3z" />
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

export const TranscriptArea: React.FC<TranscriptAreaProps> = ({
  messages,
  liveUserText,
  liveAiText,
  error,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, liveUserText, liveAiText]);

  const isEmpty = messages.length === 0 && !liveUserText && !liveAiText && !error;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth"
    >
      {/* Error display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500/30 rounded-full flex items-center justify-center">
              <ErrorIcon />
            </div>
            <div>
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-red-300/80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
            <MicrophoneIcon className="w-10 h-10 text-slate-600" />
          </div>
          <p className="text-lg">Press the microphone to start speaking.</p>
        </div>
      )}

      {/* Committed messages */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Live user text (in progress) */}
      {liveUserText && (
        <MessageBubble
          message={{ id: -1, author: 'user', text: liveUserText }}
          isLive
        />
      )}

      {/* Live AI text (in progress) */}
      {liveAiText && (
        <MessageBubble
          message={{ id: -2, author: 'ai', text: liveAiText }}
          isLive
        />
      )}
    </div>
  );
};
