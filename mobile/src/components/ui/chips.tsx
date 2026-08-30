/** Filtros em pílula, equivalentes aos botões de filtro da lista do web. */

import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

export type ChipOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Rótulo do grupo para leitores de tela. */
  accessibilityLabel?: string;
};

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.container}>
      {options.map((option) => {
        const ativo = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            style={[
              styles.chip,
              {
                backgroundColor: ativo ? colors.gold500 : 'transparent',
                borderColor: ativo ? colors.gold500 : colors.borderDefault,
              },
            ]}>
            <Text
              style={[
                styles.label,
                { color: ativo ? colors.textInverse : colors.textPrimary },
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing[1],
    paddingHorizontal: Spacing[4],
  },
  chip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
