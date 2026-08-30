import React, { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ToastContext } from './ToastContext';
import type { ToastContextValue } from './ToastContext';
import './Toast.css';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  exiting: boolean;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const DURATION = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  const add = useCallback(
    (type: ToastType, message: string) => {
      const id = ++counterRef.current;
      setToasts(prev => [...prev, { id, type, message, exiting: false }]);
      setTimeout(() => remove(id), DURATION);
    },
    [remove]
  );

  const contextValue: ToastContextValue = {
    success: (msg) => add('success', msg),
    error: (msg) => add('error', msg),
    info: (msg) => add('info', msg),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
            >
              <span className="toast-icon">{ICONS[toast.type]}</span>
              <span className="toast-message">{toast.message}</span>
              <button
                className="toast-close"
                onClick={() => remove(toast.id)}
                aria-label="Fechar notificação"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
