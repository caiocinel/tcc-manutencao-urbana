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
          <img src="/icon.svg" alt="Central de Inteligência Urbana" className="brand-icon" width="28" height="28" style={{ objectFit: 'contain' }} />
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
        <img src="/icon.svg" alt="Central de Inteligência Urbana" className="brand-icon" width="28" height="28" style={{ objectFit: 'contain' }} />
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
