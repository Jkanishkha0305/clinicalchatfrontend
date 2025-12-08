import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/lib/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Initialize with null to avoid hydration mismatch
// We'll load from localStorage on client-side after hydration
const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

// Note: Removed getStatus endpoint as it's not in the server API
// Auth status is now checked via token validation in axios interceptor

export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }: { username: string; password: string }, { rejectWithValue }) => {
    try {
      console.log('Login attempt with username:', password);
      const response = await authApi.login(username, password);
      const user = response.data;
      const token = response.token;
      
      // Store token with user data
      const userWithToken = { ...user, token };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('appUser', JSON.stringify(userWithToken));
      }
      
      return userWithToken;
    } catch (error) {
      console.error('Auth login error:', error);
      
      // Extract meaningful error message from backend response
      let errorMessage = 'Login failed';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as any).response;
        if (response?.data?.message) {
          errorMessage = response.data.message;
        } else if (response?.data?.error) {
          errorMessage = response.data.error;
        }
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const signup = createAsyncThunk(
  'auth/signup',
  async ({ username, password, confirmPassword }: { username: string; password: string; confirmPassword: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.signup(username, password, confirmPassword);
      const user = response.data;
      const token = response.token;
      
      // Store token with user data
      const userWithToken = { ...user, token };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('appUser', JSON.stringify(userWithToken));
      }
      
      return userWithToken;
    } catch (error) {
      console.error('Auth signup error:', error);
      
      // Extract meaningful error message from backend response
      let errorMessage = 'Signup failed';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as any).response;
        if (response?.data?.message) {
          errorMessage = response.data.message;
        } else if (response?.data?.error) {
          errorMessage = response.data.error;
        }
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authApi.logout();
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Logout failed');
  }
});


const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setGuestUser: (state) => {
      const guestUser = { username: 'Guest', is_guest: true };
      state.user = guestUser;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('appUser', JSON.stringify(guestUser));
      }
    },
    // Load user from localStorage (called after hydration)
    loadUserFromStorage: (state) => {
      if (typeof window === 'undefined') return;
      try {
        const stored = localStorage.getItem('appUser');
        if (stored) {
          state.user = JSON.parse(stored);
        } else {
          // Don't default to guest - keep as null so user can be redirected to login
          // Guest mode should only be set explicitly when user clicks "Continue as Guest"
          state.user = null;
        }
      } catch (e) {
        // Ignore parse errors, keep as null
        state.user = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Check status
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        if (typeof window !== 'undefined') {
          localStorage.setItem('appUser', JSON.stringify(action.payload));
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Login failed';
      })
      // Signup
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        if (typeof window !== 'undefined') {
          localStorage.setItem('appUser', JSON.stringify(action.payload));
        }
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Signup failed';
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.error = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('appUser');
        }
      })
  },
});

export const { clearError, setGuestUser, loadUserFromStorage } = authSlice.actions;
export default authSlice.reducer;

