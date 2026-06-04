import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setTestConfig, createTestAsync, updateTestAsync, setApiError, setSavedTestId,
  loadTestForEdit,
} from '../features/testCreation/testCreationSlice';
import { fetchAllTests } from '../features/tests/testsSlice';
import type { TestType, DifficultyLevel, TestConfig } from '../features/testCreation/testCreationSlice';
import {
  fetchSubjects, fetchTopics, fetchSubTopics, clearTopics,
} from '../features/subjects/subjectsSlice';
import { apiGetTestById, apiFetchBulkQuestions } from '../services/api';
import type { ApiSubject, ApiTopic, ApiSubTopic } from '../services/api';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/common/Button';
import { RadioButton } from '../components/common/RadioButton';
import { NumberStepper } from '../components/common/NumberStepper';
import { Dropdown } from '../components/common/Dropdown';
import { ChevronRight, Loader2 } from 'lucide-react';

// Reverse-map DB type → UI tab
const TYPE_TO_TAB: Record<string, TestType> = {
  chapterwise:  'Chapter Wise',
  chapter_wise: 'Chapter Wise', // legacy
  practice:     'Chapter Wise', // legacy
  pyq:          'PYQ',
  mock:         'Mock Test',
  mock_test:    'Mock Test',    // legacy
};

// Map API difficulty values back to UI DifficultyLevel labels
const capDifficulty = (d?: string): DifficultyLevel => {
  const map: Record<string, DifficultyLevel> = {
    easy: 'Easy', medium: 'Medium', hard: 'Difficult', difficult: 'Difficult',
  };
  return map[d?.toLowerCase() ?? ''] ?? 'Easy';
};

const TEST_TYPES: TestType[] = ['Chapter Wise', 'PYQ', 'Mock Test'];

/* ── form values (all string-based for react-hook-form) ── */
interface FormValues {
  testType:        TestType;
  nameOfTest:      string;
  subject:         string;   // UUID
  topic:           string;   // comma-sep UUIDs
  subTopic:        string;   // comma-sep UUIDs
  duration:        string;
  difficultyLevel: DifficultyLevel;
  wrongAnswer:     number;
  unattempted:     number;
  correctAnswer:   number;
  noOfQuestions:   string;
  totalMarks:      string;
}

interface Props {
  isModal?:   boolean;
  onSave?:    () => void;
  onCancel?:  () => void;
}

