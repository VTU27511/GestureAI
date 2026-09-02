import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { UserDashboardPage } from './pages/user/UserDashboardPage';
import { MyGesturesPage } from './pages/user/MyGesturesPage';
import { CreateGesturePage } from './pages/user/CreateGesturePage';
import { GestureDetailPage } from './pages/user/GestureDetailPage';
import { TrainingPage } from './pages/user/TrainingPage';
import { RecognitionPage } from './pages/user/RecognitionPage';
import { ProfilePage } from './pages/user/ProfilePage';

import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage';
import { AdminGesturesPage } from './pages/admin/AdminGesturesPage';
import { AdminTrainingPage } from './pages/admin/AdminTrainingPage';
import { AdminModelsPage } from './pages/admin/AdminModelsPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { NotFoundPage } from './pages/NotFoundPage';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#94a3b8' }}>
        <p>Loading GestureAI...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/user/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Protected User Dashboard Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/user/dashboard" element={<UserDashboardPage />} />
            <Route path="/user/gestures" element={<MyGesturesPage />} />
            <Route path="/user/gestures/create" element={<CreateGesturePage />} />
            <Route path="/user/gestures/:id" element={<GestureDetailPage />} />
            <Route path="/user/training" element={<TrainingPage />} />
            <Route path="/user/recognition" element={<RecognitionPage />} />
            <Route path="/user/profile" element={<ProfilePage />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:id"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminUserDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/gestures"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminGesturesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/training"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminTrainingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/models"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminModelsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLogsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;