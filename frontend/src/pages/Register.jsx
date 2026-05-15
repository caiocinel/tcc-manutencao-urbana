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

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-form-header">
          <img src="/icon.svg" alt="CIU" width="36" height="36" style={{ marginBottom: 12 }} />
          <h1>Criar conta</h1>
          <p>Central de Inteligência Urbana</p>
        </div>

        {prefillMessage && (
          <div className="auth-success-banner">
            <p>Parece que você ainda não tem uma conta. Complete seu cadastro abaixo!</p>
          </div>
        )}

        {error && <p className="auth-error" role="alert">{error}</p>}

        <div className="field">
          <label>Nome <span className="req">*</span></label>
          <input type="text" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} required />
        </div>

        <div className="field">
          <label>Email <span className="req">*</span></label>
          <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label>Senha <span className="req">*</span></label>
          <input type="password" placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} />
        </div>

        <div className="field">
          <label>CPF</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text" placeholder="000.000.000-00" value={cpf} maxLength={14}
              onChange={e => { setCpf(mascaraCpf(e.target.value)); setCpfValido(null); }}
              onBlur={handleCpfBlur}
              style={{ borderColor: cpfValido === true ? '#2ec4a0' : cpfValido === false ? '#ff6b6b' : undefined }}
            />
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11 }}>
              {cpfValidando && <span style={{ color: '#9998a8' }}>Validando...</span>}
              {cpfValido === true && <span style={{ color: '#2ec4a0' }}>OK</span>}
              {cpfValido === false && <span style={{ color: '#ff6b6b' }}>Inválido</span>}
            </span>
          </div>
        </div>

        <div className="field">
          <label>Município <span className="req">*</span></label>
          <SearchableSelect
            options={municipios}
            value={municipioId}
            onChange={setMunicipioId}
            placeholder="Pesquise um município..."
            groupBy="uf_sigla"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Criar conta'}
        </button>

        <p className="auth-link">
          Já tem conta? <Link to="/login">Faça login</Link>
        </p>
      </form>
    </div>
  );
}
