import { useAuth } from '../../context/AuthContext';

export default function AccountBlock() {
  const { user } = useAuth();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div style={{ background: '#1a1a1e', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f0eff5', marginBottom: 20, letterSpacing: '-0.02em' }}>
        Conta
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: '#5c5b6e', fontWeight: 500, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Nome
          </label>
          <span style={{ fontSize: 15, color: '#f0eff5' }}>{user?.nome || '—'}</span>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#5c5b6e', fontWeight: 500, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Email
          </label>
          <span style={{ fontSize: 15, color: '#f0eff5' }}>{user?.email || '—'}</span>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#5c5b6e', fontWeight: 500, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Membro desde
          </label>
          <span style={{ fontSize: 15, color: '#f0eff5' }}>{memberSince}</span>
        </div>
      </div>
    </div>
  );
}
