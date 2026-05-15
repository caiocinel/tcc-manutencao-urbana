import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(email, senha);
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
          <h1>Entrar</h1>
          <p>Central de Inteligência Urbana</p>
        </div>

        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label>Senha</label>
          <input type="password" placeholder="••••••" value={senha} onChange={e => setSenha(e.target.value)} required />
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="auth-link">
          Não tem conta? <Link to="/registro">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}
