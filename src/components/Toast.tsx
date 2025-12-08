'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    showToast: (type: 'success' | 'error' | 'info', message: string, options?: { title?: string; duration?: number }) => void;
  }
}

export default function ToastContainer() {
  useEffect(() => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const DEFAULT_TITLES = {
      success: 'Success',
      error: 'Something went wrong',
      info: 'Notice'
    };

    const removeToast = (toast: HTMLElement) => {
      if (!toast) return;
      toast.classList.add('toast-hide');
      setTimeout(() => {
        toast.remove();
      }, 120);
    };

    window.showToast = function showToast(type: 'success' | 'error' | 'info', message: string, options: { title?: string; duration?: number } = {}) {
      if (!container || !message) {
        return;
      }

      const toast = document.createElement('div');
      toast.className = `toast ${type || 'info'}`;

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'toast-body';

      const title = document.createElement('strong');
      title.textContent = options.title || DEFAULT_TITLES[type] || DEFAULT_TITLES.info;
      const body = document.createElement('p');
      body.textContent = message;

      contentWrapper.appendChild(title);
      contentWrapper.appendChild(body);
      toast.appendChild(contentWrapper);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.setAttribute('aria-label', 'Dismiss');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => removeToast(toast));
      toast.appendChild(closeBtn);

      container.appendChild(toast);

      const removeDelay = typeof options.duration === 'number' ? options.duration : 5200;
      if (removeDelay > 0) {
        setTimeout(() => removeToast(toast), removeDelay);
      }

      toast.addEventListener('animationend', (event: any) => {
        if (event.animationName === 'fade-out') {
          toast.remove();
        }
      });
    };
  }, []);

  return <div id="toastContainer" className="toast-container"></div>;
}

