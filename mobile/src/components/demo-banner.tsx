/** Faixa do modo demonstração — porte de `frontend/src/components/ui/DemoBanner.jsx`. */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export function DemoBanner() {
  const { isDemoMode, exitDemoMode } = useAuth();

  if (!isDemoMode) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.titulo}>Modo Demonstração</Text>
      <Text style={styles.subtitulo}>Dados resetados diariamente</Text>
      <Pressable
        onPress={exitDemoMode}
        accessibilityRole="button"
        accessibilityLabel="Sair do modo demonstração"
        hitSlop={8}
        style={styles.fechar}>
        <Ionicons name="close" size={14} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.dark.gold500,
  },
  titulo: {
    color: '#000',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subtitulo: {
    color: 'rgba(0,0,0,0.7)',
    fontSize: FontSize.xs,
  },
  fechar: {
    padding: Spacing[1],
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
});
