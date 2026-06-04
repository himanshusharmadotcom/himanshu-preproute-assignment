import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { ApiSubject, ApiTopic, ApiSubTopic } from '../../services/api';
import {
  apiGetSubjects,
  apiGetTopicsBySubject,
  apiGetSubTopicsByTopics,
} from '../../services/api';

interface SubjectsState {
  subjects: ApiSubject[];
  topics: ApiTopic[];
  subTopics: ApiSubTopic[];
  loadingSubjects: boolean;
  loadingTopics: boolean;
  loadingSubTopics: boolean;
  error: string | null;
}

const initialState: SubjectsState = {
  subjects: [],
  topics: [],
  subTopics: [],
  loadingSubjects: false,
  loadingTopics: false,
  loadingSubTopics: false,
  error: null,
};

export const fetchSubjects = createAsyncThunk(
  'subjects/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiGetSubjects();
      return res.data;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const fetchTopics = createAsyncThunk(
  'subjects/fetchTopics',
  async (subjectId: string, { rejectWithValue }) => {
    try {
      const res = await apiGetTopicsBySubject(subjectId);
      return res.data;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const fetchSubTopics = createAsyncThunk(
  'subjects/fetchSubTopics',
  async (topicIds: string[], { rejectWithValue }) => {
    try {
      if (!topicIds.length) return [];
      const res = await apiGetSubTopicsByTopics(topicIds);
      return res.data;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const subjectsSlice = createSlice({
  name: 'subjects',
  initialState,
  reducers: {
    clearTopics(state) {
      state.topics = [];
      state.subTopics = [];
    },
    clearSubTopics(state) {
      state.subTopics = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjects.pending,  (state) => { state.loadingSubjects = true; })
      .addCase(fetchSubjects.fulfilled, (state, action) => { state.loadingSubjects = false; state.subjects = action.payload; })
      .addCase(fetchSubjects.rejected,  (state, action) => { state.loadingSubjects = false; state.error = action.payload as string; })

      .addCase(fetchTopics.pending,  (state) => { state.loadingTopics = true; state.topics = []; state.subTopics = []; state.error = null; })
      .addCase(fetchTopics.fulfilled, (state, action) => { state.loadingTopics = false; state.topics = action.payload; })
      .addCase(fetchTopics.rejected,  (state, action) => { state.loadingTopics = false; state.error = action.payload as string; })

      .addCase(fetchSubTopics.pending,  (state) => { state.loadingSubTopics = true; })
      .addCase(fetchSubTopics.fulfilled, (state, action) => { state.loadingSubTopics = false; state.subTopics = action.payload; })
      .addCase(fetchSubTopics.rejected,  (state, action) => { state.loadingSubTopics = false; state.error = action.payload as string; });
  },
});

export const { clearTopics, clearSubTopics } = subjectsSlice.actions;
export default subjectsSlice.reducer;
