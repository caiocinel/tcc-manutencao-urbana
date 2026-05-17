import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../services/api';

export default function Login() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/');
  }, [isAuthenticated, authLoading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !senha) { setError('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      const res = await api.login(email, senha);
      login(res);
      addToast('Login realizado com sucesso!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return null;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }}
        className="w-full max-w-md rounded-xl border p-8" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }}>
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }} className="flex flex-col items-center mb-8">
          <img src="/icon.svg" alt="CIU" className="w-12 h-12 mb-3" />
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Central de Inteligência Urbana</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Chamados para Serviços Públicos</p>
        </motion.div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="peer w-full h-12 px-4 pt-4 rounded-lg border text-sm outline-none transition-colors bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
              style={{ borderColor: error ? 'var(--color-error)' : 'var(--color-border-default)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-gold-500)'; }}
              onBlur={e => { e.target.style.borderColor = error ? 'var(--color-error)' : 'var(--color-border-default)'; }}
              placeholder=" " />
            <label htmlFor="email" className="absolute left-4 top-0 text-xs transition-all duration-200 peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-0 peer-focus:text-xs"
              style={{ color: email ? 'var(--color-gold-500)' : 'var(--color-text-muted)' }}>E-mail</label>
          </div>
          <div className="relative">
            <input id="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)}
              className="peer w-full h-12 px-4 pt-4 rounded-lg border text-sm outline-none transition-colors bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
              style={{ borderColor: error ? 'var(--color-error)' : 'var(--color-border-default)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-gold-500)'; }}
              onBlur={e => { e.target.style.borderColor = error ? 'var(--color-error)' : 'var(--color-border-default)'; }}
              placeholder=" " />
            <label htmlFor="senha" className="absolute left-4 top-0 text-xs transition-all duration-200 peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-0 peer-focus:text-xs"
              style={{ color: senha ? 'var(--color-gold-500)' : 'var(--color-text-muted)' }}>Senha</label>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full h-10 rounded-md font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: 'var(--color-gold-500)', color: 'var(--color-text-inverse)' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <Link to="/registro" className="transition-colors hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
              Não tem conta? Cadastre-se
            </Link>
            <button type="button" onClick={() => addToast('Função em desenvolvimento.', 'info')} className="transition-colors hover:underline" style={{ color: 'var(--color-text-muted)' }}>
              Esqueci minha senha
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
