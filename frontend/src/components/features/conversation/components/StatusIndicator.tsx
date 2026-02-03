import React from 'react';
import { ConnectionStatus } from '../types';

interface StatusIndicatorProps {
  status: ConnectionStatus;
}

const STATUS_CONFIG: Record<ConnectionStatus, { text: string; color: string; dotColor: string }> = {
  idle: { text: 'Ready to start', color: 'text-slate-400', dotColor: 'bg-slate-500' },
  connecting: { text: 'Connecting...', color: 'text-sky-400', dotColor: 'bg-sky-500 animate-pulse' },
  listening: { text: 'Listening...', color: 'text-emerald-400', dotColor: 'bg-emerald-500 animate-ping' },
  speaking: { text: 'AI Speaking...', color: 'text-sky-400', dotColor: 'bg-sky-500 animate-pulse' },
  error: { text: 'Error', color: 'text-red-500', dotColor: 'bg-red-500' },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const { text, color, dotColor } = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
      <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className={`text-xs font-medium ${color}`}>{text}</span>
    </div>
  );
};
