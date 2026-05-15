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
    <div className="min-h-dvh flex items-center justify-center bg-[#0f0f11] px-4">
      <div className="w-full max-w-[420px] bg-[#1a1a1e] border border-[rgba(255,255,255,0.08)] rounded-[16px] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        <div className="text-center mb-8">
          <img src="/icon.svg" alt="CIU" className="w-10 h-10 mx-auto mb-3" />
          <h1 className="text-[17px] font-semibold text-[#f0eff5]">Entrar</h1>
          <p className="text-[12.5px] text-[#9998a8] mt-1">Central de Inteligência Urbana</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-[12.5px] font-medium text-[#9998a8] mb-1.5">Email</label>
            <input
              type="email" placeholder="seu@email.com" value={email}
              onChange={e => setEmail(e.target.value)} required
              className="w-full bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[10px] text-[14px] text-[#f0eff5] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#7c6fff] focus:shadow-[0_0_0_3px_rgba(124,111,255,0.12)] placeholder:text-[#5c5b6e]"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[12.5px] font-medium text-[#9998a8] mb-1.5">Senha</label>
            <input
              type="password" placeholder="••••••" value={senha}
              onChange={e => setSenha(e.target.value)} required
              className="w-full bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[10px] text-[14px] text-[#f0eff5] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#7c6fff] focus:shadow-[0_0_0_3px_rgba(124,111,255,0.12)] placeholder:text-[#5c5b6e]"
            />
          </div>

          {error && <p className="text-[#ff6b6b] text-[12.5px] mb-4" role="alert">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#7c6fff] text-white rounded-[8px] py-[10px] text-[13.5px] font-medium cursor-pointer transition-opacity duration-150 hover:opacity-85 disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-[12.5px] text-[#9998a8] text-center mt-4">
            Não tem conta?{' '}
            <Link to="/registro" className="text-[#7c6fff] no-underline hover:underline">Cadastre-se</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
