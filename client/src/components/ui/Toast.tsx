import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

export const ToastHub: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, any>>({});

  useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent;
      const detail = ce.detail || {};
      const item: ToastItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        message: String(detail.message || 'Something went wrong'),
        type: (detail.type as ToastType) || 'info',
      };
      setToasts((prev) => [item, ...prev].slice(0, 5));
      timers.current[item.id] = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, Math.min(Math.max((detail.duration as number) || 4000, 1500), 15000));
    }
    window.addEventListener('app:toast', onToast as any);
    return () => {
      window.removeEventListener('app:toast', onToast as any);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const close = (id: string) => {
    clearTimeout(timers.current[id]);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const styleByType: Record<ToastType, string> = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-green-200 bg-green-50 text-green-900',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    error: 'border-red-200 bg-red-50 text-red-900',
  };

  return (
    <div className="fixed z-[100] bottom-4 right-4 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-md border px-3 py-2 shadow-md ${styleByType[t.type]} animate-in fade-in slide-in-from-bottom-2`}
        >
          <div className="flex items-start gap-2">
            <div className="text-sm leading-snug flex-1 break-words">{t.message}</div>
            <button
              onClick={() => close(t.id)}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
              aria-label="Close"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper for programmatic toasts
export function emitToast(message: string, type: ToastType = 'info', duration = 4000) {
  try {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type, duration } }));
  } catch {}
}


