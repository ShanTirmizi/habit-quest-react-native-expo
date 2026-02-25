import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'xp' | 'level' | 'hp' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  xp?: number;
  type: ToastType;
}

interface ToastContextValue {
  toast: ToastItem | null;
  showToast: (message: string, xp?: number, type?: ToastType) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismissToast = useCallback(() => {
    setToast(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const showToast = useCallback((message: string, xp?: number, type: ToastType = 'xp') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    const id = Date.now().toString();
    setToast({ id, message, xp, type });
    timeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
