'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  clearToastsByType: (type: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    // Clear existing toasts of the same type to prevent duplicates
    setToasts(prev => {
      const filtered = prev.filter(existingToast => 
        existingToast.type !== newToast.type || 
        existingToast.message !== newToast.message
      );
      
      // Limit to maximum 3 toasts at once
      const limited = filtered.slice(-2); // Keep only the last 2 toasts
      return [...limited, newToast];
    });

    // Auto-dismiss is handled in the ToastContainer component
  }, [removeToast]);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const clearToastsByType = useCallback((type: Toast['type']) => {
    setToasts(prev => prev.filter(toast => toast.type !== type));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, clearAllToasts, clearToastsByType }}>
      {children}
    </ToastContext.Provider>
  );
};

// Convenience functions for different toast types
export const useToastHelpers = () => {
  const { showToast } = useToast();

  return useMemo(() => ({
    success: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
      showToast({ type: 'success', message, ...options }),
    
    error: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
      showToast({ type: 'error', message, ...options }),
    
    info: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
      showToast({ type: 'info', message, ...options }),
    
    warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
      showToast({ type: 'warning', message, ...options }),
  }), [showToast]);
};
