// Página de cadastro - criação de nova conta
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      // Chama API de registro e já autentica o usuário recém-criado
      const data = await api.register(nome, email, senha);
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
        {error && <p className="error">{error}</p>}
        <input type="text" placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} required />
        <button type="submit">Cadastrar</button>
        <p className="auth-link">
          Já tem conta? <Link to="/login">Faça login</Link>
        </p>
      </form>
    </div>
  );
}
