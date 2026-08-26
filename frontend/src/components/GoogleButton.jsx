import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './toast-context';
import { api } from '../services/api';

/**
 * "Continuar com Google" via Google Identity Services.
 *
 * O botão é desenhado pelo próprio Google (script gsi/client) e devolve um ID
 * token; o backend valida e responde com o mesmo JWT do login comum mais
 * `novo` — na primeira vez o usuário é levado a escolher o nome de exibição.
 * O client ID vem de GET /api/v1/auth/google/, então nada de env no frontend.
 * Se o backend não tiver Google configurado, o botão simplesmente não aparece.
 */

let gisPromise = null;
function carregarGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Não foi possível carregar o login do Google.'));
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

export default function GoogleButton({ texto = 'continue_with' }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();
  const alvo = useRef(null);
  const [erro, setErro] = useState('');
  const [disponivel, setDisponivel] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const cfg = await api.googleConfig().catch(() => null);
      if (cancelado) return;
      if (!cfg?.web) { setDisponivel(false); return; }
      await carregarGis();
      if (cancelado || !alvo.current) return;

      window.google.accounts.id.initialize({
        client_id: cfg.web,
        ux_mode: 'popup',
        callback: async ({ credential }) => {
          try {
            const res = await api.loginGoogle(credential);
            login(res);
            addToast(res.novo ? 'Conta criada com o Google!' : 'Login realizado com sucesso!');
            navigate(res.novo ? '/escolher-nome' : '/mapa');
          } catch (err) {
            setErro(err.message || 'Erro ao entrar com o Google.');
          }
        },
      });
      const escuro = document.documentElement.dataset.theme === 'dark';
      window.google.accounts.id.renderButton(alvo.current, {
        theme: escuro ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'rectangular',
        text: texto,
        locale: 'pt-BR',
        width: Math.min(400, alvo.current.parentElement?.offsetWidth || 360),
      });
    })().catch((err) => { if (!cancelado) setErro(err.message); });
    return () => { cancelado = true; };
  }, [login, navigate, addToast, texto]);

  if (!disponivel) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3 w-full text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        <span className="flex-1 border-t" style={{ borderColor: 'var(--color-border-default)' }} />
        ou
        <span className="flex-1 border-t" style={{ borderColor: 'var(--color-border-default)' }} />
      </div>
      <div ref={alvo} className="w-full flex justify-center min-h-10" />
      {erro && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{erro}</p>}
    </div>
  );
}
