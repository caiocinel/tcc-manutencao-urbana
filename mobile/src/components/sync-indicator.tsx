/** Indicador de fila offline — porte de `frontend/src/components/ui/sync-indicator.jsx`. */

import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';
import { useOfflineSync } from '@/hooks/use-offline-sync';

export function SyncIndicator() {
  const colors = useColors();
  const { pendentes, online, sincronizando } = useOfflineSync();

  if (online && pendentes === 0) return null;

  const offline = !online;
  const texto = offline ? 'Offline' : `${pendentes} pendente${pendentes === 1 ? '' : 's'}`;
  const fg = offline ? colors.error : colors.gold500;
  const bg = offline ? 'rgba(107,18,26,0.5)' : colors.goldMuted;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={
        offline
          ? 'Sem conexão. Chamados salvos localmente.'
          : 'Chamados aguardando sincronização'
      }
      style={[styles.badge, { backgroundColor: bg, borderColor: fg }]}>
      {sincronizando ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Ionicons name={offline ? 'cloud-offline' : 'cloud-upload'} size={12} color={fg} />
      )}
      <Text style={[styles.texto, { color: fg }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1] + 2,
    height: 26,
    paddingHorizontal: Spacing[2] + 2,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  texto: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.semibold,
  },
});