export const TestCreationForm: React.FC<Props> = ({ isModal, onSave, onCancel }) => {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const { testId } = useParams<{ testId: string }>();

  const { testConfig, savedTestId, apiLoading, apiError } = useAppSelector((s) => s.testCreation);
  const { subjects, topics, subTopics, loadingSubjects, loadingTopics, loadingSubTopics, error: subjectsError } =
    useAppSelector((s) => s.subjects);

  // Start in loading state immediately when editing an existing test so the form
  // never flashes empty/default values before the API response arrives.
  const [fetchingTest, setFetchingTest] = useState(() => {
    const id = testId ?? (isModal ? savedTestId : null);
    // In modal mode the data is already in Redux (loaded by QuestionCreationPage),
    // so skip the loader; in standalone edit mode always start loading.
    return !!id && !(isModal && !!testConfig.nameOfTest && !!testConfig.subject);
  });
  // Tracks the last test ID we fetched so the effect never runs twice for the same ID.
  const fetchedForIdRef          = useRef<string | null>(null);
  const skipSubjectClearRef      = useRef(isModal && !!testConfig.subject);
  const skipTopicClearRef        = useRef(isModal && testConfig.topic.length > 0);
  // Holds subtopic IDs to restore after a user-triggered topic change triggers a new fetch.
  // null means "no restore pending" (initial load, not a user change).
  const pendingSubTopicRestoreRef = useRef<string[] | null>(null);

  /* pre-built option arrays */
  const subjectOpts  = subjects.map((s) => ({ label: s.name, value: s.id }));
  const topicOpts    = topics.map((t)   => ({ label: t.name, value: t.id }));
  const subTopicOpts = subTopics.map((s) => ({ label: s.name, value: s.id }));

  const {
    register, handleSubmit, watch, getValues, setValue, control, reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      testType:        testConfig.testType,
      nameOfTest:      testConfig.nameOfTest,
      subject:         testConfig.subject,
      topic:           testConfig.topic.join(','),
      subTopic:        testConfig.subTopic.join(','),
      duration:        testConfig.duration,
      difficultyLevel: testConfig.difficultyLevel,
      wrongAnswer:     testConfig.wrongAnswer,
      unattempted:     testConfig.unattempted,
      correctAnswer:   testConfig.correctAnswer,
      noOfQuestions:   testConfig.noOfQuestions,
      totalMarks:      testConfig.totalMarks,
    },
  });

  /* fetch subjects on mount */
  useEffect(() => { dispatch(fetchSubjects()); }, [dispatch]);

  /* Modal mode: ensure topic/subtopic dropdowns are populated without resetting form values */
  useEffect(() => {
    if (!isModal || !testConfig.subject) return;
    if (!topics.length) {
      dispatch(fetchTopics(testConfig.subject)).then(() => {
        if (testConfig.topic.length) dispatch(fetchSubTopics(testConfig.topic));
      });
    } else if (testConfig.topic.length && !subTopics.length) {
      dispatch(fetchSubTopics(testConfig.topic));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  /* When editing an existing test → fetch it and pre-populate the form */
  useEffect(() => {
    const id = testId ?? (isModal ? savedTestId : null);
    if (!id) return;
    // Skip if we already fetched for this ID (prevents double-fetch when savedTestId updates)
    if (fetchedForIdRef.current === id) return;
    // In modal mode skip only when testConfig is already fully populated
    if (isModal && testConfig.nameOfTest && testConfig.subject) return;

    fetchedForIdRef.current = id; // mark before async to block concurrent triggers

    const load = async () => {
      setFetchingTest(true);
      try {
        // Await subjects so findSubjectId works even if the list hasn't loaded yet
        const subjectsAction = await dispatch(fetchSubjects());
        const subjectsList: ApiSubject[] = fetchSubjects.fulfilled.match(subjectsAction)
          ? subjectsAction.payload
          : subjects;

        const res  = await apiGetTestById(id);
        const test = res.data;
        dispatch(setSavedTestId(id));

        const rawSubject = (test.subject ?? '') as string;
        // Fall back to rawSubject itself so we never lose the subject UUID
        const subjectId = (test.subject_id as string | undefined)
          ?? subjectsList.find((s) => s.id === rawSubject)?.id
          ?? subjectsList.find((s) => s.name.toLowerCase() === rawSubject.toLowerCase())?.id
          ?? rawSubject;

        // API may return topic IDs in 'topics'/'sub_topics' or 'topic_ids'/'sub_topic_ids'
        const rawTopicIds    = ((test.topic_ids    ?? test.topics)    ?? []).filter(Boolean);
        const rawSubTopicIds = ((test.sub_topic_ids ?? test.sub_topics) ?? []).filter(Boolean);

        // Fetch topics/subtopics and capture payloads to derive display names
        let topicsList: ApiTopic[] = [];
        let subTopicsList: ApiSubTopic[] = [];
        if (subjectId) {
          const topicsAction = await dispatch(fetchTopics(subjectId));
          if (fetchTopics.fulfilled.match(topicsAction)) topicsList = topicsAction.payload;
        }

        // The API may return topic names instead of UUIDs — resolve to IDs via the fetched list
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const topicIds = rawTopicIds.map((raw) => {
          if (UUID_RE.test(raw)) return raw;
          return topicsList.find((t) => t.name.toLowerCase() === raw.toLowerCase())?.id ?? null;
        }).filter((id): id is string => id !== null);

        if (topicIds.length) {
          const subTopicsAction = await dispatch(fetchSubTopics(topicIds));
          if (fetchSubTopics.fulfilled.match(subTopicsAction)) subTopicsList = subTopicsAction.payload;
        }

        // Resolve subtopic IDs similarly
        const subTopicIds = rawSubTopicIds.map((raw) => {
          if (UUID_RE.test(raw)) return raw;
          return subTopicsList.find((s) => s.name.toLowerCase() === raw.toLowerCase())?.id ?? null;
        }).filter((id): id is string => id !== null);

        // Map numeric/string fields
        const correct = Number(test.correct_marks) || 5;
        const nofQ    = String(test.total_questions ?? '');
        const marks   = String(test.total_marks ?? '');

        // Sync testConfig with resolved names so the info card is fully populated
        dispatch(setTestConfig({
          testType:      TYPE_TO_TAB[test.type ?? ''] ?? 'Chapter Wise',
          subject:       subjectId,
          subjectName:   subjectsList.find((s) => s.id === subjectId)?.name ?? '',
          nameOfTest:    test.name ?? '',
          topic:         topicIds,
          topicNames:    topicIds.map((id) => topicsList.find((t) => t.id === id)?.name ?? '').filter(Boolean),
          subTopic:      subTopicIds,
          subTopicNames: subTopicIds.map((id) => subTopicsList.find((s) => s.id === id)?.name ?? '').filter(Boolean),
          duration:      String(test.total_time ?? ''),
          difficultyLevel: capDifficulty(test.difficulty),
          wrongAnswer:   Number(test.wrong_marks) || -1,
          unattempted:   Number(test.unattempt_marks) || 0,
          correctAnswer: correct,
          noOfQuestions: nofQ,
          totalMarks:    marks,
        }));

        // Prevent the watchedSubject / watchedTopics effects from wiping
        // the restored values right after reset().
        skipSubjectClearRef.current = true;
        skipTopicClearRef.current   = true;

        reset({
          testType:        TYPE_TO_TAB[test.type ?? ''] ?? 'Chapter Wise',
          nameOfTest:      test.name ?? '',
          subject:         subjectId,
          topic:           topicIds.join(','),
          subTopic:        subTopicIds.join(','),
          duration:        String(test.total_time ?? ''),
          difficultyLevel: capDifficulty(test.difficulty),
          wrongAnswer:     Number(test.wrong_marks) || -1,
          unattempted:     Number(test.unattempt_marks) || 0,
          correctAnswer:   correct,
          noOfQuestions:   nofQ,
          totalMarks:      marks,
        });
        // Pre-load existing questions into Redux so they appear immediately on the questions page
        const questionIds = (test.questions ?? []).filter(Boolean) as string[];
        if (questionIds.length) {
          try {
            const qRes = await apiFetchBulkQuestions(questionIds);
            dispatch(loadTestForEdit({ testId: id, fetchedQuestions: qRes.data }));
          } catch (_) { /* questions couldn't be fetched; user can re-add them */ }
        }
      } catch (_) {
        fetchedForIdRef.current = null; // allow retry on error
      }
      setFetchingTest(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, savedTestId]);

  /* watch subject → fetch topics */
  const watchedSubject    = watch('subject');
  const watchedTopics     = watch('topic');
  const watchedType       = watch('testType');
  const watchedDifficulty = watch('difficultyLevel');
  const noOfQ             = watch('noOfQuestions');
  const correctAns        = watch('correctAnswer');
  const totalMarks        = noOfQ && correctAns ? String(parseInt(noOfQ) * correctAns) : '';

  useEffect(() => {
    if (watchedSubject) {
      if (skipSubjectClearRef.current) {
        skipSubjectClearRef.current = false;
        return;
      }
      dispatch(fetchTopics(watchedSubject));
      setValue('topic', '');
      setValue('subTopic', '');
    } else {
      dispatch(clearTopics());
    }
  }, [watchedSubject, dispatch, setValue]);

  /* watch topics → fetch subtopics */
  useEffect(() => {
    const ids = watchedTopics ? watchedTopics.split(',').filter(Boolean) : [];
    if (ids.length) {
      if (skipTopicClearRef.current) {
        skipTopicClearRef.current = false;
        return;
      }
      // Save current selections so the restore effect can filter them once the new
      // subTopics list arrives from the API.
      pendingSubTopicRestoreRef.current = getValues('subTopic')
        .split(',')
        .filter(Boolean);
      dispatch(fetchSubTopics(ids));
    }
  }, [watchedTopics, dispatch, getValues]);

  /* Once the new subTopics list is loaded, restore whichever previously-selected
     subtopics still belong to a currently-selected topic. */
  useEffect(() => {
    if (loadingSubTopics) return;
    if (pendingSubTopicRestoreRef.current === null) return;
    const validIds = new Set(subTopics.map((s) => s.id));
    const preserved = pendingSubTopicRestoreRef.current
      .filter((id) => validIds.has(id))
      .join(',');
    pendingSubTopicRestoreRef.current = null;
    setValue('subTopic', preserved);
  }, [subTopics, loadingSubTopics, setValue]);

  const [draftSuccess, setDraftSuccess] = React.useState(false);
  // Track whether a draft was saved during this specific component session.
  // Prevents stale savedTestId (from a deleted test) from triggering an UPDATE
  // when the user arrives at /test-creation/new from a path that skips resetTest().
  const [draftSavedInSession, setDraftSavedInSession] = React.useState(false);

  const buildConfig = (data: FormValues): TestConfig => {
    const topicArr    = data.topic.split(',').filter(Boolean);
    const subTopicArr = data.subTopic.split(',').filter(Boolean);
    return {
      testType:        data.testType,
      subject:         data.subject,
      subjectName:     subjects.find((s) => s.id === data.subject)?.name ?? '',
      nameOfTest:      data.nameOfTest,
      topic:           topicArr,
      topicNames:      topicArr.map((id) => topics.find((t) => t.id === id)?.name ?? id),
      subTopic:        subTopicArr,
      subTopicNames:   subTopicArr.map((id) => subTopics.find((s) => s.id === id)?.name ?? id),
      duration:        data.duration,
      difficultyLevel: data.difficultyLevel,
      wrongAnswer:     data.wrongAnswer,
      unattempted:     data.unattempted,
      correctAnswer:   data.correctAnswer,
      noOfQuestions:   data.noOfQuestions,
      totalMarks:      noOfQ && correctAns ? String(parseInt(noOfQ) * correctAns) : '',
    };
  };

  /* Save as Draft — only Name + Subject required; everything else gets defaults */
  const handleSaveDraft = async () => {
    const data = watch() as FormValues;

    if (!data.nameOfTest?.trim()) {
      dispatch(setApiError('Test name is required to save as draft.'));
      return;
    }
    if (!data.subject) {
      dispatch(setApiError('Please select a Subject to save as draft.'));
      return;
    }

    // Build a minimal config — use safe defaults for anything not yet filled
    const topicArr    = (data.topic ?? '').split(',').filter(Boolean);
    const subTopicArr = (data.subTopic ?? '').split(',').filter(Boolean);
    const draftConfig: TestConfig = {
      testType:        data.testType ?? 'Chapter Wise',
      subject:         data.subject,
      subjectName:     subjects.find((s) => s.id === data.subject)?.name ?? '',
      nameOfTest:      data.nameOfTest.trim(),
      topic:           topicArr,
      topicNames:      topicArr.map((id) => topics.find((t) => t.id === id)?.name ?? id),
      subTopic:        subTopicArr,
      subTopicNames:   subTopicArr.map((id) => subTopics.find((s) => s.id === id)?.name ?? id),
      duration:        data.duration || '60',
      difficultyLevel: data.difficultyLevel || 'Easy',
      wrongAnswer:     data.wrongAnswer ?? -1,
      unattempted:     data.unattempted ?? 0,
      correctAnswer:   data.correctAnswer ?? 5,
      noOfQuestions:   data.noOfQuestions || '0',
      totalMarks:      data.noOfQuestions && data.correctAnswer
        ? String(parseInt(data.noOfQuestions) * data.correctAnswer)
        : '0',
    };

    dispatch(setTestConfig(draftConfig));

    // Only update an existing test if we're on the edit route (testId in URL)
    // or a draft was already saved during this session — otherwise always create.
    const id = testId ?? (draftSavedInSession ? savedTestId : null);
    const result = id
      ? await dispatch(updateTestAsync({ id, config: draftConfig }))
      : await dispatch(createTestAsync(draftConfig));

    if (createTestAsync.fulfilled.match(result) || updateTestAsync.fulfilled.match(result)) {
      setDraftSavedInSession(true);
      setDraftSuccess(true);
      setTimeout(() => setDraftSuccess(false), 3000);
    }
  };

  const onSubmit = async (data: FormValues) => {
    const config = buildConfig(data);
    dispatch(setTestConfig(config));

    if (isModal) {
      // update existing test (modal always has a known ID)
      const id = savedTestId ?? testId;
      if (id) await dispatch(updateTestAsync({ id, config }));
      onSave?.();
    } else if (testId || (draftSavedInSession && savedTestId)) {
      // editing an existing test via URL param, OR continuing a draft saved in this session
      const id = testId ?? savedTestId!;
      const result = await dispatch(updateTestAsync({ id, config }));
      if (updateTestAsync.fulfilled.match(result)) {
        dispatch(fetchAllTests()); // refresh dashboard list in background
        navigate(`/test-creation/${id}/questions`);
      }
    } else {
      // create new — ignore any stale savedTestId from a previous session
      const result = await dispatch(createTestAsync(config));
      if (createTestAsync.fulfilled.match(result)) {
        const newId = result.payload.id;
        navigate(`/test-creation/${newId}/questions`);
      }
    }
  };

  // Block the form until all pre-filled data is ready
  if (fetchingTest || (isModal && (loadingTopics || loadingSubTopics))) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={28} className="animate-spin text-[#4361EE]" />
        <p className="text-sm text-gray-400">Loading test details…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* test type tabs */}
      <div className="flex gap-0 mb-7 bg-gray-100 rounded-xl p-1 w-fit">
        {TEST_TYPES.map((t) => (
          <button
            key={t} type="button"
            onClick={() => setValue('testType', t)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all
              ${watchedType === t ? 'bg-white text-[#4361EE] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-6">

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
          <Controller name="subject" control={control}
            rules={{ required: 'Subject is required' }}
            render={({ field }) => (
              <div className="relative">
                <Dropdown
                  placeholder={loadingSubjects ? 'Loading…' : 'Choose from Drop-down'}
                  options={subjectOpts}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.subject?.message}
                  disabled={loadingSubjects}
                />
                {loadingSubjects && <Loader2 size={14} className="absolute right-9 top-3 animate-spin text-gray-400" />}
              </div>
            )}
          />
        </div>

        {/* Name of Test */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name of Test</label>
          <input
            placeholder="Enter name of Test"
            {...register('nameOfTest', { required: 'Test name is required' })}
            className={`w-full border ${errors.nameOfTest ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]/30 transition`}
          />
          {errors.nameOfTest && <p className="mt-1 text-xs text-red-500">{errors.nameOfTest.message}</p>}
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic</label>
          <Controller name="topic" control={control}
            rules={{ required: 'At least one topic is required' }}
            render={({ field }) => (
              <div className="relative">
                <Dropdown
                  placeholder={loadingTopics ? 'Loading topics…' : watchedSubject ? 'Choose from Drop-down' : 'Select subject first'}
                  options={topicOpts}
                  value={field.value ? field.value.split(',').filter(Boolean) : []}
                  onChange={field.onChange}
                  multiple
                  error={errors.topic?.message as string | undefined}
                  disabled={!watchedSubject || loadingTopics}
                />
                {loadingTopics && <Loader2 size={14} className="absolute right-9 top-3 animate-spin text-gray-400" />}
              </div>
            )}
          />
          {!loadingTopics && subjectsError && watchedSubject && (
            <p className="mt-1 text-xs text-red-500">Failed to load topics: {subjectsError}</p>
          )}
        </div>

        {/* Sub Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Sub Topic</label>
          <Controller name="subTopic" control={control}
            render={({ field }) => (
              <div className="relative">
                <Dropdown
                  placeholder={loadingSubTopics ? 'Loading…' : watchedTopics ? 'Choose from Drop-down' : 'Select topic first'}
                  options={subTopicOpts}
                  value={field.value ? field.value.split(',').filter(Boolean) : []}
                  onChange={field.onChange}
                  multiple
                  disabled={!watchedTopics || loadingSubTopics}
                />
                {loadingSubTopics && <Loader2 size={14} className="absolute right-9 top-3 animate-spin text-gray-400" />}
              </div>
            )}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (Minutes)</label>
          <input
            type="number"
            placeholder="Enter the time"
            {...register('duration', { required: 'Duration is required', min: { value: 1, message: 'Min 1 minute' } })}
            className={`w-full border ${errors.duration ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]/30 transition`}
          />
          {errors.duration && <p className="mt-1 text-xs text-red-500">{errors.duration.message}</p>}
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Test Difficulty Level</label>
          <div className="flex items-center gap-6">
            {(['Easy', 'Medium', 'Difficult'] as DifficultyLevel[]).map((d) => (
              <RadioButton key={d} name="difficultyLevel" label={d} value={d}
                checked={watchedDifficulty === d}
                onChange={(v) => setValue('difficultyLevel', v as DifficultyLevel)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Marking scheme */}
      <div className="mt-7">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Marking Scheme:</h3>
        <div className="flex items-end gap-6 flex-wrap">
          <Controller name="wrongAnswer" control={control}
            render={({ field }) => (
              <NumberStepper label="Wrong Answer" value={field.value} onChange={field.onChange} min={-10} max={0} />
            )} />
          <Controller name="unattempted" control={control}
            render={({ field }) => (
              <NumberStepper label="Unattempted" value={field.value} onChange={field.onChange} min={-5} max={0} />
            )} />
          <Controller name="correctAnswer" control={control}
            render={({ field }) => (
              <NumberStepper label="Correct Answer" value={field.value} onChange={field.onChange} min={1} max={20} />
            )} />
          <div>
            <p className="text-sm text-gray-600 mb-1.5">No of Questions</p>
            <input
              type="number"
              placeholder="Ex:50"
              {...register('noOfQuestions', { required: 'Required', min: { value: 1, message: 'Min 1' } })}
              className={`w-32 border ${errors.noOfQuestions ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]/30 transition`}
            />
            {errors.noOfQuestions && <p className="mt-1 text-xs text-red-500">{errors.noOfQuestions.message}</p>}
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1.5">Total Marks</p>
            <input
              readOnly value={totalMarks}
              placeholder="Auto-calculated"
              className="w-32 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* API error */}
      {apiError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {apiError}
        </div>
      )}

      {/* draft success banner */}
      {draftSuccess && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L5.5 10.5L12 3" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Draft saved successfully!
        </div>
      )}

      {/* actions */}
      <div className="flex items-center justify-between mt-10">
        <Button type="button" variant="ghost"
          onClick={onCancel ?? (() => navigate('/dashboard'))}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          {/* Save as Draft — only on full page, not modal */}
          {!isModal && (
            <Button type="button" variant="secondary" disabled={apiLoading} onClick={handleSaveDraft}>
              {apiLoading
                ? <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Saving…</span>
                : 'Save as Draft'
              }
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={apiLoading}>
            {apiLoading
              ? <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Saving…</span>
              : isModal
                ? 'Save'
                : <span className="flex items-center gap-1.5">Next <ChevronRight size={14} /></span>
            }
          </Button>
        </div>
      </div>
    </form>
  );
};

/* ── Full page wrapper ── */
export const TestCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();

  return (
    <MainLayout>
      <div className="px-8 py-6 max-w-4xl">
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <button onClick={() => navigate('/dashboard')} className="hover:text-[#4361EE] transition">Dashboard</button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-700">{testId ? 'Edit Test' : 'Create Test'}</span>
        </nav>
        <TestCreationForm />
      </div>
    </MainLayout>
  );
};
