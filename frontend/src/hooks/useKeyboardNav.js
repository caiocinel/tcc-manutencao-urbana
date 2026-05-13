import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const HELP_TIMEOUT = 5000;

const KEY_MAP = {
  m: '/',
  l: '/lista',
  a: '/admin',
  d: '/admin/dashboard',
  u: '/admin/usuarios',
  s: '/config',
  c: '/conta',
  i: '/login',
};

const KEY_LABELS = {
  m: 'Mapa',
  l: 'Lista',
  a: 'Admin',
  d: 'Dashboard',
  u: 'Usuários',
  s: 'Config',
  c: 'Conta',
  i: 'Login',
};

export function useKeyboardNav() {
  const navigate = useNavigate();
  const bufferRef = useRef('');
  const helpRef = useRef(null);
  const toastRef = useRef(null);

  const showHelp = useCallback(() => {
    if (helpRef.current) return;
    const lines = Object.entries(KEY_LABELS).map(([k, v]) => `g + ${k} → ${v}`);
    lines.push(...['? → Esconder esta ajuda', 'Esc → Limpar atalho']);
    helpRef.current = true;

    const el = document.createElement('div');
    el.id = 'keyboard-help';
    el.innerHTML = `
      <div style="
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        z-index:99999;background:#1a1a2e;border:1px solid #22c55e;
        border-radius:12px;padding:16px 24px;box-shadow:0 8px 32px rgba(0,0,0,0.6);
        font-family:Inter,sans-serif;font-size:13px;color:#e5e7eb;
        max-width:400px;width:90%;
      ">
        <div style="font-weight:600;margin-bottom:10px;color:#22c55e;font-size:14px">
          ⌨ Atalhos de Navegação
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">
          ${lines.map(l => `<div><code style="background:#22c55e22;padding:2px 6px;border-radius:4px;font-size:12px">${l.split('→')[0].trim()}</code><span style="margin-left:8px;color:#9ca3af">${l.split('→')[1].trim()}</span></div>`).join('')}
        </div>
        <div style="margin-top:8px;font-size:11px;color:#6b7280;text-align:center">
          Pressione g, solte, depois a tecla de destino
        </div>
      </div>
    `;
    document.body.appendChild(el);

    setTimeout(() => {
      el.remove();
      helpRef.current = null;
    }, HELP_TIMEOUT);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.key === '?' && !e.shiftKey) return;
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        showHelp();
        return;
      }

      if (e.key === 'Escape') {
        bufferRef.current = '';
        return;
      }

      if (e.key === 'g' && bufferRef.current === '') {
        bufferRef.current = 'g';
        setTimeout(() => { bufferRef.current = ''; }, 1000);
        return;
      }

      if (bufferRef.current === 'g') {
        bufferRef.current = '';
        const target = KEY_MAP[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          navigate(target);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showHelp]);
}
