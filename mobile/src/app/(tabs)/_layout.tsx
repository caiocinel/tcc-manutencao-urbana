/**
 * Abas principais. Substituem o header + dropdown de usuário do web:
 * mapa, lista de chamados, painel (admin) e conta.
 */

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';

import { FontSize } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';

export default function TabsLayout() {
  const colors = useColors();
  const { isAuthenticated, user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold500,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.borderDefault,
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
          href: isAuthenticated && user?.admin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="chamados"
        options={{
          title: 'Chamados',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
          // A lista exige sessão, como o `/lista` protegido do web.
          href: isAuthenticated ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="painel"
        options={{
          title: 'Painel',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
          href: isAuthenticated && user?.admin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
