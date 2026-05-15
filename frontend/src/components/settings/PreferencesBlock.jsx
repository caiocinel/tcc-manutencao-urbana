import { useTheme } from '../../context/ThemeContext';

const timezones = [
  'America/Sao_Paulo', 'America/Manaus', 'America/Fortaleza',
  'America/Recife', 'America/Belem', 'America/Brasilia',
  'America/Cuiaba', 'America/Campo_Grande', 'America/Porto_Velho',
  'America/Boa_Vista', 'America/Noronha',
];

const languages = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

export default function PreferencesBlock() {
  const { theme, toggle } = useTheme();
  const tzOffset = -new Date().getTimezoneOffset();
  const defaultTz = timezones.find(t => {
    const offset = -new Date().toLocaleString('pt-BR', { timeZone: t }).length; // not exact, just default
    return true;
  }) || 'America/Sao_Paulo';

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
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  function handleFocus(e) {
    e.target.style.borderColor = '#7c6fff';
    e.target.style.boxShadow = '0 0 0 3px rgba(124,111,255,0.12)';
  }

  function handleBlur(e) {
    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
    e.target.style.boxShadow = 'none';
  }

  return (
    <div style={{ background: '#1a1a1e', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f0eff5', marginBottom: 20, letterSpacing: '-0.02em' }}>
        Preferências
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ fontSize: 13, color: '#9998a8', display: 'block', marginBottom: 6, fontWeight: 500 }}>
            Tema
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => theme !== 'dark' && toggle()}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: `1px solid ${theme === 'dark' ? '#7c6fff' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                background: theme === 'dark' ? 'rgba(124,111,255,0.15)' : '#111114',
                color: theme === 'dark' ? '#7c6fff' : '#9998a8',
                transition: 'all 0.15s',
              }}
            >
              Escuro
            </button>
            <button
              onClick={() => theme !== 'light' && toggle()}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: `1px solid ${theme === 'light' ? '#7c6fff' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                background: theme === 'light' ? 'rgba(124,111,255,0.15)' : '#111114',
                color: theme === 'light' ? '#7c6fff' : '#9998a8',
                transition: 'all 0.15s',
              }}
            >
              Claro
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, color: '#9998a8', display: 'block', marginBottom: 6, fontWeight: 500 }}>
            Idioma
          </label>
          <select
            defaultValue="pt-BR"
            style={selectStyle}
            onFocus={handleFocus} onBlur={handleBlur}
          >
            {languages.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 13, color: '#9998a8', display: 'block', marginBottom: 6, fontWeight: 500 }}>
            Fuso Horário
          </label>
          <select
            defaultValue={defaultTz}
            style={selectStyle}
            onFocus={handleFocus} onBlur={handleBlur}
          >
            {timezones.map(tz => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
