'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{ toast: (message: string, tone?: ToastTone) => void }>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TONE: Record<ToastTone, string> = {
  success: 'var(--color-ok)',
  error: 'var(--color-bad)',
  info: 'var(--color-violet)',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-3), { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4200);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-[80] flex flex-col gap-2 pointer-events-none w-[calc(100%-2rem)] sm:w-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="enter pointer-events-auto flex items-stretch overflow-hidden rounded-[4px] border border-[var(--color-line-strong)] bg-[#100f15]/95 backdrop-blur shadow-[0_18px_44px_rgba(0,0,0,0.6)] sm:max-w-sm"
          >
            <span aria-hidden="true" className="w-[3px] shrink-0" style={{ background: TONE[t.tone], boxShadow: `0 0 12px ${TONE[t.tone]}` }} />
            <p className="text-[13.5px] font-medium leading-snug px-4 py-3">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
