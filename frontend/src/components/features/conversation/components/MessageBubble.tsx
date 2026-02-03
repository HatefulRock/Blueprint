import React from 'react';
import { TranscriptMessage } from '../types';

interface MessageBubbleProps {
  message: TranscriptMessage;
  isLive?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLive }) => {
  const isUser = message.author === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-start gap-3 max-w-xl ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0 mt-1 ${
            isUser ? 'bg-slate-600' : 'bg-sky-600'
          }`}
        >
          {isUser ? 'You' : 'AI'}
        </div>

        {/* Message bubble */}
        <div
          className={`p-4 rounded-2xl ${
            isUser
              ? 'bg-sky-600 text-white rounded-tr-none'
              : 'bg-slate-700 text-slate-200 rounded-tl-none'
          } ${isLive ? 'opacity-80' : ''}`}
        >
          <p className="leading-relaxed">
            {message.text}
            {isLive && (
              <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
