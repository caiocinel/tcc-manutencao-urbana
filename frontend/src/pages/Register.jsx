import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cpf, setCpf] = useState('');
  const [cpfValido, setCpfValido] = useState(null);
  const [cpfValidando, setCpfValidando] = useState(false);
  const [municipioId, setMunicipioId] = useState('');
  const [municipios, setMunicipios] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  const prefillEmail = searchParams.get('email') || '';
  const prefillMessage = !!searchParams.get('email');

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  useEffect(() => {
    api.listMunicipios()
      .then(setMunicipios)
      .catch(() => {});
  }, []);

  function mascaraCpf(val) {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  async function handleCpfBlur() {
    const nums = cpf.replace(/\D/g, '');
    if (nums.length !== 11) { setCpfValido(null); return; }
    setCpfValidando(true);
    try {
      const data = await api.validarCpf(nums);
      setCpfValido(data.valido);
    } catch {
      setCpfValido(false);
    } finally {
      setCpfValidando(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!municipioId) { setError('Selecione um município'); return; }
    setLoading(true);
    try {
      const data = await api.register(nome, email, senha, municipioId, cpf.replace(/\D/g, ''));
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[10px] text-[14px] text-[#f0eff5] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#7c6fff] focus:shadow-[0_0_0_3px_rgba(124,111,255,0.12)] placeholder:text-[#5c5b6e]";

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0f0f11] px-4 py-8">
      <div className="w-full max-w-[420px] bg-[#1a1a1e] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        <div className="text-center mb-6">
          <img src="/icon.svg" alt="CIU" className="w-10 h-10 mx-auto mb-3" />
          <h1 className="text-[17px] font-semibold text-[#f0eff5]">Criar conta</h1>
          <p className="text-[12.5px] text-[#9998a8] mt-1">Central de Inteligência Urbana</p>
        </div>

        {prefillMessage && (
          <div className="bg-[rgba(46,196,160,0.12)] border border-[rgba(46,196,160,0.3)] rounded-[8px] px-3 py-2.5 mb-4">
            <p className="text-[12px] text-[#2ec4a0] leading-relaxed">
              Parece que você ainda não tem uma conta. Complete seu cadastro abaixo!
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {error && <p className="text-[#ff6b6b] text-[12.5px] mb-4" role="alert">{error}</p>}

          <div className="mb-3">
            <label className="block text-[12.5px] font-medium text-[#9998a8] mb-1.5">Nome <span className="text-[#ff6b6b]">*</span></label>
            <input type="text" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} required className={inputClass} />
          </div>

          <div className="mb-3">
            <label className="block text-[12.5px] font-medium text-[#9998a8] mb-1.5">Email <span className="text-[#ff6b6b]">*</span></label>
            <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
          </div>

          <div className="mb-3">
            <label className="block text-[12.5px] font-medium text-[#9998a8] mb-1.5">Senha <span className="text-[#ff6b6b]">*</span></label>
            <input type="password" placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} className={inputClass} />
          </div>

          <div className="mb-3">
            <label className="block text-[12.5px] font-medium text-[#9998a8] mb-1.5">CPF</label>
            <div className="relative">
              <input
                type="text" placeholder="000.000.000-00" value={cpf} maxLength={14}
                onChange={e => { setCpf(mascaraCpf(e.target.value)); setCpfValido(null); }}
                onBlur={handleCpfBlur}
                className={inputClass}
                style={{ borderColor: cpfValido === true ? '#2ec4a0' : cpfValido === false ? '#ff6b6b' : '' }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]">
                {cpfValidando && <span className="text-[#9998a8]">Validando...</span>}
                {cpfValido === true && <span className="text-[#2ec4a0]">OK</span>}
                {cpfValido === false && <span className="text-[#ff6b6b]">Inválido</span>}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[12.5px] font-medium text-[#9998a8] mb-1.5">Município <span className="text-[#ff6b6b]">*</span></label>
            <SearchableSelect
              options={municipios}
              value={municipioId}
              onChange={setMunicipioId}
              placeholder="Pesquise um município..."
              groupBy="uf_sigla"
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-[#7c6fff] text-white rounded-[8px] py-[10px] text-[13.5px] font-medium cursor-pointer transition-opacity duration-150 hover:opacity-85 disabled:opacity-60"
          >
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </button>

          <p className="text-[12.5px] text-[#9998a8] text-center mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-[#7c6fff] no-underline hover:underline">Faça login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
