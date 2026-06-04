import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setPublishConfig, openEditModal, resetTest } from '../features/testCreation/testCreationSlice';
import type { LiveUntilOption } from '../features/testCreation/testCreationSlice';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/common/Button';
import { RadioButton } from '../components/common/RadioButton';
import { EditTestModal } from './EditTestModal';
import {
  Clock, FileQuestion, BarChart3, Pencil, CheckCircle2,
  Calendar, Loader2, AlertCircle, BookOpen, Tag,
} from 'lucide-react';
import { apiGetTestById, apiFetchBulkQuestions, apiPublishTest } from '../services/api';
import type { ApiTest, ApiQuestion } from '../services/api';

/* ── time dropdown ── */
const TimeDropdown: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({
  value, onChange, placeholder,
}) => {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of ['00', '30']) {
      times.push(`${String(h).padStart(2, '0')}:${m}`);
    }
  }
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#4361EE] transition cursor-pointer"
      >
        <option value="" disabled>{placeholder}</option>
        {times.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 5L7 9L11 5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
};

const LIVE_UNTIL_OPTIONS: LiveUntilOption[] = [
  'Always Available', '3 Weeks', '1 Week', '1 Month', '2 Weeks', 'Custom Duration',
];

const typeLabel = (t?: string) => {
  const m: Record<string, string> = {
    chapterwise:  'Chapter Wise',
    chapter_wise: 'Chapter Wise',
    practice:     'Chapter Wise',
    pyq:          'PYQ',
    mock:         'Mock Test',
    mock_test:    'Mock Test',
  };
  return m[t ?? ''] ?? t ?? 'Chapter Wise';
};

