import React from 'react';

interface ConversationControlsProps {
  isActive: boolean;
  onToggle: () => void;
  onSendText: () => void;
  textValue: string;
  onTextChange: (value: string) => void;
  disabled?: boolean;
}

const MicrophoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || 'h-6 w-6'} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm-1 3a4 4 0 108 0V4a4 4 0 10-8 0v3zM10 12a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" clipRule="evenodd" />
    <path d="M3 10a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zm13 0a1 1 0 100 2h1a1 1 0 100-2h-1zM10 15a3 3 0 01-3-3H5a5 5 0 1010 0h-2a3 3 0 01-3 3z" />
  </svg>
);

const StopIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || 'h-6 w-6'} viewBox="0 0 20 20" fill="currentColor">
    <rect x="6" y="6" width="8" height="8" rx="1" />
  </svg>
);

export const ConversationControls: React.FC<ConversationControlsProps> = ({
  isActive,
  onToggle,
  onSendText,
  textValue,
  onTextChange,
  disabled = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSendText();
    }
  };

  return (
    <div className="p-6 bg-slate-800/30 border-t border-slate-700/50">
      {/* Text input - only shown when session is active */}
      {isActive && (
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Type a message..."
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-sky-500 transition-colors"
          />
          <button
            onClick={onSendText}
            disabled={!textValue.trim()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      )}

      {/* Main control button */}
      <div className="flex justify-center items-center gap-6">
        <button
          onClick={onToggle}
          disabled={disabled}
          className={`relative group p-4 rounded-full transition-all duration-300 shadow-lg ${
            isActive
              ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-500/20'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white ring-4 ring-emerald-500/20 hover:scale-105'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isActive ? 'Stop conversation' : 'Start conversation'}
        >
          {isActive ? (
            <StopIcon className="w-8 h-8" />
          ) : (
            <MicrophoneIcon className="w-8 h-8" />
          )}
        </button>
      </div>

      {/* Hints */}
      <div className="text-center mt-3">
        <p className="text-xs text-slate-500">
          {isActive ? (
            <>
              Click to end conversation
              <span className="mx-2 text-slate-600">|</span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Esc</kbd> to stop
            </>
          ) : (
            <>
              Click to start live conversation
              <span className="mx-2 text-slate-600">|</span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Space</kbd> to toggle
            </>
          )}
        </p>
      </div>
    </div>
  );
};
