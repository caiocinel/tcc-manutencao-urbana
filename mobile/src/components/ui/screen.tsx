/** Blocos de layout reaproveitados pelas telas internas. */

import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

/** Container de tela com o fundo do tema. */
export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const colors = useColors();
  return <View style={[styles.screen, { backgroundColor: colors.bgPrimary }, style]}>{children}</View>;
}

/** Título + subtítulo no topo das telas, como no web. */
export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  const colors = useColors();
  return (
    <View style={styles.heading}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.centro}>
      <ActivityIndicator color={colors.gold500} />
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View style={styles.centro}>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

/** Cartão com borda, base visual das listas e blocos de conteúdo. */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  heading: {
    gap: Spacing[1],
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  sectionHeading: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.xs,
  },
  centro: {
    paddingVertical: Spacing[12],
    alignItems: 'center',
    gap: Spacing[2],
  },
  card: {
    borderWidth: 1,
    padding: Spacing[4],
    gap: Spacing[2],
  },
});
