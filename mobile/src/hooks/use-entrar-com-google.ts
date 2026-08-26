/**
 * Conclui o login com Google a partir do ID token, seja ele obtido pelo
 * expo-auth-session (nativo) ou pelo Google Identity Services (web).
 *
 * Na primeira vez (`novo`), leva à tela de escolher o nome de exibição.
 */

import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';

export function useEntrarComGoogle() {
  const { login } = useAuth();
  const addToast = useToast();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const entrar = useCallback(
    async (idToken: string) => {
      setCarregando(true);
      setErro('');
      try {
        const res = await api.loginGoogle(idToken);
        await login(res);
        addToast(res.novo ? 'Conta criada com o Google!' : 'Login realizado com sucesso!');
        router.replace(res.novo ? '/escolher-nome' : '/(tabs)/mapa');
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao entrar com o Google.');
      } finally {
        setCarregando(false);
      }
    },
    [login, addToast],
  );

  return { entrar, carregando, erro, setErro };
}
