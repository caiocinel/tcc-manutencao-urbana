/**
 * "Continuar com Google" — implementação nativa (expo-auth-session).
 *
 * No web o Metro resolve `google-button.web.tsx` (Google Identity Services).
 *
 * Os client IDs vêm do backend (GET /auth/google/). Android e iOS exigem os
 * IDs específicos da plataforma, que só funcionam num development build (o
 * Expo Go não tem o pacote/assinatura do app) — enquanto não existirem, o
 * botão aparece desabilitado com a explicação.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontSize } from '@/constants/theme';
import { useColors } from '@/context/theme-context';
import { useEntrarComGoogle } from '@/hooks/use-entrar-com-google';
import { api, type GoogleConfig } from '@/services/api';

WebBrowser.maybeCompleteAuthSession();

export function GoogleButton() {
  const [cfg, setCfg] = useState<GoogleConfig | null | undefined>(undefined);

  useEffect(() => {
    let cancelado = false;
    api
      .googleConfig()
      .then((c) => {
        if (!cancelado) setCfg(c);
      })
      .catch(() => {
        if (!cancelado) setCfg(null);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Sem Google configurado no backend, o botão nem aparece.
  if (!cfg?.web) return null;
  return <BotaoNativo cfg={cfg} />;
}

function BotaoNativo({ cfg }: { cfg: GoogleConfig }) {
  const colors = useColors();
  const { entrar, carregando, erro, setErro } = useEntrarComGoogle();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: cfg.web,
    androidClientId: cfg.android || undefined,
    iosClientId: cfg.ios || undefined,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.params.id_token) {
      entrar(response.params.id_token);
    } else if (response.type === 'error') {
      setErro(response.error?.message ?? 'Erro ao entrar com o Google.');
    }
  }, [response, entrar, setErro]);

  const idDaPlataforma =
    Platform.OS === 'android' ? cfg.android : Platform.OS === 'ios' ? cfg.ios : cfg.web;

  return (
    <View style={styles.bloco}>
      <Button
        block
        variant="secondary"
        onPress={() => promptAsync()}
        disabled={!request || !idDaPlataforma}
        loading={carregando}
        icon={<Ionicons name="logo-google" size={16} color={colors.textPrimary} />}>
        Continuar com Google
      </Button>
      {!idDaPlataforma ? (
        <Text style={[styles.aviso, { color: colors.textMuted }]}>
          Login com Google no {Platform.OS === 'ios' ? 'iOS' : 'Android'} disponível no build
          nativo (client ID da plataforma ainda não configurado).
        </Text>
      ) : null}
      {erro ? <Text style={[styles.aviso, { color: colors.error }]}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: {
    gap: 6,
  },
  aviso: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
