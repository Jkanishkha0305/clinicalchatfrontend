import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatSession, SearchFilters } from '@/lib/types';
import { chatSessionsApi } from '@/lib/api';

interface SessionsState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  loading: boolean;
  error: string | null;
  expectedSessionId: string | null; // Track which session ID we're expecting results for
}

const initialState: SessionsState = {
  sessions: [],
  currentSessionId: null,
  loading: false,
  error: null,
  expectedSessionId: null,
};

export const fetchSessions = createAsyncThunk('sessions/fetch', async (_, { rejectWithValue }) => {
  try {
    const response = await chatSessionsApi.list();
    return response.sessions || [];
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch sessions');
  }
});

export const createSession = createAsyncThunk(
  'sessions/create',
  async (data: { title?: string; description?: string; last_filters?: SearchFilters } | undefined, { rejectWithValue }) => {
  try {
      const response = await chatSessionsApi.create(data);
    return response.session;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to create session');
  }
  }
);

export const fetchSession = createAsyncThunk('sessions/fetchOne', async (id: string, { rejectWithValue, signal }) => {
  try {
    const response = await chatSessionsApi.get(id);
    
    // Check if request was aborted
    if (signal?.aborted) {
      return rejectWithValue('Request aborted');
    }
    
    return { ...response.session, expectedSessionId: id };
  } catch (error) {
    // Don't reject if request was aborted
    if (signal?.aborted) {
      return rejectWithValue('Request aborted');
    }
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch session');
  }
});

// Action to update current session from chat response
export const updateSessionFromChat = createAsyncThunk(
  'sessions/updateFromChat',
  async (sessionInfo: { sessionId: string; title: string; description: string; custom_questions?: string[] | null }, { rejectWithValue }) => {
    try {
      // Just return the session info - it will be added/updated in the reducer
      return sessionInfo;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update session');
    }
  }
);

export const updateSession = createAsyncThunk(
  'sessions/update',
  async ({
    id,
    data,
  }: {
    id: string;
    data: { title?: string; description?: string; last_filters?: SearchFilters };
  }, { rejectWithValue }) => {
    try {
      const response = await chatSessionsApi.update(id, data);
      return response.session;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update session');
    }
  }
);

export const deleteSession = createAsyncThunk('sessions/delete', async (id: string, { rejectWithValue }) => {
  try {
    const response = await chatSessionsApi.delete(id);
    if (!response.success) {
      return rejectWithValue(response.message || 'Failed to delete session');
    }
    return { id, message: response.message };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete session');
  }
});

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    setCurrentSession: (state, action: PayloadAction<string | null>) => {
      state.currentSessionId = action.payload;
      // Clear expected session ID when manually setting current session
      // It will be set again when fetchSession starts
      state.expectedSessionId = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setExpectedSessionId: (state, action: PayloadAction<string | null>) => {
      state.expectedSessionId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch sessions
      .addCase(fetchSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch sessions';
      })
      // Create session
      .addCase(createSession.fulfilled, (state, action) => {
        state.sessions.unshift(action.payload);
        state.currentSessionId = action.payload.id;
      })
      // Fetch single session
      .addCase(fetchSession.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Set expected session ID when request starts
        const sessionId = action.meta.arg;
        state.expectedSessionId = sessionId;
      })
      .addCase(fetchSession.fulfilled, (state, action) => {
        // Only update state if this response matches the expected session ID
        // This prevents stale responses from overwriting current data
        const responseSessionId = action.payload.expectedSessionId || action.payload.id;
        const currentExpectedSessionId = state.expectedSessionId;
        
        // If session IDs don't match, ignore this response (it's stale)
        if (responseSessionId !== currentExpectedSessionId && currentExpectedSessionId !== null) {
          return; // Ignore stale response
        }
        
        state.loading = false;
        const sessionPayload = { ...action.payload };
        delete sessionPayload.expectedSessionId; // Remove temporary field
        
        const index = state.sessions.findIndex((s) => s.id === sessionPayload.id);
        if (index >= 0) {
          // Preserve custom_questions if not in payload
          state.sessions[index] = {
            ...sessionPayload,
            custom_questions: sessionPayload.custom_questions !== undefined ? sessionPayload.custom_questions : state.sessions[index].custom_questions,
          };
        } else {
          state.sessions.unshift(sessionPayload);
        }
        state.currentSessionId = sessionPayload.id;
        state.expectedSessionId = null; // Clear after successful update
      })
      .addCase(fetchSession.rejected, (state, action) => {
        // Only update error if request wasn't aborted (aborted requests are expected)
        if (action.payload !== 'Request aborted') {
          state.loading = false;
          state.error = action.payload as string || 'Failed to fetch session';
        } else {
          // Request was aborted, just stop loading
          state.loading = false;
        }
        state.expectedSessionId = null; // Clear on error
      })
      // Update session
      .addCase(updateSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSession.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (index >= 0) {
          state.sessions[index] = action.payload;
        }
      })
      .addCase(updateSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update session';
      })
      // Delete session
      .addCase(deleteSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSession.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = state.sessions.filter((s) => s.id !== action.payload.id);
        if (state.currentSessionId === action.payload.id) {
          state.currentSessionId = null;
        }
      })
      .addCase(deleteSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to delete session';
      })
      // Update session from chat response
      .addCase(updateSessionFromChat.fulfilled, (state, action) => {
        const sessionInfo = action.payload;
        // Check if session already exists
        const existingIndex = state.sessions.findIndex((s) => s.id === sessionInfo.sessionId);
        if (existingIndex >= 0) {
          // Update existing session
          state.sessions[existingIndex] = {
            ...state.sessions[existingIndex],
            title: sessionInfo.title,
            description: sessionInfo.description,
            custom_questions: sessionInfo.custom_questions !== undefined ? sessionInfo.custom_questions : state.sessions[existingIndex].custom_questions,
          };
        } else {
          // Add new session
          state.sessions.unshift({
            id: sessionInfo.sessionId,
            title: sessionInfo.title,
            description: sessionInfo.description,
            custom_questions: sessionInfo.custom_questions || null,
          });
        }
        // Update current session ID if it's a new session
        if (!state.currentSessionId || state.currentSessionId !== sessionInfo.sessionId) {
          state.currentSessionId = sessionInfo.sessionId;
        }
      });
  },
});

export const { setCurrentSession, clearError, setExpectedSessionId } = sessionsSlice.actions;
export default sessionsSlice.reducer;

