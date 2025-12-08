'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { chatSingleStudy, setCurrentStudy, clearStudyChatMessages, addStudyChatMessage, setStudyChatMessages, removeLastUserAndAssistantStudyChatMessages, setLoading } from '@/store/slices/chatSlice';
import { studyChatsApi, studyChatQuestionsApi, searchApi, chatSessionsApi } from '@/lib/api';
import { useToastHelpers } from '@/lib/toast';
import StudyChatQuestionSettingsModal from './StudyChatQuestionSettingsModal';
import StudyChatReportModal from './StudyChatReportModal';
import { updatePreferences, AIModel } from '@/store/slices/preferencesSlice';
import { ChatMessage } from '@/lib/types';
import { AI_MODELS } from '@/lib/constants/aiModels';

const DEFAULT_STUDY_CHAT_QUESTIONS = [
  "What is the primary objective of this study?",
  "What are the inclusion and exclusion criteria?",
  "What is the study design and methodology?",
  "What are the primary and secondary endpoints?",
  "What are the potential risks and benefits?",
];

export default function StudyChatModal() {
  const dispatch = useAppDispatch();
  const { studyChatMessages, currentStudy, loading, error } = useAppSelector((state) => state.chat);
  // Get messages for the current study (NCT ID)
  const currentStudyMessages = currentStudy ? (studyChatMessages[currentStudy] || []) : [];
  const { user } = useAppSelector((state) => state.auth);
  const { currentSessionId } = useAppSelector((state) => state.sessions);
  const { ai_model, visible_models } = useAppSelector((state) => state.preferences);
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [displayQuestions, setDisplayQuestions] = useState<string[]>(DEFAULT_STUDY_CHAT_QUESTIONS);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [lastLoadedStudy, setLastLoadedStudy] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(ai_model || 'gpt-4o-mini');
  const [savingModel, setSavingModel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const toast = useToastHelpers();

  const loadStudyChatData = async () => {
    if (!currentStudy) return;

    // For guest users, don't make API calls - just use default questions
    if (!user || user.is_guest) {
      // Use default questions for guest users (no API call needed)
      setDisplayQuestions([...DEFAULT_STUDY_CHAT_QUESTIONS]);
      setQuestionsLoading(false);
      
      // For guest users, messages are already tracked per study in Redux
      // No need to clear - each study has its own message history
      setLastLoadedStudy(currentStudy);
      return;
    }

    // Load saved messages if user is authenticated
    setMessagesLoading(true);
    try {
      // First, clear any existing messages to ensure clean state
      // This prevents showing stale streaming messages
      dispatch(clearStudyChatMessages(currentStudy));
      
      const studyChatResponse = await studyChatsApi.get(currentStudy, currentSessionId || undefined);
      if (studyChatResponse && studyChatResponse.success && studyChatResponse.studyChat) {
        const savedMessages = studyChatResponse.studyChat.messages || [];
        // Convert saved messages to ChatMessage format (ensure role is 'user' | 'assistant')
        // Filter out error messages related to cancellations
        const formattedMessages = savedMessages
          .map((msg: { role: string; content: string }) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }))
          .filter((msg: ChatMessage) => {
            // Filter out error messages about cancellations
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
        // Set all messages for this study (replaces any existing messages for this study)
        dispatch(setStudyChatMessages({ studyId: currentStudy, messages: formattedMessages }));
      } else {
        // No saved messages - clear messages for this study (already cleared above, but ensure it's cleared)
        dispatch(clearStudyChatMessages(currentStudy));
      }
    } catch (error) {
      console.error('Error loading study chat:', error);
      // On error, clear messages for this study
      dispatch(clearStudyChatMessages(currentStudy));
    } finally {
      setMessagesLoading(false);
    }

    // Load questions for authenticated users only
    setQuestionsLoading(true);
    try {
      const questionsResponse = await studyChatQuestionsApi.get(currentStudy, currentSessionId || undefined);
      if (questionsResponse && questionsResponse.success && questionsResponse.questions && questionsResponse.questions.length > 0) {
        setDisplayQuestions(questionsResponse.questions);
      } else {
        // Fallback to defaults if no questions or empty array
        setDisplayQuestions([...DEFAULT_STUDY_CHAT_QUESTIONS]);
      }
    } catch (error) {
      console.error('Error loading study chat questions:', error);
      // Always fallback to defaults on error
      setDisplayQuestions([...DEFAULT_STUDY_CHAT_QUESTIONS]);
    } finally {
      setQuestionsLoading(false);
    }
    
    // Track the last loaded study for authenticated users too
    setLastLoadedStudy(currentStudy);
  };

  useEffect(() => {
    if (currentStudy) {
      setIsOpen(true);
      // Clear loading state when opening a study chat to ensure clean state
      dispatch(setLoading(false));
      loadStudyChatData();
    } else {
      setIsOpen(false);
      setLastLoadedStudy(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStudy, currentSessionId]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentStudyMessages, isOpen]);

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

  const handleClose = () => {
    setIsOpen(false);
    dispatch(setCurrentStudy(null));
    setInputValue('');
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !currentStudy || loading) return;
    
    const question = inputValue.trim();
    const savedInputValue = question; // Save the question to restore if stopped
    setInputValue('');
    
    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Store the saved question in the abort controller for later retrieval
    (abortController as any).savedQuestion = savedInputValue;
    
    // Immediately show the user's question in the chat
    dispatch(addStudyChatMessage({ studyId: currentStudy, message: { role: 'user', content: question } }));
    
    try {
      // Note: chatSingleStudy already saves to study chat if user is authenticated
      // The chatSessionId will be passed if available
      // Enable streaming for better UX
      await dispatch(chatSingleStudy({
        nctId: currentStudy,
        question,
        chatSessionId: currentSessionId || undefined,
        useStream: true, // Enable streaming
        model: selectedModel || ai_model || 'gpt-4o-mini', // Use selected model with fallback
        abortController, // Pass abort controller
      }));
      
      // Clear abort controller reference when done
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    } catch (error: any) {
      // Handle abort errors - restore input and remove messages
      if (error?.name === 'AbortError' || error?.message?.includes('cancelled') || error?.message?.includes('aborted')) {
        // Clear loading state immediately
        dispatch(setLoading(false));
        
        // Remove the user message and any partial assistant message
        if (currentStudy) {
          dispatch(removeLastUserAndAssistantStudyChatMessages(currentStudy));
        }
        // Restore the question to input field
        setInputValue(savedInputValue);
      }
      // Clear abort controller reference
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleGenerateStudyChatReport = () => {
    if (!currentStudy) {
      toast.error('No study selected. Please select a study first.');
      return;
    }

    if (!currentStudyMessages || currentStudyMessages.length === 0) {
      toast.error('No messages in this conversation. Please chat first before generating a report.');
      return;
    }

    if (!user || user.is_guest) {
      toast.error('Please log in to generate reports.');
      return;
    }

    setIsReportModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 sm:p-5" 
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl w-full max-w-[900px] max-h-[85vh] h-auto flex flex-col shadow-[0_24px_48px_rgba(0,0,0,0.3)] relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b border-[#e0e0e0] flex flex-col gap-3 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-t-2xl">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="m-0 text-xl sm:text-2xl font-semibold text-white">Chat about Study</h2>
              <p className="m-0 mt-1 text-xs sm:text-sm text-white/90 font-mono font-normal break-all">{currentStudy || 'Study'}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
            {user && !user.is_guest && currentStudyMessages.length > 0 && (
              <button
                className="bg-white/25 backdrop-blur-sm border border-white/40 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none hover:bg-white/35 hover:border-white/60 hover:shadow-lg hover:scale-105 text-xs sm:text-sm font-medium shadow-md"
                onClick={handleGenerateStudyChatReport}
                disabled={generatingReport || loading}
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
            {user && !user.is_guest && (
              <button
                className="bg-white/25 backdrop-blur-sm border border-white/40 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none hover:bg-white/35 hover:border-white/60 hover:shadow-lg hover:scale-105 text-xs sm:text-sm font-medium shadow-md"
                onClick={() => setIsSettingsOpen(true)}
                title="Configure Questions"
                aria-label="Configure Questions"
                disabled={loading}
              >
                <svg className="flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span className="hidden sm:inline whitespace-nowrap">Configure Questions</span>
              </button>
            )}
            <button 
              onClick={handleClose} 
              className="bg-white/20 hover:bg-white/30 border border-white/30 hover:border-white/50 text-white text-xl sm:text-2xl w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100" 
              aria-label="Close"
              disabled={loading}
            >
              ×
            </button>
          </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-white/20">
            <label className="text-sm text-white/90 whitespace-nowrap">AI Model:</label>
            <select 
              value={selectedModel} 
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={savingModel || loading}
              className="px-2.5 py-1.5 border border-white/30 rounded text-sm text-white bg-white/20 cursor-pointer outline-none transition-colors min-w-[150px] focus:border-white/50 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
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
                      <optgroup label="GPT" className="bg-[#667eea]">
                        {gptModels.map(model => (
                          <option key={model.value} value={model.value} className="bg-[#667eea]">{model.label}</option>
                        ))}
                      </optgroup>
                    )}
                    {geminiModels.length > 0 && (
                      <optgroup label="Gemini" className="bg-[#667eea]">
                        {geminiModels.map(model => (
                          <option key={model.value} value={model.value} className="bg-[#667eea]">{model.label}</option>
                        ))}
                      </optgroup>
                    )}
                  </>
                );
              })()}
            </select>
            {savingModel && (
              <svg className="animate-spin w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            )}
          </div>
        </div>
        
        <div id="chatMessages" className="flex-1 p-6 sm:p-6 overflow-y-auto bg-[#f8f9fa] min-h-[300px] max-h-[calc(85vh-200px)]">
          {messagesLoading ? (
            <div className="flex flex-col items-center justify-center p-16 gap-4 text-center text-[#546e7a]">
              <div className="w-10 h-10 border-4 border-[#e0e0e0] border-t-[#0066cc] rounded-full animate-spin"></div>
              <p className="m-0 text-sm">Loading conversation...</p>
            </div>
          ) : currentStudyMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 gap-5 text-center text-[#546e7a]">
              <svg className="w-16 h-16 text-[#90a4ae] opacity-60" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <line x1="8" y1="9" x2="16" y2="9"/>
                <line x1="8" y1="13" x2="14" y2="13"/>
              </svg>
              <h3 className="text-xl font-semibold text-[#37474f] m-0">{currentStudy || 'Study'}</h3>
              <p className="m-0 text-sm max-w-[400px]">Ask any question about this study to get detailed information.</p>
              {questionsLoading ? (
                <div className="p-5 text-center text-[#666] mt-5">Loading questions...</div>
              ) : (
                <ul className="list-none p-0 m-0 mt-5 max-w-[600px] w-full">
                  {displayQuestions.map((question, idx) => (
                    <li 
                      key={idx} 
                      className="p-2.5 sm:p-3 my-1.5 bg-[#f8f9fa] border border-[#e0e0e0] rounded-md cursor-pointer transition-all text-[#333] select-none hover:bg-[#e3f2fd] hover:border-[#0066cc] hover:text-[#0066cc] hover:translate-x-1 hover:shadow-[0_2px_4px_rgba(0,102,204,0.1)] active:translate-x-0.5 active:bg-[#bbdefb] focus:outline-2 focus:outline-[#0066cc] focus:outline-offset-2"
                      onClick={() => {
                        if (!loading) {
                          setInputValue(question);
                          setTimeout(() => {
                            const input = document.getElementById('chatInput') as HTMLInputElement;
                            if (input) {
                              input.focus();
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
              )}
            </div>
          ) : (
            <>
              {currentStudyMessages.map((msg, idx) => {
                const isLastMessage = idx === currentStudyMessages.length - 1;
                // Check if it's the thinking indicator
                const isThinking = isLastMessage && msg.role === 'assistant' && loading && (msg.content === '<div class="thinking-indicator">Thinking...</div>' || msg.content === '');
                // Check if it's streaming markdown (not HTML yet)
                const isStreaming = isLastMessage && msg.role === 'assistant' && loading && msg.content && !isThinking && !msg.content.trim().startsWith('<');
                
                return (
                  <div key={idx} className={`mb-4 p-3 rounded-md max-w-[90%] break-words ${
                    msg.role === 'user' 
                      ? 'bg-[#007bff] text-white ml-auto' 
                      : 'bg-white border border-[#ddd]'
                  }`}>
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
                      ) : (
                        <div className="[&_ul]:ml-5 [&_ul]:mt-2 [&_ul]:mb-2 [&_ol]:ml-5 [&_ol]:mt-2 [&_ol]:mb-2 [&_li]:mb-1.5 [&_li]:leading-relaxed [&_p]:mb-2.5 [&_p]:leading-relaxed [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: msg.content || '' }} />
                      )
                    ) : (
                      msg.content
                    )}
                  </div>
                );
              })}
              {/* Show suggested questions at the bottom when there are messages */}
              {!loading && (
                <div className="mt-5 pt-5 border-t border-[#e0e0e0]">
                  <p className="my-0 mb-2.5 text-sm text-[#666] font-medium">Suggested questions:</p>
                  {questionsLoading ? (
                    <div className="p-2.5 text-center text-[#999] text-[13px]">Loading...</div>
                  ) : (
                    <ul className="list-none p-0 m-0">
                      {displayQuestions.map((question, idx) => (
                        <li 
                          key={idx} 
                          className="p-2.5 sm:p-3 my-1.5 bg-[#f8f9fa] border border-[#e0e0e0] rounded-md cursor-pointer transition-all text-[#333] select-none hover:bg-[#e3f2fd] hover:border-[#0066cc] hover:text-[#0066cc] hover:translate-x-1 hover:shadow-[0_2px_4px_rgba(0,102,204,0.1)] active:translate-x-0.5 active:bg-[#bbdefb] focus:outline-2 focus:outline-[#0066cc] focus:outline-offset-2"
                          onClick={() => {
                            setInputValue(question);
                            setTimeout(() => {
                              const input = document.getElementById('chatInput') as HTMLInputElement;
                              if (input) {
                                input.focus();
                                input.setSelectionRange(question.length, question.length);
                              }
                            }, 0);
                          }}
                        >
                          {question}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {error && (
          <div className="flex gap-2.5 px-4 py-3 bg-[#ffebee] border-l-4 border-[#f44336] rounded-md mb-4 mx-6 text-sm text-[#c62828] items-center">
            <svg className="w-4 h-4 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <div className="p-5 sm:p-6 border-t border-[#e0e0e0] bg-white rounded-b-2xl">
          <div className="flex gap-3 items-center">
            <input 
              type="text" 
              id="chatInput" 
              placeholder="Ask a question about this study..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
              disabled={loading}
              autoFocus
              className="flex-1 px-4 py-3 border-2 border-[#e0e0e0] rounded-lg text-base transition-all outline-none focus:border-[#1565c0] focus:shadow-[0_0_0_3px_rgba(21,101,192,0.1)] disabled:bg-[#f5f5f5] disabled:cursor-not-allowed"
              style={{ fontSize: '16px' }}
            />
            {loading && abortControllerRef.current ? (
              <button 
                className="px-6 py-3 bg-[#dc3545] text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all flex items-center gap-2 min-w-[100px] justify-center hover:bg-[#c82333] hover:shadow-[0_8px_20px_rgba(220,53,69,0.2)]" 
                  onClick={() => {
                    if (abortControllerRef.current) {
                      // Get saved question before aborting
                      const savedQuestion = (abortControllerRef.current as any).savedQuestion;
                      
                      // Abort the request first
                      abortControllerRef.current.abort();
                      abortControllerRef.current = null;
                      
                      // Clear loading state immediately
                      dispatch(setLoading(false));
                      
                      // Remove the last user message and assistant message (if any) from Redux
                      // This matches FloatingChat behavior - always remove both if they exist
                      if (currentStudy) {
                        dispatch(removeLastUserAndAssistantStudyChatMessages(currentStudy));
                      }
                      
                      // Restore the question to input field
                      if (savedQuestion) {
                        setInputValue(savedQuestion);
                      } else {
                        // Fallback: try to get it from messages
                        const lastUserMessage = currentStudyMessages.length > 0 && currentStudyMessages[currentStudyMessages.length - 1].role === 'user'
                          ? currentStudyMessages[currentStudyMessages.length - 1]
                          : null;
                        if (lastUserMessage) {
                          setInputValue(lastUserMessage.content);
                        }
                      }
                    }
                  }}
              >
                Stop
              </button>
            ) : (
              <button 
                className="px-6 py-3 bg-gradient-to-br from-[#1976d2] to-[#0d47a1] text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all flex items-center gap-2 min-w-[100px] justify-center hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(13,71,161,0.2)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none" 
                onClick={sendMessage} 
                disabled={loading || !inputValue.trim()}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      {user && !user.is_guest && (
        <StudyChatQuestionSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          studyId={currentStudy}
          chatSessionId={currentSessionId}
          onSave={async () => {
            // Refresh questions after saving
            try {
              const response = await studyChatQuestionsApi.get(currentStudy || undefined, currentSessionId || undefined);
              if (response && response.success && response.questions) {
                setDisplayQuestions(response.questions);
              }
            } catch (error) {
              console.error('Error refreshing study chat questions:', error);
            }
          }}
        />
      )}
      {currentStudy && (
        <StudyChatReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          studyId={currentStudy}
          chatSessionId={currentSessionId || undefined}
        />
      )}
    </div>
  );
}

