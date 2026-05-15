import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MapPin, ArrowLeft, Sun, Moon, ListMagnifyingGlass, GearSix } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import UserMenu from './UserMenu';

export default function Header({ creating = false }) {
  const { isAuthenticated, user } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMapPage = location.pathname === '/';

  if (creating) {
    return (
      <header className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1e] border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="Central de Inteligência Urbana" className="w-7 h-7 object-contain" />
          <div>
            <h1 className="text-[15px] font-semibold leading-tight text-[#f0eff5]">Central de Inteligência Urbana</h1>
            <p className="text-[11px] text-[#9998a8]">Chamados para Serviços Públicos</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-[12.5px] text-[#9998a8]">
          <MapPin size={16} />
          <span>Clique no mapa para posicionar o alfinete</span>
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center gap-4 px-5 py-2.5 bg-[#1a1a1e] border-b border-[rgba(255,255,255,0.08)] min-h-[56px]">
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate('/')} aria-label="Ir para o mapa">
        <img src="/icon.svg" alt="Central de Inteligência Urbana" className="w-7 h-7 object-contain" />
        <div className="hidden sm:block">
          <h1 className="text-[14px] font-semibold leading-tight text-[#f0eff5]">Central de Inteligência Urbana</h1>
          <p className="text-[10.5px] text-[#9998a8] leading-tight -mt-0.5">Chamados para Serviços Públicos</p>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-1 ml-4">
        <Link to="/" className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors duration-150 ${location.pathname === '/' ? 'bg-[rgba(124,111,255,0.15)] text-[#7c6fff]' : 'text-[#9998a8] hover:text-[#f0eff5] hover:bg-[rgba(255,255,255,0.04)]'}`}>
          Mapa
        </Link>
        <Link to="/lista" className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors duration-150 ${location.pathname === '/lista' ? 'bg-[rgba(124,111,255,0.15)] text-[#7c6fff]' : 'text-[#9998a8] hover:text-[#f0eff5] hover:bg-[rgba(255,255,255,0.04)]'}`}>
          Lista
        </Link>
        {user?.admin && (
          <Link to="/admin/dashboard" className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors duration-150 ${location.pathname.startsWith('/admin') ? 'bg-[rgba(124,111,255,0.15)] text-[#7c6fff]' : 'text-[#9998a8] hover:text-[#f0eff5] hover:bg-[rgba(255,255,255,0.04)]'}`}>
            Admin
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-1.5 ml-auto">
        {!isMapPage && (
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12.5px] font-medium text-[#9998a8] bg-transparent border border-[rgba(255,255,255,0.08)] cursor-pointer transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={() => navigate('/')} aria-label="Voltar para o mapa">
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Voltar</span>
          </button>
        )}

        <button className="flex items-center justify-center w-8 h-8 rounded-[6px] text-[#9998a8] bg-transparent cursor-pointer transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={toggle} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {isAuthenticated ? <UserMenu /> : (
          <button className="px-3 py-1.5 rounded-[6px] text-[12.5px] font-medium text-white bg-[#7c6fff] cursor-pointer transition-opacity duration-150 hover:opacity-85" onClick={() => navigate('/login')} aria-label="Fazer login">
            Entrar
          </button>
        )}
      </div>
    </header>
  );
}
