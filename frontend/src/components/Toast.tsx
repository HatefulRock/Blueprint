import React, { useEffect } from 'react'

export const Toast = ({ toast, onClose }: { toast: { type: 'success'|'error'|'info', message: string } | null, onClose: () => void }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose(), 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const bg = toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-slate-700'

  return (
    <div className={`${bg} fixed top-20 left-1/2 -translate-x-1/2 text-white px-4 py-2 rounded shadow-lg z-50`}>{toast.message}</div>
  )
}
