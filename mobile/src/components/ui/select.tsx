/** Seleção simples em modal — equivale ao `<select>` do web. */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ControlHeight, FontSize, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

export type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value?: string | null;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  /** Título mostrado no topo da lista. */
  title?: string;
};

export function Select({ options, value, onChange, label, placeholder = 'Selecione...', title }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selecionado = options.find((o) => o.value === value);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityValue={{ text: selecionado?.label ?? 'nenhum' }}
        style={[styles.gatilho, { backgroundColor: colors.bgInput, borderColor: colors.borderDefault }]}>
        <Text
          numberOfLines={1}
          style={[styles.texto, { color: selecionado ? colors.textPrimary : colors.textMuted }]}>
          {selecionado?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setOpen(false)}>
          <View
            style={[
              styles.painel,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.borderDefault,
                paddingBottom: insets.bottom,
              },
            ]}>
            {title ? (
              <Text style={[styles.titulo, { color: colors.textPrimary }]}>{title}</Text>
            ) : null}
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.item,
                    pressed && { backgroundColor: colors.bgHover },
                  ]}>
                  <Text style={[styles.itemTexto, { color: colors.textSecondary }]}>
                    {item.label}
                  </Text>
                  {item.value === value ? (
                    <Ionicons name="checkmark" size={16} color={colors.gold500} />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing[1],
  },
  label: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  gatilho: {
    height: ControlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  texto: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  painel: {
    maxHeight: '70%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  titulo: {
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  itemTexto: {
    fontSize: FontSize.sm,
  },
});
