import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setCurrentQuestion,
  updateQuestion,
  deleteAllQuestions,
  deleteQuestion,
  addQuestion,
  setStep,
  openEditModal,
  saveQuestionsAsync,
  loadTestForEdit,
  clearApiMessages,
  setTestConfig,
} from '../features/testCreation/testCreationSlice';
import type { TestType, DifficultyLevel } from '../features/testCreation/testCreationSlice';
import { fetchSubjects, fetchTopics, fetchSubTopics } from '../features/subjects/subjectsSlice';
import { apiFetchBulkQuestions, apiGetTestById } from '../services/api';
import type { ApiTopic, ApiSubTopic } from '../services/api';
import { Loader2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/common/Button';
import { Dropdown } from '../components/common/Dropdown';
import { RichTextEditor } from '../components/common/RichTextEditor';
import {
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2,
  Plus,
  Clock,
  FileQuestion,
  BarChart3,
  Upload,
  TrendingUp,
  FileEdit,
  ClipboardList,
  FileText,
  Users,
  Building2,
  User,
  Archive,
  HelpCircle,
  Trophy,
  MessageSquare,
  Bell,
  Settings,
} from 'lucide-react';
import { EditTestModal } from './EditTestModal';

/* ─── collapsed icon nav ───────────────────────────── */
const collapsedNav = [
  { icon: TrendingUp,    path: '/dashboard' },
  { icon: FileEdit,      path: '/test-creation' },
  { icon: ClipboardList, path: '/test-tracking' },
  { icon: FileText,      path: '/documents' },
  { icon: Users,         path: '/students' },
  { icon: Building2,     path: '/institution' },
  { icon: User,          path: '/profile' },
  { icon: Archive,       path: '/archive' },
  { icon: HelpCircle,    path: '/help' },
  { icon: Trophy,        path: '/achievements' },
  { icon: MessageSquare, path: '/messages' },
  { icon: Bell,          path: '/notifications' },
  { icon: Settings,      path: '/settings' },
];


/* ─── helpers for mapping API values → UI labels ──── */
const TYPE_TO_TAB: Record<string, string> = {
  chapterwise:  'Chapter Wise',
  chapter_wise: 'Chapter Wise',
  practice:     'Chapter Wise',
  pyq:          'PYQ',
  mock:         'Mock Test',
  mock_test:    'Mock Test',
};

const capDifficulty = (d?: string): string => {
  const map: Record<string, string> = {
    easy: 'Easy', medium: 'Medium', hard: 'Difficult', difficult: 'Difficult',
  };
  return map[d?.toLowerCase() ?? ''] ?? 'Easy';
};

/* ─── constants ─────────────────────────────────────── */
const DIFFICULTY_OPTIONS = [
  { label: 'Easy',      value: 'easy' },
  { label: 'Medium',    value: 'medium' },
  { label: 'Difficult', value: 'hard' },
];

/* ─── page ──────────────────────────────────────────── */
export const QuestionCreationPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();

  const { testConfig, questions, currentQuestionIndex, isEditModalOpen, savedTestId, apiLoading, apiError, apiSuccess } =
    useAppSelector((s) => s.testCreation);
  const { subjects, topics, subTopics } = useAppSelector((s) => s.subjects);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [loadingTest, setLoadingTest] = useState(() => !!testId && savedTestId !== testId);

  /* ── CSV upload state ── */
  type CsvRow = { questionText: string; options: string[]; correctOption: number | null; solution: string; difficultyLevel: string; mediaUrl: string };
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvError, setCsvError] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const activeTestId = savedTestId ?? testId;

  /* topic/subtopic options from real API */
  const topicOpts    = topics.map((t) => ({ label: t.name, value: t.id }));
  const subTopicOpts = subTopics.map((s) => ({ label: s.name, value: s.id }));

  /* if arrived from dashboard "edit questions", load test + questions */
  useEffect(() => {
    if (!testId || savedTestId === testId) return;
    const load = async () => {
      setLoadingTest(true);
      try {
        const testRes = await apiGetTestById(testId);
        const questionIds = testRes.data.questions ?? [];
        let fetchedQs: Awaited<ReturnType<typeof apiFetchBulkQuestions>>['data'] = [];
        if (questionIds.length) {
          const qRes = await apiFetchBulkQuestions(questionIds);
          fetchedQs = qRes.data;
        }
        dispatch(loadTestForEdit({ testId, fetchedQuestions: fetchedQs }));

        // Ensure subjects are loaded so subject ID can be resolved
        let subjectsList = subjects;
        if (!subjectsList.length) {
          const subjectsAction = await dispatch(fetchSubjects());
          if (fetchSubjects.fulfilled.match(subjectsAction)) subjectsList = subjectsAction.payload;
        }

        const rawSubject  = (testRes.data.subject ?? '') as string;
        // Use the API value directly as a last resort so we never lose the subject UUID
        const subjectId   = (testRes.data.subject_id as string | undefined)
          ?? subjectsList.find((s) => s.id === rawSubject)?.id
          ?? subjectsList.find((s) => s.name.toLowerCase() === rawSubject.toLowerCase())?.id
          ?? rawSubject;
        const topicIds    = (testRes.data.topic_ids    ?? testRes.data.topics)    ?? [];
        const subTopicIds = (testRes.data.sub_topic_ids ?? testRes.data.sub_topics) ?? [];

        // Fetch topics/subtopics and capture their payloads so we can derive display names
        let topicsList: ApiTopic[] = [];
        let subTopicsList: ApiSubTopic[] = [];
        if (subjectId) {
          const topicsAction = await dispatch(fetchTopics(subjectId));
          if (fetchTopics.fulfilled.match(topicsAction)) topicsList = topicsAction.payload;
        }
        if (topicIds.length) {
          const subTopicsAction = await dispatch(fetchSubTopics(topicIds));
          if (fetchSubTopics.fulfilled.match(subTopicsAction)) subTopicsList = subTopicsAction.payload;
        }

        // Keep testConfig fully in sync so the edit modal opens with all fields pre-filled
        dispatch(setTestConfig({
          testType:        (TYPE_TO_TAB[testRes.data.type ?? ''] || 'Chapter Wise') as TestType,
          subject:         subjectId,
          subjectName:     subjectsList.find((s) => s.id === subjectId)?.name ?? '',
          nameOfTest:      testRes.data.name ?? '',
          topic:           topicIds,
          topicNames:      topicIds.map((id) => topicsList.find((t) => t.id === id)?.name ?? '').filter(Boolean),
          subTopic:        subTopicIds,
          subTopicNames:   subTopicIds.map((id) => subTopicsList.find((s) => s.id === id)?.name ?? '').filter(Boolean),
          duration:        String(testRes.data.total_time ?? ''),
          difficultyLevel: capDifficulty(testRes.data.difficulty) as DifficultyLevel,
          wrongAnswer:     Number(testRes.data.wrong_marks) || -1,
          unattempted:     Number(testRes.data.unattempt_marks) || 0,
          correctAnswer:   Number(testRes.data.correct_marks) || 5,
          noOfQuestions:   String(testRes.data.total_questions ?? ''),
        }));
      } catch (_) { /* ignore */ }
      setLoadingTest(false);
    };
    load();
  }, [testId, savedTestId, dispatch]);

  /* Ensure topic/subtopic dropdowns are populated when arriving from creation or edit flow.
     The load effect above is skipped when savedTestId===testId, so we fill in the gaps here. */
  useEffect(() => {
    if (!testConfig.subject) return;
    if (!topics.length) {
      dispatch(fetchTopics(testConfig.subject)).then(() => {
        if (testConfig.topic.length) dispatch(fetchSubTopics(testConfig.topic));
      });
    } else if (testConfig.topic.length && !subTopics.length) {
      dispatch(fetchSubTopics(testConfig.topic));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  /* clear messages when component unmounts */
  useEffect(() => () => { dispatch(clearApiMessages()); }, [dispatch]);

  const currentQ  = questions[currentQuestionIndex];
  const totalQ    = parseInt(testConfig.noOfQuestions) || questions.length;
  const maxQ      = parseInt(testConfig.noOfQuestions) || 0;
  const atLimit   = maxQ > 0 && questions.length >= maxQ;

  const updateField = <K extends keyof typeof currentQ>(key: K, val: (typeof currentQ)[K]) =>
    dispatch(updateQuestion({ index: currentQuestionIndex, data: { [key]: val } }));

  const handleOptionChange = (optIdx: number, val: string) => {
    const opts = [...currentQ.options];
    opts[optIdx] = val;
    updateField('options', opts);
  };

  /* ── CSV helpers ── */
  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const toCorrectOption = (val: string): number | null => {
    const v = val.trim().toLowerCase();
    if (v === '0' || v === 'a' || v === 'option1') return 0;
    if (v === '1' || v === 'b' || v === 'option2') return 1;
    if (v === '2' || v === 'c' || v === 'option3') return 2;
    if (v === '3' || v === 'd' || v === 'option4') return 3;
    const n = parseInt(v);
    if (!isNaN(n) && n >= 0 && n <= 3) return n;
    return null;
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? '';
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { setCsvError('CSV must have a header row and at least one data row.'); setShowCsvModal(true); return; }
      const headers = parseCSVRow(lines[0]).map((h) => h.toLowerCase().replace(/['"]/g, ''));
      const parsed: CsvRow[] = [];
      const errs: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVRow(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });
        if (!row['question']) { errs.push(`Row ${i}: question is empty`); continue; }
        parsed.push({
          questionText: row['question'] ?? '',
          options: [row['option1'] ?? '', row['option2'] ?? '', row['option3'] ?? '', row['option4'] ?? ''],
          correctOption: toCorrectOption(row['correct_option'] ?? row['correct option'] ?? ''),
          solution: row['solution'] ?? '',
          difficultyLevel: row['difficulty'] ?? 'easy',
          mediaUrl: row['media_url'] ?? row['mediaurl'] ?? '',
        });
      }
      let finalRows = parsed;
      if (maxQ > 0) {
        const remaining = maxQ - questions.length;
        if (remaining <= 0) {
          setCsvError(`Question limit reached. This test allows a maximum of ${maxQ} questions.`);
          setCsvRows([]);
          setShowCsvModal(true);
          return;
        }
        if (parsed.length > remaining) {
          finalRows = parsed.slice(0, remaining);
          errs.unshift(`${parsed.length - remaining} question(s) skipped — only ${remaining} slot(s) remaining (max: ${maxQ}).`);
        }
      }
      setCsvError(errs.length ? errs.join('; ') : '');
      setCsvRows(finalRows);
      setShowCsvModal(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportCsv = () => {
    // Append blank slots first (Redux dispatch is sync so indices are predictable)
    const startIdx = questions.length;
    for (let i = 0; i < csvRows.length; i++) dispatch(addQuestion());
    // Now update each newly created slot with CSV data
    csvRows.forEach((row, i) => {
      dispatch(updateQuestion({ index: startIdx + i, data: row }));
    });
    setShowCsvModal(false);
    setCsvRows([]);
  };

  /* ── image file upload ── */
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      updateField('mediaUrl', dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ── save & continue ── */
  const handleSaveAndContinue = async () => {
    if (!activeTestId) { alert('No test ID found. Please create the test first.'); return; }
    const result = await dispatch(saveQuestionsAsync({ testId: activeTestId, subject: testConfig.subject, questions }));
    if (saveQuestionsAsync.fulfilled.match(result)) {
      navigate(`/test-creation/${activeTestId}/preview`);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      dispatch(setCurrentQuestion(currentQuestionIndex + 1));
    }
  };

  const questionLabel = (idx: number) => {
    const q = questions[idx];
    if (q.questionText) return q.questionText.slice(0, 14) + (q.questionText.length > 14 ? '…' : '');
    return `Question ${idx + 1}`;
  };

  const isCompleted = (q: typeof currentQ) =>
    Boolean(q.questionText && q.correctOption !== null);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {loadingTest ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] gap-3">
          <Loader2 size={32} className="animate-spin text-[#4361EE]" />
          <p className="text-sm text-gray-400">Loading test…</p>
        </div>
      ) : null}

      <div className={`flex pt-14 h-screen ${loadingTest ? 'hidden' : ''}`}>

        {/* ── Col 1: thin icon-only nav (40px) ── */}
        <aside className="fixed left-0 top-14 bottom-0 w-10 bg-white border-r border-gray-100 flex flex-col items-center py-3 gap-0.5 z-20 overflow-y-auto">
          {/* expand button shown when panel is collapsed */}
          {panelCollapsed && (
            <button
              onClick={() => setPanelCollapsed(false)}
              title="Expand question panel"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#4361EE] bg-[#EEF1FD] hover:bg-[#dde3fb] transition mb-1"
            >
              <ChevronsRight size={14} />
            </button>
          )}
          {collapsedNav.map(({ icon: Icon, path }) => {
            const active = path === '/test-creation';
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                  ${active ? 'bg-[#EEF1FD] text-[#4361EE]' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              </button>
            );
          })}
        </aside>

        {/* ── Col 2: question creation list panel (160px, collapsible) ── */}
        <aside
          className={`fixed left-10 top-14 bottom-0 bg-white border-r border-gray-100 flex flex-col z-20 transition-all duration-200 overflow-hidden
            ${panelCollapsed ? 'w-0 border-r-0' : 'w-[160px]'}`}
        >
          {/* panel header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 flex-shrink-0 min-w-[160px]">
            <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">Question creation</span>
            <button
              onClick={() => setPanelCollapsed(true)}
              title="Collapse panel"
              className="text-gray-400 hover:text-[#4361EE] transition flex-shrink-0"
            >
              <ChevronsLeft size={15} />
            </button>
          </div>

          <p className="px-3 pt-3 pb-2 text-[11px] text-gray-400 whitespace-nowrap min-w-[160px]">
            Total Questions .&nbsp;
            <span className={`font-semibold ${atLimit ? 'text-amber-600' : 'text-gray-600'}`}>
              {maxQ > 0 ? `${questions.length} / ${maxQ}` : questions.length}
            </span>
          </p>

          {/* question list */}
          <div className="flex-1 overflow-y-auto py-1 px-2 min-w-[160px] space-y-1.5">
            {questions.map((q, idx) => {
              const active = currentQuestionIndex === idx;
              const done = isCompleted(q);
              return (
                <div
                  key={q.id}
                  className={`group flex items-center gap-1 rounded-xl border text-[13px] transition-all
                    ${done ? 'border-[#22C55E] bg-[#F0FDF4]' : 'border-gray-200 bg-white'}
                    ${active ? 'ring-2 ring-[#4361EE]/30' : ''}`}
                >
                  {/* clickable row */}
                  <button
                    onClick={() => dispatch(setCurrentQuestion(idx))}
                    className="flex-1 flex items-center gap-2 px-2.5 py-2 min-w-0 text-left"
                  >
                    {done ? (
                      <div className="w-[18px] h-[18px] rounded-full bg-[#22C55E] flex items-center justify-center flex-shrink-0">
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    ) : (
                      <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-[2px] rounded-full bg-gray-300" />
                      </div>
                    )}
                    <span className={`truncate ${done ? 'text-gray-800' : 'text-gray-400'}`}>
                      {questionLabel(idx)}
                    </span>
                  </button>

                  {/* per-question delete — visible on hover, hidden if only 1 question */}
                  {questions.length > 1 && (
                    <button
                      title="Delete question"
                      onClick={() => dispatch(deleteQuestion(idx))}
                      className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Col 3: main content ── */}
        <div
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-200
            ${panelCollapsed ? 'ml-[40px]' : 'ml-[200px]'}`}
        >

          {/* sticky sub-header: breadcrumb + publish */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
            <nav className="flex items-center gap-1.5 text-sm text-gray-500">
              <button onClick={() => navigate('/test-creation')} className="hover:text-[#4361EE] transition">
                Test Creation
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">Create Test</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">Chapter Wise</span>
            </nav>
            <Button variant="primary" size="sm" onClick={handleSaveAndContinue} disabled={apiLoading}>
              Publish
            </Button>
          </div>

          {/* scrollable body */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 max-w-3xl pb-10">

              {/* ── Test info card ── */}
              <div className="border border-gray-200 rounded-xl p-4 mb-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="bg-gray-900 text-white text-xs font-semibold px-3 py-1 rounded-md">
                    {testConfig.testType || 'Chapter Wise'}
                  </span>
                  <button
                    onClick={() => dispatch(openEditModal())}
                    className="text-[#4361EE] hover:text-[#3451D1] transition"
                  >
                    <Pencil size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base font-bold text-gray-800">{testConfig.nameOfTest || 'Untitled Test'}</span>
                  <span className="inline-flex items-center gap-1 bg-[#E6F7F6] text-[#00B4AB] text-xs font-medium px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-[#00B4AB] inline-block" />
                    {testConfig.difficultyLevel || 'Easy'}
                  </span>
                </div>

                <div className="grid gap-y-1.5 text-sm mb-3" style={{ gridTemplateColumns: '80px 1fr' }}>
                  <span className="text-gray-400">Subject</span>
                  <span className="text-gray-700">: {testConfig.subjectName || subjects.find((s) => s.id === testConfig.subject)?.name || testConfig.subject || '—'}</span>

                  <span className="text-gray-400">Topic</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-gray-700">:</span>
                    {(testConfig.topicNames?.length ? testConfig.topicNames : testConfig.topic).filter(Boolean).map((t, i) => (
                      <span key={i} className="border border-orange-300 text-orange-500 text-xs px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>

                  <span className="text-gray-400">Sub Topic</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-gray-700">:</span>
                    {(testConfig.subTopicNames?.length ? testConfig.subTopicNames : testConfig.subTopic).filter(Boolean).map((s, i) => (
                      <span key={i} className="border border-orange-300 text-orange-500 text-xs px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-5 pt-2.5 border-t border-gray-100 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5"><Clock size={13} /> {testConfig.duration || '—'} Min</span>
                  <span className="flex items-center gap-1.5"><FileQuestion size={13} /> {testConfig.noOfQuestions || '—'} Q's</span>
                  <span className="flex items-center gap-1.5"><BarChart3 size={13} /> {testConfig.totalMarks || '—'} Marks</span>
                </div>
              </div>

              {/* ── Question counter + actions ── */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800">
                  Question {currentQuestionIndex + 1}/<span className="text-[#4361EE]">{totalQ}</span>
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" className="flex items-center gap-1.5 text-xs"
                    onClick={() => dispatch(addQuestion())}
                    disabled={atLimit}
                    title={atLimit ? `Maximum ${maxQ} questions reached` : undefined}>
                    <Plus size={12} /> MCQ
                  </Button>
                  <Button variant="secondary" size="sm" className="flex items-center gap-1.5 text-xs"
                    onClick={() => csvInputRef.current?.click()}>
                    <Upload size={12} /> CSV
                  </Button>
                  <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
                </div>
              </div>

              {/* ── Delete All Edits ── */}
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 mb-4 transition"
                >
                  <Trash2 size={14} />
                  Delete All Edits
                </button>
              ) : (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-red-600">Delete all question content?</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" onClick={() => { dispatch(deleteAllQuestions()); setShowDeleteConfirm(false); }}>
                      Yes, Delete
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Rich text question editor ── */}
              <RichTextEditor
                value={currentQ.questionText}
                onChange={(v) => updateField('questionText', v)}
                placeholder="Type here"
                minHeight="120px"
              />

              {/* ── MCQ Options ── */}
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Type the options below</h3>
                <div className="space-y-3">
                  {currentQ.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateField('correctOption', currentQ.correctOption === oi ? null : oi)}
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition
                          ${currentQ.correctOption === oi ? 'border-[#4361EE]' : 'border-gray-300'}`}
                      >
                        {currentQ.correctOption === oi && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#4361EE]" />
                        )}
                      </button>
                      <div className="flex-1 flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <input
                          value={opt}
                          onChange={(e) => handleOptionChange(oi, e.target.value)}
                          placeholder="Type Option here"
                          className="flex-1 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleOptionChange(oi, '')}
                          className="px-2.5 text-gray-300 hover:text-red-400 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Add Solution ── */}
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Solution</h3>
                <RichTextEditor
                  value={currentQ.solution}
                  onChange={(v) => updateField('solution', v)}
                  placeholder="Type here"
                  minHeight="100px"
                  onDelete={() => updateField('solution', '')}
                />
              </div>

              {/* ── Media / Image ── */}
              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Question Image <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={currentQ.mediaUrl?.startsWith('data:') ? '' : (currentQ.mediaUrl ?? '')}
                    onChange={(e) => updateField('mediaUrl', e.target.value)}
                    placeholder="Paste image URL…"
                    className="flex-1 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => imgInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
                  >
                    <Upload size={13} /> Upload
                  </button>
                  <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                </div>
                {currentQ.mediaUrl?.startsWith('data:') && (
                  <p className="mt-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                    Preview only — uploaded files are not stored by the server. Paste an image URL above to persist the image.
                  </p>
                )}
                {currentQ.mediaUrl && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={currentQ.mediaUrl}
                      alt="Question media"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      className="max-h-36 rounded-lg border border-gray-200 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => updateField('mediaUrl', '')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition"
                      title="Remove image"
                    >×</button>
                  </div>
                )}
              </div>

              {/* ── Prev / Next arrows ── */}
              <div className="flex items-center justify-center gap-6 mt-5">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => dispatch(setCurrentQuestion(currentQuestionIndex - 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  disabled={currentQuestionIndex >= questions.length - 1}
                  onClick={() => dispatch(setCurrentQuestion(currentQuestionIndex + 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* ── Question settings ── */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Question settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Level of Difficulty</label>
                    <Dropdown
                      placeholder="Select from Drop-down"
                      options={DIFFICULTY_OPTIONS}
                      value={currentQ.difficultyLevel}
                      onChange={(v) => updateField('difficultyLevel', v)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic</label>
                    <Dropdown
                      placeholder={topicOpts.length ? 'Select from Drop-down' : 'No topics available'}
                      options={topicOpts}
                      value={currentQ.topic}
                      onChange={(v) => updateField('topic', v)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sub-topic</label>
                    <Dropdown
                      placeholder={subTopicOpts.length ? 'Select from Drop-down' : 'No sub-topics available'}
                      options={subTopicOpts}
                      value={currentQ.subTopic}
                      onChange={(v) => updateField('subTopic', v)}
                    />
                  </div>
                </div>
              </div>

              {/* ── API error / success ── */}
              {apiError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {apiError}
                </div>
              )}
              {apiSuccess && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  {apiSuccess}
                </div>
              )}

              {/* ── Add another question ── */}
              {!atLimit ? (
                <button
                  type="button"
                  onClick={() => dispatch(addQuestion())}
                  className="mt-4 flex items-center gap-1.5 text-sm text-[#4361EE] hover:underline"
                >
                  <Plus size={14} /> Add Another Question
                </button>
              ) : (
                <p className="mt-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Maximum of {maxQ} questions reached for this test.
                </p>
              )}

              {/* ── Footer actions ── */}
              <div className="flex items-center justify-between mt-6 pb-8">
                <Button variant="danger"
                  onClick={() => { dispatch(setStep('create')); navigate('/dashboard'); }}>
                  Exit Test Creation
                </Button>
                <div className="flex gap-2">
                  {currentQuestionIndex < questions.length - 1 && (
                    <Button variant="secondary" onClick={handleNext}>Next Question</Button>
                  )}
                  <Button variant="primary" onClick={handleSaveAndContinue} disabled={apiLoading}>
                    {apiLoading
                      ? <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Saving…</span>
                      : 'Save & Continue'
                    }
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen && <EditTestModal />}

      {/* ── CSV Import Modal ── */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Import Questions from CSV</h2>
              <button onClick={() => { setShowCsvModal(false); setCsvRows([]); setCsvError(''); }}
                className="text-gray-400 hover:text-gray-600 transition text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {csvError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{csvError}</div>
              )}
              {csvRows.length === 0 && !csvError && (
                <div className="text-sm text-gray-500 space-y-2">
                  <p>No valid rows found. Expected CSV columns:</p>
                  <code className="block bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap">question, option1, option2, option3, option4, correct_option, solution, difficulty, media_url</code>
                  <p className="text-xs text-gray-400">correct_option: 0–3, A–D, or option1–option4</p>
                </div>
              )}
              {csvRows.length > 0 && (
                <>
                  <p className="text-sm text-gray-600">{csvRows.length} question(s) ready to import:</p>
                  <div className="space-y-3">
                    {csvRows.map((row, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-3">
                        <p className="text-sm font-medium text-gray-800 mb-2">Q{i + 1}. {row.questionText}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {row.options.map((opt, oi) => (
                            <div key={oi} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border
                              ${row.correctOption === oi ? 'border-green-300 bg-green-50 text-green-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                              <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${row.correctOption === oi ? 'border-green-500 bg-green-500' : 'border-gray-300'}`} />
                              {opt || <span className="italic text-gray-400">empty</span>}
                            </div>
                          ))}
                        </div>
                        {row.solution && <p className="mt-1.5 text-xs text-gray-500 italic">Solution: {row.solution}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                These will be appended after existing questions.
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setShowCsvModal(false); setCsvRows([]); setCsvError(''); }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
                {csvRows.length > 0 && (
                  <button onClick={handleImportCsv}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#4361EE] rounded-lg hover:bg-[#3451D1] transition">
                    Import {csvRows.length} Question{csvRows.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
