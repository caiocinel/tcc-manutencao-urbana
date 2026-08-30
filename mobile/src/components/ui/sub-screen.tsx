/**
 * Casca das telas de ajustes (submenus da aba Conta): seta de voltar, título
 * e conteúdo rolável com teclado tratado.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

type Props = {
  title: string;
  /** Para onde ir quando não há pilha para voltar (ex.: URL aberta direto). */
  fallback?: '/(tabs)/mapa' | '/(tabs)/conta';
  children: React.ReactNode;
};

export function SubScreen({ title, fallback = '/(tabs)/mapa', children }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.cabecalho, { paddingTop: insets.top + Spacing[2] }]}>
        <Pressable
          onPress={voltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          style={styles.voltar}>
          <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={[styles.titulo, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing[16] }]}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingBottom: Spacing[2],
  },
  voltar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  scroll: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
});
