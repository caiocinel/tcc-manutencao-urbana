import { useState } from 'react';

function Toggle({ label, description, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <span style={{ fontSize: 14, color: '#f0eff5', fontWeight: 500 }}>{label}</span>
        {description && (
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '2px 0 0', lineHeight: 1.4 }}>{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: 40,
          height: 22,
          borderRadius: 11,
          border: 'none',
          cursor: 'pointer',
          background: checked ? 'var(--color-gold-500)' : 'rgba(255,255,255,0.12)',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
        aria-label={label}
      >
        <span style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

export default function NotificationsBlock() {
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);
  const [inApp, setInApp] = useState(false);

  return (
    <div style={{ background: '#1a1a1e', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f0eff5', marginBottom: 4, letterSpacing: '-0.02em' }}>
        Notificações
      </h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
        Gerencie como você recebe notificações
      </p>
      <div>
        <Toggle
          label="Email"
          description="Receba notificações por email"
          checked={email}
          onChange={setEmail}
        />
        <Toggle
          label="Push"
          description="Notificações push no navegador"
          checked={push}
          onChange={setPush}
        />
        <Toggle
          label="No aplicativo"
          description="Notificações dentro do sistema"
          checked={inApp}
          onChange={setInApp}
        />
      </div>
    </div>
  );
}
