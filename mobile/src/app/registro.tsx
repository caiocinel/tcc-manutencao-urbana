/**
 * Cadastro — porte de `frontend/src/pages/Register.jsx`.
 *
 * Só nome, e-mail e senha: CPF e município são opcionais no backend e podem
 * ser preenchidos depois na aba Conta.
 */

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

export default function RegistroScreen() {
  const colors = useColors();
  const addToast = useToast();
  const { login } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const senhasDiferem = !!confirmarSenha && senha !== confirmarSenha;

  async function handleSubmit() {
    setError('');
    if (!nome || !email || !senha || !confirmarSenha) {
      setError('Preencha todos os campos.');
      return;
    }
    if (senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setError('Senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register(nome.trim(), email.trim(), senha);
      await login(res);
      addToast('Conta criada com sucesso!');
      router.replace('/(tabs)/mapa');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View
          style={[styles.cartao, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
          <View style={styles.marca}>
            <View style={[styles.logoCaixa, { borderColor: colors.icon }]}>
              <Image source={LOGO} style={styles.logo} contentFit="cover" />
            </View>
            <Text style={[styles.titulo, { color: colors.textPrimary }]}>Criar Conta</Text>
            <Text style={[styles.subtitulo, { color: colors.textMuted }]}>
              Central de Inteligência Urbana
            </Text>
          </View>

          <TextField
            label="Nome completo"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome completo"
            autoComplete="name"
          />

          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextField
            label="Senha"
            value={senha}
            onChangeText={setSenha}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            autoComplete="new-password"
          />

          <TextField
            label="Confirmar senha"
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            placeholder="Repita a senha"
            secureTextEntry
            invalid={senhasDiferem}
            hint={senhasDiferem ? 'As senhas não conferem.' : undefined}
          />

          {error ? <Text style={[styles.erro, { color: colors.error }]}>{error}</Text> : null}

          <Button block onPress={handleSubmit} loading={loading}>
            Cadastrar
          </Button>

          <GoogleButton />

          <Link href="/login" asChild>
            <Pressable accessibilityRole="link" style={styles.rodape}>
              <Text style={[styles.link, { color: colors.textSecondary }]}>
                Já tem conta? Faça login
              </Text>
            </Pressable>
          </Link>
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
    gap: Spacing[3],
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
  },
  subtitulo: {
    fontSize: FontSize.sm,
  },
  erro: {
    fontSize: FontSize.xs,
  },
  rodape: {
    alignItems: 'center',
    marginTop: Spacing[2],
  },
  link: {
    fontSize: FontSize.sm,
  },
});
