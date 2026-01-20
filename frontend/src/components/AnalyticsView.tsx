import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { wordService } from '../services/api';

export const AnalyticsView = ({ userId = 1 }: { userId?: number }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/analytics/practice?user_id=${userId}`);
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) return <div>Loading analytics...</div>;
  if (!stats) return <div>No analytics available.</div>;

  const labels = stats.daily_breakdown.map((d: any) => d.date);
  const counts = stats.daily_breakdown.map((d: any) => d.count);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Reviews',
        data: counts,
        backgroundColor: 'rgba(14,165,233,0.2)',
        borderColor: 'rgba(14,165,233,1)',
        borderWidth: 2,
      },
    ],
  } as any;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Practice Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded">
          <h4 className="text-sm text-slate-400">Total Sessions</h4>
          <p className="text-3xl font-bold">{stats.total_sessions}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded">
          <h4 className="text-sm text-slate-400">Total Reviews</h4>
          <p className="text-3xl font-bold">{stats.total_reviews}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded">
          <h4 className="text-sm text-slate-400">Average Quality</h4>
          <p className="text-3xl font-bold">{stats.average_quality ? stats.average_quality.toFixed(2) : '—'}</p>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded mb-6">
        <h4 className="text-sm text-slate-400 mb-2">Daily Reviews</h4>
        <Line data={chartData} />
      </div>

      <div className="bg-slate-800 p-4 rounded">
        <h4 className="text-sm text-slate-400 mb-2">Top Reviewed Cards</h4>
        <ul className="space-y-2">
          {stats.top_cards.map((c: any) => (
            <li key={c.card_id} className="p-2 bg-slate-900 rounded">
              <div className="text-sm text-sky-400">{c.count} reviews</div>
              <div className="text-white font-semibold">{c.front}</div>
              <div className="text-slate-400 text-sm">{c.back}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
