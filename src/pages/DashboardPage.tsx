import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAllTests, deleteTest } from '../features/tests/testsSlice';
import { resetTest, setSavedTestId, setTestConfig } from '../features/testCreation/testCreationSlice';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/common/Button';
import {
  Plus, Search, Pencil, Eye, Trash2, ChevronRight,
  FileText, Clock, BookOpen, BarChart3, AlertCircle,
} from 'lucide-react';
import type { ApiTest } from '../services/api';

const DIFFICULTY_DISPLAY: Record<string, 'Easy' | 'Medium' | 'Difficult'> = {
  easy: 'Easy', medium: 'Medium', hard: 'Difficult', difficult: 'Difficult',
};

const StatusBadge: React.FC<{ status: ApiTest['status'] }> = ({ status }) => {
  const map: Record<string, { cls: string; label: string }> = {
    draft:       { cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Draft'       },
    live:        { cls: 'bg-green-50  text-green-700  border-green-200',  label: 'Live'        },
    unpublished: { cls: 'bg-gray-50   text-gray-500   border-gray-200',   label: 'Unpublished' },
    scheduled:   { cls: 'bg-blue-50   text-blue-700   border-blue-200',   label: 'Scheduled'   },
    expired:     { cls: 'bg-red-50    text-red-600    border-red-200',    label: 'Expired'     },
  };
  const s = status ?? 'draft';
  const { cls, label } = map[s] ?? map['draft'];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

const typeLabel = (type?: string) => {
  const map: Record<string, string> = {
    chapterwise:  'Chapter Wise',
    chapter_wise: 'Chapter Wise',
    practice:     'Chapter Wise',
    pyq:          'PYQ',
    mock:         'Mock Test',
    mock_test:    'Mock Test',
  };
  return map[type ?? ''] ?? type ?? '—';
};

export const DashboardPage: React.FC = () => {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const { list, loading, error, deleteLoading } = useAppSelector((s) => s.tests);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  useEffect(() => { dispatch(fetchAllTests()); }, [dispatch]);

  const filtered = list.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    (t.subject as string)?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleEdit = (test: ApiTest) => {
    dispatch(resetTest());
    dispatch(setSavedTestId(test.id));
    // pre-fill config from the test list data
    dispatch(setTestConfig({
      nameOfTest:    test.name,
      difficultyLevel: DIFFICULTY_DISPLAY[test.difficulty ?? ''] ?? 'Easy',
      duration:      String(test.total_time ?? ''),
      noOfQuestions: String(test.total_questions ?? ''),
      totalMarks:    String(test.total_marks ?? ''),
    }));
    navigate(`/test-creation/${test.id}/edit`);
  };

  const handleView = (id: string) => navigate(`/test-creation/${id}/preview`);

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    await dispatch(deleteTest(id));
    dispatch(fetchAllTests());
  };

  return (
    <MainLayout>
      <div className="px-8 py-6">

        {/* ── page header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Test Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage all your tests in one place</p>
          </div>
          <Button
            variant="primary"
            onClick={() => { dispatch(resetTest()); navigate('/test-creation/new'); }}
          >
            <Plus size={15} className="mr-1.5" /> Create New Test
          </Button>
        </div>

        {/* ── search ── */}
        <div className="relative mb-5 w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or subject…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]/30 transition"
          />
        </div>

        {/* ── error ── */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* ── loading skeleton ── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* ── table ── */}
        {!loading && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Test Name', 'Subject', 'Type', 'Questions', 'Status', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                      <FileText size={32} className="mx-auto mb-2 opacity-40" />
                      {search ? 'No tests match your search.' : 'No tests yet. Create your first test.'}
                    </td>
                  </tr>
                )}
                {paginated.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                    {/* Name */}
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{test.name}</span>
                    </td>
                    {/* Subject */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-gray-600">
                        <BookOpen size={13} className="text-gray-400" />
                        {(test.subject as string) || '—'}
                      </span>
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                        {typeLabel(test.type)}
                      </span>
                    </td>
                    {/* Questions */}
                    <td className="px-4 py-3 text-gray-600">
                      <span className="flex items-center gap-1">
                        <BarChart3 size={13} className="text-gray-400" />
                        {test.total_questions ?? (test.questions?.length ?? 0)}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={test.status} />
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {test.created_at ? new Date(test.created_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(test)}
                          title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-[#4361EE] transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleView(test.id)}
                          title="Preview"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-green-50 hover:text-green-600 transition"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(test.id)}
                          title="Delete"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition"
                          disabled={deleteLoading === test.id}
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => navigate(`/test-creation/${test.id}/questions`)}
                          title="Add Questions"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* ── pagination ── */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} tests
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                        n === currentPage
                          ? 'bg-[#4361EE] text-white'
                          : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── delete confirmation modal ── */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-xl p-6 w-80">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Delete Test</p>
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
