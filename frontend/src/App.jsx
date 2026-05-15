import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconContext } from '@phosphor-icons/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import './styles/tokens.css';
import './App.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const MapPage = lazy(() => import('./pages/MapPage'));
const DefectList = lazy(() => import('./pages/DefectList'));
const Settings = lazy(() => import('./pages/Settings'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminDashboardMetrics = lazy(() => import('./pages/AdminDashboardMetrics'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const GeneralSettings = lazy(() => import('./pages/GeneralSettings'));

function PageFallback() {
  return (
    <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="skeleton skeleton-cluster" style={{ margin: '0 auto 8px' }} />
        <div className="skeleton skeleton-line" style={{ width: 160, margin: '0 auto' }} />
      </div>
    </div>
  );
}

function AnimatedRoute({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
}

function KeyboardNav() {
  const addToast = useToast();
  const { toggle } = useTheme();
  useKeyboardNav({ addToast, toggleTheme: toggle });
  return null;
}

function MapPageGuard() {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <PageFallback />;
  return <MapPage key={String(isAuthenticated)} />;
}

function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Ir para o conteúdo principal
    </a>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <IconContext.Provider value={{ weight: 'light', size: 20 }}>
        <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <SkipLink />
              <KeyboardNav />
              <main id="main-content" style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
              <Routes>
                <Route path="/" element={<Suspense fallback={<PageFallback />}><div style={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}><MapPageGuard /></div></Suspense>} />
                <Route path="/login" element={<Suspense fallback={<PageFallback />}><AnimatedRoute><Login /></AnimatedRoute></Suspense>} />
                <Route path="/registro" element={<Suspense fallback={<PageFallback />}><AnimatedRoute><Register /></AnimatedRoute></Suspense>} />
                <Route path="/lista" element={<Suspense fallback={<PageFallback />}><AnimatedRoute><DefectList /></AnimatedRoute></Suspense>} />
                <Route path="/config" element={<Suspense fallback={<PageFallback />}><AnimatedRoute><Settings /></AnimatedRoute></Suspense>} />
                <Route path="/conta" element={<Suspense fallback={<PageFallback />}><AnimatedRoute><ProfileSettings /></AnimatedRoute></Suspense>} />
                <Route path="/configuracoes" element={<Suspense fallback={<PageFallback />}><AnimatedRoute><GeneralSettings /></AnimatedRoute></Suspense>} />
                <Route path="/admin" element={
                  <Suspense fallback={<PageFallback />}>
                    <AnimatedRoute><AdminDashboard /></AnimatedRoute>
                  </Suspense>
                } />
                <Route path="/admin/dashboard" element={
                  <Suspense fallback={<PageFallback />}>
                    <AnimatedRoute><AdminDashboardMetrics /></AnimatedRoute>
                  </Suspense>
                } />
                <Route path="/admin/usuarios" element={
                  <Suspense fallback={<PageFallback />}>
                    <AnimatedRoute><SuperAdmin /></AnimatedRoute>
                  </Suspense>
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
              </main>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
        </ThemeProvider>
      </IconContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
