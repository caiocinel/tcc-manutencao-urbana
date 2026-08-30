/** Linha de menu de configurações: ícone, rótulo e chevron ou valor à direita. */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontSize, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Linha menor abaixo do rótulo (ex.: "Nome, senha e sessão"). */
  detail?: string;
  /** Texto à direita no lugar do chevron (ex.: "Português (BR)"). */
  value?: string;
  onPress?: () => void;
  /** Pinta ícone e rótulo com a cor de alerta (ex.: e-mail não verificado). */
  destaque?: boolean;
};

export function MenuRow({ icon, label, detail, value, onPress, destaque }: Props) {
  const colors = useColors();
  const corTexto = destaque ? colors.gold500 : colors.textSecondary;

  const conteudo = (
    <>
      <Ionicons name={icon} size={18} color={corTexto} />
      <View style={styles.textos}>
        <Text style={[styles.label, { color: destaque ? colors.gold500 : colors.textPrimary }]}>
          {label}
        </Text>
        {detail ? (
          <Text style={[styles.detail, { color: colors.textMuted }]}>{detail}</Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[styles.value, { color: colors.textMuted }]}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.linha}>{conteudo}</View>;
  }
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.linha}>
      {conteudo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[3],
  },
  textos: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: FontSize.sm,
  },
  detail: {
    fontSize: FontSize.xs,
  },
  value: {
    fontSize: FontSize.xs,
  },
});
