import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignOut, ArrowLeft } from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Header from '../components/Header';

export default function AccountSettings() {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const addToast = useToast();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [saving, setSaving] = useState(false);

  const [codigoVerificacao, setCodigoVerificacao] = useState('');
  const [reenviando, setReenviando] = useState(false);
  const [emailVerificado, setEmailVerificado] = useState(user?.email_verificado || false);

  if (!isAuthenticated) { navigate('/login'); return null; }

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

  async function handleVerificarEmail(e) {
    e.preventDefault();
    try {
      await api.verificarEmail(codigoVerificacao);
      addToast('Email verificado com sucesso!');
      setEmailVerificado(true);
      updateUser({ email_verificado: true });
      setCodigoVerificacao('');
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    }
  }

  async function handleReenviar() {
    setReenviando(true);
    try {
      await api.reenviarCodigo();
      addToast('Código reenviado para seu email');
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="admin-page">
      <Header />
      <div className="settings-wrapper">
      <div className="auth-form">
        <h1>Configurações da Conta</h1>
        <p className="chamado-meta">{user?.email}</p>
        {user?.cpf && <p className="chamado-meta">CPF: {user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>}

        <hr />

        <h3 style={{ fontSize: 'var(--text-xl)' }}>Verificação de Email</h3>
        <p className="chamado-meta" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1_5)' }}>
          Status:
          {emailVerificado
            ? <span style={{ color: 'var(--accent-green)', fontWeight: 'var(--weight-semibold)' }}>Verificado</span>
            : <span style={{ color: 'var(--accent-amber)', fontWeight: 'var(--weight-semibold)' }}>Nao verificado</span>
          }
        </p>

        {!emailVerificado && (
          <form onSubmit={handleVerificarEmail} className="defect-form">
            <input
              type="text" placeholder="Codigo de verificacao" maxLength={6}
              value={codigoVerificacao} onChange={e => setCodigoVerificacao(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required aria-label="Codigo de verificacao"
            />
            <button type="submit">Verificar Email</button>
            <button type="button" className="btn-secondary" onClick={handleReenviar} disabled={reenviando}>
              {reenviando ? 'Enviando...' : 'Reenviar codigo'}
            </button>
          </form>
        )}

        <hr />

        <h3 style={{ fontSize: 'var(--text-xl)' }}>Alterar Senha</h3>

        <form onSubmit={handleChangePassword} className="defect-form">
          <input type="password" placeholder="Senha atual" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required aria-label="Senha atual" />
          <input type="password" placeholder="Nova senha" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={6} aria-label="Nova senha" />
          <input type="password" placeholder="Confirmar nova senha" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} required minLength={6} aria-label="Confirmar nova senha" />
          <button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Alterar Senha'}</button>
        </form>

        <hr />

        <div className="modal-actions" style={{ marginTop: 'var(--space-1)' }}>
          <button type="button" onClick={() => navigate('/')} className="btn-secondary" style={{ flex: 1 }}>
            <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Voltar
          </button>
          <button type="button" onClick={logout} className="btn-primary" style={{ flex: 1, background: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>
            <SignOut size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Sair
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
