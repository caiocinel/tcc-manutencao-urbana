import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { api } from '../services/api';
import SearchableSelect from '../components/ui/searchable-select';

export default function Register() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [cpf, setCpf] = useState('');
  const [municipioId, setMunicipioId] = useState('');
  const [municipios, setMunicipios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const municipioOptions = municipios.map(m => ({ value: m.codigo, label: m.nome, group: m.uf_sigla }));

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/mapa');
    api.getMunicipiosComAdmin().then(setMunicipios).catch(() => {});
  }, [isAuthenticated, authLoading, navigate]);

  function formatCpf(val) {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    return nums.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
      || nums.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3')
      || nums.replace(/^(\d{3})(\d{1,3})$/, '$1.$2')
      || nums;
  }

  function validarCpfDigitos(cpf) {
    const nums = cpf.replace(/\D/g, '');
    if (nums.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(nums)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(nums[i]) * (10 - i);
    let resto = (sum * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(nums[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(nums[i]) * (11 - i);
    resto = (sum * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(nums[10])) return false;
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!nome || !email || !senha || !confirmarSenha || !cpf) { setError('Preencha todos os campos.'); return; }
    if (senha.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (senha !== confirmarSenha) { setError('Senhas não conferem.'); return; }
    if (!validarCpfDigitos(cpf)) { setError('CPF inválido.'); return; }
    setLoading(true);
    try {
      const res = await api.register(nome, email, senha, municipioId || undefined, cpf.replace(/\D/g, ''));
      login(res);
      addToast('Conta criada com sucesso!');
      navigate('/mapa');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const fieldStyle = 'w-full h-12 px-4 border text-sm outline-none transition-colors bg-[var(--color-bg-input)] text-[var(--color-text-primary)]';

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-md border p-8" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }}>
        <div className="flex flex-col items-center mb-8">
          <div style={{ width: '3rem', height: '3rem', background: 'var(--color-gold-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-text-inverse)' }}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Criar Conta</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>Central de Inteligência Urbana</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="reg-nome" className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Nome completo</label>
            <input id="reg-nome" type="text" value={nome} onChange={e => setNome(e.target.value)}
              className={fieldStyle}
              style={{ borderColor: 'var(--color-border-default)' }}
              onFocus={e => e.target.style.borderColor = 'var(--color-gold-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-default)'} placeholder="Seu nome completo" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="reg-email" className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>E-mail</label>
            <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              className={fieldStyle}
              style={{ borderColor: 'var(--color-border-default)' }}
              onFocus={e => e.target.style.borderColor = 'var(--color-gold-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-default)'} placeholder="seu@email.com" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="reg-cpf" className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>CPF <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input id="reg-cpf" type="text" value={cpf} onChange={e => setCpf(formatCpf(e.target.value))}
              className={fieldStyle}
              style={{ borderColor: 'var(--color-border-default)' }}
              onFocus={e => e.target.style.borderColor = 'var(--color-gold-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-default)'} placeholder="000.000.000-00" maxLength={14} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="reg-municipio" className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Município</label>
            <SearchableSelect options={municipioOptions} value={municipioId} onChange={setMunicipioId}
              placeholder="Selecione um município" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="reg-senha" className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Senha</label>
            <input id="reg-senha" type="password" value={senha} onChange={e => setSenha(e.target.value)}
              className={fieldStyle}
              style={{ borderColor: 'var(--color-border-default)' }}
              onFocus={e => e.target.style.borderColor = 'var(--color-gold-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-default)'} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="reg-confirmar-senha" className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Confirmar senha</label>
            <input id="reg-confirmar-senha" type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)}
              className={fieldStyle}
              style={{ borderColor: confirmarSenha && senha !== confirmarSenha ? 'var(--color-error)' : 'var(--color-border-default)' }}
              onFocus={e => e.target.style.borderColor = confirmarSenha && senha !== confirmarSenha ? 'var(--color-error)' : 'var(--color-gold-500)'}
              onBlur={e => e.target.style.borderColor = confirmarSenha && senha !== confirmarSenha ? 'var(--color-error)' : 'var(--color-border-default)'} placeholder="Repita a senha" />
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full h-12 font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: 'var(--color-gold-500)', color: 'var(--color-text-inverse)' }}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
          <div className="text-center mt-4">
            <Link to="/login" className="text-sm transition-colors hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
              Já tem conta? Faça login
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