export const PublishTestPage: React.FC = () => {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const { testId } = useParams<{ testId: string }>();

  const { publishConfig, isEditModalOpen, savedTestId, savedQuestionIds } = useAppSelector((s) => s.testCreation);

  const activeTestId = testId ?? savedTestId;

  const [test,      setTest]      = useState<ApiTest | null>(null);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published,  setPublished]  = useState(false);

  /* fetch test + questions.
     savedQuestionIds are set by saveQuestionsAsync immediately after the bulk-create call,
     so they always point to the freshest question records — even if the backend's PUT /tests
     hasn't propagated the updated questions array yet. */
  useEffect(() => {
    if (!activeTestId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const testRes = await apiGetTestById(activeTestId);
        setTest(testRes.data);

        // Prefer Redux's fresh IDs (from the last save) over the API-returned list
        const freshIds = savedTestId === activeTestId && savedQuestionIds.length > 0
          ? savedQuestionIds
          : (testRes.data.questions ?? []);

        if (freshIds.length) {
          const qRes = await apiFetchBulkQuestions(freshIds);
          setQuestions(qRes.data);
        }
      } catch (err) {
        setError((err as Error).message);
      }
      setLoading(false);
    };
    load();
  }, [activeTestId]);

  const setConfig = (patch: Partial<typeof publishConfig>) => dispatch(setPublishConfig(patch));

  const handlePublish = async () => {
    if (!activeTestId) return;
    setPublishing(true);
    try {
      await apiPublishTest(activeTestId);
      setPublished(true);
    } catch (err) {
      setError((err as Error).message);
    }
    setPublishing(false);
  };

  /* ── loading state ── */
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <Loader2 size={32} className="animate-spin text-[#4361EE]" />
            <p className="text-sm">Loading test preview…</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  /* ── error state ── */
  if (error && !test) {
    return (
      <MainLayout>
        <div className="px-8 py-6">
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            <AlertCircle size={18} /> {error}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="px-8 py-6 max-w-4xl">

        {/* ── published success view ── */}
        {published && (
          <div className="mb-8">
            {/* success banner */}
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 mb-6">
              <CheckCircle2 size={22} />
              <div className="flex-1">
                <p className="font-semibold text-base">Test Published Successfully!</p>
                <p className="text-sm opacity-80">Your test is now live and available to students.</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => { dispatch(resetTest()); navigate('/dashboard'); }}>
                Go to Dashboard
              </Button>
            </div>

            {/* published test output */}
            <div className="border-2 border-green-200 rounded-2xl overflow-hidden">
              <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{test?.name ?? 'Published Test'}</h2>
                  <p className="text-green-100 text-sm mt-0.5">{typeLabel(test?.type)} · {test?.difficulty ?? ''}</p>
                </div>
                <span className="bg-white text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Live</span>
              </div>

              {/* stats row */}
              <div className="bg-green-50 px-6 py-3 flex items-center gap-6 text-sm text-green-800 border-b border-green-200">
                <span className="flex items-center gap-1.5"><Clock size={14} /> {test?.total_time ?? '—'} min</span>
                <span className="flex items-center gap-1.5"><FileQuestion size={14} /> {questions.length} questions</span>
                <span className="flex items-center gap-1.5"><BarChart3 size={14} /> {test?.total_marks ?? '—'} marks</span>
              </div>

              {/* questions list */}
              <div className="px-6 py-5 space-y-5">
                {questions.map((q, i) => (
                  <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="min-w-[24px] h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="flex-1 text-sm text-gray-800 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: q.question }} />
                    </div>

                    {/* question image */}
                    {q.media_url && (
                      <img src={q.media_url} alt="Question media"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        className="mb-3 max-h-40 rounded-lg border border-gray-200 object-contain" />
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {(['option1', 'option2', 'option3', 'option4'] as const).map((opt, oi) => (
                        <div key={opt}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border
                            ${q.correct_option === opt
                              ? 'border-green-400 bg-green-50 text-green-700 font-semibold'
                              : 'border-gray-200 text-gray-600'}`}
                        >
                          <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-bold
                            ${q.correct_option === opt ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-400'}`}>
                            {['A','B','C','D'][oi]}
                          </span>
                          {q[opt]}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                        <span className="font-semibold">Explanation: </span>{q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <Button variant="primary" onClick={() => { dispatch(resetTest()); navigate('/dashboard'); }}>
                Done — Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* ── pre-publish view (hidden after publishing) ── */}
        {!published && <>

        {/* ── header ── */}
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-base font-semibold text-gray-800">Test created</h1>
          <span className="flex items-center gap-1.5 bg-[#E6F7F6] text-[#00B4AB] text-xs font-medium px-3 py-1 rounded-full">
            <CheckCircle2 size={12} />
            All {questions.length} Questions done
          </span>
        </div>

        {/* ── test info card ── */}
        {test && (
          <div className="border border-gray-200 rounded-xl p-5 mb-6">
            <div className="flex items-start justify-between mb-3">
              <span className="bg-gray-900 text-white text-xs font-semibold px-3 py-1 rounded-md">
                {typeLabel(test.type)}
              </span>
              <button onClick={() => dispatch(openEditModal())} className="text-[#4361EE] hover:text-[#3451D1]">
                <Pencil size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold text-gray-800">{test.name}</span>
              {test.difficulty && (
                <span className="inline-flex items-center gap-1 bg-[#E6F7F6] text-[#00B4AB] text-xs font-medium px-2.5 py-0.5 rounded-full capitalize">
                  <span className="w-2 h-2 rounded-full bg-[#00B4AB] inline-block" /> {test.difficulty}
                </span>
              )}
            </div>

            <div className="grid gap-y-1.5 text-sm mb-3" style={{ gridTemplateColumns: '90px 1fr' }}>
              <span className="text-gray-400 flex items-center gap-1"><BookOpen size={12} /> Subject</span>
              <span className="text-gray-700">: {(test.subject as string) || '—'}</span>
              <span className="text-gray-400 flex items-center gap-1"><Tag size={12} /> Topics</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-gray-700">:</span>
                {(Array.isArray(test.topics) ? test.topics : []).map((t) => (
                  <span key={t} className="border border-orange-300 text-orange-500 text-xs px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-5 pt-2.5 border-t border-gray-100 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Clock size={13} /> {test.total_time ?? '—'} Min</span>
              <span className="flex items-center gap-1.5"><FileQuestion size={13} /> {questions.length} Q's</span>
              <span className="flex items-center gap-1.5"><BarChart3 size={13} /> {test.total_marks ?? '—'} Marks</span>
            </div>
          </div>
        )}

        {/* ── questions preview ── */}
        {questions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Questions Preview</h2>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-xs font-semibold text-gray-400 mt-0.5">Q{i + 1}.</span>
                    <p className="text-sm text-gray-800 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: q.question }} />
                  </div>
                  {q.media_url && (
                    <img src={q.media_url} alt="Question media"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      className="mb-3 max-h-40 rounded-lg border border-gray-200 object-contain" />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {(['option1', 'option2', 'option3', 'option4'] as const).map((opt) => (
                      <div key={opt}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border
                          ${q.correct_option === opt
                            ? 'border-green-300 bg-green-50 text-green-700 font-medium'
                            : 'border-gray-200 text-gray-600'}`}
                      >
                        <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                          ${q.correct_option === opt ? 'border-green-500' : 'border-gray-300'}`}>
                          {q.correct_option === opt && <span className="w-2 h-2 rounded-full bg-green-500" />}
                        </span>
                        {q[opt]}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="mt-2 text-xs text-gray-500 italic">Explanation: {q.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── publish type tabs ── */}
        <div className="flex gap-1 mb-6">
          {(['Publish Now', 'Schedule Publish'] as const).map((tab) => (
            <button key={tab}
              onClick={() => setConfig({ publishType: tab })}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all
                ${publishConfig.publishType === tab
                  ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* schedule date/time */}
        {publishConfig.publishType === 'Schedule Publish' && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Select Date and Time</h3>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" value={publishConfig.scheduleDate}
                onChange={(e) => setConfig({ scheduleDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#4361EE] transition"
              />
              <TimeDropdown value={publishConfig.scheduleTime}
                onChange={(v) => setConfig({ scheduleTime: v })} placeholder="Select Time" />
            </div>
          </div>
        )}

        {/* live until */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Live Until</h3>
          <p className="text-sm text-gray-500 mb-4">Choose how long this test should remain available.</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {LIVE_UNTIL_OPTIONS.map((opt) => (
              <RadioButton key={opt} name="liveUntil" label={opt} value={opt}
                checked={publishConfig.liveUntil === opt}
                onChange={(v) => setConfig({ liveUntil: v as LiveUntilOption })}
              />
            ))}
          </div>
          {publishConfig.liveUntil === 'Custom Duration' && (
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className="relative">
                <input type="date" value={publishConfig.endDate}
                  onChange={(e) => setConfig({ endDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#4361EE] transition"
                />
                <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <TimeDropdown value={publishConfig.endTime}
                onChange={(v) => setConfig({ endTime: v })} placeholder="Select End Time" />
            </div>
          )}
        </div>

        {/* error from publish */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Cancel
          </Button>
          <Button variant="secondary"
            onClick={() => activeTestId ? navigate(`/test-creation/${activeTestId}/questions`) : navigate('/dashboard')}>
            Edit Questions
          </Button>
          <Button variant="secondary"
            onClick={() => activeTestId ? navigate(`/test-creation/${activeTestId}/edit`) : navigate('/dashboard')}>
            Edit Test
          </Button>
          <Button variant="primary" onClick={handlePublish} disabled={publishing}>
            {publishing
              ? <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Publishing…</span>
              : 'Publish Test'
            }
          </Button>
        </div>

        </> /* end !published */}
      </div>

      {isEditModalOpen && <EditTestModal />}
    </MainLayout>
  );
};
