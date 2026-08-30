/**
 * Fluxo único de entrada: um campo de e-mail e os meios de login embaixo
 * (hoje, só Google). Ao continuar, o backend diz se o e-mail já tem conta —
 * se tiver, pede a senha; se não tiver, vira cadastro ali mesmo. Nada de
 * telas separadas de "Entrar" × "Criar conta".
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleButton } from '@/components/google-button';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontSize, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';

type Etapa = 'email' | 'senha' | 'cadastro';

export function AuthFlow() {
  const colors = useColors();
  const addToast = useToast();
  const { login } = useAuth();

  const [etapa, setEtapa] = useState<Etapa>('email');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const senhasDiferem = !!confirmarSenha && senha !== confirmarSenha;

  function trocarEmail() {
    setEtapa('email');
    setSenha('');
    setNome('');
    setConfirmarSenha('');
    setError('');
  }

  async function continuar() {
    setError('');
    const limpo = email.trim();
    if (!limpo || !limpo.includes('@')) {
      setError('Digite um e-mail válido.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.emailExiste(limpo);
      setEtapa(res.existe ? 'senha' : 'cadastro');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar o e-mail.');
    } finally {
      setLoading(false);
    }
  }

  async function entrar() {
    setError('');
    if (!senha) {
      setError('Digite sua senha.');
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

  async function cadastrar() {
    setError('');
    if (!nome.trim()) {
      setError('Digite seu nome.');
      return;
    }
    if (senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setError('As senhas não conferem.');
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

  const emailFixo = (
    <Pressable
      onPress={trocarEmail}
      accessibilityRole="button"
      accessibilityLabel="Usar outro e-mail"
      style={[styles.emailFixo, { borderColor: colors.borderDefault }]}>
      <Text style={[styles.emailFixoTexto, { color: colors.textSecondary }]} numberOfLines={1}>
        {email.trim()}
      </Text>
      <Ionicons name="pencil" size={14} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {etapa === 'email' ? (
        <>
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            invalid={!!error}
            onSubmitEditing={continuar}
            returnKeyType="go"
          />
          {error ? <Text style={[styles.erro, { color: colors.error }]}>{error}</Text> : null}
          <Button block onPress={continuar} loading={loading}>
            Continuar
          </Button>

          <View style={styles.divisor}>
            <View style={[styles.divisorLinha, { backgroundColor: colors.borderDefault }]} />
            <Text style={[styles.divisorTexto, { color: colors.textMuted }]}>ou</Text>
            <View style={[styles.divisorLinha, { backgroundColor: colors.borderDefault }]} />
          </View>
          <GoogleButton />
        </>
      ) : null}

      {etapa === 'senha' ? (
        <>
          {emailFixo}
          <TextField
            label="Senha"
            value={senha}
            onChangeText={setSenha}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
            autoFocus
            invalid={!!error}
            onSubmitEditing={entrar}
            returnKeyType="go"
          />
          {error ? <Text style={[styles.erro, { color: colors.error }]}>{error}</Text> : null}
          <Button block onPress={entrar} loading={loading}>
            Entrar
          </Button>
          <Pressable
            accessibilityRole="button"
            onPress={() => addToast('Função em desenvolvimento.', 'info')}
            style={styles.rodape}>
            <Text style={[styles.link, { color: colors.textMuted }]}>Esqueci minha senha</Text>
          </Pressable>
        </>
      ) : null}

      {etapa === 'cadastro' ? (
        <>
          {emailFixo}
          <Text style={[styles.aviso, { color: colors.textMuted }]}>
            Você é novo por aqui — complete para criar sua conta.
          </Text>
          <TextField
            label="Nome completo"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome completo"
            autoComplete="name"
            autoFocus
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
            onSubmitEditing={cadastrar}
            returnKeyType="go"
          />
          {error ? <Text style={[styles.erro, { color: colors.error }]}>{error}</Text> : null}
          <Button block onPress={cadastrar} loading={loading}>
            Criar conta
          </Button>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing[3],
  },
  erro: {
    fontSize: FontSize.xs,
  },
  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  divisorLinha: {
    flex: 1,
    height: 1,
  },
  divisorTexto: {
    fontSize: FontSize.xs,
  },
  emailFixo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
    borderWidth: 1,
    paddingHorizontal: Spacing[3],
    height: 40,
  },
  emailFixoTexto: {
    fontSize: FontSize.sm,
    flexShrink: 1,
  },
  aviso: {
    fontSize: FontSize.xs,
  },
  rodape: {
    alignItems: 'center',
    marginTop: Spacing[1],
  },
  link: {
    fontSize: FontSize.sm,
  },
});
