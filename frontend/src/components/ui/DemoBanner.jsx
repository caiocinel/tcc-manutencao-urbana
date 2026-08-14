import { X } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

export default function DemoBanner() {
  const { isDemoMode, exitDemoMode } = useAuth();

  if (!isDemoMode) return null;

  return (
    <div
      className="flex items-center justify-center gap-4 px-4 py-2 z-[2000]"
      style={{ background: 'linear-gradient(90deg, #D4AF37, #AA7C11)', color: '#000000' }}
    >
      <span className="font-semibold text-xs uppercase tracking-wider">
        Modo Demonstração
      </span>
      <span className="text-xs max-sm:hidden" style={{ color: 'rgba(0,0,0,0.7)' }}>
        Dados resetados diariamente
      </span>
      <button
        onClick={exitDemoMode}
        className="p-1 transition-colors"
        style={{ background: 'rgba(0,0,0,0.1)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; }}
        aria-label="Sair do modo demonstração"
      >
        <X size={14} />
      </button>
    </div>
  );
}
