'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { deleteSession } from '@/store/slices/sessionsSlice';
import { useToast } from '@/lib/toast';
import DeleteModal from './DeleteModal';

interface ChatMenuProps {
  sessionId: string;
  onClose?: () => void;
  onRename?: () => void;
  isLastItem?: boolean;
}

export default function ChatMenu({ sessionId, onClose, onRename, isLastItem = false }: ChatMenuProps) {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);


  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleRename = () => {
    setIsOpen(false);
    onRename?.();
  };


  const handleDeleteClick = () => {
    setIsOpen(false);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    
    try {
      const result = await dispatch(deleteSession(sessionId)).unwrap();
      showToast({ 
        type: 'success', 
        message: result.message
      });
      setShowDeleteModal(false);
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to delete session';
      showToast({ 
        type: 'error', 
        message: errorMessage 
      });
      console.error('Failed to delete session:', error);
    } finally {
      setIsDeleting(false);
      onClose?.();
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    onClose?.();
  };


  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        className={`flex opacity-100 lg:hidden lg:opacity-0 lg:group-hover:flex lg:group-hover:opacity-100 bg-transparent border-none text-[#546e7a] cursor-pointer p-1.5 rounded transition-all items-center justify-center w-7 h-7 flex-shrink-0 touch-manipulation hover:bg-[rgba(21,101,192,0.1)] active:bg-[rgba(21,101,192,0.15)] hover:text-[#1565c0] disabled:opacity-70 disabled:cursor-not-allowed ${isDeleting ? 'text-[#1565c0] cursor-not-allowed' : ''}`}
        onClick={handleMenuToggle}
        aria-label="Chat options"
        title="More options"
        disabled={isDeleting}
      >
        {isDeleting ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="31.416" strokeDashoffset="31.416" opacity="0.3"/>
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
          </svg>
        )}
      </button>

      {isOpen && (
        <div className={`absolute ${isLastItem ? 'bottom-full mb-0.5' : 'top-full mt-0.5'} right-0 bg-white border border-[rgba(21,101,192,0.15)] rounded-md shadow-[0_4px_12px_rgba(15,23,42,0.12)] z-[1000] min-w-[100px] p-0.5`}>
          <button className="flex items-center justify-center w-full px-3 py-1.5 bg-transparent border-none text-[#546e7a] cursor-pointer text-[13px] text-center transition-all font-normal hover:bg-[rgba(21,101,192,0.08)] hover:text-[#1565c0]" onClick={handleRename}>
            Rename
          </button>
          <button className="flex items-center justify-center w-full px-3 py-1.5 bg-transparent border-none text-[#d32f2f] cursor-pointer text-[13px] text-center transition-all font-normal hover:bg-[rgba(211,47,47,0.08)] hover:text-[#c62828]" onClick={handleDeleteClick}>
            Delete
          </button>
        </div>
      )}
      
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
