import { WifiSlash, UploadSimple } from '@phosphor-icons/react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export default function SyncIndicator() {
  const { pending, online, syncing } = useOfflineSync();

  if (online && pending === 0) return null;

  const offline = !online;
  const text = offline ? 'Offline' : `${pending} pendente${pending === 1 ? '' : 's'}`;
  const Icon = offline ? WifiSlash : UploadSimple;
  const bg = offline ? 'rgba(107,18,26,0.5)' : 'rgba(212,160,23,0.15)';
  const fg = offline ? 'var(--color-error)' : 'var(--color-gold-500)';

  return (
    <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-semibold transition-colors"
      style={{ background: bg, borderColor: fg, color: fg }}
      title={offline ? 'Sem conexão. Chamados salvos localmente.' : 'Chamados aguardando sincronização'}>
      {syncing ? <span className="w-2.5 h-2.5 border-2 border-current rounded-full border-t-transparent animate-spin" /> : <Icon size={12} />}
      {text}
    </span>
  );
}