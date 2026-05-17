import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconContext, List as ListIcon } from '@phosphor-icons/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { AppSidebar } from './components/ui/app-sidebar';
import { CommandMenu } from './components/ui/command-menu';
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

function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const isMapPage = location.pathname === '/';

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const showSidebar = user || location.pathname.startsWith('/admin');

  return (
    <div style={{ height: '100dvh', display: 'flex', overflow: 'hidden' }}>
      {(user || showSidebar) && (
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <main id="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>
        {!isMapPage && (
          <header className="header">
            <div className="flex items-center gap-2">
              {(user || showSidebar) && (
                <button
                  onClick={() => setSidebarOpen(o => !o)}
                  className="flex items-center justify-center w-8 h-8 rounded-md lg:hidden"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Abrir menu"
                >
                  <ListIcon size={20} />
                </button>
              )}
              <div
                className="brand"
                role="button"
                tabIndex={0}
                onClick={() => navigate('/')}
                onKeyDown={e => e.key === 'Enter' && navigate('/')}
                aria-label="Ir para o mapa"
              >
                <img src="/icon.svg" alt="Central de Inteligência Urbana" className="brand-icon" width="28" height="28" style={{ objectFit: 'contain' }} />
                <div>
                  <h1>Central de Inteligência Urbana</h1>
                  <p>Chamados para Serviços Públicos</p>
                </div>
              </div>
            </div>

            <div className="header-actions">
              <button
                onClick={() => setCmdOpen(true)}
                className="nav-btn"
                aria-label="Abrir busca (Cmd+K)"
                title="Buscar (Cmd+K)"
              >
                <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" style={{ verticalAlign: 'middle' }}>
                  <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
                </svg>
                <span className="hidden sm:inline text-xs opacity-60">Cmd+K</span>
              </button>
            </div>
          </header>
        )}

        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <MapPageGuard />
              </div>
            } />
            <Route path="/login" element={<AnimatedRoute><Login /></AnimatedRoute>} />
            <Route path="/registro" element={<AnimatedRoute><Register /></AnimatedRoute>} />
            <Route path="/lista" element={<AnimatedRoute><DefectList /></AnimatedRoute>} />
            <Route path="/config" element={<AnimatedRoute><Settings /></AnimatedRoute>} />
            <Route path="/conta" element={<AnimatedRoute><ProfileSettings /></AnimatedRoute>} />
            <Route path="/configuracoes" element={<AnimatedRoute><GeneralSettings /></AnimatedRoute>} />
            <Route path="/admin" element={<AnimatedRoute><AdminDashboard /></AnimatedRoute>} />
            <Route path="/admin/dashboard" element={<AnimatedRoute><AdminDashboardMetrics /></AnimatedRoute>} />
            <Route path="/admin/usuarios" element={<AnimatedRoute><SuperAdmin /></AnimatedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>

      <CommandMenu
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        isAdmin={user?.admin}
      />
    </div>
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
              <AppLayout />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
        </ThemeProvider>
      </IconContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
