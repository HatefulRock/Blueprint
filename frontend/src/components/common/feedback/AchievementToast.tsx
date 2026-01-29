/*
import React, { useEffect } from 'react';
import { Achievement } from '../types';

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
}

const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13.5a9 9 0 110 18 9 9 0 010-18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6.75a3.75 3.75 0 017.5 0V19M12 21a2.25 2.25 0 01-2.25-2.25V15a2.25 2.25 0 014.5 0v3.75A2.25 2.25 0 0112 21z" />
    </svg>
)


export const AchievementToast = ({ achievement, onClose }: AchievementToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  useEffect(() => {
    // Inject animation styles only once
    const styleId = 'toast-animations';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          @keyframes toastIn {
            from {
              transform: translate(-50%, -100%);
              opacity: 0;
            }
            to {
              transform: translate(-50%, 0);
              opacity: 1;
            }
          }
          .animate-toast-in {
            animation: toastIn 0.5s ease-out forwards;
          }
        `;
        document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-800 border border-amber-500 rounded-lg shadow-2xl p-4 flex items-center gap-4 z-50 animate-toast-in">
      <TrophyIcon />
      <div>
        <p className="font-bold text-white">Achievement Unlocked!</p>
        <p className="text-slate-300">{achievement.name}</p>
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
    </div>
  );
};
*/
