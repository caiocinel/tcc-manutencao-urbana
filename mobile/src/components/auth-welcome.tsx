/**
 * Boas-vindas de quem ainda não entrou — usada tanto na rota `/login` quanto
 * na aba Conta deslogada, para o momento de entrada ser um só.
 *
 * Composição vertical centralizada, com a marca em destaque (brasão + nome) e
 * o fluxo único de e-mail logo abaixo. Sem preferências, sem menu, sem nada
 * técnico: a única decisão aqui é entrar.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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

import { AuthFlow } from '@/components/auth-flow';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

const LOGO = require('@/assets/images/icon.png');

export function AuthWelcome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  function voltar() {
    // Da rota /login dá para voltar na pilha; na aba Conta não há pilha —
    // volta para o mapa, a tela neutra de quem não quer entrar agora.
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/mapa');
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable
        onPress={voltar}
        accessibilityRole="button"
        accessibilityLabel="Voltar sem entrar"
        hitSlop={8}
        style={[styles.voltar, { top: insets.top + Spacing[3] }]}>
        <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
      </Pressable>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing[6], paddingBottom: insets.bottom + Spacing[8] },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.marca}>
          <View style={[styles.logoCaixa, { borderColor: colors.gold500 }]}>
            <Image source={LOGO} style={styles.logo} contentFit="cover" />
          </View>
          <Text style={[styles.titulo, { color: colors.textPrimary }]}>
            Central de Inteligência{'\n'}Urbana
          </Text>
          <View style={[styles.filete, { backgroundColor: colors.gold500 }]} />
          <Text style={[styles.subtitulo, { color: colors.textMuted }]}>
            Chamados para Serviços Públicos
          </Text>
        </View>

        <View
          style={[
            styles.cartao,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderGold },
          ]}>
          <AuthFlow />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  voltar: {
    position: 'absolute',
    left: Spacing[4],
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing[5],
    gap: Spacing[8],
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  marca: {
    alignItems: 'center',
    gap: Spacing[3],
  },
  logoCaixa: {
    width: 72,
    height: 72,
    borderWidth: 1,
    marginBottom: Spacing[2],
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  titulo: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    lineHeight: FontSize.xl * 1.25,
  },
  filete: {
    width: 32,
    height: 2,
  },
  subtitulo: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  cartao: {
    borderWidth: 1,
    padding: Spacing[6],
  },
});
