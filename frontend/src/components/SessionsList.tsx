import React, { useEffect, useState } from 'react';

interface SessionItem {
  id: number;
  user_id: number;
  session_type: string;
  score?: number;
  timestamp?: string;
}

export const SessionsList = ({ onSelect, apiBase = '' }: { onSelect: (id: number) => void, apiBase?: string }) => {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const base = apiBase || (process.env.REACT_APP_API_URL || '');
        const res = await fetch(`${base}/practice/sessions?user_id=1&limit=50`);
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (e) {
        console.error('Failed to load sessions', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apiBase]);

  if (loading) return <div>Loading sessions...</div>;
  return (
    <div className="p-4">
      <h4 className="text-lg font-semibold text-white mb-3">Recent Sessions</h4>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="p-3 bg-slate-800 rounded flex justify-between items-center">
            <div>
              <div className="text-sm text-slate-400">{s.session_type}</div>
              <div className="text-white font-medium">Session #{s.id}</div>
              <div className="text-xs text-slate-500">{s.timestamp ? new Date(s.timestamp).toLocaleString() : ''}</div>
            </div>
            <button onClick={() => onSelect(s.id)} className="px-3 py-1 bg-sky-600 rounded">Open</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
