import { useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../Toast';

export default function SecurityBlock() {
  const addToast = useToast();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      addToast('As senhas não conferem', 'error');
      return;
    }
    if (novaSenha.length < 6) {
      addToast('Nova senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.updatePassword(senhaAtual, novaSenha);
      addToast('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    fontSize: 14,
    background: '#111114',
    color: '#f0eff5',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  function handleInputFocus(e) {
    e.target.style.borderColor = 'var(--color-gold-500)';
    e.target.style.boxShadow = '0 0 0 3px rgba(124,111,255,0.12)';
  }

  function handleInputBlur(e) {
    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
    e.target.style.boxShadow = 'none';
  }

  return (
    <div style={{ background: '#1a1a1e', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f0eff5', marginBottom: 20, letterSpacing: '-0.02em' }}>
        Segurança
      </h2>

      <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0eff5', marginBottom: 4 }}>Alterar Senha</h3>
        <input
          type="password" placeholder="Senha atual"
          value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
          required aria-label="Senha atual"
          style={inputStyle}
          onFocus={handleInputFocus} onBlur={handleInputBlur}
        />
        <input
          type="password" placeholder="Nova senha"
          value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
          required minLength={6} aria-label="Nova senha"
          style={inputStyle}
          onFocus={handleInputFocus} onBlur={handleInputBlur}
        />
        <input
          type="password" placeholder="Confirmar nova senha"
          value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)}
          required minLength={6} aria-label="Confirmar nova senha"
          style={inputStyle}
          onFocus={handleInputFocus} onBlur={handleInputBlur}
        />
        <button
          type="submit" disabled={saving}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            background: 'var(--color-gold-500)',
            color: '#fff',
            opacity: saving ? 0.5 : 1,
            transition: 'opacity 0.15s',
            alignSelf: 'flex-start',
          }}
        >
          {saving ? 'Salvando...' : 'Alterar Senha'}
        </button>
      </form>

      <div style={{ padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0eff5', marginBottom: 4 }}>Autenticação de Dois Fatores (2FA)</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Status:</span>
            <span style={{ fontSize: 13, color: '#5c5b6e', fontStyle: 'italic' }}>Indisponível</span>
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0eff5', marginBottom: 4 }}>Sessões Ativas</h3>
          <span style={{ fontSize: 13, color: '#5c5b6e', fontStyle: 'italic' }}>Gerencie suas sessões ativas em breve</span>
        </div>
      </div>
    </div>
  );
}
