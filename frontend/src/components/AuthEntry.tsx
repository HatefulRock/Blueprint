import React, { useState } from 'react';
import { AuthModal } from './AuthModal';
import { useApp } from '../context/AppContext';

export const AuthEntry: React.FC = () => {
  const { user, setUser } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {!user ? (
        <>
          <button onClick={() => setOpen(true)} className="px-3 py-2 bg-sky-600 rounded-md text-white">Sign In</button>
          <AuthModal open={open} onClose={() => setOpen(false)} />
        </>
      ) : (
        <div className="bg-slate-800/60 px-3 py-2 rounded-md text-slate-200">
          Signed in as <span className="font-semibold text-white">{user.username || `user${user.id}`}</span>
        </div>
      )}
    </div>
  );
};
