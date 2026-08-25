/** Histórico do chamado — porte de `frontend/src/components/ui/timeline.jsx`. */

import { StyleSheet, Text, View } from 'react-native';

import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';
import type { TimelineItem } from '@/utils/timeline';

export function Timeline({ items }: { items: TimelineItem[] }) {
  const colors = useColors();
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Trilho vertical ligando os marcadores. */}
      <View style={[styles.trilho, { backgroundColor: colors.borderDefault }]} />
      {items.map((item, i) => (
        <View key={item.id} style={[styles.linha, i === items.length - 1 && styles.ultima]}>
          <View style={[styles.marcador, { backgroundColor: colors.gold500, borderColor: colors.gold500 }]}>
            <View style={styles.marcadorInterno} />
          </View>
          <View
            style={[
              styles.cartao,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
            ]}>
            <Text style={[styles.titulo, { color: colors.textPrimary }]}>{item.title}</Text>
            {item.description ? (
              <Text style={[styles.descricao, { color: colors.textSecondary }]}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.rodape}>
              {item.date ? (
                <Text style={[styles.meta, { color: colors.textMuted }]}>{item.date}</Text>
              ) : null}
              {item.meta ? (
                <Text style={[styles.meta, { color: colors.textMuted }]}>{item.meta}</Text>
              ) : null}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const MARCADOR = 20;

const styles = StyleSheet.create({
  container: {
    paddingLeft: Spacing[8],
    position: 'relative',
  },
  trilho: {
    position: 'absolute',
    left: Spacing[8] - MARCADOR / 2 - 1,
    top: Spacing[2],
    bottom: Spacing[2],
    width: 1,
  },
  linha: {
    position: 'relative',
    paddingBottom: Spacing[4],
  },
  ultima: {
    paddingBottom: 0,
  },
  marcador: {
    position: 'absolute',
    left: -(Spacing[8] - MARCADOR / 2) - MARCADOR / 2 + 1,
    top: Spacing[1],
    width: MARCADOR,
    height: MARCADOR,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcadorInterno: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: '#fff',
  },
  cartao: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[3],
    gap: Spacing[1],
  },
  titulo: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  descricao: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  rodape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  meta: {
    fontSize: FontSize.xs - 1,
  },
});
