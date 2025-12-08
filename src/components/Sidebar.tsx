'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSessions, setCurrentSession, fetchSession, updateSession } from '@/store/slices/sessionsSlice';
import { logout } from '@/store/slices/authSlice';
import { searchStudies, setFilters, clearResults } from '@/store/slices/searchSlice';
import { clearMessages, clearAllStudyChatMessages, addMessage, setReports, clearReports } from '@/store/slices/chatSlice';
import { SearchFilters } from '@/lib/types';
import { useSearchMutation } from '@/hooks/useSearchQuery';
import ChatMenu from './ChatMenu';

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

interface SidebarProps {
  onOpenSearchModal: () => void;
  onClose?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function Sidebar({ onOpenSearchModal, onClose, onCollapsedChange }: SidebarProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { sessions, currentSessionId } = useAppSelector((state) => state.sessions);
  const searchMutation = useSearchMutation();
  // Track the session ID we're currently loading to prevent race conditions
  const loadingSessionIdRef = useRef<string | null>(null);
  // Track the current search request to cancel it when switching chats
  const currentSearchAbortRef = useRef<(() => void) | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    // Initialize state from localStorage, but only on desktop (lg breakpoint)
    if (typeof window !== 'undefined') {
      // Don't collapse on mobile - only on desktop
      const isMobile = window.innerWidth < 1024;
      if (isMobile) return false;
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [chatHistoryCollapsed, setChatHistoryCollapsed] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const renameButtonClickedRef = useRef(false);

  useEffect(() => {
    // Load chat sessions
    if (user && !user.is_guest) {
      dispatch(fetchSessions());
    }
  }, [user, dispatch]);

  // Cleanup: Cancel any pending search when component unmounts
  useEffect(() => {
    return () => {
      if (currentSearchAbortRef.current) {
        currentSearchAbortRef.current();
        currentSearchAbortRef.current = null;
      }
    };
  }, []);

  // Notify parent of initial collapsed state
  useEffect(() => {
    onCollapsedChange?.(collapsed);
  }, []); // Only on mount

  // Handle window resize to prevent collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const isMobile = window.innerWidth < 1024;
        if (isMobile && collapsed) {
          setCollapsed(false);
          onCollapsedChange?.(false);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [collapsed, onCollapsedChange]);

  // Focus input when entering rename mode
  useEffect(() => {
    if (renamingSessionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingSessionId]);

  // Close profile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && profileMenuOpen) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileMenuOpen]);

  const handleStartRename = (sessionId: string, currentTitle: string) => {
    setRenamingSessionId(sessionId);
    setRenameValue(currentTitle);
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (renamingSessionId && renameValue.trim()) {
      try {
        await dispatch(updateSession({
          id: renamingSessionId,
          data: { title: renameValue.trim() }
        })).unwrap();
      } catch (error) {
        console.error('Failed to rename session:', error);
      }
    }
    setRenamingSessionId(null);
    setRenameValue('');
  };

  const handleRenameBlur = async () => {
    // Small delay to allow button clicks to process first
    setTimeout(async () => {
      // Skip auto-save if a button was clicked
      if (renameButtonClickedRef.current) {
        renameButtonClickedRef.current = false;
        return;
      }
      // Auto-save on blur if value has changed
      if (renamingSessionId && renameValue.trim()) {
        await handleRenameSubmit();
      } else if (renamingSessionId) {
        // If empty, cancel rename
        handleRenameCancel();
      }
    }, 150);
  };

  const handleRenameCancel = () => {
    setRenamingSessionId(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  return (
    <aside className={`w-[320px] lg:w-[280px] ${collapsed ? 'lg:w-[60px]' : ''} bg-white rounded-none lg:rounded-none p-0 fixed lg:fixed top-0 left-0 h-[100dvh] lg:h-screen flex flex-col transition-all duration-300 border-r border-[rgba(21,101,192,0.1)] z-30`} id="appSidebar" style={{ maxHeight: '100dvh', touchAction: 'pan-y' }}>
      <div className={`flex flex-1 flex-col h-full min-h-0 overflow-hidden ${collapsed ? 'lg:overflow-visible' : ''}`}>
        <div className={`flex items-center justify-between px-14 sm:px-6 py-4 border-b border-[rgba(21,101,192,0.1)] relative group ${
          collapsed ? 'lg:justify-center lg:px-0 py-[1.1rem]' : ''
        }`}>
          {/* Logo - Always visible, centered when collapsed */}
          <div className={`flex items-center gap-2.5 ${
            collapsed 
              ? 'lg:justify-center lg:w-full lg:mx-auto lg:group-hover:opacity-0' 
              : ''
          }`}>
            <svg className="w-8 h-8 text-[#1565c0] flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M8.5 14.5L4 19L7 20L11.5 15.5M8.5 14.5L11.5 11.5M11.5 15.5L15.5 11.5M11.5 15.5L14.5 18.5L16 17L12.5 13.5" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className={`text-base font-semibold text-[#1565c0] whitespace-nowrap ${
              collapsed ? 'lg:hidden' : ''
            }`}>Clinical Chat</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile Close Button */}
            {onClose && (
              <button 
                onClick={onClose}
                className="lg:hidden p-2 rounded-md hover:bg-[rgba(0,114,125,0.1)] active:bg-[rgba(0,114,125,0.15)] text-[#546e7a] transition-colors touch-manipulatio bg-transparent"
                aria-label="Close sidebar"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6L18 18" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            
            {/* Desktop Toggle Button - Visible when expanded, hidden when collapsed but shows on hover */}
            <button 
              id="sidebarToggle" 
              className={`hidden lg:flex items-center justify-center w-9 h-9 bg-transparent border-none text-[#546e7a] cursor-pointer p-1 rounded-md transition-all hover:bg-[rgba(0,114,125,0.1)] hover:text-[#00727d] ${
                collapsed 
                  ? 'lg:absolute lg:top-1/2 lg:right-2 lg:-translate-y-1/2 lg:opacity-0 lg:group-hover:opacity-100 lg:z-10' 
                  : ''
              }`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} 
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => {
                // Only allow collapse on desktop (lg breakpoint)
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                  const newCollapsed = !collapsed;
                  setCollapsed(newCollapsed);
                  localStorage.setItem('sidebarCollapsed', String(newCollapsed));
                  onCollapsedChange?.(newCollapsed);
                }
              }}
            >
              <svg className="w-6 h-6" width="24" height="24" viewBox="0 0 24 24" fill="none">
                {collapsed ? (
                  // Expand icon (chevron right) when collapsed
                  <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                ) : (
                  // Collapse icon (hamburger) when expanded
                  <path d="M3 12H21M3 6H21M3 18H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                )}
              </svg>
            </button>
          </div>
        </div>

        <div className="p-3 flex flex-col gap-2 flex-shrink-0">
          <button 
            id="newChatButton" 
            className={`flex items-center gap-3 px-3 py-2.5 border border-transparent rounded-lg cursor-pointer transition-all text-sm text-left w-full touch-manipulation select-none ${
              currentSessionId === null
                ? 'text-white font-semibold shadow-sm'
                : 'bg-[rgba(0,114,125,0.05)] text-black hover:bg-[rgba(0,114,125,0.08)] active:bg-[rgba(0,114,125,0.12)] hover:border-transparent hover:text-[#00727d] active:text-[#00727d]'
            } ${collapsed ? 'lg:justify-center lg:w-9 lg:h-9 lg:p-0 lg:mx-auto' : ''}`}
            style={currentSessionId === null ? { background: 'linear-gradient(145deg, #00727d 0%, #44aeb8 100%)' } : undefined}
            title="New chat"
            onClick={() => {
              // Cancel any pending search request
              if (currentSearchAbortRef.current) {
                currentSearchAbortRef.current();
                currentSearchAbortRef.current = null;
              }
              
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
              
              // Close mobile sidebar
              if (onClose) onClose();
            }}
          >
            <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className={`flex-1 ${collapsed ? 'lg:hidden' : ''}`}>New chat</span>
          </button>

          <button 
            id="searchChatsBtn" 
            className={`flex items-center gap-3 px-3 py-2.5 bg-transparent border border-transparent rounded-lg text-[#37474f] cursor-pointer transition-all text-sm text-left w-full touch-manipulation select-none ${
              collapsed ? 'lg:justify-center lg:w-9 lg:h-9 lg:p-0 lg:mx-auto' : ''
            } hover:bg-[rgba(0,114,125,0.08)] active:bg-[rgba(0,114,125,0.12)] hover:border-transparent hover:text-[#00727d] active:text-[#00727d]`}
            title="Search chats"
            onClick={() => {
              onOpenSearchModal();
              if (onClose) onClose();
            }}
          >
            <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className={`flex-1 ${collapsed ? 'lg:hidden' : ''}`}>Search chats</span>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-3 min-h-0">
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <button 
              className={`flex items-center justify-between px-3 py-2 bg-transparent border-none text-[#546e7a] cursor-pointer w-full text-left rounded-md transition-all touch-manipulation select-none hover:bg-[rgba(0,114,125,0.08)] active:bg-[rgba(0,114,125,0.12)] hover:text-[#00727d] active:text-[#00727d] ${collapsed ? 'lg:hidden' : ''}`} 
              id="chatHistoryToggle"
              onClick={() => setChatHistoryCollapsed(!chatHistoryCollapsed)}
            >
              <span className="text-xs font-semibold uppercase tracking-wider">Chats</span>
              <svg className={`w-4 h-4 transition-transform ${chatHistoryCollapsed ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div 
              className={`flex-1 overflow-y-auto overflow-x-hidden mt-2 flex flex-col gap-0.5 py-1 pr-1 transition-all duration-300 ${chatHistoryCollapsed ? 'hidden' : ''}`} 
              id="chatHistoryList" 
              style={{ WebkitOverflowScrolling: 'touch' }}
              onTouchStart={(e) => {
                // Prevent touch events from propagating to background on mobile
                e.stopPropagation();
              }}
              onTouchMove={(e) => {
                // Allow scrolling within the chat history
                e.stopPropagation();
              }}
            >
              {sessions.length === 0 ? (
                <div className={`text-[#90a4ae] text-center p-5 text-sm ${collapsed ? 'lg:hidden' : ''}`}>
                  <p>Your conversations will appear here</p>
                </div>
              ) : (
                sessions.map((session, index) => {
                  const isActive = currentSessionId === session.id;
                  return (
                  <div 
                    key={session.id} 
                    className={`relative flex items-center m-0.5 gap-1 p-1 rounded-lg transition-all group touch-manipulation ${
                      isActive 
                        ? '' 
                        : 'hover:bg-[rgba(0,114,125,0.08)] active:bg-[rgba(0,114,125,0.12)]'
                    }`}
                    data-session-id={session.id}
                  >
                    {/* Active indicator for collapsed sidebar */}
                    {isActive && collapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00727d] rounded-r-full hidden lg:block" />
                    )}
                    {renamingSessionId === session.id ? (
                      <div className="flex items-center gap-1.5 w-full px-2 py-1">
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={handleRenameKeyDown}
                          onBlur={handleRenameBlur}
                          className="flex-1 px-2 py-1.5 border border-[rgba(0,114,125,0.3)] rounded outline-none transition-colors focus:border-[#00727d] bg-white min-w-0"
                          placeholder="Enter chat name"
                          maxLength={100}
                          style={{ fontSize: '16px' }}
                          autoFocus
                        />
                        <div className="flex gap-0.5 flex-shrink-0">
                          <button 
                            type="button" 
                            onClick={() => {
                              renameButtonClickedRef.current = true;
                              handleRenameSubmit();
                            }} 
                            className="p-1.5 bg-transparent border-none rounded cursor-pointer flex items-center justify-center transition-all w-7 h-7 text-[#2e7d32] hover:bg-[rgba(46,125,50,0.1)] active:bg-[rgba(46,125,50,0.15)] touch-manipulation" 
                            title="Save"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => {
                              renameButtonClickedRef.current = true;
                              handleRenameCancel();
                            }} 
                            className="p-1.5 bg-transparent border-none rounded cursor-pointer flex items-center justify-center transition-all w-7 h-7 text-[#d32f2f] hover:bg-[rgba(211,47,47,0.1)] active:bg-[rgba(211,47,47,0.15)] touch-manipulation" 
                            title="Cancel"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div 
                          className={`flex-1 flex items-center px-4 py-3 rounded-lg cursor-pointer transition-all text-sm leading-normal whitespace-nowrap overflow-hidden text-ellipsis border border-transparent min-h-[44px] box-border text-left touch-manipulation select-none ${
                            isActive
                              ? 'text-white font-semibold shadow-sm' 
                              : 'bg-transparent text-black group-hover:text-[#00727d] active:text-[#00727d]'
                          } ${collapsed ? 'lg:hidden' : ''}`}
                          style={isActive ? { background: 'linear-gradient(145deg, #00727d 0%, #44aeb8 100%)' } : undefined}
                          onClick={async () => {
                            // Capture the session ID for this specific request
                            const requestedSessionId = session.id;
                            
                            // Cancel any previous search request before starting a new one
                            if (currentSearchAbortRef.current) {
                              currentSearchAbortRef.current();
                              currentSearchAbortRef.current = null;
                            }
                            
                            // Set the session ID we're loading to prevent race conditions
                            loadingSessionIdRef.current = requestedSessionId;
                            
                            // Set current session immediately - this will update expectedSessionId in reducers
                            dispatch(setCurrentSession(requestedSessionId));
                            
                            // Clear previous results immediately when switching chats
                            dispatch(clearResults());
                            
                            // Close mobile sidebar
                            if (onClose) onClose();
                            
                            try {
                              // Fetch session - reducer will validate response matches expected session ID
                              const result = await dispatch(fetchSession(requestedSessionId)).unwrap();
                              
                              // Verify we're still loading the same session (user might have switched again)
                              if (loadingSessionIdRef.current !== requestedSessionId) {
                                // User switched to a different session, ignore this response
                                return;
                              }
                              
                              if (result.last_filters) {
                                // Cancel previous search request if it exists
                                if (currentSearchAbortRef.current) {
                                  currentSearchAbortRef.current();
                                  currentSearchAbortRef.current = null;
                                }
                                
                                // Set filters in Redux state first so SearchForm can sync
                                dispatch(setFilters(result.last_filters));
                                
                                // Use cached search mutation - this will check cache first
                                // If cached, returns immediately; otherwise fetches and caches
                                try {
                                  await searchMutation({
                                    filters: result.last_filters,
                                    page: 1,
                                    sessionId: requestedSessionId,
                                    syncToRedux: true,
                                  });
                                } catch (error: any) {
                                  // Ignore abort errors
                                  if (error !== 'Request aborted') {
                                    console.error('Search failed:', error);
                                  }
                                }
                              }
                              
                              // Verify again before updating messages/reports
                              if (loadingSessionIdRef.current !== requestedSessionId) {
                                return;
                              }
                              
                              dispatch(clearMessages());
                              dispatch(clearReports());
                              if (result.messages && result.messages.length > 0) {
                                result.messages.forEach(msg => {
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
                            } finally {
                              // Clear loading session ID if this was the last request
                              if (loadingSessionIdRef.current === requestedSessionId) {
                                loadingSessionIdRef.current = null;
                              }
                            }
                          }}
                        >
                          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{session.title || 'New Chat'}</span>
                        </div>
                        <ChatMenu 
                          sessionId={session.id}
                          onRename={() => handleStartRename(session.id, session.title || 'New Chat')}
                          isLastItem={index === sessions.length - 1}
                        />
                      </>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-[rgba(21,101,192,0.1)] relative flex flex-col gap-3 mt-auto flex-shrink-0 z-10">
          {user && (
            <div className="relative" ref={profileMenuRef}>
          <button 
            id="profileCard" 
            className={`flex items-center gap-3 w-full px-3 py-2 bg-[rgba(0,114,125,0.05)] border border-[rgba(0,114,125,0.1)] rounded-lg text-[#37474f] cursor-pointer transition-all text-left relative z-10 touch-manipulation select-none ${
              collapsed ? 'lg:justify-center lg:w-11 lg:h-11 lg:p-2 lg:mx-auto' : ''
            } hover:bg-[rgba(0,114,125,0.1)] active:bg-[rgba(0,114,125,0.12)] hover:border-[rgba(0,114,125,0.2)] active:border-[rgba(0,114,125,0.25)] ${profileMenuOpen ? 'bg-[rgba(0,114,125,0.1)] border-[rgba(0,114,125,0.2)]' : ''}`}
            aria-haspopup="true" 
            aria-expanded={profileMenuOpen}
            title={user?.username}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          >
            <div className="profile-avatar">
              <span>{(user?.username?.[0] || 'U').toUpperCase()}</span>
            </div>
            <div className="profile-info">
              <span className={`profile-name ${collapsed ? 'lg:hidden' : ''}`}>{user?.username}</span>
            </div>
            <svg className={`w-5 h-5 text-[#546e7a] ml-auto transition-transform ${collapsed ? 'lg:hidden' : ''} ${profileMenuOpen ? 'rotate-180' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="12" r="2" fill="currentColor"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
              <circle cx="19" cy="12" r="2" fill="currentColor"/>
            </svg>
          </button>

          <div 
            id="profileMenu" 
            className={`absolute bottom-full left-0 right-0 mb-2 bg-white text-[#37474f] border border-[rgba(21,101,192,0.15)] rounded-lg p-2 shadow-[0_8px_24px_rgba(21,101,192,0.15)] z-[1400] min-w-[200px] transition-all duration-200 ${
              profileMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 pointer-events-none'
            }`}
            role="menu" 
            aria-hidden={!profileMenuOpen}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="dropdown-item" role="menuitem">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
              </svg>
              <span>{user?.username}</span>
            </button>
            <button 
              className="dropdown-item" 
              role="menuitem" 
              id="settingsMenuItem"
              onClick={() => {
                setProfileMenuOpen(false);
                // Dispatch custom event to open settings modal
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('openSettingsModal'));
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/>
              </svg>
              <span>Settings</span>
            </button>
            <div className="h-px bg-[rgba(21,101,192,0.1)] my-2 border-none"></div>
            <button 
              type="button" 
              className="flex items-center gap-3 px-3 py-2.5 text-[#d32f2f] no-underline rounded-md transition-all bg-transparent border-none w-full text-left cursor-pointer text-sm hover:bg-[rgba(211,47,47,0.1)] hover:text-[#c62828]" 
              role="menuitem"
              onClick={() => {
                setProfileMenuOpen(false);
                dispatch(logout());
                if (onClose) onClose();
              }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                  <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Log out</span>
              </button>
          </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

