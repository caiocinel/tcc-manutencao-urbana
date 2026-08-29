/**
 * Detalhe do chamado para o **cidadão** (mapa e lista).
 *
 * Só o que uma pessoa comum faz: apoiar (ou "confirmar no local", quando a
 * tela informa a distância) e anexar uma foto. Atender, responder e finalizar
 * são trabalho de operador e vivem em `operacao-sheet.tsx` — mesmo um admin
 * navegando por aqui não vê essas ações, para o mapa do cidadão não virar
 * painel de operação.
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text } from 'react-native';

import { DefectDetail, detailStyles } from '@/components/defect-detail';
import { Button } from '@/components/ui/button';
import { RAIO_CONFIRMACAO_M } from '@/constants/proximidade';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';
import type { Defeito, PickedImage } from '@/types';
import { totalApoios } from '@/utils/format';
import { formatarDistancia } from '@/utils/geo';
import { escolherDaGaleria, ImagemMuitoGrandeError } from '@/utils/image';

type Props = {
  defeito: Defeito | null;
  apoiado: boolean;
  onClose: () => void;
  /** Aplica uma alteração parcial na lista do pai. */
  onPatch: (id: number, patch: Partial<Defeito>) => void;
  /** Substitui o chamado pelo objeto recarregado do backend. */
  onReplace: (defeito: Defeito) => void;
  onApoioToggle: (id: number, apoiado: boolean) => void;
  /**
   * Distância do usuário até o chamado, em metros. Quando informada (tela do
   * mapa), o "Apoiar" vira "Confirmar no local", liberado só dentro de
   * `RAIO_CONFIRMACAO_M` — o usuário atesta que a demanda existe estando lá.
   * `null` = GPS indisponível; `undefined` = contexto sem GPS (lista).
   */
  distanciaM?: number | null;
};

export function DefectSheet({
  defeito,
  apoiado,
  onClose,
  onPatch,
  onReplace,
  onApoioToggle,
  distanciaM,
}: Props) {
  const colors = useColors();
  const addToast = useToast();
  const { isAuthenticated } = useAuth();

  const [acaoEmCurso, setAcaoEmCurso] = useState<string | null>(null);

  if (!defeito) return null;

  // Modo "confirmar no local": só quando a tela informa a distância.
  const modoConfirmacao = distanciaM !== undefined;
  const aoAlcance = typeof distanciaM === 'number' && distanciaM <= RAIO_CONFIRMACAO_M;
  const podeConfirmar = !modoConfirmacao || apoiado || aoAlcance;
  const rotuloConfirmar = !modoConfirmacao
    ? apoiado
      ? 'Apoiado'
      : 'Apoiar'
    : apoiado
      ? 'Confirmado'
      : aoAlcance
        ? 'Confirmar no local'
        : distanciaM === null
          ? 'Sem GPS'
          : `Aproxime-se · ${formatarDistancia(distanciaM)}`;

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

  function handleApoiar() {
    const id = defeito!.id;
    return comAcao('apoiar', async () => {
      const res = await api.apoiarDefeito(id);
      onApoioToggle(id, res.apoiado);
      const atual = totalApoios(defeito!);
      onPatch(id, {
        total_apoios: res.apoiado ? atual + 1 : Math.max(0, atual - 1),
      });
      addToast(
        modoConfirmacao
          ? res.apoiado
            ? 'Demanda confirmada no local!'
            : 'Confirmação removida.'
          : res.apoiado
            ? 'Apoio registrado!'
            : 'Apoio removido.',
      );
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

  return (
    <DefectDetail
      defeito={defeito}
      onClose={onClose}
      rotuloApoios={modoConfirmacao ? 'confirmacoes' : 'apoios'}>
      {isAuthenticated ? (
        <>
          <Button
            variant={modoConfirmacao && aoAlcance && !apoiado ? 'primary' : 'secondary'}
            size="sm"
            onPress={handleApoiar}
            disabled={!podeConfirmar}
            loading={acaoEmCurso === 'apoiar'}
            icon={
              <Ionicons
                name={
                  modoConfirmacao
                    ? apoiado
                      ? 'checkmark-circle'
                      : aoAlcance
                        ? 'checkmark-circle-outline'
                        : 'walk'
                    : apoiado
                      ? 'thumbs-up'
                      : 'thumbs-up-outline'
                }
                size={14}
                color={
                  modoConfirmacao && aoAlcance && !apoiado
                    ? colors.textInverse
                    : podeConfirmar
                      ? colors.gold500
                      : colors.textMuted
                }
              />
            }
            style={{ borderColor: podeConfirmar ? colors.gold500 : colors.borderDefault }}>
            {rotuloConfirmar}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onPress={handleAnexar}
            loading={acaoEmCurso === 'anexar'}
            icon={<Ionicons name="image" size={14} color={colors.textSecondary} />}>
            Anexar
          </Button>
        </>
      ) : (
        <Text style={[detailStyles.aviso, { color: colors.textMuted }]}>
          Faça login para apoiar ou anexar imagens.
        </Text>
      )}
    </DefectDetail>
  );
}
