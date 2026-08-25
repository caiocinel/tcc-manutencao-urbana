/** Cabeçalho do app — porte do `AppHeader` de `frontend/src/App.jsx`. */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SyncIndicator } from '@/components/sync-indicator';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

const LOGO = require('@/assets/images/icon.png');

type Props = {
  /** Mensagem que substitui os controles (ex.: instrução ao posicionar o pino). */
  hint?: string;
};

export function AppHeader({ hint }: Props) {
  const { theme, colors, toggle } = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.bgElevated, borderBottomColor: colors.borderDefault },
      ]}>
      <View style={styles.marca}>
        <View style={[styles.logoCaixa, { borderColor: colors.icon }]}>
          <Image source={LOGO} style={styles.logo} contentFit="cover" />
        </View>
        <View style={styles.marcaTexto}>
          <Text style={[styles.titulo, { color: colors.textPrimary }]} numberOfLines={1}>
            Central de Inteligência Urbana
          </Text>
          <Text style={[styles.subtitulo, { color: colors.textMuted }]} numberOfLines={1}>
            Chamados para Serviços Públicos
          </Text>
        </View>
      </View>

      {hint ? (
        <Text style={[styles.hint, { color: colors.gold500 }]} numberOfLines={2}>
          {hint}
        </Text>
      ) : (
        <View style={styles.acoes}>
          <SyncIndicator />
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            hitSlop={8}
            style={styles.botaoIcone}>
            <Ionicons
              name={theme === 'dark' ? 'sunny' : 'moon'}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
          {!isAuthenticated ? (
            <Pressable
              onPress={() => router.push('/login')}
              accessibilityRole="button"
              style={[styles.entrar, { borderColor: colors.borderDefault }]}>
              <Text style={[styles.entrarTexto, { color: colors.textSecondary }]}>Entrar</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[3],
    height: 56,
    paddingHorizontal: Spacing[4],
    borderBottomWidth: 1,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flexShrink: 1,
  },
  logoCaixa: {
    width: 28,
    height: 28,
    borderWidth: 1,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  marcaTexto: {
    flexShrink: 1,
  },
  titulo: {
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.medium,
  },
  subtitulo: {
    fontSize: FontSize.xs - 2,
  },
  hint: {
    flex: 1,
    textAlign: 'right',
    fontSize: FontSize.xs,
  },
  acoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  botaoIcone: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  entrar: {
    height: 32,
    paddingHorizontal: Spacing[3],
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrarTexto: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
