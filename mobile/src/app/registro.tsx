/**
 * Rota antiga de cadastro. O cadastro agora acontece dentro do fluxo único de
 * entrada (`/login` → `AuthFlow`): o e-mail decide entre login e cadastro.
 */

import { Redirect } from 'expo-router';

export default function RegistroScreen() {
  return <Redirect href="/login" />;
}
