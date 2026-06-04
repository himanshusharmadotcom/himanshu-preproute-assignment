import { configureStore } from '@reduxjs/toolkit';
import authReducer       from '../features/auth/authSlice';
import testsReducer      from '../features/tests/testsSlice';
import subjectsReducer   from '../features/subjects/subjectsSlice';
import testCreationReducer from '../features/testCreation/testCreationSlice';

export const store = configureStore({
  reducer: {
    auth:         authReducer,
    tests:        testsReducer,
    subjects:     subjectsReducer,
    testCreation: testCreationReducer,
  },
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
