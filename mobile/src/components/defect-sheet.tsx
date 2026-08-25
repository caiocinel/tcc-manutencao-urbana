/**
 * Detalhe do chamado em bottom sheet.
 *
 * No web esse conteúdo aparecia duplicado no MapPage e no DefectList; aqui as
 * duas telas usam este mesmo componente. As ações (atender, finalizar, apoiar,
 * anexar, gerar OS) são executadas aqui e propagadas ao pai por callbacks, que
 * atualizam a lista local sem refazer a requisição inteira.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ImageViewer } from '@/components/ui/image-viewer';
import { StatusBadge } from '@/components/ui/status-badge';
import { Timeline } from '@/components/ui/timeline';
import { STATUS_FECHADOS } from '@/constants/status';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';
import type { Defeito, PickedImage } from '@/types';
import {
  concluidoEm,
  formatarData,
  maskName,
  parseImagensExtra,
  totalApoios,
} from '@/utils/format';
import { escolherDaGaleria, ImagemMuitoGrandeError, tirarFoto } from '@/utils/image';
import { getTimelineItems } from '@/utils/timeline';

type Props = {
  defeito: Defeito | null;
  apoiado: boolean;
  onClose: () => void;
  /** Aplica uma alteração parcial na lista do pai. */
  onPatch: (id: number, patch: Partial<Defeito>) => void;
  /** Substitui o chamado pelo objeto recarregado do backend. */
  onReplace: (defeito: Defeito) => void;
  onApoioToggle: (id: number, apoiado: boolean) => void;
};

const STATUS_VINCULADOS = ['vinculado_sem_resposta', 'vinculado_com_resposta'];

