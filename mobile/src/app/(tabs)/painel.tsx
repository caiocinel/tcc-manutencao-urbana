/**
 * Painel de métricas — porte de `frontend/src/pages/AdminDashboardMetrics.jsx`.
 * Mesmos blocos do web, com os gráficos redesenhados em `components/charts.tsx`.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BarChart,
  ChartCard,
  HorizontalBarChart,
  LineChart,
  PieChart,
  ProgressBar,
} from '@/components/charts';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, EmptyState, LoadingState, PageHeading, SectionHeading } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { getStatusLabel, STATUS_CHART_COLORS } from '@/constants/status';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';
import type { Estatisticas } from '@/types';
import { formatarData, formatarDuracao } from '@/utils/format';

const IMPACTO_LABEL: Record<string, string> = { alta: 'Alto', media: 'Médio', baixa: 'Baixo' };

const TIPO_LABEL: Record<string, string> = {
  recapeamento: 'Recapeamento',
  sazonalidade: 'Sazonalidade',
};

export default function PainelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const addToast = useToast();
  const { user, isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();

  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setStats(await api.adminEstatisticas());
    } catch (err) {
      addToast(
        'Erro ao carregar estatísticas: ' + (err instanceof Error ? err.message : ''),
        'error',
      );
    } finally {
      setCarregando(false);
    }
  }, [addToast]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user?.admin) carregar();
    }, [carregar, isAuthenticated, user?.admin]),
  );

  if (!isAuthenticated || !user?.admin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}>
        <EmptyState label="Área restrita a administradores." />
      </View>
    );
  }

  if (carregando) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}>
        <LoadingState />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}>
        <EmptyState label="Sem estatísticas disponíveis." />
      </View>
    );
  }

  const larguraGrafico = width - Spacing[4] * 2 - Spacing[4] * 2;

  const statusData = (stats.por_status ?? []).map((s) => ({
    label: getStatusLabel(s.status),
    value: s.total,
    color: STATUS_CHART_COLORS[s.status] ?? '#6B5B3E',
  }));

  const categorias = (stats.por_categoria ?? []).slice(0, 10);
  const tendencia = stats.tendencia_mensal ?? [];
  const medias = stats.medias_moveis ?? {};
  const anomalias = stats.anomalias ?? [];
  const slaCategorias = stats.sla_por_categoria ?? [];
  const bairros = stats.top_bairros ?? [];
  const recomendacoes = stats.recomendacoes ?? [];
  const variacaoMensal = stats.sazonalidade?.variacao_percentual ?? null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      contentContainerStyle={[
        styles.conteudo,
        { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing[16] },
      ]}>
      <PageHeading
        title="Dashboard de Métricas"
        subtitle="Visão geral dos chamados de serviços públicos"
      />

      <View style={styles.secao}>
        <View style={styles.kpiGrid}>
          <KpiCard title="Total de Chamados" value={stats.total} icon="documents" />
          <KpiCard
            title="Pendentes"
            value={stats.pendentes}
            icon="time"
            variation={variacaoMensal}
          />
          <KpiCard title="Resolvidos" value={stats.resolvidos} icon="checkmark-circle" />
          <KpiCard
            title="Taxa de Resolução"
            value={stats.taxa_resolucao}
            format="percent"
            icon="trending-up"
          />
          <KpiCard
            title="Tempo Médio (SLA)"
            value={formatarDuracao(stats.sla_medio_minutos)}
            icon="timer"
          />
          <KpiCard
            title="Este Mês"
            value={stats.sazonalidade?.mes_atual ?? 0}
            icon="bar-chart"
            variation={variacaoMensal}
          />
          <KpiCard
            title="SLA Vencidos"
            value={stats.sla_vencidos_total ?? 0}
            icon="warning"
            accent={colors.error}
          />
        </View>
      </View>

      <View style={styles.secao}>
        <ChartCard title="Chamados por Status">
          <PieChart data={statusData} size={Math.min(larguraGrafico, 220)} />
        </ChartCard>
      </View>

      <View style={styles.secao}>
        <ChartCard title="Comparativo Mensal">
          <BarChart
            data={[
              { label: 'Mês Anterior', value: stats.sazonalidade?.mes_anterior ?? 0 },
              { label: 'Mês Atual', value: stats.sazonalidade?.mes_atual ?? 0 },
            ]}
            height={180}
          />
        </ChartCard>
      </View>

      <View style={styles.secao}>
        <ChartCard title="Chamados por Categoria">
          <HorizontalBarChart
            data={categorias.map((c) => ({ label: c.categoria, value: c.total }))}
          />
        </ChartCard>
      </View>

      <View style={styles.secao}>
        <ChartCard title="Variação por Categoria">
          {categorias.filter((c) => c.variacao != null).length === 0 ? (
            <Text style={[styles.vazio, { color: colors.textMuted }]}>
              Dados insuficientes para comparação mensal.
            </Text>
          ) : (
            categorias
              .filter((c) => c.variacao != null)
              .slice(0, 8)
              .map((c) => (
                <View
                  key={c.categoria}
                  style={[styles.variacaoLinha, { backgroundColor: colors.bgPrimary }]}>
                  <Text style={[styles.variacaoNome, { color: colors.textPrimary }]}>
                    {c.categoria}
                  </Text>
                  <Text
                    style={[
                      styles.variacaoValor,
                      {
                        color:
                          (c.variacao ?? 0) > 0
                            ? colors.success
                            : (c.variacao ?? 0) < 0
                              ? colors.error
                              : colors.textMuted,
                      },
                    ]}>
                    {(c.variacao ?? 0) > 0 ? '↑' : (c.variacao ?? 0) < 0 ? '↓' : '→'}{' '}
                    {Math.abs(c.variacao ?? 0)}%
                  </Text>
                  <Text style={[styles.variacaoMeta, { color: colors.textMuted }]}>
                    {c.mes_atual} · {c.mes_anterior}
                  </Text>
                </View>
              ))
          )}
        </ChartCard>
      </View>

      {tendencia.length > 1 ? (
        <View style={styles.secao}>
          <SectionHeading
            title="Tendência Mensal (12 meses)"
            subtitle="Volume de chamados por mês"
          />
          <ChartCard title="Total por mês">
            <LineChart
              data={tendencia.map((t) => ({ label: t.mes, value: t.total }))}
              width={larguraGrafico}
            />
          </ChartCard>
        </View>
      ) : null}

      {medias.semana_atual != null ? (
        <View style={styles.secao}>
          <SectionHeading title="Médias Móveis" />
          <View style={styles.kpiGrid}>
            <KpiCard title="Esta semana" value={medias.semana_atual} icon="time" />
            <KpiCard title="Média 4 semanas" value={medias.media_4_semanas ?? 0} icon="bar-chart" />
            <KpiCard
              title="Variação"
              value={Math.abs(medias.variacao_percentual ?? 0)}
              format="percent"
              icon="trending-up"
            />
          </View>
        </View>
      ) : null}

      {anomalias.length > 0 ? (
        <View style={styles.secao}>
          <SectionHeading
            title="Anomalias Detectadas"
            subtitle="Bairros com aumento anormal de chamados"
          />
          {anomalias.map((a) => (
            <Card
              key={a.bairro}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: a.intensidade === 'alta' ? colors.error : colors.gold500,
              }}>
              <View style={styles.linhaEntre}>
                <Text style={[styles.cardTitulo, { color: colors.textPrimary }]}>{a.bairro}</Text>
                <ImpactoTag impacto={a.intensidade === 'alta' ? 'alta' : 'media'} />
              </View>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {a.total_mes} este mês · média {a.media_historica} · Z-Score {a.z_score}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      {slaCategorias.length > 0 ? (
        <View style={styles.secao}>
          <ChartCard title="Tempo Médio por Categoria">
            <HorizontalBarChart
              data={slaCategorias.map((s) => ({
                label: s.categoria,
                value: s.sla_medio_minutos,
                color: Colors.dark.gold600,
              }))}
              formatValue={formatarDuracao}
            />
          </ChartCard>
        </View>
      ) : null}

      {stats.sla_vencidos && stats.sla_vencidos.length > 0 ? (
        <View style={styles.secao}>
          <SectionHeading
            title="Chamados com SLA Vencido"
            subtitle="Prazo de atendimento ultrapassado. Priorizar resolução."
          />
          {stats.sla_vencidos.map((v) => (
            <Card key={v.id} style={{ borderLeftWidth: 3, borderLeftColor: colors.error }}>
              <Text style={[styles.cardTitulo, { color: colors.textPrimary }]} numberOfLines={1}>
                {v.titulo}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {v.categoria} · {formatarData(v.criado_em)} · prazo {v.prazo_sla_dias}d
              </Text>
              <StatusBadge status={v.status} />
            </Card>
          ))}
        </View>
      ) : null}

      {bairros.length > 0 ? (
        <View style={styles.secao}>
          <SectionHeading title="Bairros com Mais Chamados" />
          {bairros.map((b, i) => (
            <Card key={b.bairro} style={styles.bairroCard}>
              <Text style={[styles.posicao, { color: colors.textMuted }]}>#{i + 1}</Text>
              <View style={styles.bairroTexto}>
                <Text style={[styles.cardTitulo, { color: colors.textPrimary }]}>{b.bairro}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {b.total} chamados · {b.taxa_resolucao}% resolvidos
                </Text>
              </View>
              <ProgressBar percent={b.taxa_resolucao} />
            </Card>
          ))}
        </View>
      ) : null}

      {recomendacoes.length > 0 ? (
        <View style={styles.secao}>
          <SectionHeading title="Recomendações Inteligentes" />
          {recomendacoes.map((r, i) => (
            <Card
              key={`${r.tipo}-${i}`}
              style={{
                borderLeftWidth: 3,
                borderLeftColor:
                  r.impacto === 'alta'
                    ? colors.error
                    : r.impacto === 'media'
                      ? colors.gold500
                      : colors.success,
              }}>
              <View style={styles.linhaInicio}>
                <ImpactoTag impacto={r.impacto} />
                <Text style={[styles.tipo, { color: colors.textMuted }]}>
                  {TIPO_LABEL[r.tipo] ?? 'Bairro Crítico'}
                </Text>
              </View>
              <Text style={[styles.sugestao, { color: colors.textPrimary }]}>{r.sugestao}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {[r.local, r.bairro, `${r.ocorrencias} ocorrências`].filter(Boolean).join(' · ')}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={styles.secao}>
        <Button
          block
          variant="secondary"
          onPress={() => router.push('/admin/usuarios')}
          icon={<Ionicons name="people" size={16} color={colors.textPrimary} />}>
          Gerenciar Usuários
        </Button>
      </View>
    </ScrollView>
  );
}

function ImpactoTag({ impacto }: { impacto: string }) {
  const colors = useColors();
  const cor =
    impacto === 'alta' ? colors.error : impacto === 'media' ? colors.gold500 : colors.success;
  return (
    <View style={[styles.impacto, { borderColor: cor }]}>
      <Text style={[styles.impactoTexto, { color: cor }]}>
        {IMPACTO_LABEL[impacto] ?? impacto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conteudo: {
    gap: Spacing[2],
  },
  secao: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  vazio: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    paddingVertical: Spacing[6],
  },
  variacaoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[2],
  },
  variacaoNome: {
    flex: 1,
    fontSize: FontSize.xs,
  },
  variacaoValor: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  variacaoMeta: {
    fontSize: FontSize.xs,
  },
  linhaEntre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  linhaInicio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  cardTitulo: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  meta: {
    fontSize: FontSize.xs,
  },
  sugestao: {
    fontSize: FontSize.sm,
  },
  tipo: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  impacto: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[2],
    paddingVertical: 1,
  },
  impactoTexto: {
    fontSize: FontSize.xs - 2,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  bairroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  posicao: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    width: 26,
  },
  bairroTexto: {
    flex: 1,
    gap: 2,
  },
});
