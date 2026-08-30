/**
 * Painel da visão expandida do mapa: a cidade onde a pessoa está, quantos
 * chamados abertos ela tem e rankings (tipos mais frequentes, mais antigos,
 * mais confirmados). Os dados vêm prontos de `GET /defeitos/municipio/`.
 */

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FilterChips } from '@/components/ui/chips';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';
import type { Defeito, VisaoMunicipio } from '@/types';
import { totalApoios } from '@/utils/format';

type Aba = 'tipos' | 'antigas' | 'apoiadas';

const ABAS: { value: Aba; label: string }[] = [
  { value: 'tipos', label: 'Tipos' },
  { value: 'antigas', label: 'Mais antigas' },
  { value: 'apoiadas', label: 'Mais confirmadas' },
];

type Props = {
  visao: VisaoMunicipio;
  /** Emoji por nome de categoria, para os rankings. */
  icones: Map<string, string>;
  onSelecionar: (defeito: Defeito) => void;
  onFechar: () => void;
};

function diasDesde(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'há 1 dia';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`;
}

function nomeCategoria(d: Defeito) {
  return d.categoria_nome ?? d.categoria ?? '';
}

export function MunicipioPanel({ visao, icones, onSelecionar, onFechar }: Props) {
  const colors = useColors();
  const [aba, setAba] = useState<Aba>('tipos');
  const [recolhido, setRecolhido] = useState(false);

  const porId = useMemo(() => new Map(visao.defeitos.map((d) => [String(d.id), d])), [visao]);
  const lista = useMemo(() => {
    const ids = aba === 'antigas' ? visao.mais_antigos : visao.mais_apoiados;
    return ids.map((id) => porId.get(String(id))).filter((d): d is Defeito => !!d);
  }, [aba, visao, porId]);
  const maior = visao.tipos[0]?.total ?? 1;

  return (
    <View
      style={[
        styles.painel,
        { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
      ]}
      accessibilityLabel={`Visão do município ${visao.municipio.nome}`}>
      <View style={styles.cabecalho}>
        <Ionicons name="business" size={16} color={colors.gold500} />
        <View style={styles.titulos}>
          <Text style={[styles.titulo, { color: colors.textPrimary }]} numberOfLines={1}>
            {visao.municipio.nome}/{visao.municipio.uf_sigla}
          </Text>
          <Text style={[styles.subtitulo, { color: colors.textMuted }]}>
            {visao.total_abertos === 1
              ? '1 chamado em aberto'
              : `${visao.total_abertos} chamados em aberto`}
          </Text>
        </View>
        <Pressable
          onPress={() => setRecolhido((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={recolhido ? 'Expandir ranking' : 'Recolher ranking'}
          hitSlop={8}>
          <Ionicons
            name={recolhido ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
        <Pressable
          onPress={onFechar}
          accessibilityRole="button"
          accessibilityLabel="Voltar para a navegação"
          hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {recolhido ? null : (
        <>
          <FilterChips options={ABAS} value={aba} onChange={setAba} accessibilityLabel="Ranking" />

          <ScrollView style={styles.corpo} contentContainerStyle={styles.corpoConteudo}>
            {visao.total_abertos === 0 ? (
              <Text style={[styles.vazio, { color: colors.textMuted }]}>
                Nenhum chamado em aberto nesta cidade.
              </Text>
            ) : aba === 'tipos' ? (
              visao.tipos.map((t, i) => (
                <View key={t.categoria} style={styles.linha}>
                  <Text style={[styles.posicao, { color: colors.textMuted }]}>{i + 1}</Text>
                  <Text style={styles.icone}>{icones.get(t.categoria) ?? '📋'}</Text>
                  <View style={styles.linhaTexto}>
                    <Text style={[styles.nome, { color: colors.textPrimary }]} numberOfLines={1}>
                      {t.categoria}
                    </Text>
                    <View style={[styles.barraFundo, { backgroundColor: colors.bgElevated }]}>
                      <View
                        style={[
                          styles.barra,
                          { backgroundColor: colors.gold500, width: `${(t.total / maior) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={[styles.total, { color: colors.textPrimary }]}>{t.total}</Text>
                </View>
              ))
            ) : lista.length === 0 ? (
              <Text style={[styles.vazio, { color: colors.textMuted }]}>
                Nenhum chamado confirmado ainda.
              </Text>
            ) : (
              lista.map((d, i) => (
                <Pressable
                  key={String(d.id)}
                  onPress={() => onSelecionar(d)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.linha, pressed && { opacity: 0.6 }]}>
                  <Text style={[styles.posicao, { color: colors.textMuted }]}>{i + 1}</Text>
                  <Text style={styles.icone}>{icones.get(nomeCategoria(d)) ?? '📋'}</Text>
                  <View style={styles.linhaTexto}>
                    <Text style={[styles.nome, { color: colors.textPrimary }]} numberOfLines={1}>
                      {nomeCategoria(d) || d.titulo}
                      {d.rua ? ` · ${d.rua}` : ''}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {aba === 'antigas'
                        ? `aberto ${diasDesde(d.criado_em)}`
                        : `${totalApoios(d)} confirmações · ${diasDesde(d.criado_em)}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  painel: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
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
  corpo: {
    maxHeight: 220,
  },
  corpoConteudo: {
    paddingHorizontal: Spacing[3],
    gap: Spacing[1],
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[1] + 2,
  },
  posicao: {
    width: 16,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textAlign: 'right',
  },
  icone: {
    fontSize: 20,
  },
  linhaTexto: {
    flex: 1,
    gap: 3,
  },
  nome: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  meta: {
    fontSize: FontSize.xs,
  },
  barraFundo: {
    height: 5,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barra: {
    height: 5,
    borderRadius: Radius.full,
  },
  total: {
    minWidth: 24,
    textAlign: 'right',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  vazio: {
    fontSize: FontSize.sm,
    paddingVertical: Spacing[2],
  },
});
