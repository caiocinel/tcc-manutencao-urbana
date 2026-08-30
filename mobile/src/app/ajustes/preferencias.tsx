/** Submenu "Preferências": tema e idioma. Aberto a partir do hub da aba Conta. */

import { Redirect } from 'expo-router';

import { MenuRow } from '@/components/ui/menu-row';
import { Card } from '@/components/ui/screen';
import { SubScreen } from '@/components/ui/sub-screen';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

export default function PreferenciasScreen() {
  const { theme, toggle } = useTheme();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/(tabs)/conta" />;
  }

  return (
    <SubScreen title="Preferências" fallback="/(tabs)/conta">
      <Card>
        <MenuRow
          icon={theme === 'dark' ? 'moon' : 'sunny'}
          label="Tema"
          detail="Toque para alternar entre claro e escuro"
          value={theme === 'dark' ? 'Escuro' : 'Claro'}
          onPress={toggle}
        />
        <MenuRow icon="language" label="Idioma" value="Português (BR)" />
      </Card>
    </SubScreen>
  );
}
