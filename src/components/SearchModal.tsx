'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCurrentSession, fetchSession } from '@/store/slices/sessionsSlice';
import { setFilters, clearResults, searchStudies } from '@/store/slices/searchSlice';
import { clearMessages, clearAllStudyChatMessages, addMessage, setReports, clearReports } from '@/store/slices/chatSlice';
import { SearchFilters } from '@/lib/types';

// Empty filters constant for resetting
const emptyFilters: SearchFilters = {
  condition: '',
  intervention: '',
  location: '',
  status: [],
  studyType: [],
  phase: [],
  sex: '',
  ageGroups: [],
  healthyVolunteers: false,
  hasResults: '',
  hasProtocol: false,
  hasSAP: false,
  hasICF: false,
  funderType: [],
  studyStartFrom: '',
  studyStartTo: '',
  primaryCompletionFrom: '',
  primaryCompletionTo: '',
  title: '',
  outcome: '',
  sponsor: '',
  nctId: '',
  fdaaa801Violation: false,
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const dispatch = useAppDispatch();
  const { sessions, currentSessionId } = useAppSelector((state) => state.sessions);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSessions, setFilteredSessions] = useState(sessions);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter sessions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
    } else {
      const filtered = sessions.filter(session =>
        session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSessions(filtered);
    }
  }, [searchQuery, sessions]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleNewChat = () => {
    // Clear current session
    dispatch(setCurrentSession(null));
    
    // Clear all filters
    dispatch(setFilters(emptyFilters));
    
    // Clear search results
    dispatch(clearResults());
    
    // Clear chat messages (all studies chat)
    dispatch(clearMessages());
    
    // Clear all study chat messages (per-study chats)
    dispatch(clearAllStudyChatMessages());
    
    onClose();
  };

  const handleChatSelect = async (sessionId: string) => {
    // Capture the session ID for this specific request
    const requestedSessionId = sessionId;
    
    // Set current session immediately - this will update expectedSessionId in reducers
    dispatch(setCurrentSession(requestedSessionId));
    
    // Clear previous results immediately when switching chats
    dispatch(clearResults());
    
    try {
      // Fetch session - reducer will validate response matches expected session ID
      const result = await dispatch(fetchSession(requestedSessionId)).unwrap();
      
      // Verify we're still on the same session (check currentSessionId from Redux)
      // The reducer validation should handle this, but we double-check here
      if (result.id !== requestedSessionId) {
        // Response doesn't match requested session, ignore it
        return;
      }
      
      if (result.last_filters) {
        // Set filters in Redux state first so SearchForm can sync
        dispatch(setFilters(result.last_filters));
        // Then perform the search with session ID
        // Reducer will validate response matches expected session ID
        dispatch(searchStudies({ 
          filters: result.last_filters, 
          page: 1, 
          sessionId: requestedSessionId 
        }));
      }
      
      dispatch(clearMessages());
      dispatch(clearReports());
      if (result.messages && result.messages.length > 0) {
        // Filter out error messages about cancellations when loading previous chats
        const filteredMessages = result.messages.filter((msg: any) => {
          if (msg.role === 'assistant' && msg.content) {
            const content = typeof msg.content === 'string' ? msg.content : '';
            if (content.includes('Error: Request cancelled') || 
                content.includes('Request cancelled by user') ||
                content.startsWith('Error: Request cancelled')) {
              return false;
            }
          }
          return true;
        });
        filteredMessages.forEach((msg: any) => {
          dispatch(addMessage(msg));
        });
      }
      if (result.reports && result.reports.length > 0) {
        dispatch(setReports(result.reports));
      }
    } catch (error: any) {
      // Ignore abort errors (handled by reducer)
      if (error !== 'Request aborted') {
        console.error('Failed to load session:', error);
      }
    }
    
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-[rgba(21,101,192,0.4)] backdrop-blur-sm z-[2000] flex items-center justify-center p-5 transition-opacity ${
      isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[600px] max-h-[80vh] flex flex-col shadow-[0_24px_48px_rgba(21,101,192,0.2)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-[rgba(21,101,192,0.1)] flex items-center">
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search chats..." 
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 border border-[rgba(21,101,192,0.2)] rounded-lg text-base outline-none transition-colors focus:border-[#1565c0]"
            style={{ fontSize: '16px' }}
          />
          <button className="bg-transparent border-none text-[#546e7a] text-2xl cursor-pointer p-1 ml-3 transition-colors hover:text-[#1565c0]" onClick={onClose}>×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all mb-4 border border-transparent hover:bg-[rgba(21,101,192,0.08)] hover:border-[rgba(21,101,192,0.15)]" onClick={handleNewChat}>
            <svg className="w-5 h-5 text-[#1565c0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14m-7-7h14"/>
            </svg>
            <span className="text-[#37474f] font-medium">New chat</span>
          </div>
          
          {filteredSessions.length > 0 && (
            <div className="flex flex-col gap-1">
              {filteredSessions.map(session => (
                <div 
                  key={session.id}
                  className={`flex items-center gap-3 px-4 py-3 my-0.5 rounded-lg cursor-pointer transition-all text-[#37474f] min-h-[44px] leading-relaxed box-border ${
                    currentSessionId === session.id 
                      ? 'bg-[rgba(21,101,192,0.12)] text-[#1565c0] border border-[rgba(21,101,192,0.2)]' 
                      : 'hover:bg-[rgba(21,101,192,0.08)] hover:text-[#1565c0]'
                  }`}
                  onClick={() => handleChatSelect(session.id)}
                >
                  <svg className="w-[18px] h-[18px] flex-shrink-0 text-[#546e7a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{session.title || 'New Chat'}</span>
                </div>
              ))}
            </div>
          )}
          
          {filteredSessions.length === 0 && searchQuery.trim() && (
            <div className="text-center p-10 text-[#546e7a]">
              <p className="m-0 text-sm">No chats found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

