import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, ArrowLeft, Sun, Moon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UserMenu from './UserMenu';

export default function Header({ creating = false }) {
  const { isAuthenticated } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMapPage = location.pathname === '/';

  if (creating) {
    return (
      <header className="header">
        <div className="brand">
          <svg className="brand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <line x1="9" y1="6" x2="9" y2="7" />
            <line x1="15" y1="6" x2="15" y2="7" />
            <line x1="9" y1="10" x2="9" y2="11" />
            <line x1="15" y1="10" x2="15" y2="11" />
            <line x1="9" y1="14" x2="9" y2="15" />
            <line x1="15" y1="14" x2="15" y2="15" />
            <line x1="9" y1="18" x2="15" y2="18" />
            <polyline points="7 21 10 18 14 18 17 21" />
          </svg>
          <div>
            <h1>Central de Inteligência Urbana</h1>
            <p>Chamados para Serviços Públicos</p>
          </div>
        </div>
        <div className="header-creating-hint">
          <MapPin size={16} />
          <span>Clique no mapa para posicionar o alfinete</span>
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <div className="brand" role="button" tabIndex={0} onClick={() => navigate('/')} onKeyDown={e => e.key === 'Enter' && navigate('/')} aria-label="Ir para o mapa">
        <svg className="brand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="9" y1="6" x2="9" y2="7" />
          <line x1="15" y1="6" x2="15" y2="7" />
          <line x1="9" y1="10" x2="9" y2="11" />
          <line x1="15" y1="10" x2="15" y2="11" />
          <line x1="9" y1="14" x2="9" y2="15" />
          <line x1="15" y1="14" x2="15" y2="15" />
          <line x1="9" y1="18" x2="15" y2="18" />
          <polyline points="7 21 10 18 14 18 17 21" />
        </svg>
        <div>
          <h1>Central de Inteligência Urbana</h1>
          <p>Chamados para Serviços Públicos</p>
        </div>
      </div>

      <div className="header-actions">
        {!isMapPage && (
          <button className="btn-back-map" onClick={() => navigate('/')} aria-label="Voltar para o mapa">
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar para o mapa
          </button>
        )}

        <button className="nav-btn theme-toggle" onClick={toggle} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {isAuthenticated ? <UserMenu /> : (
          <button className="nav-btn" onClick={() => navigate('/login')} aria-label="Fazer login">
            Entrar
          </button>
        )}
      </div>
    </header>
  );
}
