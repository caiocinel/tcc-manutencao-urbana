/**
 * Conta — porte de `frontend/src/pages/ProfileSettings.jsx` somado ao menu do
 * `UserDropdown` (mapa/lista/admin/sair), que no app vira navegação por abas.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card, PageHeading, SectionHeading } from '@/components/ui/screen';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { TextField } from '@/components/ui/text-field';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';
import type { Municipio } from '@/types';
import { formatarCpf } from '@/utils/format';

export default function ContaScreen() {
  const { theme, colors, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const addToast = useToast();
  const { user, isAuthenticated, updateUser, logout } = useAuth();

  // O formulário parte do usuário carregado; guardamos só o que foi editado,
  // para não precisar sincronizar estado dentro de um efeito.
  const [nomeEditado, setNomeEditado] = useState<string | null>(null);
  const [municipioEditado, setMunicipioEditado] = useState<string | null>(null);
  const nome = nomeEditado ?? user?.nome ?? '';
  const municipioId = municipioEditado ?? user?.municipio_id ?? '';
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.listMunicipios().then(setMunicipios).catch(() => {});
  }, [isAuthenticated]);

  const opcoes = useMemo(
    () => municipios.map((m) => ({ value: m.codigo, label: m.nome, group: m.uf_sigla })),
    [municipios],
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}>
        <PageHeading title="Conta" subtitle="Entre para gerenciar seus chamados" />
        <View style={styles.deslogado}>
          <Button block onPress={() => router.push('/login')}>
            Entrar
          </Button>
          <Button block variant="secondary" onPress={() => router.push('/registro')}>
            Criar conta
          </Button>
          <PreferenciasCard theme={theme} onToggle={toggle} />
        </View>
      </View>
    );
  }

  async function salvar() {
    setSalvando(true);
    try {
      if (nome !== user?.nome) {
        await api.updateProfile({ nome });
        await updateUser({ nome });
      }
      if (senhaAtual && novaSenha) {
        await api.updatePassword(senhaAtual, novaSenha);
        setSenhaAtual('');
        setNovaSenha('');
      }
      if (municipioId && municipioId !== user?.municipio_id) {
        const res = await api.updateMunicipio(municipioId);
        await updateUser({ municipio_id: municipioId, municipio: res.municipio });
      }
      // Volta a espelhar o usuário salvo.
      setNomeEditado(null);
      setMunicipioEditado(null);
      addToast('Alterações salvas com sucesso!');
    } catch (err) {
      addToast(
        'Erro ao salvar: ' + (err instanceof Error ? err.message : 'tente novamente'),
        'error',
      );
    } finally {
      setSalvando(false);
    }
  }

  async function verificarEmail() {
    if (codigo.length < 6) {
      addToast('Digite o código de verificação.', 'error');
      return;
    }
    setVerificando(true);
    try {
      await api.verificarEmail(codigo);
      await updateUser({ email_verificado: true });
      addToast('Email verificado com sucesso!');
      setCodigo('');
    } catch (err) {
      addToast('Erro: ' + (err instanceof Error ? err.message : ''), 'error');
    } finally {
      setVerificando(false);
    }
  }

  async function reenviarCodigo() {
    try {
      await api.reenviarCodigo();
      addToast('Código reenviado para seu email.');
    } catch (err) {
      addToast('Erro: ' + (err instanceof Error ? err.message : ''), 'error');
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing[16] },
        ]}
        keyboardShouldPersistTaps="handled">
        <PageHeading title="Configurações" subtitle="Gerencie sua conta e preferências" />

        <View style={styles.secao}>
          <Card>
            <View style={styles.perfil}>
              <View style={[styles.avatar, { backgroundColor: colors.bgElevated }]}>
                <Text style={[styles.avatarTexto, { color: colors.textSecondary }]}>
                  {user?.nome?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.perfilTexto}>
                <Text style={[styles.perfilNome, { color: colors.textPrimary }]}>
                  {user?.nome || 'Usuário'}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>{user?.email}</Text>
                {user?.municipio?.nome ? (
                  <Text style={[styles.meta, { color: colors.gold500 }]}>
                    {user.municipio.nome} - {user.municipio.uf_sigla}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.emailStatus}>
              <Ionicons
                name={user?.email_verificado ? 'checkmark-circle' : 'alert-circle'}
                size={14}
                color={user?.email_verificado ? colors.success : colors.gold500}
              />
              <Text
                style={[
                  styles.meta,
                  { color: user?.email_verificado ? colors.success : colors.gold500 },
                ]}>
                {user?.email_verificado ? 'E-mail verificado' : 'E-mail não verificado'}
              </Text>
            </View>

            <TextField label="Nome completo" value={nome} onChangeText={setNomeEditado} />

            {user?.cpf ? (
              <TextField label="CPF" value={formatarCpf(user.cpf)} editable={false} />
            ) : null}

            <SearchableSelect
              label="Município"
              options={opcoes}
              value={municipioId}
              onChange={setMunicipioEditado}
              placeholder="Selecione um município"
            />
          </Card>
        </View>

        {!user?.email_verificado ? (
          <View style={styles.secao}>
            <Card style={{ borderColor: colors.gold500 }}>
              <SectionHeading
                title="Verificação de E-mail"
                subtitle="Digite o código enviado para seu e-mail."
              />
              <TextField
                value={codigo}
                onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.codigo}
              />
              <View style={styles.linhaAcoes}>
                <Button size="sm" onPress={verificarEmail} loading={verificando}>
                  Verificar
                </Button>
                <Button size="sm" variant="ghost" onPress={reenviarCodigo}>
                  Reenviar código
                </Button>
              </View>
            </Card>
          </View>
        ) : null}

        <View style={styles.secao}>
          <Card>
            <SectionHeading title="Alterar Senha" subtitle="Atualize sua senha de acesso" />
            <TextField
              label="Senha atual"
              value={senhaAtual}
              onChangeText={setSenhaAtual}
              secureTextEntry
              autoComplete="current-password"
            />
            <TextField
              label="Nova senha"
              value={novaSenha}
              onChangeText={setNovaSenha}
              secureTextEntry
              autoComplete="new-password"
            />
          </Card>
        </View>

        <View style={styles.secao}>
          <Button block onPress={salvar} loading={salvando}>
            Salvar Alterações
          </Button>
        </View>

        <View style={styles.secao}>
          <PreferenciasCard theme={theme} onToggle={toggle} />
        </View>

        {user?.admin ? (
          <View style={styles.secao}>
            <Card>
              <SectionHeading title="Administração" />
              <Pressable
                onPress={() => router.push('/admin/usuarios')}
                accessibilityRole="button"
                style={styles.linhaLista}>
                <Ionicons name="people" size={16} color={colors.textSecondary} />
                <Text style={[styles.itemTexto, { color: colors.textSecondary }]}>
                  Gerenciar Usuários
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            </Card>
          </View>
        ) : null}

        <View style={styles.secao}>
          <Button
            block
            variant="danger"
            onPress={async () => {
              await logout();
              addToast('Sessão encerrada.');
              router.replace('/(tabs)/mapa');
            }}
            icon={<Ionicons name="log-out" size={16} color={colors.error} />}>
            Sair
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PreferenciasCard({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <Card>
      <SectionHeading title="Preferências" subtitle="Personalize sua experiência" />
      <Pressable onPress={onToggle} accessibilityRole="button" style={styles.linhaLista}>
        <Ionicons
          name={theme === 'dark' ? 'moon' : 'sunny'}
          size={16}
          color={colors.textSecondary}
        />
        <Text style={[styles.itemTexto, { color: colors.textSecondary }]}>
          Tema {theme === 'dark' ? 'escuro' : 'claro'}
        </Text>
        <Text style={[styles.meta, { color: colors.gold500 }]}>Alternar</Text>
      </Pressable>
      <View style={styles.linhaLista}>
        <Ionicons name="language" size={16} color={colors.textSecondary} />
        <Text style={[styles.itemTexto, { color: colors.textSecondary }]}>Idioma</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>Português (BR)</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    gap: Spacing[2],
  },
  secao: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[1],
  },
  deslogado: {
    padding: Spacing[4],
    gap: Spacing[3],
  },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
  },
  perfilTexto: {
    flex: 1,
    gap: 2,
  },
  perfilNome: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  meta: {
    fontSize: FontSize.xs,
  },
  emailStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  codigo: {
    textAlign: 'center',
    letterSpacing: 6,
  },
  linhaAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  linhaLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[2],
  },
  itemTexto: {
    flex: 1,
    fontSize: FontSize.sm,
  },
});
