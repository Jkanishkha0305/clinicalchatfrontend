import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Study, SearchFilters } from '@/lib/types';
import { searchApi } from '@/lib/api';

interface SearchState {
  results: Study[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  filters: SearchFilters | null;
  loading: boolean;
  error: string | null;
  searchType?: 'keyword' | 'semantic';
  expectedSessionId: string | null; // Track which session ID we're expecting results for
}

const initialState: SearchState = {
  results: [],
  total: 0,
  page: 1,
  perPage: 20,
  totalPages: 1,
  filters: null,
  loading: false,
  error: null,
  expectedSessionId: null,
};

export const searchStudies = createAsyncThunk(
  'search/searchStudies',
  async ({ filters, page = 1, perPage, sessionId }: { filters: SearchFilters; page?: number; perPage?: number; sessionId?: string }, { getState, rejectWithValue, signal }) => {
    try {
      const state = getState() as { search: SearchState };
      const currentPerPage = perPage || state.search.perPage;
      const searchFilters = { ...filters, page, per_page: currentPerPage, sessionId };
      
      // Store the sessionId we're expecting results for
      const expectedSessionId = sessionId || null;
      
      const response = await searchApi.search(searchFilters, signal);
      
      // Check if request was aborted
      if (signal?.aborted) {
        return rejectWithValue('Request aborted');
      }
      
      // Handle response structure: { success, total, page, per_page, total_pages, results, sessionInfo? }
      return { 
        ...response, 
        filters: searchFilters,
        sessionInfo: response.sessionInfo,
        expectedSessionId, // Include expected session ID in response
      };
    } catch (error) {
      // Don't reject if request was aborted
      if (signal?.aborted) {
        return rejectWithValue('Request aborted');
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Search failed');
    }
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<SearchFilters>) => {
      state.filters = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setPerPage: (state, action: PayloadAction<number>) => {
      state.perPage = action.payload;
    },
    clearResults: (state) => {
      state.results = [];
      state.total = 0;
      state.page = 1;
      state.totalPages = 1;
      state.filters = null;
      state.expectedSessionId = null; // Clear expected session ID when clearing results
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
      .addCase(searchStudies.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        // Set expected session ID when request starts
        const sessionId = action.meta.arg.sessionId || null;
        state.expectedSessionId = sessionId;
      })
      .addCase(searchStudies.fulfilled, (state, action) => {
        // Only update state if this response matches the expected session ID
        // This prevents stale responses from overwriting current data
        const responseSessionId = action.payload.expectedSessionId;
        const currentExpectedSessionId = state.expectedSessionId;
        
        // If session IDs don't match, ignore this response (it's stale)
        if (responseSessionId !== currentExpectedSessionId && currentExpectedSessionId !== null) {
          return; // Ignore stale response
        }
        
        state.loading = false;
        state.results = action.payload.results;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.totalPages = action.payload.total_pages;
        state.perPage = action.payload.per_page || state.perPage;
        state.filters = action.payload.filters;
        state.searchType = action.payload.searchType;
      })
      .addCase(searchStudies.rejected, (state, action) => {
        // Only update error if request wasn't aborted (aborted requests are expected)
        if (action.payload !== 'Request aborted') {
          state.loading = false;
          state.error = action.payload as string || 'Search failed';
        } else {
          // Request was aborted, just stop loading
          state.loading = false;
        }
      });
  },
});

export const { setFilters, setPage, setPerPage, clearResults, clearError, setExpectedSessionId } = searchSlice.actions;
export default searchSlice.reducer;

