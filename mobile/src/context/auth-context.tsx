/**
 * Autenticação — porte de `frontend/src/context/AuthContext.jsx`.
 *
 * Diferenças em relação ao web:
 * - a sessão é hidratada de forma assíncrona do SecureStore no boot;
 * - não há inscrição em Web Push (VAPID é uma API de navegador). Notificações
 *   nativas exigiriam FCM/APNs no backend — ver README.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, setUnauthorizedHandler } from '@/services/api';
import {
  clearSession,
  getStoredUser,
  hydrateSession,
  mergeStoredUser,
  setDemoMode,
  setRefresh,
  setStoredUser,
  setToken,
} from '@/services/storage';
import type { AuthResponse, Municipio, User } from '@/types';
import { decodeJwt } from '@/utils/jwt';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  isDemoMode: boolean;
  login: (response: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  enterDemoMode: () => Promise<void>;
  exitDemoMode: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const decodeToken = decodeJwt;

/** O município precisa do polígono e do bounding box para desenhar o mapa. */
function precisaCarregarMunicipio(user: User) {
  if (!user.municipio_id) return false;
  const m = user.municipio;
  return (
    !m ||
    !m.poligono_json ||
    typeof m.min_lat !== 'number' ||
    typeof m.max_lat !== 'number' ||
    typeof m.min_lng !== 'number' ||
    typeof m.max_lng !== 'number'
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const logout = useCallback(async () => {
    setTokenState(null);
    setUser(null);
    setIsDemoMode(false);
    await clearSession();
  }, []);

  // Derruba a sessão quando o refresh token também expira.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const carregarMunicipio = useCallback(async (municipioId: string) => {
    try {
      const mun = await api.getMunicipio(municipioId);
      // O endpoint devolve GeoJSON Feature; achatamos como o web faz.
      const flat = { ...mun.properties, id: mun.id } as Municipio;
      setUser((prev) => (prev ? { ...prev, municipio: flat } : prev));
      await mergeStoredUser({ municipio: flat });
    } catch {
      // Sem o polígono o mapa apenas não desenha o perímetro.
    }
  }, []);

  /** Monta o usuário a partir do token + dados salvos e busca o município se faltar. */
  const aplicarSessao = useCallback(
    async (accessToken: string) => {
      const payload = decodeToken(accessToken);
      if (!payload) {
        await logout();
        return;
      }
      const stored = (await getStoredUser()) ?? {};
      const base: User = {
        id: stored.id ?? payload.user_id ?? '',
        email: stored.email ?? payload.email ?? '',
        nome: stored.nome ?? '',
        cpf: stored.cpf ?? null,
        admin: stored.admin ?? false,
        super_admin: stored.super_admin ?? false,
        municipio_id: stored.municipio_id ?? null,
        municipio: stored.municipio ?? null,
        email_verificado: stored.email_verificado ?? stored.email_verified ?? false,
      };
      setUser(base);
      if (precisaCarregarMunicipio(base)) await carregarMunicipio(base.municipio_id!);
    },
    [carregarMunicipio, logout],
  );

  // Boot: lê SecureStore e reconstrói a sessão.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const session = await hydrateSession();
      if (cancelado) return;
      setIsDemoMode(session.demoMode);
      if (session.token) {
        setTokenState(session.token);
        await aplicarSessao(session.token);
      }
      if (!cancelado) setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [aplicarSessao]);

  const login = useCallback(
    async (response: AuthResponse) => {
      const { access, refresh, user: userData } = response;
      await setToken(access);
      if (refresh) await setRefresh(refresh);
      if (userData) await setStoredUser(userData);
      setTokenState(access);
      if (userData) {
        const normalizado: User = {
          ...userData,
          email_verificado: userData.email_verificado ?? userData.email_verified ?? false,
        };
        setUser(normalizado);
        if (precisaCarregarMunicipio(normalizado)) {
          await carregarMunicipio(normalizado.municipio_id!);
        }
      } else {
        await aplicarSessao(access);
      }
    },
    [aplicarSessao, carregarMunicipio],
  );

  const updateUser = useCallback(async (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    await mergeStoredUser(updates);
  }, []);

  const enterDemoMode = useCallback(async () => {
    const res = await api.loginDemo();
    await setDemoMode(true);
    setIsDemoMode(true);
    await login(res);
  }, [login]);

  const exitDemoMode = useCallback(async () => {
    await logout();
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!token,
      loading,
      isDemoMode,
      login,
      logout,
      updateUser,
      enterDemoMode,
      exitDemoMode,
    }),
    [user, token, loading, isDemoMode, login, logout, updateUser, enterDemoMode, exitDemoMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
