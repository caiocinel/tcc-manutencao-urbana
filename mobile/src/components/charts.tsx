/**
 * Gráficos do painel administrativo.
 *
 * O web usa Recharts, que depende do DOM. Aqui os mesmos gráficos (pizza,
 * barras verticais, barras horizontais e linha) são desenhados com
 * react-native-svg — o suficiente para os dados do endpoint de estatísticas,
 * sem trazer uma biblioteca de charts inteira.
 */

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline } from 'react-native-svg';

import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

export type ChartDatum = {
  label: string;
  value: number;
  color?: string;
};

/** Envelope com título, usado por todos os blocos de gráfico do painel. */
export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

function EmptyChart({ height }: { height: number }) {
  const colors = useColors();
  return (
    <View style={[styles.empty, { height }]}>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sem dados no período.</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ pizza */

function arcPath(cx: number, cy: number, raio: number, inicio: number, fim: number) {
  // Ângulos em radianos, começando às 12h e girando no sentido horário.
  const x1 = cx + raio * Math.sin(inicio);
  const y1 = cy - raio * Math.cos(inicio);
  const x2 = cx + raio * Math.sin(fim);
  const y2 = cy - raio * Math.cos(fim);
  const arcoGrande = fim - inicio > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${raio} ${raio} 0 ${arcoGrande} 1 ${x2} ${y2} Z`;
}

export function PieChart({ data, size = 200 }: { data: ChartDatum[]; size?: number }) {
  const colors = useColors();
  const total = data.reduce((acc, d) => acc + d.value, 0);

  const fatias = useMemo(() => {
    if (total <= 0) return [];
    let angulo = 0;
    return data.map((d) => {
      const inicio = angulo;
      const fim = angulo + (d.value / total) * Math.PI * 2;
      angulo = fim;
      return { ...d, inicio, fim };
    });
  }, [data, total]);

  if (total <= 0) return <EmptyChart height={size} />;

  const raio = size / 2;

  return (
    <View style={styles.pieWrapper}>
      <Svg width={size} height={size}>
        <G>
          {fatias.map((fatia) => (
            <Path
              key={fatia.label}
              // Uma fatia única (100%) não pode ser desenhada como arco: vira círculo.
              d={
                fatia.fim - fatia.inicio >= Math.PI * 2 - 0.0001
                  ? `M ${raio} ${raio} m -${raio} 0 a ${raio} ${raio} 0 1 0 ${size} 0 a ${raio} ${raio} 0 1 0 -${size} 0`
                  : arcPath(raio, raio, raio, fatia.inicio, fatia.fim)
              }
              fill={fatia.color ?? colors.gold500}
            />
          ))}
        </G>
      </Svg>

      <View style={styles.legenda}>
        {fatias.map((fatia) => (
          <View key={fatia.label} style={styles.legendaItem}>
            <View style={[styles.legendaCor, { backgroundColor: fatia.color ?? colors.gold500 }]} />
            <Text style={[styles.legendaTexto, { color: colors.textSecondary }]} numberOfLines={1}>
              {fatia.label}
            </Text>
            <Text style={[styles.legendaValor, { color: colors.textPrimary }]}>
              {fatia.value} ({Math.round((fatia.value / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* --------------------------------------------------------- barras verticais */

export function BarChart({
  data,
  height = 200,
  formatValue,
}: {
  data: ChartDatum[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const colors = useColors();
  const max = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) return <EmptyChart height={height} />;

  return (
    <View style={{ gap: Spacing[2] }}>
      <View style={[styles.barsRow, { height }]}>
        {data.map((d) => (
          <View key={d.label} style={styles.barColumn}>
            <Text style={[styles.barValue, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatValue ? formatValue(d.value) : d.value}
            </Text>
            <View
              style={{
                width: '70%',
                height: Math.max((d.value / max) * (height - 44), 2),
                backgroundColor: d.color ?? colors.gold500,
              }}
            />
            <Text style={[styles.barLabel, { color: colors.textMuted }]} numberOfLines={2}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------- barras horizontais */

export function HorizontalBarChart({
  data,
  formatValue,
}: {
  data: ChartDatum[];
  formatValue?: (value: number) => string;
}) {
  const colors = useColors();
  const max = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) return <EmptyChart height={120} />;

  return (
    <View style={{ gap: Spacing[2] }}>
      {data.map((d) => (
        <View key={d.label} style={styles.hBarRow}>
          <Text style={[styles.hBarLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {d.label}
          </Text>
          <View style={[styles.hBarTrack, { backgroundColor: colors.bgElevated }]}>
            <View
              style={{
                width: `${(d.value / max) * 100}%`,
                height: '100%',
                backgroundColor: d.color ?? colors.gold600,
              }}
            />
          </View>
          <Text style={[styles.hBarValue, { color: colors.textPrimary }]}>
            {formatValue ? formatValue(d.value) : d.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ linha */

export function LineChart({
  data,
  width,
  height = 200,
}: {
  data: ChartDatum[];
  width: number;
  height?: number;
}) {
  const colors = useColors();

  if (data.length < 2) return <EmptyChart height={height} />;

  const padLeft = 8;
  const padBottom = 24;
  const padTop = 12;
  const plotWidth = Math.max(width - padLeft * 2, 1);
  const plotHeight = height - padBottom - padTop;
  const max = Math.max(...data.map((d) => d.value), 1);

  const pontos = data.map((d, i) => ({
    x: padLeft + (i / (data.length - 1)) * plotWidth,
    y: padTop + plotHeight - (d.value / max) * plotHeight,
    datum: d,
  }));

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Linha de base. */}
        <Line
          x1={padLeft}
          y1={padTop + plotHeight}
          x2={padLeft + plotWidth}
          y2={padTop + plotHeight}
          stroke={colors.borderDefault}
          strokeWidth={1}
        />
        <Polyline
          points={pontos.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={colors.gold500}
          strokeWidth={2}
        />
        {pontos.map((p) => (
          <Circle key={p.datum.label} cx={p.x} cy={p.y} r={3} fill={colors.gold500} />
        ))}
      </Svg>

      <View style={[styles.lineLabels, { width }]}>
        {data.map((d, i) => (
          // Só rotula as pontas e o meio para não embolar em 12 meses.
          <Text
            key={d.label}
            style={[
              styles.lineLabel,
              {
                color: colors.textMuted,
                opacity: i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2) ? 1 : 0,
              },
            ]}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Barra de progresso simples usada na lista de bairros. */
export function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.hBarTrack, { backgroundColor: colors.bgElevated, width: 90 }]}>
      <View
        style={{
          width: `${Math.min(Math.max(percent, 0), 100)}%`,
          height: '100%',
          backgroundColor: color ?? colors.gold500,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[4],
    gap: Spacing[4],
  },
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FontSize.xs,
  },
  pieWrapper: {
    alignItems: 'center',
    gap: Spacing[4],
  },
  legenda: {
    alignSelf: 'stretch',
    gap: Spacing[1],
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  legendaCor: {
    width: 10,
    height: 10,
  },
  legendaTexto: {
    flex: 1,
    fontSize: FontSize.xs,
  },
  legendaValor: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing[2],
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing[1],
  },
  barValue: {
    fontSize: FontSize.xs - 2,
  },
  barLabel: {
    fontSize: FontSize.xs - 2,
    textAlign: 'center',
    height: 26,
  },
  hBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  hBarLabel: {
    width: 96,
    fontSize: FontSize.xs,
  },
  hBarTrack: {
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  hBarValue: {
    width: 56,
    textAlign: 'right',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing[4],
  },
  lineLabel: {
    fontSize: FontSize.xs - 2,
    flex: 1,
    textAlign: 'center',
  },
});
