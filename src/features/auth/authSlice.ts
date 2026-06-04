import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiLogin } from '../../services/api';

interface AuthUser { name?: string; role?: string; userId?: string; [key: string]: unknown; }

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// Restore session from localStorage on startup
const storedToken = localStorage.getItem('auth_token');

const initialState: AuthState = {
  isAuthenticated: !!storedToken,
  user: null,
  token: storedToken,
  loading: false,
  error: null,
};

export const loginAsync = createAsyncThunk(
  'auth/loginAsync',
  async (payload: { userId: string; password: string }, { rejectWithValue }) => {
    try {
      const { token, user } = await apiLogin(payload.userId, payload.password);
      localStorage.setItem('auth_token', token);
      return { token, user };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('auth_token');
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user as AuthUser;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
