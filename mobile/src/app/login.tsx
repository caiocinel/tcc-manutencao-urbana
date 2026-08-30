/**
 * Entrada no app — boas-vindas centralizadas com o fluxo único de e-mail
 * (`AuthWelcome`/`AuthFlow`): o backend decide se é login ou cadastro.
 */

import { AuthWelcome } from '@/components/auth-welcome';

export default function LoginScreen() {
  return <AuthWelcome />;
}
