import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userPreferencesApi, userSettingsApi } from '@/lib/api';
import { AI_MODELS, type AIModel, type AIProvider, normalizeProvider } from '@/lib/constants/aiModels';

interface PreferencesState {
  default_chat_questions: string[];
  ai_provider: AIProvider;
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

const KNOWN_MODELS = new Set(AI_MODELS.map((model) => model.value));

const normalizeVisibleModels = (visibleModels?: string[] | null): string[] => {
  if (!visibleModels || visibleModels.length === 0) {
    return defaultVisibleModels;
  }

  const knownModels = visibleModels.filter((model) => KNOWN_MODELS.has(model as AIModel));
  const containsUnknownModels = knownModels.length !== visibleModels.length;

  if (containsUnknownModels && knownModels.length <= 1) {
    return defaultVisibleModels;
  }

  return knownModels.length > 0 ? knownModels : defaultVisibleModels;
};

const normalizeSelectedModel = (model?: string | null): AIModel => {
  if (model && KNOWN_MODELS.has(model as AIModel)) {
    return model as AIModel;
  }

  return 'gpt-4o-mini';
};

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
      ai_provider: normalizeProvider(preferencesResponse.preferences.ai_provider),
      ai_model: normalizeSelectedModel(preferencesResponse.preferences.ai_model),
      visible_models: normalizeVisibleModels(settingsResponse?.settings?.visible_models),
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch preferences');
  }
});

export const fetchSettings = createAsyncThunk('preferences/fetchSettings', async (_, { rejectWithValue }) => {
  try {
    const response = await userSettingsApi.get();
    return {
      visible_models: normalizeVisibleModels(response.settings.visible_models),
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch settings');
  }
});

export const updateSettings = createAsyncThunk('preferences/updateSettings', async (updates: { visible_models?: string[] }, { rejectWithValue }) => {
  try {
    const response = await userSettingsApi.update(updates);
    return {
      visible_models: normalizeVisibleModels(response.settings.visible_models),
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to update settings');
  }
});

export const updatePreferences = createAsyncThunk('preferences/update', async (updates: { default_chat_questions?: string[]; ai_provider?: AIProvider; ai_model?: AIModel }, { rejectWithValue }) => {
  try {
    const response = await userPreferencesApi.update(updates);
    return {
      default_chat_questions: response.preferences.default_chat_questions,
      ai_provider: normalizeProvider(response.preferences.ai_provider),
      ai_model: normalizeSelectedModel(response.preferences.ai_model),
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
    setAiProvider: (state, action: PayloadAction<AIProvider>) => {
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
        state.ai_model = normalizeSelectedModel(action.payload.ai_model);
        state.visible_models = normalizeVisibleModels(action.payload.visible_models);
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
        state.ai_model = normalizeSelectedModel(action.payload.ai_model);
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
        state.visible_models = normalizeVisibleModels(action.payload.visible_models);
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
        state.visible_models = normalizeVisibleModels(action.payload.visible_models);
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
