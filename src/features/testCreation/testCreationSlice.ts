import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  apiCreateTest,
  apiUpdateTest,
  apiBulkCreateQuestions,
  indexToCorrectOption,
  correctOptionIndex,
} from '../../services/api';
import type { CreateTestPayload, ApiQuestion } from '../../services/api';

export type TestType       = 'Chapter Wise' | 'PYQ' | 'Mock Test';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Difficult';
export type LiveUntilOption = 'Always Available' | '1 Week' | '2 Weeks' | '3 Weeks' | '1 Month' | 'Custom Duration';

export interface TestConfig {
  testType: TestType;
  subject: string;        // UUID
  subjectName: string;    // display
  nameOfTest: string;
  topic: string[];        // UUIDs
  topicNames: string[];   // display
  subTopic: string[];     // UUIDs
  subTopicNames: string[];
  duration: string;
  difficultyLevel: DifficultyLevel;
  wrongAnswer: number;
  unattempted: number;
  correctAnswer: number;
  noOfQuestions: string;
  totalMarks: string;
}

export interface Question {
  id: string;             // local UUID (crypto.randomUUID)
  apiId?: string;         // UUID from API after save
  questionText: string;
  options: string[];
  correctOption: number | null;
  solution: string;
  difficultyLevel: string;
  topic: string;
  mediaUrl: string;
  subTopic: string;
}

export interface PublishConfig {
  publishType: 'Publish Now' | 'Schedule Publish';
  liveUntil: LiveUntilOption;
  endDate: string;
  endTime: string;
  scheduleDate: string;
  scheduleTime: string;
}

type Step = 'create' | 'questions' | 'publish';

interface TestCreationState {
  step: Step;
  testConfig: TestConfig;
  questions: Question[];
  currentQuestionIndex: number;
  publishConfig: PublishConfig;
  isEditModalOpen: boolean;
  savedTestId: string | null;
  savedQuestionIds: string[];
  apiLoading: boolean;
  apiError: string | null;
  apiSuccess: string | null;
}

const defaultTestConfig: TestConfig = {
  testType: 'Chapter Wise',
  subject: '',
  subjectName: '',
  nameOfTest: '',
  topic: [],
  topicNames: [],
  subTopic: [],
  subTopicNames: [],
  duration: '',
  difficultyLevel: 'Easy',
  wrongAnswer: -1,
  unattempted: 0,
  correctAnswer: 5,
  noOfQuestions: '',
  totalMarks: '',
};

// DB enum values for the type field (tests_type_check constraint)
const TYPE_MAP: Record<TestType, string> = {
  'Chapter Wise': 'chapterwise',
  'PYQ':          'pyq',
  'Mock Test':    'mock',
};

// DB enum values for the difficulty field (tests_difficulty_check constraint)
// The DB uses 'hard', not 'difficult'
const DIFFICULTY_API_MAP: Record<string, string> = {
  'Easy':      'easy',
  'Medium':    'medium',
  'Difficult': 'hard',
};

const defaultPublishConfig: PublishConfig = {
  publishType: 'Publish Now',
  liveUntil: 'Custom Duration',
  endDate: '', endTime: '',
  scheduleDate: '', scheduleTime: '',
};

const loadPublishConfig = (): PublishConfig => {
  try {
    const saved = localStorage.getItem('prepRoute_publishConfig');
    if (saved) return { ...defaultPublishConfig, ...(JSON.parse(saved) as PublishConfig) };
  } catch { /* ignore */ }
  return { ...defaultPublishConfig };
};

const defaultQuestion = (config?: Partial<TestConfig>): Question => ({
  id: crypto.randomUUID(),
  questionText: '',
  options: ['', '', '', ''],
  correctOption: null,
  solution: '',
  difficultyLevel: '',
  topic:           config?.topic?.[0] ?? '',
  subTopic:        config?.subTopic?.[0] ?? '',
  mediaUrl: '',
});

const initialState: TestCreationState = {
  step: 'create',
  testConfig: defaultTestConfig,
  questions: Array.from({ length: 4 }, defaultQuestion),
  currentQuestionIndex: 0,
  publishConfig: loadPublishConfig(),
  isEditModalOpen: false,
  savedTestId: null,
  savedQuestionIds: [],
  apiLoading: false,
  apiError: null,
  apiSuccess: null,
};

