/**
 * "Continuar com Google" — implementação web (Google Identity Services).
 *
 * O Metro resolve este arquivo no lugar de `google-button.tsx` na web. O
 * botão é desenhado pelo script do Google e devolve o ID token direto, sem
 * redirect — por isso não precisa registrar URI de redirecionamento no console.
 */

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FontSize } from '@/constants/theme';
import { useColors, useTheme } from '@/context/theme-context';
import { useEntrarComGoogle } from '@/hooks/use-entrar-com-google';
import { api } from '@/services/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let gisPromise: Promise<void> | null = null;
function carregarGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Não foi possível carregar o login do Google.'));
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

export function GoogleButton() {
  const colors = useColors();
  const { theme } = useTheme();
  const { entrar, erro, setErro } = useEntrarComGoogle();
  const alvo = useRef<HTMLDivElement>(null);
  const [disponivel, setDisponivel] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const cfg = await api.googleConfig().catch(() => null);
      if (cancelado) return;
      if (!cfg?.web) {
        setDisponivel(false);
        return;
      }
      await carregarGis();
      if (cancelado || !alvo.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: cfg.web,
        ux_mode: 'popup',
        callback: ({ credential }: { credential: string }) => entrar(credential),
      });
      window.google.accounts.id.renderButton(alvo.current, {
        theme: theme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        locale: 'pt-BR',
        width: Math.min(400, alvo.current.parentElement?.offsetWidth ?? 360),
      });
    })().catch((err: Error) => {
      if (!cancelado) setErro(err.message);
    });
    return () => {
      cancelado = true;
    };
  }, [entrar, setErro, theme]);

  if (!disponivel) return null;

  return (
    <View style={styles.bloco}>
      <div ref={alvo} style={{ display: 'flex', justifyContent: 'center', minHeight: 40 }} />
      {erro ? <Text style={[styles.aviso, { color: colors.error }]}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: {
    gap: 6,
  },
  aviso: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
