/**
 * Tokens de design portados de `frontend/src/styles/tokens.css`.
 *
 * O tema escuro é AMOLED (fundo #000) com acento dourado; o claro usa a paleta
 * bege do web. Os nomes dos tokens seguem os do CSS para facilitar comparação
 * entre as duas implementações.
 */

import { Platform } from 'react-native';

const shared = {
  gold300: '#E6C762',
  gold400: '#E6C762',
  gold500: '#D4AF37',
  gold600: '#AA7C11',
  gold700: '#8B6508',
  goldMuted: 'rgba(212, 175, 55, 0.12)',
  icon: '#AF8F57',
  burgundy: '#4A0E17',
  sangria: '#6B121A',
  success: '#4CAF7D',
  warning: '#D4A017',
  error: '#CF4444',
  info: '#3B82F6',
} as const;

export const Colors = {
  dark: {
    ...shared,
    bgPrimary: '#000000',
    bgSecondary: '#0a0a0a',
    bgSurface: '#0a0a0a',
    bgElevated: '#111111',
    bgInput: '#0d0d0d',
    bgHover: '#1a1a1a',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0a0',
    textMuted: '#555555',
    textInverse: '#000000',
    borderDefault: '#1a1a1a',
    borderHover: '#2a2a2a',
    borderGold: 'rgba(212, 175, 55, 0.3)',
    borderSubtle: '#111111',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
  light: {
    ...shared,
    bgPrimary: '#F5F0E8',
    bgSecondary: '#EDE8DD',
    bgSurface: '#FFFFFF',
    bgElevated: '#F0EBE0',
    bgInput: '#FFFFFF',
    bgHover: '#E8E3D8',
    textPrimary: '#1A1A14',
    textSecondary: '#8B7A4E',
    textMuted: '#C8B890',
    textInverse: '#FFFFFF',
    borderDefault: '#D8D0C0',
    borderHover: '#C8B890',
    borderGold: '#D4A017',
    borderSubtle: '#E8E3D8',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
} as const;

export type ThemeName = keyof typeof Colors;
export type Palette = (typeof Colors)[ThemeName];

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/**
 * O web usa raio zero (estética industrial). Mantido aqui, exceto `full` para
 * elementos circulares (FAB, avatar, badge).
 */
export const Radius = {
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  full: 999,
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
  web: { sans: 'system-ui, sans-serif', mono: 'ui-monospace, monospace' },
}) as { sans: string; mono: string };

/** Altura padrão de campos de formulário e botões primários. */
export const ControlHeight = 48;
