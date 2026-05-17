import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignOut, User, List, ChartBar, Layout, Users } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.split(/[ @._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

export default function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!isAuthenticated) return null;

  const label = user?.nome || user?.email || '';
  const initials = getInitials(label);

  function handleNav(path) {
    setOpen(false);
    navigate(path);
  }

  return (
    <div className="user-menu-wrapper" ref={ref}>
      <button
        className="user-menu-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Menu do usuário"
        aria-expanded={open}
      >
        <span className="user-avatar">{initials}</span>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <span className="user-menu-name">{user?.nome || 'Usuário'}</span>
            <span className="user-menu-email">{user?.email}</span>
          </div>

          <div className="user-menu-divider" />

          <button className="user-menu-item" onClick={() => handleNav('/lista')}>
            <List size={16} /> Lista de Chamados
          </button>

          <button className="user-menu-item" onClick={() => handleNav('/conta')}>
            <User size={16} /> Configurações
          </button>

          {user?.admin && (
            <>
              <div className="user-menu-divider" />
              <span className="user-menu-section-label">Admin</span>
              <button className="user-menu-item" onClick={() => handleNav('/admin')}>
                <Layout size={16} /> Painel
              </button>
              <button className="user-menu-item" onClick={() => handleNav('/admin/dashboard')}>
                <ChartBar size={16} /> Métricas
              </button>
              <button className="user-menu-item" onClick={() => handleNav('/admin/usuarios')}>
                <Users size={16} /> Usuários
              </button>
            </>
          )}

          <div className="user-menu-divider" />

          <button className="user-menu-item user-menu-logout" onClick={logout}>
            <SignOut size={16} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
