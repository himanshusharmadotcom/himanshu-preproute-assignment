import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { ApiTest } from '../../services/api';
import {
  apiGetAllTests,
  apiGetTestById,
  apiDeleteTest,
} from '../../services/api';

interface TestsState {
  list: ApiTest[];
  currentTest: ApiTest | null;
  loading: boolean;
  deleteLoading: string | null; // id being deleted
  error: string | null;
}

const initialState: TestsState = {
  list: [],
  currentTest: null,
  loading: false,
  deleteLoading: null,
  error: null,
};

export const fetchAllTests = createAsyncThunk(
  'tests/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiGetAllTests();
      return res.data;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const fetchTestById = createAsyncThunk(
  'tests/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await apiGetTestById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const deleteTest = createAsyncThunk(
  'tests/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiDeleteTest(id);
      return id;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const testsSlice = createSlice({
  name: 'tests',
  initialState,
  reducers: {
    clearCurrentTest(state) {
      state.currentTest = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch all
      .addCase(fetchAllTests.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllTests.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchAllTests.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      // fetch by id
      .addCase(fetchTestById.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTestById.fulfilled, (state, action) => { state.loading = false; state.currentTest = action.payload; })
      .addCase(fetchTestById.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      // delete
      .addCase(deleteTest.pending, (state, action) => { state.deleteLoading = action.meta.arg; })
      .addCase(deleteTest.fulfilled, (state, action) => {
        state.deleteLoading = null;
        state.list = state.list.filter((t) => t.id !== action.payload);
      })
      .addCase(deleteTest.rejected, (state, action) => {
        state.deleteLoading = null;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentTest, clearError } = testsSlice.actions;
export default testsSlice.reducer;
