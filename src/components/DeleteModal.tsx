'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  isLoading?: boolean;
}

export default function DeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete Chat",
  message = "Are you sure you want to delete this chat? This action cannot be undone.",
  isLoading = false
}: DeleteModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-[rgba(21,101,192,0.4)] backdrop-blur-sm z-[5000] flex items-center justify-center p-5" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl w-full max-w-[400px] shadow-[0_24px_48px_rgba(21,101,192,0.2)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[rgba(21,101,192,0.1)] flex items-center justify-between">
          <h3 className="text-xl font-semibold text-[#37474f] m-0">{title}</h3>
          <button 
            className="bg-transparent border-none text-[#546e7a] text-2xl cursor-pointer p-1 transition-colors hover:text-[#1565c0] disabled:opacity-60 disabled:cursor-not-allowed" 
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        <div className="p-6">
          <p className="text-[#546e7a] text-[15px] leading-relaxed m-0">{message}</p>
        </div>
        <div className="p-6 border-t border-[rgba(21,101,192,0.1)] flex gap-3 justify-end">
          <button 
            className="px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all border-none bg-[rgba(21,101,192,0.1)] text-[#1565c0] hover:bg-[rgba(21,101,192,0.15)] disabled:opacity-60 disabled:cursor-not-allowed" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all border-none bg-[#d32f2f] text-white hover:bg-[#c62828] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="31.416" strokeDashoffset="31.416" opacity="0.3"/>
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
                </svg>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level, ensuring it's always centered on viewport
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
}

