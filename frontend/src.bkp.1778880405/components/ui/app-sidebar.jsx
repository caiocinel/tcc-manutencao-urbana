import { useLocation, useNavigate } from 'react-router-dom';
import {
  MapPin, List, ChartBar, Layout, Users, User, GearSix, SignOut, X
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/', icon: MapPin, label: 'Mapa', exact: true },
  { path: '/lista', icon: List, label: 'Chamados' },
  { path: '/conta', icon: User, label: 'Configurações' },
];

const adminItems = [
  { path: '/admin', icon: Layout, label: 'Painel Admin' },
  { path: '/admin/dashboard', icon: ChartBar, label: 'Métricas' },
  { path: '/admin/usuarios', icon: Users, label: 'Usuários' },
];

export function AppSidebar({ open, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function isActive(path, exact) {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  }

  function handleNav(path) {
    navigate(path);
    onClose?.();
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 h-full w-60 flex-shrink-0',
          'bg-[var(--color-bg-primary)] border-r border-[var(--color-border-default)]',
          'flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--color-border-default)]">
          <div className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="" className="w-6 h-6 opacity-90" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Gestão Urbana</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive(item.path, item.exact)
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-l-[3px] border-[var(--color-gold-500)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-tertiary)] border-l-[3px] border-transparent'
              )}
            >
              <item.icon size={18} weight={isActive(item.path, item.exact) ? 'bold' : 'regular'} />
              {item.label}
            </button>
          ))}

          {user?.admin && (
            <>
              <div className="pt-3 pb-1">
                <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Administração
                </span>
              </div>
              {adminItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive(item.path, item.exact)
                      ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-l-[3px] border-[var(--color-gold-500)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-tertiary)] border-l-[3px] border-transparent'
                  )}
                >
                  <item.icon size={18} weight={isActive(item.path, item.exact) ? 'bold' : 'regular'} />
                  {item.label}
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-[var(--color-border-default)] p-2">
          <button
            onClick={() => { handleNav('/configuracoes'); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-tertiary)] transition-colors"
          >
            <GearSix size={18} />
            Configurações Gerais
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-error)] hover:bg-[rgba(207,68,68,0.12)] transition-colors"
          >
            <SignOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
