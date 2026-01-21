import React, { useState } from "react";
import { userService } from "../services/api";
import { useApp } from "../context/AppContext";

export const AuthModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { setUser } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register') {
        const res: any = await userService.register({ username, password }).catch(() => null);
        if (!res || !res.token) throw new Error('Registration failed');
        try { localStorage.setItem('authToken', res.token); } catch (e) {}
        setUser({ id: res.id, username: res.username });
        onClose();
        return;
      } else {
        const res: any = await userService.login({ username, password }).catch(() => null);
        if (!res || !res.token) throw new Error('Login failed');
        try { localStorage.setItem('authToken', res.token); } catch (e) {}
        setUser({ id: res.id, username: res.username });
        onClose();
        return;
      }
    } catch (e: any) {
      setError(e?.message || 'Auth failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{mode === 'login' ? 'Sign In' : 'Create Account'}</h3>
          <button className="text-slate-400" onClick={onClose}>✕</button>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-slate-300 mb-1">Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-700 text-slate-200" />
        </div>
        <div className="mb-4">
          <label className="block text-sm text-slate-300 mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-700 text-slate-200" />
        </div>

        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}

        <div className="flex gap-2">
          <button onClick={handleAuth} disabled={loading} className="px-4 py-2 bg-sky-600 rounded text-white">
            {loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create')}
          </button>
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="px-4 py-2 bg-slate-700 rounded text-slate-200">
            {mode === 'login' ? 'Create account' : 'Have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
