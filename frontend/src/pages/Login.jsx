// Página de login - autenticação de usuário existente
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      // Chama API de login e armazena token + dados do usuário
      const data = await api.login(email, senha);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h1>Login</h1>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required aria-label="Email" aria-describedby={error ? 'login-error' : undefined} />
        <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} required aria-label="Senha" aria-describedby={error ? 'login-error' : undefined} />
        {error && <p id="login-error" className="error" role="alert">{error}</p>}
        <button type="submit">Entrar</button>
        <p className="auth-link">
          Não tem conta? <Link to="/registro">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}
