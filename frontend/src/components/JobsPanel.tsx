import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

export const JobsPanel = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const { user } = useApp();

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        // For demo, get jobs from localStorage or similar; in production you'd call GET /jobs/list
        const stored = localStorage.getItem('jobs')
        const parsed = stored ? JSON.parse(stored) : []
        if (mounted) setJobs(parsed)
      } catch (e) {
        console.warn(e)
      }
    }
    poll();
    const t = setInterval(poll, 5000);
    return () => { mounted = false; clearInterval(t); }
  }, [])

  return (
    <div className="fixed right-4 bottom-4 w-80 p-4 bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
      <h4 className="text-sm font-bold text-white mb-2">Background Jobs</h4>
      {jobs.length === 0 ? <p className="text-slate-400 text-sm">No active jobs</p> : (
        <div className="space-y-2 max-h-56 overflow-auto">
          {jobs.map((j,i) => (
            <div key={i} className="p-2 bg-slate-700 rounded">
              <div className="flex justify-between text-sm text-slate-200">
                <span>{j.job_id}</span>
                <span className="text-slate-400">{j.status || 'queued'}</span>
              </div>
              <div className="text-xs text-slate-400">{j.desc || 'Generate cards'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
