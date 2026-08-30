/** Único passo depois do login com Google: como a pessoa quer ser chamada. */

import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';

export default function EscolherNomeScreen() {
  const colors = useColors();
  const addToast = useToast();
  const { user, updateUser } = useAuth();

  const [nome, setNome] = useState(user?.nome ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const limpo = nome.trim();
    if (limpo.length < 2) {
      setError('Informe um nome com pelo menos 2 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.updateProfile({ nome: limpo });
      await updateUser({ nome: limpo });
      addToast('Tudo pronto!');
      router.replace('/(tabs)/mapa');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar o nome.');
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
          style={[
            styles.cartao,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
          ]}>
          <Text style={[styles.titulo, { color: colors.textPrimary }]}>Como quer ser chamado?</Text>
          <Text style={[styles.subtitulo, { color: colors.textMuted }]}>
            Esse nome aparece nos seus chamados. Você pode mudar depois na aba Conta.
          </Text>

          <TextField
            label="Nome"
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome"
            autoFocus
            maxLength={80}
            invalid={!!error}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
          />

          {error ? <Text style={[styles.erro, { color: colors.error }]}>{error}</Text> : null}

          <Button block onPress={handleSubmit} loading={loading}>
            Continuar
          </Button>
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
  titulo: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  subtitulo: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  erro: {
    fontSize: FontSize.xs,
  },
});
