'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { chatAllStudies, setAdvancedMode, addMessage, setReports, removeLastUserAndAssistantMessages, setLoading } from '@/store/slices/chatSlice';
import { ProtocolReport } from '@/lib/types';
import { updateSessionFromChat, setCurrentSession } from '@/store/slices/sessionsSlice';
import { chatQuestionsApi, userPreferencesApi, searchApi, chatSessionsApi } from '@/lib/api';
import { useToastHelpers } from '@/lib/toast';
import QuestionSettingsModal from './QuestionSettingsModal';
import ChatReportModal from './ChatReportModal';
import { updatePreferences, AIModel } from '@/store/slices/preferencesSlice';
import { AI_MODELS } from '@/lib/constants/aiModels';

// Default questions for guest users
const DEFAULT_GUEST_QUESTIONS = [
  "What are the most common interventions?",
  "How many studies are in Phase 3?",
  "Which sponsors are funding these trials?",
  "What are the primary outcomes?",
  "Summarize the recruiting studies",
];

export default function FloatingChat() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { messages, reports, isAdvancedMode, loading } = useAppSelector((state) => state.chat);
  const { filters } = useAppSelector((state) => state.search);
  const { currentSessionId } = useAppSelector((state) => state.sessions);
  const { ai_model, visible_models } = useAppSelector((state) => state.preferences);
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [displayQuestions, setDisplayQuestions] = useState<string[]>(DEFAULT_GUEST_QUESTIONS);
  const [sessionQuestions, setSessionQuestions] = useState<string[]>([]);
  const [defaultQuestions, setDefaultQuestions] = useState<string[]>([]);
  const [useDefaultQuestions, setUseDefaultQuestions] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(ai_model || 'gpt-4o-mini');
  const [savingModel, setSavingModel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const toast = useToastHelpers();

  // Fetch questions from API when component mounts, session changes, or modal opens
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user || user.is_guest) {
        // For guest users, just use default guest questions
        setDisplayQuestions(DEFAULT_GUEST_QUESTIONS);
        return;
      }

      try {
        setQuestionsLoading(true);
        
        // Fetch both session questions and default questions
        const [sessionResponse, defaultResponse] = await Promise.all([
          // Fetch session questions (if sessionId exists)
          currentSessionId ? chatQuestionsApi.get(currentSessionId) : Promise.resolve(null),
          // Fetch default questions from user preferences
          userPreferencesApi.get().catch(() => null),
        ]);

        // Extract session and default questions from responses
        let sessionQ: string[] = [];
        let defaultQ: string[] = [];

        // Set session questions
        if (sessionResponse && sessionResponse.success && sessionResponse.questions) {
          if (sessionResponse.source === 'session') {
            // Session has custom questions
            sessionQ = sessionResponse.questions;
            setSessionQuestions(sessionResponse.questions);
          } else {
            // Session doesn't have custom questions
            setSessionQuestions([]);
          }
        } else {
          setSessionQuestions([]);
        }

        // Set default questions
        if (defaultResponse && defaultResponse.success && defaultResponse.preferences?.default_chat_questions) {
          defaultQ = defaultResponse.preferences.default_chat_questions;
          setDefaultQuestions(defaultQ);
        } else {
          // Fallback to guest questions if preferences not available
          defaultQ = DEFAULT_GUEST_QUESTIONS;
          setDefaultQuestions(DEFAULT_GUEST_QUESTIONS);
        }

        // Determine which questions to display based on toggle and availability
        if (currentSessionId && sessionQ.length > 0) {
          // If we have session questions, use toggle state
          setDisplayQuestions(useDefaultQuestions ? defaultQ : sessionQ);
        } else {
          // No session questions, use defaults
          setDisplayQuestions(defaultQ.length > 0 ? defaultQ : DEFAULT_GUEST_QUESTIONS);
        }
      } catch (error) {
        console.error('Error fetching chat questions:', error);
        // Fallback to default questions
        setDisplayQuestions(DEFAULT_GUEST_QUESTIONS);
      } finally {
        setQuestionsLoading(false);
      }
    };

    // Fetch questions when modal opens or session changes
    if (isOpen) {
      fetchQuestions();
    }
  }, [currentSessionId, isOpen, user]);

  // Update display questions when toggle changes
  useEffect(() => {
    if (user && !user.is_guest && currentSessionId && sessionQuestions.length > 0) {
      setDisplayQuestions(useDefaultQuestions ? defaultQuestions : sessionQuestions);
    } else if (defaultQuestions.length > 0) {
      setDisplayQuestions(defaultQuestions);
    }
  }, [useDefaultQuestions, sessionQuestions, defaultQuestions, currentSessionId, user]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Update selected model when preferences change
  useEffect(() => {
    if (ai_model) {
      setSelectedModel(ai_model);
    }
  }, [ai_model]);

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    if (user && !user.is_guest) {
      setSavingModel(true);
      try {
        await dispatch(updatePreferences({ ai_model: model as AIModel })).unwrap();
      } catch (error) {
        console.error('Failed to update AI model:', error);
        // Revert on error
        setSelectedModel(ai_model || 'gpt-4o-mini');
        toast.error('Failed to update AI model');
      } finally {
        setSavingModel(false);
      }
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !filters || loading) return;
    
    const question = inputValue.trim();
    const savedInputValue = question; // Save the question to restore if stopped
    setInputValue('');
    
    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Store the saved question in the abort controller for later retrieval
    (abortController as any).savedQuestion = savedInputValue;
    
    // Immediately show the user's question in the chat
    dispatch(addMessage({ role: 'user', content: question }));
    
    try {
      const result = await dispatch(chatAllStudies({
        filters,
        question,
        advancedMode: isAdvancedMode,
        sessionId: currentSessionId || undefined,
        useStream: true, // Enable streaming
        model: selectedModel || ai_model || 'gpt-4o-mini', // Use selected model with fallback
        abortController, // Pass abort controller
      }));
      
      // Clear abort controller reference when done
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      
      // Handle session info from response
    if (chatAllStudies.fulfilled.match(result) && result.payload.sessionInfo) {
      dispatch(updateSessionFromChat(result.payload.sessionInfo));
      dispatch(setCurrentSession(result.payload.sessionInfo.sessionId));
      
      // Refresh questions after session update
      try {
        const [sessionResponse, defaultResponse] = await Promise.all([
          chatQuestionsApi.get(result.payload.sessionInfo.sessionId),
          userPreferencesApi.get().catch(() => null),
        ]);

        if (sessionResponse && sessionResponse.success && sessionResponse.questions) {
          if (sessionResponse.source === 'session') {
            setSessionQuestions(sessionResponse.questions);
          } else {
            setSessionQuestions([]);
          }
        }

        if (defaultResponse && defaultResponse.success && defaultResponse.preferences?.default_chat_questions) {
          setDefaultQuestions(defaultResponse.preferences.default_chat_questions);
        }

        // Update display based on current toggle state
        if (sessionResponse && sessionResponse.source === 'session' && sessionResponse.questions.length > 0) {
          setDisplayQuestions(useDefaultQuestions ? defaultQuestions : sessionResponse.questions);
        } else if (defaultQuestions.length > 0) {
          setDisplayQuestions(defaultQuestions);
        }
      } catch (error) {
        console.error('Error refreshing questions:', error);
      }
    }
    } catch (error: any) {
      // Handle abort errors - restore input and remove messages
      if (error?.name === 'AbortError' || error?.message?.includes('cancelled') || error?.message?.includes('aborted')) {
        // Remove the user message and any partial assistant message
        dispatch(removeLastUserAndAssistantMessages());
        // Restore the question to input field
        setInputValue(savedInputValue);
      }
      // Clear abort controller reference
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleGenerateChatReport = () => {
    if (!currentSessionId) {
      toast.error('No active session. Please start a conversation first.');
      return;
    }

    if (!messages || messages.length === 0) {
      toast.error('No messages in this conversation. Please chat first before generating a report.');
      return;
    }

    if (!user || user.is_guest) {
      toast.error('Please log in to generate reports.');
      return;
    }

    setIsReportModalOpen(true);
  };

  return (
    <div className="fixed right-4 bottom-4 sm:right-5 sm:bottom-5 z-[1500]">
      <button 
        id="chatFab" 
        className="w-16 h-16 sm:w-16 sm:h-16 rounded-full border-0 bg-gradient-to-br from-[#1e88e5] to-[#0d47a1] text-white cursor-pointer shadow-[0_18px_36px_rgba(13,71,161,0.28),0_8px_16px_rgba(13,71,161,0.24),inset_0_2px_6px_rgba(255,255,255,0.25)] inline-flex items-center justify-center transition-all duration-[120ms] relative overflow-visible backdrop-blur-[saturate(120%)] hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(13,71,161,0.34),0_10px_20px_rgba(13,71,161,0.26),inset_0_2px_8px_rgba(255,255,255,0.28)] active:translate-y-0 active:shadow-[0_10px_20px_rgba(13,71,161,0.28),0_6px_12px_rgba(13,71,161,0.24),inset_0_1px_4px_rgba(255,255,255,0.2)] active:brightness-[0.98]"
        aria-label="Open chat" 
        title="Ask About All Results"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(13,71,161,0.18),inset_0_1px_0_rgba(255,255,255,0.8)]" aria-hidden="true">
          <svg className="w-[22px] h-[22px] block drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="#1565c0" d="M4 11.5c0-4.142 3.806-7.5 8.5-7.5S21 7.358 21 11.5 17.194 19 12.5 19c-1.148 0-2.254-.19-3.278-.543L5 19.25l.9-2.731C5.31 15.396 4 13.58 4 11.5z"/>
            <circle cx="9.25" cy="11.75" r="1.15" fill="#ffffff"/>
            <circle cx="12.5" cy="11.75" r="1.15" fill="#ffffff"/>
            <circle cx="15.75" cy="11.75" r="1.15" fill="#ffffff"/>
          </svg>
        </span>
      </button>
      <div id="floatingChatWindow" className={`fixed top-0 sm:top-24 right-0 sm:right-6 left-0 sm:left-auto w-full sm:w-[420px] max-w-full sm:max-w-[420px] h-[100dvh] sm:h-[calc(100vh-120px)] shadow-[0_24px_40px_rgba(0,0,0,0.2)] rounded-none sm:rounded-2xl overflow-hidden bg-white transform transition-transform duration-[250ms] z-[1600] ${
        isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-[120%]'
      }`} style={{ maxHeight: '100dvh' }}>
        <div className="h-full relative top-0 flex flex-col min-h-0">
          <div className="flex-col p-4 sm:p-5 border-b-2 border-[#0066cc] bg-gradient-to-br from-[#0066cc] to-[#0052a3] text-white rounded-t-2xl flex justify-between gap-3 flex-shrink-0">

            <div className=" min-w-0 flex justify-between gap-3">
              <div className="flex-1">
              <h2 className="text-base sm:text-lg mb-0.5 font-semibold">Ask About All Results</h2>
              <p className="text-xs sm:text-[13px] opacity-90">Chat about your filtered studies</p>
              </div>
              <button 
                id="chatWindowClose" 
                className="bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 text-white text-xl sm:text-2xl cursor-pointer p-1.5 sm:p-2 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-md flex items-center justify-center min-w-[32px] min-h-[32px]" 
                aria-label="Close chat" 
                title="Close" 
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {user && !user.is_guest && (
                <button
                  className="bg-white/25 backdrop-blur-sm border border-white/40 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 transition-all duration-200 hover:bg-white/35 hover:border-white/60 hover:shadow-lg hover:scale-105 text-xs sm:text-sm font-medium shadow-md"
                  onClick={() => setIsSettingsOpen(true)}
                  title="Configure Questions"
                  aria-label="Configure Questions"
                >
                  <svg className="flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span className="hidden sm:inline whitespace-nowrap">Configure Questions</span>
                </button>
              )}
              
              {user && !user.is_guest && messages.length > 0 && (
                <button
                  className="bg-white/25 backdrop-blur-sm border border-white/40 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 transition-all duration-200 hover:bg-white/35 hover:border-white/60 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none text-xs sm:text-sm font-medium shadow-md"
                  onClick={handleGenerateChatReport}
                  disabled={generatingReport}
                  title="Generate Report from Chat"
                  aria-label="Generate Report from Chat"
                >
                  {generatingReport ? (
                    <>
                      <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                      </svg>
                      <span className="hidden sm:inline whitespace-nowrap">Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                      <span className="hidden sm:inline whitespace-nowrap">Generate Report</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="p-2.5 sm:p-3.5 bg-[#f8f9fa] border-t border-b border-[#ddd] flex-shrink-0 space-y-2">
            <div className="flex flex-col justify-start gap-3">
            <div className="flex items-center gap-2">
                <label className="text-[13px] text-[#666] whitespace-nowrap">AI Model:</label>
                <select 
                  value={selectedModel} 
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={savingModel || loading}
                  className="px-2.5 py-1.5 border border-[#ddd] rounded text-[13px] text-[#333] bg-white cursor-pointer outline-none transition-colors min-w-[150px] focus:border-[#0066cc] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(() => {
                    // Filter models based on visible_models, or show all if not set
                    // Always include the currently selected model even if not in visible_models
                    const availableModels = visible_models && visible_models.length > 0
                      ? AI_MODELS.filter(m => visible_models.includes(m.value) || m.value === selectedModel)
                      : AI_MODELS;
                    
                    // Group by provider
                    const gptModels = availableModels.filter(m => m.group === 'GPT');
                    const geminiModels = availableModels.filter(m => m.group === 'Gemini');
                    
                    return (
                      <>
                        {gptModels.length > 0 && (
                          <optgroup label="GPT">
                            {gptModels.map(model => (
                              <option key={model.value} value={model.value}>{model.label}</option>
                            ))}
                          </optgroup>
                        )}
                        {geminiModels.length > 0 && (
                          <optgroup label="Gemini">
                            {geminiModels.map(model => (
                              <option key={model.value} value={model.value}>{model.label}</option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    );
                  })()}
                </select>
                {savingModel && (
                  <svg className="animate-spin w-4 h-4 text-[#666]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                )}
              </div>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer flex-1">
                <input 
                  type="checkbox" 
                  id="advancedModeCheckbox" 
                  checked={isAdvancedMode}
                  onChange={(e) => dispatch(setAdvancedMode(e.target.checked))}
                  className="w-5 h-5 cursor-pointer"
                />
                <span>
                  Advanced Mode (Complete Data)
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ml-1.5 ${
                    isAdvancedMode ? 'bg-[#ff6b6b] text-white' : 'bg-[#28a745] text-white'
                  }`}>
                    {isAdvancedMode ? 'ADVANCED' : 'ESSENTIAL'}
                  </span>
                </span>
              </label>
              
            </div>
            <div className={`p-2 bg-[#fff3cd] border border-[#ffc107] rounded text-xs text-[#856404] ${isAdvancedMode ? 'block' : 'hidden'}`}>
              ⚠️ Advanced mode includes ALL study data. Recommended for 50 or fewer studies for best performance.
            </div>
          </div>

          <div id="sidebarChatMessages" className="flex-1 p-5 overflow-y-auto overflow-x-hidden bg-[#f8f9fa]" style={{ WebkitOverflowScrolling: 'touch' }}>
            {messages.length === 0 ? (
              <div className="text-center text-[#666] p-10 sm:p-10">
                <h3 className="text-[#0066cc] mb-4 text-lg font-semibold">Search first, then ask questions!</h3>
                <p className="my-4 text-sm">After searching, ask questions like:</p>
                {questionsLoading ? (
                  <div className="p-5 text-center text-[#666]">Loading questions...</div>
                ) : (
                  <>
                    <ul className="list-none p-0 m-0">
                      {displayQuestions.map((question, idx) => (
                        <li 
                          key={idx} 
                          className="p-2.5 sm:p-3 my-1.5 bg-[#f8f9fa] border border-[#e0e0e0] rounded-md cursor-pointer transition-all text-[#333] select-none hover:bg-[#e3f2fd] hover:border-[#0066cc] hover:text-[#0066cc] hover:translate-x-1 hover:shadow-[0_2px_4px_rgba(0,102,204,0.1)] active:translate-x-0.5 active:bg-[#bbdefb] focus:outline-2 focus:outline-[#0066cc] focus:outline-offset-2"
                          onClick={() => {
                            if (!loading) {
                              setInputValue(question);
                              // Focus the input field after setting the value
                              setTimeout(() => {
                                const input = document.getElementById('sidebarChatInput') as HTMLInputElement;
                                if (input) {
                                  input.focus();
                                  // Move cursor to end of text
                                  input.setSelectionRange(question.length, question.length);
                                }
                              }, 0);
                            }
                          }}
                        >
                          {question}
                        </li>
                      ))}
                    </ul>
                    {/* Question Source Toggle - Only show for logged-in users with session */}
                    {user && !user.is_guest && currentSessionId && sessionQuestions.length > 0 && (
                      <div className="py-3 mt-3 border-t border-[rgba(21,101,192,0.1)]">
                        <label className="flex items-center justify-between gap-3 text-[13px] cursor-default">
                          <span className="text-[#546e7a] font-medium flex-shrink-0">Question Source:</span>
                          <div className="flex gap-1 bg-white border border-[rgba(21,101,192,0.2)] rounded-md p-0.5">
                            <button
                              type="button"
                              className={`px-3 py-1.5 border-none bg-transparent text-[#546e7a] cursor-pointer text-[13px] font-medium rounded transition-all min-w-[70px] ${
                                !useDefaultQuestions 
                                  ? 'bg-gradient-to-br from-[#1976d2] to-[#0d47a1] text-white shadow-[0_2px_4px_rgba(21,101,192,0.2)]' 
                                  : 'hover:bg-[rgba(21,101,192,0.08)] hover:text-[#1565c0]'
                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                              onClick={() => setUseDefaultQuestions(false)}
                              disabled={questionsLoading}
                            >
                              Session
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-1.5 border-none bg-transparent text-[#546e7a] cursor-pointer text-[13px] font-medium rounded transition-all min-w-[70px] ${
                                useDefaultQuestions 
                                  ? 'bg-gradient-to-br from-[#1976d2] to-[#0d47a1] text-white shadow-[0_2px_4px_rgba(21,101,192,0.2)]' 
                                  : 'hover:bg-[rgba(21,101,192,0.08)] hover:text-[#1565c0]'
                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                              onClick={() => setUseDefaultQuestions(true)}
                              disabled={questionsLoading}
                            >
                              Default
                            </button>
                          </div>
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Display Protocol Reports, Chat Reports, and Study Chat Reports */}
                {/* {reports && reports.length > 0 && (
                  <div className="mb-5">
                    <h4 className="text-[#667eea] mb-4 text-base font-bold">
                      📋 Generated Reports
                    </h4>
                    {reports.map((report: ProtocolReport, idx: number) => {
                      const isChatReport = report.metadata?.report_type === 'chat_report';
                      const isStudyChatReport = report.metadata?.report_type === 'study_chat_report';
                      // Clean the HTML string - remove any escaped newlines and ensure proper formatting
                      const cleanHtml = (report.report || '').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
                      
                      return (
                        <div 
                          key={idx} 
                          className="bg-white p-5 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.1)] mb-4"
                        >
                          <div className="mb-4 pb-2.5 border-b border-[#eee]">
                            <div className="flex items-center gap-2.5 mb-2">
                              <span className="text-lg">
                                {isStudyChatReport ? '🔬' : isChatReport ? '💬' : '📋'}
                              </span>
                              <strong className="text-[#667eea]">
                                {isStudyChatReport 
                                  ? 'Study Chat Report' 
                                  : isChatReport 
                                    ? 'Chat Conversation Report' 
                                    : 'Protocol Report'}
                              </strong>
                            </div>
                            <div className="text-sm text-[#666]">
                              {isStudyChatReport && report.metadata?.study_id && (
                                <div><strong>Study ID:</strong> {report.metadata.study_id}</div>
                              )}
                              <div><strong>Condition:</strong> {report.condition}</div>
                              {report.intervention && (
                                <div><strong>Intervention:</strong> {report.intervention}</div>
                              )}
                              {report.created_at && (
                                <div className="text-xs text-[#999] mt-1.5">
                                  Generated: {new Date(report.created_at).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div 
                            className="report-content"
                            style={{
                              lineHeight: '1.6',
                              color: '#333',
                            }}
                            dangerouslySetInnerHTML={{ __html: cleanHtml }} 
                          />
                        </div>
                      );
                    })}
                  </div>
                )} */}
                
                {/* Display Chat Messages */}
                {messages.map((msg, idx) => {
                  const isLastMessage = idx === messages.length - 1;
                  // Check if it's the thinking indicator
                  const isThinking = isLastMessage && msg.role === 'assistant' && loading && (msg.content === '<div class="thinking-indicator">Thinking...</div>' || msg.content === '');
                  // Check if it's streaming markdown (not HTML yet)
                  const isStreaming = isLastMessage && msg.role === 'assistant' && loading && msg.content && !isThinking && !msg.content.trim().startsWith('<');
                  // Check if it's a protocol report
                  const isProtocolReport = msg.metadata?.type === 'protocol_report';
                  
                  return (
                    <div key={idx} className={`mb-4 p-3 rounded-md max-w-[90%] break-words ${
                      msg.role === 'user' 
                        ? 'bg-[#007bff] text-white ml-auto' 
                        : 'bg-white border border-[#ddd]'
                    } ${isProtocolReport ? 'protocol-report' : ''}`}>
                      {msg.role === 'assistant' ? (
                        isThinking ? (
                          <div className="flex items-center gap-3 py-3 text-[#666]">
                            <div className="flex gap-1 items-center">
                              <span className="w-2 h-2 rounded-full bg-[#0066cc] animate-[thinking-bounce_1.4s_infinite_ease-in-out]" style={{ animationDelay: '-0.32s' }}></span>
                              <span className="w-2 h-2 rounded-full bg-[#0066cc] animate-[thinking-bounce_1.4s_infinite_ease-in-out]" style={{ animationDelay: '-0.16s' }}></span>
                              <span className="w-2 h-2 rounded-full bg-[#0066cc] animate-[thinking-bounce_1.4s_infinite_ease-in-out]"></span>
                            </div>
                            <span className="text-sm italic text-[#666]">Thinking...</span>
                          </div>
                        ) : isStreaming ? (
                          <div className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</div>
                        ) : isProtocolReport ? (
                          <div 
                            className="bg-white p-5 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.1)] mt-2.5"
                            dangerouslySetInnerHTML={{ __html: msg.content || '' }} 
                          />
                        ) : (
                          <div className="[&_ul]:ml-5 [&_ul]:mt-2 [&_ul]:mb-2 [&_ol]:ml-5 [&_ol]:mt-2 [&_ol]:mb-2 [&_li]:mb-1.5 [&_li]:leading-relaxed [&_p]:mb-2.5 [&_p]:leading-relaxed [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: msg.content || '' }} />
                        )
                      ) : (
                        <div>
                          {msg.metadata?.type === 'protocol_report_request' ? (
                            <div className="flex items-center gap-2">
                              <span>📋</span>
                              <span>{msg.content}</span>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Always show suggested questions at the bottom when there are messages */}
                {!loading && (
                  <div className="mt-5 pt-5 border-t border-[#e0e0e0]">
                    <p className="my-4 mb-2.5 text-sm text-[#666] font-medium">Suggested questions:</p>
                    {questionsLoading ? (
                      <div className="p-2.5 text-center text-[#999] text-[13px]">Loading...</div>
                    ) : (
                      <>
                        <ul className="list-none p-0 m-0">
                          {displayQuestions.map((question, idx) => (
                            <li 
                              key={idx} 
                              className="p-2.5 sm:p-3 my-1.5 bg-[#f8f9fa] border border-[#e0e0e0] rounded-md cursor-pointer transition-all text-[#333] select-none hover:bg-[#e3f2fd] hover:border-[#0066cc] hover:text-[#0066cc] hover:translate-x-1 hover:shadow-[0_2px_4px_rgba(0,102,204,0.1)] active:translate-x-0.5 active:bg-[#bbdefb] focus:outline-2 focus:outline-[#0066cc] focus:outline-offset-2"
                              onClick={() => {
                                setInputValue(question);
                                // Focus the input field after setting the value
                                setTimeout(() => {
                                  const input = document.getElementById('sidebarChatInput') as HTMLInputElement;
                                  if (input) {
                                    input.focus();
                                    // Move cursor to end of text
                                    input.setSelectionRange(question.length, question.length);
                                  }
                                }, 0);
                              }}
                            >
                              {question}
                            </li>
                          ))}
                        </ul>
                        {/* Question Source Toggle - Only show for logged-in users with session */}
                        {user && !user.is_guest && currentSessionId && sessionQuestions.length > 0 && (
                          <div className="py-3 mt-3 border-t border-[rgba(21,101,192,0.1)]">
                            <label className="flex items-center justify-between gap-3 text-[13px] cursor-default">
                              <span className="text-[#546e7a] font-medium flex-shrink-0">Question Source:</span>
                              <div className="flex gap-1 bg-white border border-[rgba(21,101,192,0.2)] rounded-md p-0.5">
                                <button
                                  type="button"
                                  className={`px-3 py-1.5 border-none bg-transparent text-[#546e7a] cursor-pointer text-[13px] font-medium rounded transition-all min-w-[70px] ${
                                    !useDefaultQuestions 
                                      ? 'bg-gradient-to-br from-[#1976d2] to-[#0d47a1] text-white shadow-[0_2px_4px_rgba(21,101,192,0.2)]' 
                                      : 'hover:bg-[rgba(21,101,192,0.08)] hover:text-[#1565c0]'
                                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                                  onClick={() => setUseDefaultQuestions(false)}
                                  disabled={questionsLoading}
                                >
                                  Session
                                </button>
                                <button
                                  type="button"
                                  className={`px-3 py-1.5 border-none bg-transparent text-[#546e7a] cursor-pointer text-[13px] font-medium rounded transition-all min-w-[70px] ${
                                    useDefaultQuestions 
                                      ? 'bg-gradient-to-br from-[#1976d2] to-[#0d47a1] text-white shadow-[0_2px_4px_rgba(21,101,192,0.2)]' 
                                      : 'hover:bg-[rgba(21,101,192,0.08)] hover:text-[#1565c0]'
                                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                                  onClick={() => setUseDefaultQuestions(true)}
                                  disabled={questionsLoading}
                                >
                                  Default
                                </button>
                              </div>
                            </label>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-[#ddd] bg-white rounded-b-2xl flex-shrink-0">
            <div className="flex gap-2.5">
              <input 
                type="text" 
                id="sidebarChatInput" 
                placeholder="Ask about all filtered studies..." 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={loading}
                autoFocus={false}
                className="flex-1 px-3 py-3 border border-[#ddd] rounded text-base focus:outline-none focus:ring-2 focus:ring-[#0066cc] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ fontSize: '16px' }}
              />
              {loading && abortControllerRef.current ? (
                <button 
                  className="px-6 py-3 bg-[#dc3545] text-white border-none rounded cursor-pointer transition-colors hover:bg-[#c82333] text-sm font-medium touch-manipulation" 
                  onClick={() => {
                    if (abortControllerRef.current) {
                      // Get saved question before aborting
                      const savedQuestion = (abortControllerRef.current as any).savedQuestion;
                      
                      abortControllerRef.current.abort();
                      abortControllerRef.current = null;
                      
                      // Clear loading state immediately
                      dispatch(setLoading(false));
                      
                      // Remove the last user message and assistant message (if any) from Redux
                      dispatch(removeLastUserAndAssistantMessages());
                      
                      // Restore the question to input field
                      if (savedQuestion) {
                        setInputValue(savedQuestion);
                      } else {
                        // Fallback: try to get it from messages
                        const lastUserMessage = messages.length > 0 && messages[messages.length - 1].role === 'user'
                          ? messages[messages.length - 1]
                          : null;
                        if (lastUserMessage) {
                          setInputValue(lastUserMessage.content);
                        }
                      }
                    }
                  }}
                  id="sidebarStopBtn"
                >
                  Stop
                </button>
              ) : (
                <button 
                  className="px-6 py-3 bg-[#28a745] text-white border-none rounded cursor-pointer transition-colors hover:bg-[#218838] disabled:bg-[#ccc] disabled:cursor-not-allowed text-sm font-medium touch-manipulation" 
                  onClick={sendMessage} 
                  id="sidebarSendBtn"
                  disabled={!inputValue.trim() || loading}
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {user && !user.is_guest && (
        <QuestionSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          sessionId={currentSessionId}
          onSave={async () => {
            // Refresh questions after saving
            try {
              const [sessionResponse, defaultResponse] = await Promise.all([
                currentSessionId ? chatQuestionsApi.get(currentSessionId) : Promise.resolve(null),
                userPreferencesApi.get().catch(() => null),
              ]);

              if (sessionResponse && sessionResponse.success && sessionResponse.questions) {
                if (sessionResponse.source === 'session') {
                  setSessionQuestions(sessionResponse.questions);
                } else {
                  setSessionQuestions([]);
                }
              }

              if (defaultResponse && defaultResponse.success && defaultResponse.preferences?.default_chat_questions) {
                setDefaultQuestions(defaultResponse.preferences.default_chat_questions);
              }

              // Update display based on current toggle state
              if (sessionResponse && sessionResponse.source === 'session' && sessionResponse.questions.length > 0) {
                setDisplayQuestions(useDefaultQuestions ? defaultQuestions : sessionResponse.questions);
              } else if (defaultQuestions.length > 0) {
                setDisplayQuestions(defaultQuestions);
              }
            } catch (error) {
              console.error('Error refreshing questions:', error);
            }
          }}
        />
      )}
      {currentSessionId && (
        <ChatReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          sessionId={currentSessionId}
        />
      )}
    </div>
  );
}

