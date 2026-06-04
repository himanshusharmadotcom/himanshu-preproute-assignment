import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppSelector } from './store/hooks';

import { LoginPage }              from './pages/LoginPage';
import { DashboardPage }          from './pages/DashboardPage';
import { TestCreationPage }       from './pages/TestCreationPage';
import { QuestionCreationPage }   from './pages/QuestionCreationPage';
import { PublishTestPage }        from './pages/PublishTestPage';

/* ── Protected route wrapper ── */
const PrivateRoute: React.FC = () => {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* public */}
      <Route path="/login" element={<LoginPage />} />

      {/* protected */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard"                             element={<DashboardPage />} />
        <Route path="/test-creation/new"                     element={<TestCreationPage />} />
        <Route path="/test-creation/:testId/edit"            element={<TestCreationPage />} />
        <Route path="/test-creation/:testId/questions"       element={<QuestionCreationPage />} />
        <Route path="/test-creation/:testId/preview"         element={<PublishTestPage />} />
        {/* fallback redirects */}
        <Route path="/"                                      element={<Navigate to="/test-creation/new" replace />} />
        <Route path="/test-creation"                         element={<Navigate to="/test-creation/new" replace />} />
        <Route path="/test-creation/create"                  element={<Navigate to="/test-creation/new" replace />} />
        <Route path="/test-creation/questions"               element={<Navigate to="/dashboard" replace />} />
        <Route path="/test-creation/publish"                 element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
