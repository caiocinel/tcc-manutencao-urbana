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
    if (!authLoading && isAuthenticated) navigate('/');
    api.listMunicipios().then(setMunicipios).catch(() => {});
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
      login(res.token, res.user);
      addToast('Conta criada com sucesso!');
      navigate('/');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-xl border p-8" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }}>
        <div className="flex flex-col items-center mb-8">
          <img src="/icon.svg" alt="CIU" className="w-12 h-12 mb-3" />
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Criar Conta</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Central de Inteligência Urbana</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input id="reg-nome" type="text" value={nome} onChange={e => setNome(e.target.value)}
              className="peer w-full h-12 px-4 pt-4 rounded-lg border text-sm outline-none bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
              style={{ borderColor: 'var(--color-border-default)' }}
              onFocus={e => e.target.style.borderColor = 'var(--color-gold-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-default)'} placeholder=" " />
            <label htmlFor="reg-nome" className="absolute left-4 top-0 text-xs transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-0 peer-focus:text-xs"
              style={{ color: nome ? 'var(--color-gold-500)' : 'var(--color-text-muted)' }}>Nome completo</label>
          </div>
          <div className="relative">
            <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="peer w-full h-12 px-4 pt-4 rounded-lg border text-sm outline-none bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
              style={{ borderColor: 'var(--color-border-default)' }}
              onFocus={e => e.target.style.borderColor = 'var(--color-gold-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-default)'} placeholder=" " />
            <label htmlFor="reg-email" className="absolute left-4 top-0 text-xs transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-0 peer-focus:text-xs"
              style={{ color: email ? 'var(--color-gold-500)' : 'var(--color-text-muted)' }}>E-mail</label>
          </div>
          <div className="relative">
            <input id="reg-cpf" type="text" value={cpf} onChange={e => setCpf(formatCpf(e.target.value))}
              className="peer w-full h-12 px-4 pt-4 rounded-lg border text-sm outline-none bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
              style={{ borderColor: 'var(--color-border-default)' }}
              onFocus={e => e.target.style.borderColor = 'var(--color-gold-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-default)'} placeholder=" " maxLength={14} />
            <label htmlFor="reg-cpf" className="absolute left-4 top-0 text-xs transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-0 peer-focus:text-xs"
              style={{ color: cpf ? 'var(--color-gold-500)' : 'var(--color-text-muted)' }}>CPF <span style={{ color: 'var(--color-error)' }}>*</span></label>
          </div>
          <SearchableSelect options={municipioOptions} value={municipioId} onChange={setMunicipioId}
            placeholder="Selecione um município" label="Município" />
          <div className="relative">
            <input id="reg-senha" type="password" value={senha} onChange={e => setSenha(e.target.value)}
              className="peer w-full h-12 px-4 pt-4 rounded-lg border text-sm outline-none bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
              style={{ borderColor: 'var(--color-border-default)' }}
              onFocus={e => e.target.style.borderColor = 'var(--color-gold-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-default)'} placeholder=" " />
            <label htmlFor="reg-senha" className="absolute left-4 top-0 text-xs transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-0 peer-focus:text-xs"
              style={{ color: senha ? 'var(--color-gold-500)' : 'var(--color-text-muted)' }}>Senha</label>
          </div>
          <div className="relative">
            <input id="reg-confirmar-senha" type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)}
              className="peer w-full h-12 px-4 pt-4 rounded-lg border text-sm outline-none bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
              style={{ borderColor: confirmarSenha && senha !== confirmarSenha ? 'var(--color-error)' : 'var(--color-border-default)' }}
              onFocus={e => e.target.style.borderColor = confirmarSenha && senha !== confirmarSenha ? 'var(--color-error)' : 'var(--color-gold-500)'}
              onBlur={e => e.target.style.borderColor = confirmarSenha && senha !== confirmarSenha ? 'var(--color-error)' : 'var(--color-border-default)'} placeholder=" " />
            <label htmlFor="reg-confirmar-senha" className="absolute left-4 top-0 text-xs transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-0 peer-focus:text-xs"
              style={{ color: confirmarSenha ? (senha !== confirmarSenha ? 'var(--color-error)' : 'var(--color-gold-500)') : 'var(--color-text-muted)' }}>Confirmar senha</label>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full h-10 rounded-md font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: 'var(--color-gold-500)', color: 'var(--color-text-inverse)' }}>
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
          <div className="text-center">
            <Link to="/login" className="text-sm transition-colors hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
              Já tem conta? Faça login
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
