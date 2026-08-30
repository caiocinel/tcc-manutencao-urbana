/**
 * Recepção da primeira entrada: três passos contando para que o app serve e
 * como ele funciona, sem jargão — só para a pessoa não cair no mapa perdida.
 * Mostrada uma única vez (flag local); "Pular" está sempre à mão.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';
import { setOnboardingVisto } from '@/services/storage';

const LOGO = require('@/assets/images/icon.png');

const PASSOS: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  texto: string;
}[] = [
  {
    icone: 'map',
    titulo: 'A sua cidade, num mapa',
    texto:
      'Buraco na rua, poste apagado, entulho na calçada? Aqui você vê o que já foi reportado perto de você — e o que a prefeitura está fazendo a respeito.',
  },
  {
    icone: 'camera',
    titulo: 'Viu um problema? Reporte',
    texto:
      'Toque em Reportar, tire uma foto na hora e pronto: o chamado vai direto para a equipe responsável, no ponto exato onde você está.',
  },
  {
    icone: 'checkmark-done-circle',
    titulo: 'Acompanhe até resolver',
    texto:
      'Vizinhos podem apoiar e confirmar o problema, e você acompanha tudo em "Meus chamados" — do aberto ao resolvido.',
  },
];

export default function BoasVindasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [passo, setPasso] = useState(0);

  const ultimo = passo === PASSOS.length - 1;
  const atual = PASSOS[passo];

  async function concluir() {
    await setOnboardingVisto();
    router.replace('/(tabs)/mapa');
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgPrimary,
          paddingTop: insets.top + Spacing[4],
          paddingBottom: insets.bottom + Spacing[6],
        },
      ]}>
      <View style={styles.topo}>
        <View style={styles.marca}>
          <View style={[styles.logoCaixa, { borderColor: colors.gold500 }]}>
            <Image source={LOGO} style={styles.logo} contentFit="cover" />
          </View>
          <Text style={[styles.marcaNome, { color: colors.textMuted }]}>
            Central de Inteligência Urbana
          </Text>
        </View>
        <Pressable onPress={concluir} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.pular, { color: colors.textMuted }]}>Pular</Text>
        </Pressable>
      </View>

      <View style={styles.conteudo}>
        <View style={[styles.iconeCaixa, { backgroundColor: colors.goldMuted }]}>
          <Ionicons name={atual.icone} size={44} color={colors.gold500} />
        </View>
        <Text style={[styles.titulo, { color: colors.textPrimary }]}>{atual.titulo}</Text>
        <Text style={[styles.texto, { color: colors.textSecondary }]}>{atual.texto}</Text>
      </View>

      <View style={styles.rodape}>
        <View style={styles.pontos}>
          {PASSOS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.ponto,
                {
                  backgroundColor: i === passo ? colors.gold500 : colors.borderDefault,
                  width: i === passo ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>
        <Button block onPress={ultimo ? concluir : () => setPasso((p) => p + 1)}>
          {ultimo ? 'Começar' : 'Avançar'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing[6],
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  logoCaixa: {
    width: 24,
    height: 24,
    borderWidth: 1,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  marcaNome: {
    fontSize: FontSize.xs,
  },
  pular: {
    fontSize: FontSize.sm,
    padding: Spacing[2],
  },
  conteudo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
  },
  iconeCaixa: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  titulo: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  texto: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
  },
  rodape: {
    gap: Spacing[5],
    alignItems: 'center',
  },
  pontos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  ponto: {
    height: 6,
    borderRadius: Radius.full,
  },
});
