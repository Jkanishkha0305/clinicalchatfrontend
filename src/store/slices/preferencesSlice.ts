import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userPreferencesApi, userSettingsApi } from '@/lib/api';
import { AI_MODELS } from '@/lib/constants/aiModels';

type AIModel = 
  | 'gpt-5.1' | 'gpt-5' | 'gpt-5-mini' | 'gpt-5-nano' | 'gpt-4.1-mini' | 'gpt-4.1-nano' | 'gpt-4o-mini'
  | 'gemini-3-pro-preview' | 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.0-flash' | 'gemini-2.0-flash-lite';

interface PreferencesState {
  default_chat_questions: string[];
  ai_provider: 'openai' | 'gemini' | 'grok';
  ai_model: AIModel;
  visible_models: string[];
  loading: boolean;
  error: string | null;
}

const defaultQuestions = [
  "What are the most common interventions?",
  "How many studies are in Phase 3?",
  "Which sponsors are funding these trials?",
  "What are the primary outcomes?",
  "Summarize the recruiting studies",
];

// Default visible models for new users and guest users
const defaultVisibleModels: string[] = [
  "gemini-3-pro-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gpt-5",
  "gpt-4o-mini",
  "gpt-5-mini"
];

const initialState: PreferencesState = {
  default_chat_questions: defaultQuestions,
  ai_provider: 'openai',
  ai_model: 'gpt-4o-mini',
  visible_models: defaultVisibleModels,
  loading: false,
  error: null,
};

export const fetchPreferences = createAsyncThunk('preferences/fetch', async (_, { rejectWithValue }) => {
  try {
    const [preferencesResponse, settingsResponse] = await Promise.all([
      userPreferencesApi.get(),
      userSettingsApi.get().catch(() => null), // Settings might not exist yet
    ]);
    
    return {
      default_chat_questions: preferencesResponse.preferences.default_chat_questions || defaultQuestions,
      ai_provider: preferencesResponse.preferences.ai_provider || 'openai',
      ai_model: preferencesResponse.preferences.ai_model || 'gpt-4o-mini',
      visible_models: settingsResponse?.settings?.visible_models || defaultVisibleModels,
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch preferences');
  }
});

export const fetchSettings = createAsyncThunk('preferences/fetchSettings', async (_, { rejectWithValue }) => {
  try {
    const response = await userSettingsApi.get();
    return {
      visible_models: response.settings.visible_models || defaultVisibleModels,
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch settings');
  }
});

export const updateSettings = createAsyncThunk('preferences/updateSettings', async (updates: { visible_models?: string[] }, { rejectWithValue }) => {
  try {
    const response = await userSettingsApi.update(updates);
    return {
      visible_models: response.settings.visible_models || defaultVisibleModels,
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to update settings');
  }
});

export const updatePreferences = createAsyncThunk('preferences/update', async (updates: { default_chat_questions?: string[]; ai_provider?: 'openai' | 'gemini' | 'grok'; ai_model?: AIModel }, { rejectWithValue }) => {
  try {
    const response = await userPreferencesApi.update(updates);
    return {
      default_chat_questions: response.preferences.default_chat_questions,
      ai_provider: response.preferences.ai_provider || 'openai',
      ai_model: response.preferences.ai_model || 'gpt-4o-mini',
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to update preferences');
  }
});

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setDefaultQuestions: (state, action: PayloadAction<string[]>) => {
      state.default_chat_questions = action.payload;
    },
    setAiProvider: (state, action: PayloadAction<'openai' | 'gemini' | 'grok'>) => {
      state.ai_provider = action.payload;
    },
    setAiModel: (state, action: PayloadAction<AIModel>) => {
      state.ai_model = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.default_chat_questions = action.payload.default_chat_questions;
        state.ai_provider = action.payload.ai_provider;
        state.ai_model = (action.payload.ai_model || 'gpt-4o-mini') as AIModel;
        state.visible_models = action.payload.visible_models || defaultVisibleModels;
      })
      .addCase(fetchPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch preferences';
      })
      .addCase(updatePreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.default_chat_questions = action.payload.default_chat_questions;
        state.ai_provider = action.payload.ai_provider;
        state.ai_model = (action.payload.ai_model || 'gpt-4o-mini') as AIModel;
      })
      .addCase(updatePreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update preferences';
      })
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.visible_models = action.payload.visible_models || defaultVisibleModels;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch settings';
      })
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.visible_models = action.payload.visible_models || defaultVisibleModels;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update settings';
      });
  },
});

export const { setDefaultQuestions, setAiProvider, setAiModel, clearError } = preferencesSlice.actions;
export type { AIModel };
export default preferencesSlice.reducer;

