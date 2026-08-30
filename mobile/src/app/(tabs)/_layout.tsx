/**
 * Abas principais. Substituem o header + dropdown de usuário do web:
 * mapa, lista de chamados, painel e operação (admin). A conta saiu da barra —
 * vive atrás do botão de menu no topo do mapa. Com uma aba só (visitante sem
 * login: apenas o mapa) a barra inteira some.
 */

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';

import { FontSize } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';

export default function TabsLayout() {
  const colors = useColors();
  const { isAuthenticated, user } = useAuth();

  const admin = isAuthenticated && !!user?.admin;
  // mapa (sempre) + operação e painel (admin). Para o cidadão comum sobra só
  // o mapa, então a barra some — chamados dele vivem em Conta > Meus chamados.
  const abasVisiveis = 1 + (admin ? 2 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold500,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.borderDefault,
          display: abasVisiveis <= 1 ? 'none' : 'flex',
        },
        tabBarLabelStyle: { fontSize: FontSize.xs - 2 },
      }}>
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="operacao"
        options={{
          title: 'Operação',
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
          // Mapa de trabalho do operador: fila, meus atendimentos, finalizar.
          // Separado do mapa do cidadão para nenhum dos dois virar uma mistura.
          href: admin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="chamados"
        options={{
          title: 'Chamados',
          // Fora da barra: a lista geral segue existindo como rota (/chamados),
          // mas o dia a dia do cidadão é o mapa + Conta > Meus chamados.
          href: null,
        }}
      />
      <Tabs.Screen
        name="painel"
        options={{
          title: 'Painel',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
          href: admin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          // Fora da barra: abre pelo botão de menu no topo do mapa.
          href: null,
        }}
      />
    </Tabs>
  );
}
