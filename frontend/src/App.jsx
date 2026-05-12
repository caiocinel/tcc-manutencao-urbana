import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { IconContext } from '@phosphor-icons/react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import MapPage from './pages/MapPage';
import DefectList from './pages/DefectList';
import Settings from './pages/Settings';
import AccountSettings from './pages/AccountSettings';
import './styles/tokens.css';
import './App.css';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminDashboardMetrics = lazy(() => import('./pages/AdminDashboardMetrics'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));

function AdminFallback() {
  return (
    <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="skeleton skeleton-cluster" style={{ margin: '0 auto 8px' }} />
        <div className="skeleton skeleton-line" style={{ width: 160, margin: '0 auto' }} />
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <IconContext.Provider value={{ weight: 'light', size: 20 }}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<MapPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                <Route path="/lista" element={<DefectList />} />
                <Route path="/config" element={<Settings />} />
                <Route path="/conta" element={<AccountSettings />} />
                <Route path="/admin" element={
                  <Suspense fallback={<AdminFallback />}>
                    <AdminDashboard />
                  </Suspense>
                } />
                <Route path="/admin/dashboard" element={
                  <Suspense fallback={<AdminFallback />}>
                    <AdminDashboardMetrics />
                  </Suspense>
                } />
                <Route path="/admin/usuarios" element={
                  <Suspense fallback={<AdminFallback />}>
                    <SuperAdmin />
                  </Suspense>
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </IconContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
