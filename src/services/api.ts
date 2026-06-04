// Both dev (Vite proxy) and prod (Vercel rewrite) forward /api to the backend.
const BASE_URL = '/api';

const getToken = () => localStorage.getItem('auth_token') ?? '';

const authHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers ?? {}) },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json();
  if (!res.ok || json.success === false) {
    // Parse error objects from the API into a readable string
    let detail = '';
    if (json.errors) {
      if (Array.isArray(json.errors)) {
        detail = json.errors
          .map((e: unknown) => {
            if (typeof e === 'string') return e;
            if (e && typeof e === 'object') {
              const o = e as Record<string, unknown>;
              // common fields: message, msg, field+message
              const field = o.field ?? o.param ?? o.path ?? '';
              const msg   = o.message ?? o.msg ?? o.error ?? JSON.stringify(o);
              return field ? `${field}: ${msg}` : String(msg);
            }
            return String(e);
          })
          .join(' | ');
      } else if (typeof json.errors === 'object') {
        detail = Object.entries(json.errors as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ');
      } else {
        detail = String(json.errors);
      }
    } else {
      detail = json.details ?? json.error ?? '';
    }
    const msg = json.message ?? `Request failed (${res.status})`;
    throw new Error(detail ? `${msg} — ${detail}` : msg);
  }
  return json as T;
}

const get  = <T>(path: string)                 => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body: unknown)  => request<T>(path, { method: 'POST',  body: JSON.stringify(body) });
const put  = <T>(path: string, body: unknown)  => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) });
const del  = <T>(path: string)                 => request<T>(path, { method: 'DELETE' });

/* ── types ── */
export interface ApiSubject   { id: string; name: string; }
export interface ApiTopic     { id: string; name: string; subject_id: string; }
export interface ApiSubTopic  { id: string; name: string; topic_id: string; }

export interface ApiTest {
  id: string;
  name: string;
  type?: string;
  subject?: string;       // may be name or id depending on endpoint
  subject_id?: string;
  topics?: string[];
  topic_ids?: string[];
  sub_topics?: string[];
  sub_topic_ids?: string[];
  status: TestStatus | null;
  created_at?: string;
  questions?: string[];
  correct_marks?: number;
  wrong_marks?: number;
  unattempt_marks?: number;
  difficulty?: string;
  total_time?: number;
  total_marks?: number;
  total_questions?: number;
}

export interface ApiQuestion {
  id: string;
  type: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation?: string;
  difficulty?: string;
  topic_id?: string;
  sub_topic_id?: string;
  test_id: string;
  media_url?: string;
}

export type TestStatus = 'draft' | 'live' | 'unpublished' | 'scheduled' | 'expired';

export interface CreateTestPayload {
  name: string;
  type: string;
  subject: string;
  topics: string[];
  sub_topics: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: string;
  total_time: number;
  total_marks: number;
  total_questions: number;
  status: TestStatus;
}

export interface CreateQuestionPayload {
  type: 'mcq';
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation?: string;
  difficulty?: string;
  test_id: string;
  subject: string;
  media_url?: string;
}

/* ── auth ── */
export const apiLogin = async (userId: string, password: string) => {
  const res  = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json();

  // Hard failure (4xx / 5xx) AND the response explicitly says success:false
  if (!res.ok && json.success === false) {
    throw new Error(json.message ?? 'Login failed');
  }
  if (!res.ok) {
    throw new Error(json.message ?? `Login failed (${res.status})`);
  }

  // Extract token from wherever the API puts it
  const token: string =
    json?.data?.token ??
    json?.token ??
    json?.access_token ??
    json?.data?.access_token;

  if (!token) throw new Error('No authentication token received');

  const user: Record<string, unknown> =
    json?.data?.user ?? json?.user ?? {};

  return { token, user };
};

/* ── subjects / topics / subtopics ── */
export const apiGetSubjects = () =>
  get<{ success: true; data: ApiSubject[] }>('/subjects');

export const apiGetTopicsBySubject = (subjectId: string) =>
  get<{ success: true; data: ApiTopic[] }>(`/topics/subject/${subjectId}`);

export const apiGetSubTopicsByTopics = (topicIds: string[]) =>
  post<{ success: true; data: ApiSubTopic[] }>('/sub-topics/multi-topics', { topicIds });

/* ── tests ── */
export const apiGetAllTests = () =>
  get<{ success: true; data: ApiTest[] }>('/tests');

export const apiGetTestById = (id: string) =>
  get<{ success: true; data: ApiTest }>(`/tests/${id}`);

export const apiCreateTest = (payload: CreateTestPayload) =>
  post<{ success: true; data: ApiTest; message: string }>('/tests', payload);

export const apiUpdateTest = (id: string, payload: Partial<ApiTest> & Record<string, unknown>) =>
  put<{ success: true; data: ApiTest; message: string }>(`/tests/${id}`, payload);

export const apiDeleteTest = (id: string) =>
  del<{ success: true; message: string }>(`/tests/${id}`);

export const apiPublishTest = (id: string) =>
  put<{ success: true; data: ApiTest; message: string }>(`/tests/${id}`, { status: 'live' });

/* ── questions ── */
export const apiBulkCreateQuestions = (questions: CreateQuestionPayload[]) =>
  post<{ success: true; data: ApiQuestion[]; message: string }>('/questions/bulk', { questions });

export const apiFetchBulkQuestions = (questionIds: string[]) =>
  post<{ success: true; data: ApiQuestion[] }>('/questions/fetchBulk', { question_ids: questionIds });

/* ── helpers ── */
export const correctOptionIndex = (opt: ApiQuestion['correct_option']): number =>
  ({ option1: 0, option2: 1, option3: 2, option4: 3 }[opt] ?? 0);

export const indexToCorrectOption = (idx: number): ApiQuestion['correct_option'] =>
  (['option1', 'option2', 'option3', 'option4'][idx] as ApiQuestion['correct_option']) ?? 'option1';