/* ── async: create test ── */
export const createTestAsync = createAsyncThunk(
  'testCreation/createTest',
  async (config: TestConfig, { rejectWithValue }) => {
    try {
      const payload: CreateTestPayload = {
        name:            config.nameOfTest,
        type:            TYPE_MAP[config.testType],
        subject:         config.subject,
        topics:          config.topic.length ? config.topic : [],
        sub_topics:      config.subTopic.length ? config.subTopic : [],
        correct_marks:   Number(config.correctAnswer) || 5,
        wrong_marks:     Number(config.wrongAnswer) || -1,
        unattempt_marks: Number(config.unattempted) || 0,
        difficulty:      DIFFICULTY_API_MAP[config.difficultyLevel] ?? config.difficultyLevel.toLowerCase(),
        total_time:      parseInt(config.duration) || 60,
        total_marks:     parseInt(config.totalMarks) || 0,
        total_questions: parseInt(config.noOfQuestions) || 0,
        status:          'draft',
      };
      const res = await apiCreateTest(payload);
      return res.data;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

/* ── async: update test config ── */
export const updateTestAsync = createAsyncThunk(
  'testCreation/updateTest',
  async ({ id, config }: { id: string; config: TestConfig }, { rejectWithValue, getState }) => {
    try {
      const { savedQuestionIds, questions } = (getState() as { testCreation: TestCreationState }).testCreation;

      // Preserve existing question IDs so the API update never wipes them.
      // savedQuestionIds is authoritative when questions were saved in this session;
      // otherwise fall back to apiId values loaded from the API.
      const existingQuestionIds = savedQuestionIds.length > 0
        ? savedQuestionIds
        : questions.map((q) => q.apiId).filter((id): id is string => !!id);

      const res = await apiUpdateTest(id, {
        name:            config.nameOfTest,
        type:            TYPE_MAP[config.testType],
        subject:         config.subject,
        topics:          config.topic,
        sub_topics:      config.subTopic,
        correct_marks:   config.correctAnswer,
        wrong_marks:     config.wrongAnswer,
        unattempt_marks: config.unattempted,
        difficulty:      DIFFICULTY_API_MAP[config.difficultyLevel] ?? config.difficultyLevel.toLowerCase(),
        total_time:      parseInt(config.duration) || 60,
        total_marks:     parseInt(config.totalMarks) || 0,
        total_questions: parseInt(config.noOfQuestions) || 0,
        questions:       existingQuestionIds,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

/* ── async: bulk save questions ── */
export const saveQuestionsAsync = createAsyncThunk(
  'testCreation/saveQuestions',
  async ({ testId, subject, questions }: { testId: string; subject: string; questions: Question[] }, { rejectWithValue }) => {
    try {
      // Strip HTML tags to check if a question is truly empty
      const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();
      const validQs = questions.filter(
        (q) => stripHtml(q.questionText) && q.correctOption !== null && q.options.every((o) => o.trim())
      );
      if (!validQs.length) throw new Error('Add at least one complete question with all 4 options filled and a correct option selected');

      const payload = validQs.map((q) => ({
        type:           'mcq' as const,
        question:       q.questionText,
        option1:        q.options[0] || '',
        option2:        q.options[1] || '',
        option3:        q.options[2] || '',
        option4:        q.options[3] || '',
        correct_option: indexToCorrectOption(q.correctOption!),
        explanation:    q.solution || undefined,
        difficulty:     (DIFFICULTY_API_MAP[q.difficultyLevel] ?? q.difficultyLevel?.toLowerCase()) || undefined,
        test_id:        testId,
        subject:        subject,
        media_url:      (q.mediaUrl && !q.mediaUrl.startsWith('data:')) ? q.mediaUrl : undefined,
      }));

      const bulkRes = await apiBulkCreateQuestions(payload);
      const questionIds = bulkRes.data.map((q) => q.id);

      // attach questions to the test
      await apiUpdateTest(testId, {
        questions:       questionIds,
        total_questions: questionIds.length,
      });

      return questionIds;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

/* ── async: load existing test into form ── */
export const loadTestForEdit = createAsyncThunk(
  'testCreation/loadForEdit',
  async ({ testId, fetchedQuestions }: { testId: string; fetchedQuestions: ApiQuestion[] }, { rejectWithValue }) => {
    try {
      return { testId, fetchedQuestions };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const testCreationSlice = createSlice({
  name: 'testCreation',
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<Step>) {
      state.step = action.payload;
    },
    setTestConfig(state, action: PayloadAction<Partial<TestConfig>>) {
      state.testConfig = { ...state.testConfig, ...action.payload };
      const qty     = parseInt(state.testConfig.noOfQuestions) || 0;
      const correct = state.testConfig.correctAnswer || 0;
      state.testConfig.totalMarks = qty > 0 ? String(qty * correct) : '';
      // When topic/subTopic are set, backfill any questions that still have empty values
      if (action.payload.topic !== undefined || action.payload.subTopic !== undefined) {
        const defaultTopic    = state.testConfig.topic[0]    ?? '';
        const defaultSubTopic = state.testConfig.subTopic[0] ?? '';
        state.questions = state.questions.map((q) => ({
          ...q,
          topic:    q.topic    || defaultTopic,
          subTopic: q.subTopic || defaultSubTopic,
        }));
      }
    },
    setSavedTestId(state, action: PayloadAction<string>) {
      state.savedTestId = action.payload;
    },
    setCurrentQuestion(state, action: PayloadAction<number>) {
      state.currentQuestionIndex = action.payload;
    },
    updateQuestion(state, action: PayloadAction<{ index: number; data: Partial<Question> }>) {
      const { index, data } = action.payload;
      if (state.questions[index]) {
        state.questions[index] = { ...state.questions[index], ...data };
      }
    },
    addQuestion(state) {
      const max = parseInt(state.testConfig.noOfQuestions) || 0;
      if (max > 0 && state.questions.length >= max) return;
      state.questions.push(defaultQuestion(state.testConfig));
    },
    deleteQuestion(state, action: PayloadAction<number>) {
      if (state.questions.length <= 1) return; // keep at least one
      state.questions.splice(action.payload, 1);
      // adjust current index if needed
      if (state.currentQuestionIndex >= state.questions.length) {
        state.currentQuestionIndex = state.questions.length - 1;
      }
    },
    deleteAllQuestions(state) {
      state.questions = state.questions.map(() => defaultQuestion(state.testConfig));
    },
    setPublishConfig(state, action: PayloadAction<Partial<PublishConfig>>) {
      state.publishConfig = { ...state.publishConfig, ...action.payload };
      try {
        localStorage.setItem('prepRoute_publishConfig', JSON.stringify(state.publishConfig));
      } catch { /* ignore */ }
    },
    openEditModal(state) { state.isEditModalOpen = true; },
    closeEditModal(state) { state.isEditModalOpen = false; },
    setApiError(state, action: PayloadAction<string>) {
      state.apiError = action.payload;
    },
    clearApiMessages(state) {
      state.apiError = null;
      state.apiSuccess = null;
    },
    resetTest(_state) {
      try { localStorage.removeItem('prepRoute_publishConfig'); } catch { /* ignore */ }
      return { ...initialState, publishConfig: { ...defaultPublishConfig } };
    },
  },
  extraReducers: (builder) => {
    builder
      /* create */
      .addCase(createTestAsync.pending,  (state) => { state.apiLoading = true;  state.apiError = null; })
      .addCase(createTestAsync.fulfilled, (state, action) => {
        state.apiLoading  = false;
        state.savedTestId = action.payload.id;
        state.step        = 'questions';
        state.apiSuccess  = 'Test created successfully';
        const max = parseInt(state.testConfig.noOfQuestions) || 0;
        const initCount = max > 0 ? Math.min(max, 4) : 4;
        state.questions = Array.from({ length: initCount }, () => defaultQuestion(state.testConfig));
      })
      .addCase(createTestAsync.rejected, (state, action) => {
        state.apiLoading = false;
        state.apiError   = action.payload as string;
      })
      /* update */
      .addCase(updateTestAsync.pending,  (state) => { state.apiLoading = true;  state.apiError = null; })
      .addCase(updateTestAsync.fulfilled, (state) => {
        state.apiLoading = false;
        state.apiSuccess = 'Test updated successfully';
        state.isEditModalOpen = false;
      })
      .addCase(updateTestAsync.rejected, (state, action) => {
        state.apiLoading = false;
        state.apiError   = action.payload as string;
      })
      /* save questions */
      .addCase(saveQuestionsAsync.pending,  (state) => { state.apiLoading = true;  state.apiError = null; })
      .addCase(saveQuestionsAsync.fulfilled, (state, action) => {
        state.apiLoading      = false;
        state.savedQuestionIds = action.payload;
        state.step            = 'publish';
        state.apiSuccess      = 'Questions saved successfully';
      })
      .addCase(saveQuestionsAsync.rejected, (state, action) => {
        state.apiLoading = false;
        state.apiError   = action.payload as string;
      })
      /* load for edit */
      .addCase(loadTestForEdit.fulfilled, (state, action) => {
        const { testId: tid, fetchedQuestions } = action.payload;
        state.savedTestId = tid;
        if (fetchedQuestions.length > 0) {
          state.questions = fetchedQuestions.map((q) => ({
            id:             crypto.randomUUID(),
            apiId:          q.id,
            questionText:   q.question,
            options:        [q.option1, q.option2, q.option3, q.option4],
            correctOption:  correctOptionIndex(q.correct_option),
            solution:       q.explanation ?? '',
            difficultyLevel: q.difficulty ?? '',
            topic:          q.topic_id ?? '',
            subTopic:       q.sub_topic_id ?? '',
            mediaUrl:       q.media_url ?? '',
          }));
        }
      });
  },
});

export const {
  setStep, setTestConfig, setSavedTestId,
  setCurrentQuestion, updateQuestion, addQuestion, deleteQuestion, deleteAllQuestions,
  setPublishConfig, openEditModal, closeEditModal,
  setApiError, clearApiMessages, resetTest,
} = testCreationSlice.actions;

export default testCreationSlice.reducer;
