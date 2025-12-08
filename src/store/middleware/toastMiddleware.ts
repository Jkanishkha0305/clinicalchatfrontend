import { Middleware } from '@reduxjs/toolkit';

// This would need to be initialized with a toast function
let toastFunction: ((message: string, options?: any) => void) | null = null;

export const setToastFunction = (fn: (message: string, options?: any) => void) => {
  toastFunction = fn;
};

export const toastMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  // Handle auth-related actions
  if (toastFunction && action && typeof action === 'object' && 'type' in action && typeof action.type === 'string') {
    if (action.type.endsWith('/fulfilled')) {
      if (action.type.startsWith('auth/login')) {
        toastFunction('Successfully logged in!', { type: 'success', title: 'Welcome Back' });
      } else if (action.type.startsWith('auth/signup')) {
        toastFunction('Account created successfully!', { type: 'success', title: 'Welcome!' });
      }
    } else if (action.type.endsWith('/rejected')) {
      if (action.type.startsWith('auth/')) {
        const payload = ('payload' in action && typeof action.payload === 'string') ? action.payload : 'Operation failed';
        toastFunction(payload, { type: 'error', title: 'Error' });
      }
    }
  }

  return result;
};
