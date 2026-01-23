import React, { useState } from 'react';
import { AuthModal } from './AuthModal';
import { useApp } from '../context/AppContext';

export const AuthEntry: React.FC = () => {
  const { user, logout } = useApp();
  const [open, setOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {!user ? (
        <>
          <button onClick={() => setOpen(true)} className="px-3 py-2 bg-sky-600 rounded-md text-white">Sign In</button>
          <AuthModal open={open} onClose={() => setOpen(false)} />
        </>
      ) : (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="bg-slate-800/60 px-3 py-2 rounded-md text-slate-200 hover:bg-slate-700/60 transition-colors"
          >
            Signed in as <span className="font-semibold text-white">{user.username || `user${user.id}`}</span>
          </button>
          {showMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-slate-800 rounded-md shadow-lg overflow-hidden min-w-[150px]">
              <button
                onClick={() => {
                  logout();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
