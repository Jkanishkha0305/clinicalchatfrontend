import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, SearchFilters, ProtocolReport } from '@/lib/types';
import { chatApi } from '@/lib/api';

interface ChatState {
  messages: ChatMessage[]; // Messages for "all studies" chat (FloatingChat)
  studyChatMessages: Record<string, ChatMessage[]>; // Messages for "single study" chat, keyed by NCT ID (StudyChatModal)
  reports: ProtocolReport[]; // Protocol reports for the current session
  currentStudy: string | null;
  isAdvancedMode: boolean;
  loading: boolean;
  generatingReport: boolean; // Loading state for report generation (persists across tab switches)
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  studyChatMessages: {}, // Object with NCT ID as key, messages array as value
  reports: [],
  currentStudy: null,
  isAdvancedMode: false,
  loading: false,
  generatingReport: false,
  error: null,
};

export const chatSingleStudy = createAsyncThunk(
  'chat/singleStudy',
  async ({ nctId, question, chatSessionId, useStream = false, model, abortController }: { nctId: string; question: string; chatSessionId?: string; useStream?: boolean; model?: string; abortController?: AbortController }, { rejectWithValue, dispatch, getState }) => {
    try {
      // Get model from state if not provided
      const state = getState() as any;
      const aiModel = model || state.preferences?.ai_model || 'gpt-4o-mini';
      
      if (useStream) {
        // Use streaming API
        return new Promise((resolve, reject) => {
          let streamingAnswer = '';
          
          // Add placeholder message with "thinking" indicator for streaming
          dispatch(addStudyChatMessage({ studyId: nctId, message: { role: 'assistant', content: '<div class="thinking-indicator">Thinking...</div>' } }));
          
          chatApi.chatSingleStudyStream(
            nctId,
            question,
            chatSessionId,
            (chunk) => {
              // Check if aborted
              if (abortController?.signal.aborted) {
                return;
              }
              // Update the last message (assistant) with streaming content (markdown)
              streamingAnswer += chunk;
              // Display markdown during streaming (will be converted to HTML at completion)
              dispatch(updateStudyChatStreamingMessage({ studyId: nctId, content: streamingAnswer }));
            },
            (answer) => {
              // Server sends HTML at completion (already converted from markdown)
              // Update final message with HTML (replace the streaming content)
              dispatch(updateStudyChatStreamingMessage({ studyId: nctId, content: answer }));
              
              resolve({
                question,
                answer: answer,
              });
            },
            (error) => {
              // Don't show error message for user-initiated cancellations
              if (error && typeof error === 'string' && error.includes('cancelled')) {
                // Just reject without adding error message to chat
                reject(rejectWithValue('Request cancelled'));
                return;
              }
              dispatch(updateStudyChatStreamingMessage({ studyId: nctId, content: `Error: ${error}` }));
              reject(rejectWithValue(error));
            },
            aiModel,
            abortController
          );
        }) as any;
      } else {
        // Use regular API
        const response = await chatApi.chatSingleStudy(nctId, question, chatSessionId, aiModel);
        return { question, answer: response.answer };
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Chat failed');
    }
  }
);

export const chatAllStudies = createAsyncThunk(
  'chat/allStudies',
  async ({
    filters,
    question,
    advancedMode,
    sessionId,
    useStream = false,
    model,
    abortController,
  }: {
    filters: SearchFilters;
    question: string;
    advancedMode: boolean;
    sessionId?: string;
    useStream?: boolean;
    model?: string;
    abortController?: AbortController;
  }, { rejectWithValue, dispatch, getState }) => {
    try {
      // Get model from state if not provided
      const state = getState() as any;
      const aiModel = model || state.preferences?.ai_model || 'gpt-4o-mini';
      
      if (useStream) {
        // Use streaming API
        return new Promise((resolve, reject) => {
          let streamingAnswer = '';
          
          // Add placeholder message with "thinking" indicator for streaming
          dispatch(addMessage({ role: 'assistant', content: '<div class="thinking-indicator">Thinking...</div>' }));
          
          chatApi.chatAllStudiesStream(
            filters,
            question,
            advancedMode,
            sessionId,
            (chunk) => {
              // Check if aborted
              if (abortController?.signal.aborted) {
                return;
              }
              // Update the last message (assistant) with streaming content (markdown)
              streamingAnswer += chunk;
              // Display markdown during streaming (will be converted to HTML at completion)
              dispatch(updateStreamingMessage(streamingAnswer));
            },
            (answer, info, sessionInfo) => {
              // Server sends HTML at completion (already converted from markdown)
              // Note: answer already includes HTML, and info is separate
              let answerContent = answer;
              if (info && !answerContent.includes('ℹ️ Analysis Info:')) {
                // Only add info box if it's not already present in the answer
                answerContent = `<div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 10px; margin-bottom: 10px; font-size: 12px;"><strong>ℹ️ Analysis Info:</strong> ${info}</div>${answerContent}`;
              }
              
              // Update final message with HTML (replace the streaming content)
              dispatch(updateStreamingMessage(answerContent));
              
              resolve({
                question,
                answer: answerContent,
                info,
                sessionInfo,
              });
            },
            (error) => {
              // Don't show error message for user-initiated cancellations
              if (error && typeof error === 'string' && error.includes('cancelled')) {
                // Just reject without adding error message to chat
                reject(rejectWithValue('Request cancelled'));
                return;
              }
              dispatch(updateStreamingMessage(`Error: ${error}`));
              reject(rejectWithValue(error));
            },
            aiModel,
            abortController
          );
        }) as any;
      } else {
        // Use regular API
      const response = await chatApi.chatAllStudies(filters, question, advancedMode, sessionId, aiModel);
      return {
        question,
        answer: response.answer,
        info: response.info,
          sessionInfo: response.sessionInfo,
      };
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Chat failed');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    updateStreamingMessage: (state, action: PayloadAction<string>) => {
      // Update the last message if it's an assistant message
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content = action.payload;
      }
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    removeLastMessage: (state) => {
      if (state.messages.length > 0) {
        state.messages.pop();
      }
    },
    removeLastUserAndAssistantMessages: (state) => {
      // Remove assistant message if it's the last one
      if (state.messages.length > 0 && state.messages[state.messages.length - 1].role === 'assistant') {
        state.messages.pop();
      }
      // Remove user message if it's now the last one
      if (state.messages.length > 0 && state.messages[state.messages.length - 1].role === 'user') {
        state.messages.pop();
      }
    },
    setReports: (state, action: PayloadAction<ProtocolReport[]>) => {
      state.reports = action.payload;
    },
    clearReports: (state) => {
      state.reports = [];
    },
    setGeneratingReport: (state, action: PayloadAction<boolean>) => {
      state.generatingReport = action.payload;
    },
    clearStudyChatMessages: (state, action: PayloadAction<string>) => {
      // Clear messages for a specific study (NCT ID)
      if (action.payload) {
        delete state.studyChatMessages[action.payload];
      }
    },
    clearAllStudyChatMessages: (state) => {
      // Clear all study chat messages (for new chat reset)
      state.studyChatMessages = {};
    },
    addStudyChatMessage: (state, action: PayloadAction<{ studyId: string; message: ChatMessage }>) => {
      // Add message to a specific study's chat
      const { studyId, message } = action.payload;
      if (!state.studyChatMessages[studyId]) {
        state.studyChatMessages[studyId] = [];
      }
      state.studyChatMessages[studyId].push(message);
    },
    updateStudyChatStreamingMessage: (state, action: PayloadAction<{ studyId: string; content: string }>) => {
      // Update the last message if it's an assistant message for a specific study
      const { studyId, content } = action.payload;
      const messages = state.studyChatMessages[studyId];
      if (messages && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = content;
        }
      }
    },
    setStudyChatMessages: (state, action: PayloadAction<{ studyId: string; messages: ChatMessage[] }>) => {
      // Set all messages for a specific study (used when loading saved messages)
      const { studyId, messages } = action.payload;
      state.studyChatMessages[studyId] = messages;
    },
    removeLastUserAndAssistantStudyChatMessages: (state, action: PayloadAction<string>) => {
      // Remove assistant message and user message for a specific study
      // This matches the behavior of removeLastUserAndAssistantMessages for main chat
      const studyId = action.payload;
      const messages = state.studyChatMessages[studyId];
      if (messages && messages.length > 0) {
        // Remove assistant message if it's the last one (could be "Thinking..." or streaming content)
        if (messages[messages.length - 1].role === 'assistant') {
          messages.pop();
        }
        // Remove user message if it's now the last one
        if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
          messages.pop();
        }
      }
    },
    setCurrentStudy: (state, action: PayloadAction<string | null>) => {
      state.currentStudy = action.payload;
      // Don't clear messages when closing study chat - preserve them
      // Only clear if explicitly needed
    },
    setAdvancedMode: (state, action: PayloadAction<boolean>) => {
      state.isAdvancedMode = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Single study chat
      .addCase(chatSingleStudy.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(chatSingleStudy.fulfilled, (state, action) => {
        state.loading = false;
        // Get the study ID from the action meta or from currentStudy
        const studyId = state.currentStudy || action.meta.arg.nctId;
        if (!studyId) return;
        
        // Initialize messages array for this study if it doesn't exist
        if (!state.studyChatMessages[studyId]) {
          state.studyChatMessages[studyId] = [];
        }
        
        // For streaming, messages are already added and updated, so don't add again
        // Check if the last message is already the assistant message (from streaming)
        const messages = state.studyChatMessages[studyId];
        const lastMessage = messages[messages.length - 1];
        const isFromStreaming = lastMessage && lastMessage.role === 'assistant' && lastMessage.content;
        
        if (!isFromStreaming) {
          // Non-streaming: add messages normally
          // Check if the user's question was already added optimistically
          if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== action.payload.question) {
            messages.push({ role: 'user', content: action.payload.question });
          }
          messages.push({ role: 'assistant', content: action.payload.answer });
        }
      })
      .addCase(chatSingleStudy.rejected, (state, action) => {
        state.loading = false;
        const errorMessage = action.payload as string || 'Chat failed';
        state.error = errorMessage;
        // Get the study ID from currentStudy
        const studyId = state.currentStudy;
        // Don't add error message to chat if it's a user-initiated cancellation
        if (errorMessage && errorMessage.includes('cancelled')) {
          return; // Silently handle cancellation without adding error message
        }
        if (studyId) {
          if (!state.studyChatMessages[studyId]) {
            state.studyChatMessages[studyId] = [];
          }
          state.studyChatMessages[studyId].push({ role: 'assistant', content: `Error: ${errorMessage}` });
        }
      })
      // All studies chat
      .addCase(chatAllStudies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(chatAllStudies.fulfilled, (state, action) => {
        state.loading = false;
        // For streaming, messages are already added and updated, so don't add again
        // Check if the last message is already the assistant message (from streaming)
        const lastMessage = state.messages[state.messages.length - 1];
        const isFromStreaming = lastMessage && lastMessage.role === 'assistant' && lastMessage.content;
        
        if (!isFromStreaming) {
          // Non-streaming: add messages normally
          // Check if the user's question was already added optimistically
          if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== action.payload.question) {
        state.messages.push({ role: 'user', content: action.payload.question });
          }
        let answerContent = action.payload.answer;
        if (action.payload.info) {
          answerContent = `<div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 10px; margin-bottom: 10px; font-size: 12px;"><strong>ℹ️ Analysis Info:</strong> ${action.payload.info}</div>${answerContent}`;
        }
        state.messages.push({ role: 'assistant', content: answerContent });
        }
        // Note: sessionInfo is returned in the action payload and should be handled by the component
      })
      .addCase(chatAllStudies.rejected, (state, action) => {
        state.loading = false;
        const errorMessage = action.payload as string || 'Chat failed';
        state.error = errorMessage;
        // Don't add error message to chat if it's a user-initiated cancellation
        if (errorMessage && errorMessage.includes('cancelled')) {
          return; // Silently handle cancellation without adding error message
        }
        // Check if the user's question was already added optimistically
        // If the last message is not the user's question, add it
        const lastMessage = state.messages[state.messages.length - 1];
        if (!lastMessage || lastMessage.role !== 'user') {
          // Question wasn't added, but we don't have the question in the error case
          // So we'll just add the error message
        }
        state.messages.push({ role: 'assistant', content: `Error: ${errorMessage}` });
      });
  },
});

export const { addMessage, updateStreamingMessage, clearMessages, removeLastMessage, removeLastUserAndAssistantMessages, addStudyChatMessage, updateStudyChatStreamingMessage, clearStudyChatMessages, clearAllStudyChatMessages, setStudyChatMessages, removeLastUserAndAssistantStudyChatMessages, setCurrentStudy, setAdvancedMode, setReports, clearReports, setGeneratingReport, clearError, setLoading } = chatSlice.actions;
export default chatSlice.reducer;

