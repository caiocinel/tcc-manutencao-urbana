import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const { login } = useAuth();
  const navigate = useNavigate();

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
    try {
      const data = await api.register(nome, email, senha, municipioId, cpf.replace(/\D/g, ''));
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h1>Cadastro</h1>
        {error && <p className="error" id="register-error" role="alert">{error}</p>}
        <input type="text" placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} required aria-label="Nome completo" aria-describedby={error ? 'register-error' : undefined} />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required aria-label="Email" aria-describedby={error ? 'register-error' : undefined} />
        <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} required aria-label="Senha" aria-describedby={error ? 'register-error' : undefined} />
        <div style={{ position: 'relative' }}>
          <input
            type="text" placeholder="CPF" value={cpf} maxLength={14}
            onChange={e => { setCpf(mascaraCpf(e.target.value)); setCpfValido(null); }}
            onBlur={handleCpfBlur}
            aria-label="CPF"
            aria-describedby={cpfValido !== null ? 'cpf-status' : undefined}
            style={{ borderColor: cpfValido === true ? '#16a34a' : cpfValido === false ? '#dc2626' : '' }}
          />
          <span id="cpf-status" role="status" style={{ position: 'absolute', right: 8, top: 12, fontSize: 11 }}>
            {cpfValidando && <span style={{ color: '#888' }}>Validando...</span>}
            {cpfValido === true && <span style={{ color: '#16a34a' }}>OK</span>}
            {cpfValido === false && <span style={{ color: '#dc2626' }}>Inválido</span>}
          </span>
        </div>
        <SearchableSelect
          options={municipios}
          value={municipioId}
          onChange={setMunicipioId}
          placeholder="Pesquise um município..."
          groupBy="uf_sigla"
        />
        <button type="submit">Cadastrar</button>
        <p className="auth-link">
          Já tem conta? <Link to="/login">Faça login</Link>
        </p>
      </form>
    </div>
  );
}
