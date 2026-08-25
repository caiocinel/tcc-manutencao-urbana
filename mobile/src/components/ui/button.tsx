/** Botão — porte de `frontend/src/components/ui/button.jsx`. */

import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** Ocupa toda a largura disponível. */
  block?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const HEIGHTS: Record<ButtonSize, number> = { xs: 28, sm: 36, md: 48 };
const PADDINGS: Record<ButtonSize, number> = { xs: Spacing[2], sm: Spacing[3], md: Spacing[6] };
const FONT_SIZES: Record<ButtonSize, number> = {
  xs: FontSize.xs,
  sm: FontSize.xs,
  md: FontSize.sm,
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  block,
  icon,
  style,
  accessibilityLabel,
}: Props) {
  const colors = useColors();
  const inativo = disabled || loading;

  const paleta: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.gold500, fg: colors.textInverse, border: colors.gold500 },
    secondary: { bg: 'transparent', fg: colors.textPrimary, border: colors.borderDefault },
    danger: { bg: 'rgba(207,68,68,0.12)', fg: colors.error, border: colors.error },
    ghost: { bg: 'transparent', fg: colors.textSecondary, border: 'transparent' },
  };
  const { bg, fg, border } = paleta[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!inativo, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          paddingHorizontal: PADDINGS[size],
          backgroundColor: bg,
          borderColor: border,
          opacity: inativo ? 0.5 : pressed ? 0.8 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.conteudo}>
          {icon}
          <Text style={[styles.label, { color: fg, fontSize: FONT_SIZES[size] }]}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  label: {
    fontWeight: FontWeight.semibold,
  },
});
