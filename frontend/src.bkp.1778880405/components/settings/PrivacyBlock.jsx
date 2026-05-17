import { useState } from 'react';

function Checkbox({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--color-gold-500)', width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
      />
      <span style={{ fontSize: 14, color: '#f0eff5' }}>{label}</span>
    </label>
  );
}

export default function PrivacyBlock() {
  const [visibility, setVisibility] = useState('public');
  const [shareAnalytics, setShareAnalytics] = useState(true);
  const [shareUsage, setShareUsage] = useState(false);

  const selectStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    fontSize: 14,
    background: '#111114',
    color: '#f0eff5',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  };

  function handleSelectFocus(e) {
    e.target.style.borderColor = 'var(--color-gold-500)';
    e.target.style.boxShadow = '0 0 0 3px rgba(124,111,255,0.12)';
  }

  function handleSelectBlur(e) {
    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
    e.target.style.boxShadow = 'none';
  }

  return (
    <div style={{ background: '#1a1a1e', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f0eff5', marginBottom: 20, letterSpacing: '-0.02em' }}>
        Privacidade
      </h2>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
          Visibilidade do Perfil
        </label>
        <select
          value={visibility}
          onChange={e => setVisibility(e.target.value)}
          style={selectStyle}
          onFocus={handleSelectFocus} onBlur={handleSelectBlur}
        >
          <option value="public">Público</option>
          <option value="private">Privado</option>
        </select>
      </div>

      <div>
        <label style={{ fontSize: 13, color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 6, fontWeight: 500 }}>
          Compartilhamento de Dados
        </label>
        <Checkbox
          label="Compartilhar dados analíticos anonimamente"
          checked={shareAnalytics}
          onChange={setShareAnalytics}
        />
        <Checkbox
          label="Compartilhar dados de uso para melhorias"
          checked={shareUsage}
          onChange={setShareUsage}
        />
      </div>
    </div>
  );
}
