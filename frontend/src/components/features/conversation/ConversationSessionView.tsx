import React, { useEffect, useState } from 'react';

interface Message {
  id: number;
  author: string;
  text: string;
  timestamp?: string;
}

export const ConversationSessionView = ({ sessionId, apiBase = '' }: { sessionId: number | null, apiBase?: string }) => {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      setLoading(true);
      try {
        const base = apiBase || (process.env.REACT_APP_API_URL || '');
        const res = await fetch(`${base}/conversation/session/${sessionId}`);
        const data = await res.json();
        setMessages(data || []);
      } catch (e) {
        console.error('Failed to load session', e);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId, apiBase]);

  if (!sessionId) return <div className="p-4 text-slate-400">Select a session to view its messages.</div>;
  if (loading) return <div className="p-4">Loading session...</div>;
  if (!messages) return <div className="p-4">No messages found.</div>;

  return (
    <div className="p-4 space-y-3">
      <h4 className="text-lg font-semibold text-white mb-2">Conversation Session #{sessionId}</h4>
      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`p-3 rounded-xl ${m.author === 'ai' ? 'bg-slate-700 text-slate-200' : 'bg-sky-600 text-white flex-row-reverse'}`}>
            <div className="text-sm">{m.text}</div>
            <div className="text-xs text-slate-400 mt-2">{m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
