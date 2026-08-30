/**
 * Tema claro/escuro — porte de `frontend/src/context/ThemeContext.jsx`.
 * Segue a preferência do sistema até o usuário escolher manualmente; a escolha
 * fica no AsyncStorage.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, type Palette, type ThemeName } from '@/constants/theme';
import { getStoredTheme, setStoredTheme } from '@/services/storage';

type ThemeContextValue = {
  theme: ThemeName;
  colors: Palette;
  toggle: () => void;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ThemeName | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    getStoredTheme()
      .then((stored) => setOverride(stored))
      .finally(() => setHydrated(true));
  }, []);

  const theme: ThemeName = override ?? (systemScheme === 'light' ? 'light' : 'dark');

  const setTheme = useCallback((next: ThemeName) => {
    setOverride(next);
    setStoredTheme(next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, colors: Colors[theme], toggle, setTheme }),
    [theme, toggle, setTheme],
  );

  // Evita o flash de tema errado enquanto a preferência salva é lida.
  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return ctx;
}

/** Atalho para quem só precisa das cores. */
export function useColors() {
  return useTheme().colors;
}
