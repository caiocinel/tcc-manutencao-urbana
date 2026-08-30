/**
 * Cartão de KPI — porte de `frontend/src/components/ui/kpi-card.jsx`,
 * incluindo a contagem animada até o valor final.
 */

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';

type Props = {
  title: string;
  /** Número (animado) ou texto já formatado, como "2.5h". */
  value: number | string;
  icon?: keyof typeof Ionicons.glyphMap;
  variation?: number | null;
  format?: 'percent' | 'time';
  /** Cor da faixa superior; por padrão o dourado do tema. */
  accent?: string;
};

const DURACAO_MS = 900;

function useContagemAnimada(alvo: number) {
  const [valor, setValor] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    const inicio = anterior.current;
    const delta = alvo - inicio;
    if (delta === 0) {
      setValor(alvo);
      return;
    }
    const t0 = Date.now();
    const intervalo = setInterval(() => {
      const t = Math.min((Date.now() - t0) / DURACAO_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValor(Math.round(inicio + delta * eased));
      if (t >= 1) {
        anterior.current = alvo;
        clearInterval(intervalo);
      }
    }, 16);
    return () => clearInterval(intervalo);
  }, [alvo]);

  return valor;
}

export function KpiCard({ title, value, icon, variation, format, accent }: Props) {
  const colors = useColors();
  const numerico = typeof value === 'number';
  const animado = useContagemAnimada(numerico ? value : 0);
  const exibido = numerico ? animado.toLocaleString('pt-BR') : value;

  const subiu = (variation ?? 0) > 0;
  const caiu = (variation ?? 0) < 0;
  const corVariacao = subiu ? colors.success : caiu ? colors.error : colors.textMuted;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
      <View style={[styles.faixa, { backgroundColor: accent ?? colors.gold500 }]} />
      <View style={styles.topo}>
        <Text style={[styles.titulo, { color: colors.textSecondary }]} numberOfLines={2}>
          {title}
        </Text>
        {icon ? (
          <View style={[styles.iconeCaixa, { backgroundColor: colors.goldMuted }]}>
            <Ionicons name={icon} size={16} color={colors.gold500} />
          </View>
        ) : null}
      </View>

      <Text style={[styles.valor, { color: colors.gold500 }]}>
        {exibido}
        {format === 'percent' ? <Text style={styles.sufixo}>%</Text> : null}
      </Text>

      {variation != null ? (
        <Text style={[styles.variacao, { color: corVariacao }]}>
          {subiu ? '↑' : caiu ? '↓' : '→'} {Math.abs(variation).toFixed(1)}% vs mês anterior
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing[4],
    gap: Spacing[2],
    overflow: 'hidden',
  },
  faixa: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  titulo: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  iconeCaixa: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valor: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  sufixo: {
    fontSize: FontSize.md,
  },
  variacao: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.semibold,
  },
});
