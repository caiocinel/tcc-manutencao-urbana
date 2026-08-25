/**
 * Gerenciar usuários — porte de `frontend/src/pages/SuperAdmin.jsx`.
 * A tabela do web virou lista de cartões; o `<select>` de município usa o
 * mesmo seletor com busca do cadastro.
 */

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState, PageHeading } from '@/components/ui/screen';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';
import type { Municipio, User } from '@/types';

export default function UsuariosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const addToast = useToast();
  const { user, isAuthenticated } = useAuth();

  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  // Quem não é admin nem chega a carregar nada.
  const [carregando, setCarregando] = useState(isAuthenticated && !!user?.admin);
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAuthenticated || !user?.admin) return;
    let cancelado = false;
    Promise.all([api.adminListUsers(), api.listMunicipios()])
      .then(([us, muns]) => {
        if (cancelado) return;
        setUsuarios(us);
        setMunicipios(muns);
      })
      .catch(() => addToast('Erro ao carregar dados', 'error'))
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [isAuthenticated, user?.admin, addToast]);

  const opcoes = useMemo(
    () => municipios.map((m) => ({ value: m.codigo, label: m.nome, group: m.uf_sigla })),
    [municipios],
  );

  function marcarSalvando(chave: string, valor: boolean) {
    setSalvando((prev) => {
      const next = { ...prev };
      if (valor) next[chave] = true;
      else delete next[chave];
      return next;
    });
  }

  async function alternarAdmin(alvo: User) {
    if (alvo.super_admin) return;
    const chave = `admin-${alvo.id}`;
    marcarSalvando(chave, true);
    try {
      await api.adminToggleAdmin(alvo.id, !alvo.admin);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === alvo.id ? { ...u, admin: !alvo.admin } : u)),
      );
      addToast(alvo.admin ? 'Admin removido' : 'Usuário promovido a admin');
    } catch (err) {
      addToast('Erro: ' + (err instanceof Error ? err.message : ''), 'error');
    } finally {
      marcarSalvando(chave, false);
    }
  }

  async function definirMunicipio(alvo: User, codigo: string) {
    const chave = `mun-${alvo.id}`;
    marcarSalvando(chave, true);
    try {
      await api.adminSetMunicipio(alvo.id, codigo || null);
      const mun = municipios.find((m) => m.codigo === codigo) ?? null;
      setUsuarios((prev) =>
        prev.map((u) => (u.id === alvo.id ? { ...u, municipio: mun, municipio_id: codigo } : u)),
      );
      addToast('Município atualizado');
    } catch (err) {
      addToast('Erro: ' + (err instanceof Error ? err.message : ''), 'error');
    } finally {
      marcarSalvando(chave, false);
    }
  }

  if (!isAuthenticated || !user?.admin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <EmptyState label="Área restrita a administradores." />
      </View>
    );
  }

  if (carregando) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <PageHeading
        title="Gerenciar Usuários"
        subtitle="Administre usuários, vínculo municipal e permissões de admin"
      />

      <FlatList
        data={usuarios}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + Spacing[8] }]}
        ListEmptyComponent={<EmptyState label="Nenhum usuário encontrado." />}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
            ]}>
            <View style={styles.linhaTopo}>
              <Text style={[styles.nome, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.nome}
              </Text>
              {item.super_admin ? (
                <View style={[styles.tagSuper, { backgroundColor: colors.goldMuted }]}>
                  <Text style={[styles.tagSuperTexto, { color: colors.gold500 }]}>SUPER</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>
              {item.email}
            </Text>

            <SearchableSelect
              label="Município"
              options={opcoes}
              value={item.municipio?.codigo ?? ''}
              onChange={(codigo) => definirMunicipio(item, codigo)}
              placeholder="— Sem município —"
            />

            <View style={styles.linhaAcoes}>
              <View style={styles.papel}>
                <Ionicons
                  name={item.admin || item.super_admin ? 'shield-checkmark' : 'shield-outline'}
                  size={14}
                  color={item.admin || item.super_admin ? colors.success : colors.textMuted}
                />
                <Text
                  style={[
                    styles.papelTexto,
                    { color: item.admin || item.super_admin ? colors.success : colors.textMuted },
                  ]}>
                  {item.admin || item.super_admin ? 'Admin' : 'Comum'}
                </Text>
              </View>

              {!item.super_admin ? (
                <Button
                  size="xs"
                  variant={item.admin ? 'danger' : 'secondary'}
                  onPress={() => alternarAdmin(item)}
                  loading={!!salvando[`admin-${item.id}`]}>
                  {item.admin ? 'Remover' : 'Tornar Admin'}
                </Button>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lista: {
    padding: Spacing[4],
    gap: Spacing[2],
  },
  card: {
    borderWidth: 1,
    padding: Spacing[3],
    gap: Spacing[2],
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  nome: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  tagSuper: {
    paddingHorizontal: Spacing[1] + 2,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  tagSuperTexto: {
    fontSize: FontSize.xs - 3,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  email: {
    fontSize: FontSize.xs,
  },
  linhaAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  papel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  papelTexto: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
