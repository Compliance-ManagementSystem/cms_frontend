import React, { createContext, useContext, useCallback } from 'react';
import toast, { Toaster, type ToastOptions } from 'react-hot-toast';

interface ToastContextValue {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  dismiss: (toastId?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const success = useCallback(
    (message: string, options?: ToastOptions) => toast.success(message, options),
    []
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) => toast.error(message, options),
    []
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) =>
      toast(message, { icon: 'ℹ️', ...options }),
    []
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) =>
      toast(message, { icon: '⚠️', ...options }),
    []
  );

  const dismiss = useCallback((toastId?: string) => toast.dismiss(toastId), []);

  return (
    <ToastContext.Provider value={{ success, error, info, warning, dismiss }}>
      {children}
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid rgba(100, 116, 139, 0.3)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#1e293b' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
          },
        }}
      />
    </ToastContext.Provider>
  );
};

export const useToastContext = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return ctx;
};
