import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';

export default function Header({ creating = false }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
      <div className="brand" role="button" tabIndex={0} onClick={() => navigate('/')} onKeyDown={e => e.key === 'Enter' && navigate('/')}>
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

      <div className="header-actions">
        <button className="btn-back-map" onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          Voltar para o mapa
        </button>

        {isAuthenticated ? <UserMenu /> : (
          <button className="nav-btn" onClick={() => navigate('/login')}>
            Entrar
          </button>
        )}
      </div>
    </header>
  );
}
