/** Tela de login — porte de `frontend/src/pages/Login.jsx`. */

import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GoogleButton } from '@/components/google-button';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';

const LOGO = require('@/assets/images/icon.png');

export default function LoginScreen() {
  const colors = useColors();
  const addToast = useToast();
  const { login, enterDemoMode } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!email || !senha) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.login(email.trim(), senha);
      await login(res);
      addToast('Login realizado com sucesso!');
      router.replace('/(tabs)/mapa');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setError('');
    setDemoLoading(true);
    try {
      await enterDemoMode();
      addToast('Modo demonstração ativado.');
      router.replace('/(tabs)/mapa');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar no modo demo.');
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.cartao, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
          <View style={styles.marca}>
            <View style={[styles.logoCaixa, { borderColor: colors.icon }]}>
              <Image source={LOGO} style={styles.logo} contentFit="cover" />
            </View>
            <Text style={[styles.titulo, { color: colors.textPrimary }]}>
              Central de Inteligência Urbana
            </Text>
            <Text style={[styles.subtitulo, { color: colors.textMuted }]}>
              Chamados para Serviços Públicos
            </Text>
          </View>

          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            invalid={!!error}
          />

          <TextField
            label="Senha"
            value={senha}
            onChangeText={setSenha}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
            invalid={!!error}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />

          {error ? <Text style={[styles.erro, { color: colors.error }]}>{error}</Text> : null}

          <Button block onPress={handleSubmit} loading={loading}>
            Entrar
          </Button>

          <GoogleButton />

          <Button block variant="secondary" onPress={handleDemo} loading={demoLoading}>
            Entrar no modo demonstração
          </Button>

          <View style={styles.rodape}>
            <Link href="/registro" asChild>
              <Pressable accessibilityRole="link">
                <Text style={[styles.link, { color: colors.textSecondary }]}>
                  Não tem conta? Cadastre-se
                </Text>
              </Pressable>
            </Link>
            <Pressable
              accessibilityRole="button"
              onPress={() => addToast('Função em desenvolvimento.', 'info')}>
              <Text style={[styles.link, { color: colors.textMuted }]}>Esqueci minha senha</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing[4],
  },
  cartao: {
    borderWidth: 1,
    padding: Spacing[6],
    gap: Spacing[4],
  },
  marca: {
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  logoCaixa: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  titulo: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: FontSize.sm,
  },
  erro: {
    fontSize: FontSize.xs,
  },
  rodape: {
    gap: Spacing[3],
    alignItems: 'center',
    marginTop: Spacing[2],
  },
  link: {
    fontSize: FontSize.sm,
  },
});
