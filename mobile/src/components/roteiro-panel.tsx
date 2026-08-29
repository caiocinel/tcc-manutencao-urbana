/**
 * Painel do roteiro ativo (aba Operação): próxima parada em destaque, com
 * navegação externa (Google Maps / Waze), e a lista das paradas restantes.
 * O avanço é automático quando a parada atual é finalizada; "Pular" resolve
 * o caso de não conseguir atender agora.
 */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';
import type { Defeito } from '@/types';
import { formatarDistancia } from '@/utils/geo';
import { navegarGoogleMaps, navegarWaze } from '@/utils/navegacao';

export type Roteiro = {
  paradas: Defeito[];
  /** Índice da parada atual em `paradas`. */
  atual: number;
  /** IDs já atendidos ou pulados. */
  concluidas: Set<number>;
  distanciaM: number;
  duracaoS: number | null;
  /** De onde veio o traçado: ruas (OSRM) ou linha reta (fallback). */
  fonte: 'ruas' | 'reta';
};

type Props = {
  roteiro: Roteiro;
  icones: Map<string, string>;
  /** Posição do operador, origem da navegação externa. */
  origem: { latitude: number; longitude: number } | null;
  onAbrir: (defeito: Defeito) => void;
  onPular: () => void;
  onFechar: () => void;
};

function formatarDuracao(segundos: number | null) {
  if (segundos == null) return null;
  const min = Math.round(segundos / 60);
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  return `~${h}h${String(min % 60).padStart(2, '0')}`;
}

function nomeCategoria(d: Defeito) {
  return d.categoria_nome ?? d.categoria ?? d.titulo;
}

export function RoteiroPanel({ roteiro, icones, origem, onAbrir, onPular, onFechar }: Props) {
  const colors = useColors();
  const { paradas, atual, concluidas } = roteiro;
  const proxima = paradas[atual];
  const feitas = concluidas.size;
  const restantes = paradas.filter((p, i) => i > atual && !concluidas.has(p.id));
  const duracao = formatarDuracao(roteiro.duracaoS);

  return (
    <View
      style={[styles.painel, { backgroundColor: colors.bgSurface, borderColor: colors.gold500 }]}
      accessibilityLabel="Roteiro de atendimento">
      <View style={styles.cabecalho}>
        <Ionicons name="navigate" size={16} color={colors.gold500} />
        <View style={styles.titulos}>
          <Text style={[styles.titulo, { color: colors.textPrimary }]}>
            Roteiro · {feitas}/{paradas.length}
          </Text>
          <Text style={[styles.subtitulo, { color: colors.textMuted }]}>
            {formatarDistancia(roteiro.distanciaM)}
            {duracao ? ` · ${duracao}` : ''}
            {roteiro.fonte === 'ruas' ? ' · por ruas' : ' · em linha reta'}
          </Text>
        </View>
        <Pressable
          onPress={onFechar}
          accessibilityRole="button"
          accessibilityLabel="Encerrar roteiro"
          hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {proxima ? (
        <View style={[styles.atual, { backgroundColor: colors.bgElevated }]}>
          <View style={styles.atualLinha}>
            <View style={[styles.numero, { backgroundColor: colors.gold500 }]}>
              <Text style={[styles.numeroTexto, { color: colors.textInverse }]}>{atual + 1}</Text>
            </View>
            <Text style={styles.icone}>{icones.get(nomeCategoria(proxima)) ?? '📋'}</Text>
            <Pressable style={styles.atualTexto} onPress={() => onAbrir(proxima)}>
              <Text style={[styles.atualTitulo, { color: colors.textPrimary }]} numberOfLines={1}>
                {nomeCategoria(proxima)}
              </Text>
              <Text style={[styles.atualMeta, { color: colors.textMuted }]} numberOfLines={1}>
                {[proxima.rua, proxima.bairro].filter(Boolean).join(' · ') || 'Sem endereço'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.acoes}>
            <Button
              size="sm"
              onPress={() => navegarGoogleMaps(proxima, origem)}
              icon={<Ionicons name="navigate" size={14} color={colors.textInverse} />}>
              Navegar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => navegarWaze(proxima)}
              icon={<Ionicons name="car" size={14} color={colors.textPrimary} />}>
              Waze
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => onAbrir(proxima)}
              icon={<Ionicons name="open-outline" size={14} color={colors.textPrimary} />}>
              Abrir
            </Button>
            <Button size="sm" variant="ghost" onPress={onPular}>
              Pular
            </Button>
          </View>
        </View>
      ) : (
        <View style={[styles.atual, { backgroundColor: colors.bgElevated }]}>
          <Text style={[styles.atualTitulo, { color: colors.textPrimary }]}>
            Roteiro concluído 🎉
          </Text>
          <Text style={[styles.atualMeta, { color: colors.textMuted }]}>
            Todas as paradas foram atendidas ou puladas.
          </Text>
        </View>
      )}

      {restantes.length > 0 ? (
        <ScrollView style={styles.lista} contentContainerStyle={styles.listaConteudo}>
          {restantes.map((d) => {
            const numero = paradas.indexOf(d) + 1;
            return (
              <Pressable
                key={String(d.id)}
                onPress={() => onAbrir(d)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
                <Text style={[styles.itemNumero, { color: colors.textMuted }]}>{numero}</Text>
                <Text style={styles.itemIcone}>{icones.get(nomeCategoria(d)) ?? '📋'}</Text>
                <Text style={[styles.itemTexto, { color: colors.textSecondary }]} numberOfLines={1}>
                  {nomeCategoria(d)}
                  {d.rua ? ` · ${d.rua}` : ''}
                </Text>
                {d.sla_vencido ? <Ionicons name="alarm" size={12} color={colors.error} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  painel: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[2],
    gap: Spacing[2],
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
  },
  titulos: {
    flex: 1,
  },
  titulo: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  subtitulo: {
    fontSize: FontSize.xs,
  },
  atual: {
    marginHorizontal: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.md,
    gap: Spacing[2],
  },
  atualLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  numero: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroTexto: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  icone: {
    fontSize: 22,
  },
  atualTexto: {
    flex: 1,
    gap: 2,
  },
  atualTitulo: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  atualMeta: {
    fontSize: FontSize.xs,
  },
  acoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  lista: {
    maxHeight: 120,
  },
  listaConteudo: {
    paddingHorizontal: Spacing[3],
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[1],
  },
  itemNumero: {
    width: 16,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textAlign: 'right',
  },
  itemIcone: {
    fontSize: 16,
  },
  itemTexto: {
    flex: 1,
    fontSize: FontSize.xs,
  },
});