export function DefectSheet({
  defeito,
  apoiado,
  onClose,
  onPatch,
  onReplace,
  onApoioToggle,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const addToast = useToast();
  const { user, isAuthenticated } = useAuth();

  const [acaoEmCurso, setAcaoEmCurso] = useState<string | null>(null);
  const [imagemAberta, setImagemAberta] = useState<string | null>(null);

  if (!defeito) return null;

  const isAdmin = !!user?.admin;
  const fechado = STATUS_FECHADOS.includes(defeito.status);
  const podeAtender = isAdmin && !defeito.atendente_id && !fechado;
  const podeFinalizar = isAdmin && !!defeito.atendente_id && STATUS_VINCULADOS.includes(defeito.status);
  const imagensExtra = parseImagensExtra(defeito.imagens_extra);

  async function comAcao(chave: string, fn: () => Promise<void>) {
    setAcaoEmCurso(chave);
    try {
      await fn();
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro inesperado';
      addToast('Erro: ' + mensagem, 'error');
    } finally {
      setAcaoEmCurso(null);
    }
  }

  function handleAtender() {
    const id = defeito!.id;
    return comAcao('atender', async () => {
      await api.atenderDefeito(id);
      addToast('Chamado vinculado com sucesso!');
      onPatch(id, { status: 'vinculado_sem_resposta', atendente_id: user?.id ?? null });
    });
  }

  function handleResponder() {
    const id = defeito!.id;
    return comAcao('responder', async () => {
      await api.updateDefeito(id, { status: 'vinculado_com_resposta' });
      addToast('Resposta registrada!');
      onPatch(id, { status: 'vinculado_com_resposta' });
    });
  }

  /** Finalizar exige a foto de resolução, então a câmera abre antes do PATCH. */
  function handleFinalizar() {
    const id = defeito!.id;
    return comAcao('finalizar', async () => {
      let foto: PickedImage | null = null;
      try {
        foto = await tirarFoto();
      } catch (err) {
        if (err instanceof ImagemMuitoGrandeError) {
          addToast(err.message, 'error');
          return;
        }
        throw err;
      }
      if (!foto) {
        addToast('Foto de resolução é obrigatória para finalizar.', 'error');
        return;
      }
      await api.finalizarDefeito(id, foto);
      addToast('Chamado finalizado!');
      onPatch(id, { status: 'atendido' });
    });
  }

  function handleApoiar() {
    const id = defeito!.id;
    return comAcao('apoiar', async () => {
      const res = await api.apoiarDefeito(id);
      onApoioToggle(id, res.apoiado);
      const atual = totalApoios(defeito!);
      onPatch(id, {
        total_apoios: res.apoiado ? atual + 1 : Math.max(0, atual - 1),
      });
      addToast(res.apoiado ? 'Apoio registrado!' : 'Apoio removido.');
    });
  }

  function handleAnexar() {
    const id = defeito!.id;
    return comAcao('anexar', async () => {
      let imagem: PickedImage | null = null;
      try {
        imagem = await escolherDaGaleria();
      } catch (err) {
        if (err instanceof ImagemMuitoGrandeError) {
          addToast(err.message, 'error');
          return;
        }
        throw err;
      }
      if (!imagem) return;
      await api.anexarImagem(id, imagem);
      addToast('Imagem anexada!');
      onReplace(await api.detalharDefeito(id));
    });
  }

  function handleGerarOS() {
    const id = defeito!.id;
    return comAcao('os', async () => {
      await api.gerarOS(id);
      addToast('Ordem de Serviço gerada!');
    });
  }

  return (
    <>
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={onClose}
          accessibilityLabel="Fechar detalhes"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderGold,
              paddingBottom: insets.bottom + Spacing[4],
            },
          ]}>
          <View style={styles.puxador}>
            <View style={[styles.puxadorBarra, { backgroundColor: colors.borderHover }]} />
          </View>

          <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
            <View style={styles.cabecalho}>
              <View style={styles.cabecalhoTexto}>
                <Text style={[styles.titulo, { color: colors.textPrimary }]} numberOfLines={2}>
                  {defeito.titulo}
                </Text>
                <View style={styles.linhaMeta}>
                  <StatusBadge status={defeito.status} concluidoEm={concluidoEm(defeito)} />
                  <Text style={[styles.meta, { color: colors.textMuted }]}>
                    {maskName(defeito.usuario?.nome)}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.descricao, { color: colors.textSecondary }]}>
              {defeito.descricao}
            </Text>

            {defeito.categoria || defeito.bairro ? (
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {[defeito.categoria, defeito.rua, defeito.bairro].filter(Boolean).join(' · ')}
              </Text>
            ) : null}

            {defeito.imagem_thumbnail ? (
              <Pressable onPress={() => setImagemAberta(defeito.imagem_thumbnail!)}>
                <Image
                  source={{ uri: defeito.imagem_thumbnail }}
                  style={styles.imagem}
                  contentFit="cover"
                  transition={150}
                />
              </Pressable>
            ) : null}

            {imagensExtra.map((url) => (
              <Pressable key={url} onPress={() => setImagemAberta(url)}>
                <Image source={{ uri: url }} style={styles.imagem} contentFit="cover" transition={150} />
              </Pressable>
            ))}

            <Text style={[styles.secao, { color: colors.textMuted }]}>Histórico</Text>
            <Timeline items={getTimelineItems(defeito)} />

            <View style={styles.rodapeMeta}>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {formatarData(defeito.criado_em)}
              </Text>
              {totalApoios(defeito) > 0 ? (
                <View style={styles.apoios}>
                  <Ionicons name="thumbs-up" size={12} color={colors.textMuted} />
                  <Text style={[styles.meta, { color: colors.textMuted }]}>
                    {totalApoios(defeito)}
                  </Text>
                </View>
              ) : null}
            </View>

            {isAuthenticated ? (
              <View style={styles.acoes}>
                {podeAtender ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={handleAtender}
                    loading={acaoEmCurso === 'atender'}
                    icon={<Ionicons name="hand-left" size={14} color={colors.info} />}
                    style={{ borderColor: colors.info }}>
                    Atender
                  </Button>
                ) : null}

                {podeFinalizar ? (
                  <>
                    {defeito.status === 'vinculado_sem_resposta' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={handleResponder}
                        loading={acaoEmCurso === 'responder'}
                        icon={<Ionicons name="chatbox-ellipses" size={14} color={colors.textPrimary} />}>
                        Responder
                      </Button>
                    ) : null}
                    <Button
                      variant="danger"
                      size="sm"
                      onPress={handleFinalizar}
                      loading={acaoEmCurso === 'finalizar'}
                      icon={<Ionicons name="camera" size={14} color={colors.error} />}>
                      Finalizar
                    </Button>
                  </>
                ) : null}

                <Button
                  variant="secondary"
                  size="sm"
                  onPress={handleApoiar}
                  loading={acaoEmCurso === 'apoiar'}
                  icon={
                    <Ionicons
                      name={apoiado ? 'thumbs-up' : 'thumbs-up-outline'}
                      size={14}
                      color={colors.gold500}
                    />
                  }
                  style={{ borderColor: colors.gold500 }}>
                  {apoiado ? 'Apoiado' : 'Apoiar'}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onPress={handleAnexar}
                  loading={acaoEmCurso === 'anexar'}
                  icon={<Ionicons name="image" size={14} color={colors.textSecondary} />}>
                  Anexar
                </Button>

                {isAdmin ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={handleGerarOS}
                    loading={acaoEmCurso === 'os'}
                    icon={<Ionicons name="document-text" size={14} color={colors.textSecondary} />}>
                    Ordem de Serviço
                  </Button>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Faça login para apoiar ou anexar imagens.
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>

      <ImageViewer uri={imagemAberta} onClose={() => setImagemAberta(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  puxador: {
    alignItems: 'center',
    paddingTop: Spacing[2],
  },
  puxadorBarra: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
  },
  conteudo: {
    padding: Spacing[5],
    gap: Spacing[3],
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  cabecalhoTexto: {
    flex: 1,
    gap: Spacing[2],
  },
  titulo: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  linhaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  meta: {
    fontSize: FontSize.xs,
  },
  descricao: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  imagem: {
    width: '100%',
    height: 160,
    borderRadius: Radius.md,
  },
  secao: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing[2],
  },
  rodapeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  apoios: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  acoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
});
