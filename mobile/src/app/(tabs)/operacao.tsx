/**
 * Mapa de operação — a mesa de trabalho do operador (admin), separada do mapa
 * do cidadão de propósito: aqui não se reporta nem se confirma nada; o que
 * existe é a **fila** de chamados e o fluxo assumir → responder → finalizar.
 *
 * A fila é a do **município a que o operador está vinculado** (o backend
 * recorta em `/defeitos/operacao/` e recusa assumir fora dele). Sem vínculo,
 * a tela explica em vez de mostrar o mapa. Como cidadão, na aba Mapa, a mesma
 * pessoa continua livre para reportar em qualquer cidade.
 *
 * - Chips no topo trocam o recorte: Fila (sem atendente), Meus (assumidos por
 *   mim), Abertos (tudo que não foi concluído) e Concluídos.
 * - O mapa mostra os pinos do recorte, coloridos por status; o painel inferior
 *   lista os mesmos chamados, mais perto primeiro (ou mais antigo, sem GPS),
 *   com alerta de SLA vencido.
 * - Enquadrar (canto superior direito) ajusta o zoom para caber todo o recorte;
 *   Recentralizar volta para a posição do operador.
 * - Tocar num pino ou num item abre o `OperacaoSheet`, com as ações de operador.
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapSurface } from '@/components/map-surface';
import type { MapSurfaceHandle, MarcadorMapa, Regiao } from '@/components/map-surface.types';
import { OperacaoSheet } from '@/components/operacao-sheet';
import { FilterChips } from '@/components/ui/chips';
import { LoadingState } from '@/components/ui/screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { getStatusColor, STATUS_ABERTOS, STATUS_FECHADOS } from '@/constants/status';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors, useTheme } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { GpsJoystick } from '@/dev/gps-joystick';
import { useLocalizacao } from '@/hooks/use-localizacao';
import { api } from '@/services/api';
import type { Categoria, Defeito, Operacao } from '@/types';
import { concluidoEm } from '@/utils/format';
import {
  caixaDosPontos,
  distanciaAte,
  formatarDistancia,
  regiaoDaCaixa,
  REGIAO_PADRAO,
} from '@/utils/geo';

type Recorte = 'fila' | 'meus' | 'abertos' | 'concluidos';

const RECORTES: { value: Recorte; label: string }[] = [
  { value: 'fila', label: 'Fila' },
  { value: 'meus', label: 'Meus' },
  { value: 'abertos', label: 'Abertos' },
  { value: 'concluidos', label: 'Concluídos' },
];

const MOSTRAR_JOYSTICK = __DEV__ && Platform.OS === 'web';

function diasDesde(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return '1 dia';
  return `${dias} dias`;
}

export default function OperacaoScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const addToast = useToast();
  const { user } = useAuth();
  const { posicao, bussola, permitido, erro: erroGps, tentarNovamente } = useLocalizacao();

  const mapRef = useRef<MapSurfaceHandle>(null);
  const [defeitos, setDefeitos] = useState<Defeito[]>([]);
  const [municipioOp, setMunicipioOp] = useState<Operacao['municipio']>(null);
  const [carregando, setCarregando] = useState(true);
  // Mensagem do backend quando o operador não pode operar (sem município).
  const [bloqueio, setBloqueio] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [recorte, setRecorte] = useState<Recorte>('fila');
  const [selecionado, setSelecionado] = useState<Defeito | null>(null);
  const [painelAberto, setPainelAberto] = useState(true);
  const [mapaPronto, setMapaPronto] = useState(false);
  // Enquadra o recorte uma vez por carga; depois disso a câmera é do operador.
  const enquadrouRef = useRef(false);

  const regiaoInicial: Regiao = REGIAO_PADRAO;

  const iconePorCategoria = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of categorias) if (c.icone) mapa.set(c.nome, c.icone);
    return mapa;
  }, [categorias]);

  const carregar = useCallback(async () => {
    try {
      const fila = await api.operacao();
      setDefeitos(fila.defeitos);
      setMunicipioOp(fila.municipio);
      setBloqueio(null);
    } catch (err) {
      // 403 = sem município vinculado; qualquer outro erro mantém a tela.
      const msg = err instanceof Error ? err.message : '';
      if (/munic[ií]pio|permiss/i.test(msg)) setBloqueio(msg);
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  useEffect(() => {
    api
      .listCategorias()
      .then(setCategorias)
      .catch(() => {});
  }, []);

  const meuId = user ? String(user.id) : null;

  /** Recorte atual, ordenado: mais perto primeiro; sem GPS, mais antigo primeiro. */
  const lista = useMemo(() => {
    const filtrados = defeitos.filter((d) => {
      switch (recorte) {
        case 'fila':
          return STATUS_ABERTOS.includes(d.status) && !d.atendente_id;
        case 'meus':
          return STATUS_ABERTOS.includes(d.status) && String(d.atendente_id) === meuId;
        case 'abertos':
          return STATUS_ABERTOS.includes(d.status);
        case 'concluidos':
          return STATUS_FECHADOS.includes(d.status);
      }
    });
    const comDistancia = filtrados.map((defeito) => ({
      defeito,
      distancia: posicao
        ? distanciaAte(defeito, posicao.latitude, posicao.longitude)
        : Number.POSITIVE_INFINITY,
      icone: iconePorCategoria.get(defeito.categoria ?? defeito.categoria_nome ?? ''),
    }));
    return comDistancia.sort((a, b) =>
      posicao ? a.distancia - b.distancia : a.defeito.criado_em.localeCompare(b.defeito.criado_em),
    );
  }, [defeitos, recorte, meuId, posicao, iconePorCategoria]);

  const totais = useMemo(() => {
    const t = { fila: 0, meus: 0, abertos: 0, concluidos: 0 };
    for (const d of defeitos) {
      if (STATUS_FECHADOS.includes(d.status)) t.concluidos += 1;
      if (!STATUS_ABERTOS.includes(d.status)) continue;
      t.abertos += 1;
      if (!d.atendente_id) t.fila += 1;
      else if (String(d.atendente_id) === meuId) t.meus += 1;
    }
    return t;
  }, [defeitos, meuId]);

  const chips = useMemo(
    () => RECORTES.map((r) => ({ value: r.value, label: `${r.label} · ${totais[r.value]}` })),
    [totais],
  );

  const marcadores = useMemo<MarcadorMapa[]>(
    () =>
      lista.map(({ defeito, icone }) => ({
        key: String(defeito.id),
        coordenada: { latitude: defeito.latitude, longitude: defeito.longitude },
        cor: getStatusColor(defeito.status, concluidoEm(defeito)),
        icone,
        selecionado: selecionado?.id === defeito.id,
      })),
    [lista, selecionado?.id],
  );

  function enquadrar() {
    const pontos: { latitude: number; longitude: number }[] = lista.map((i) => i.defeito);
    if (posicao) pontos.push(posicao);
    const caixa = caixaDosPontos(pontos);
    if (!caixa) {
      addToast('Nada para enquadrar neste recorte.', 'info');
      return;
    }
    mapRef.current?.animarPara(regiaoDaCaixa(caixa));
  }

  // Primeiro enquadramento: assim que mapa e dados existem.
  useEffect(() => {
    if (!mapaPronto || enquadrouRef.current || defeitos.length === 0) return;
    enquadrouRef.current = true;
    const pontos: { latitude: number; longitude: number }[] = lista.map((i) => i.defeito);
    if (posicao) pontos.push(posicao);
    const caixa = caixaDosPontos(pontos);
    if (caixa) mapRef.current?.animarPara(regiaoDaCaixa(caixa));
    else if (posicao) mapRef.current?.seguir(posicao);
  }, [mapaPronto, defeitos.length, lista, posicao]);

  function recentrar() {
    if (!posicao) {
      if (permitido === false) tentarNovamente();
      addToast(erroGps ?? 'Aguardando sinal do GPS...', 'info');
      return;
    }
    mapRef.current?.seguir(posicao);
  }

  function aplicarPatch(id: number, patch: Partial<Defeito>) {
    setDefeitos((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    setSelecionado((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }

  function substituir(defeito: Defeito) {
    setDefeitos((prev) => prev.map((d) => (d.id === defeito.id ? defeito : d)));
    setSelecionado(defeito);
  }

  async function abrir(defeito: Defeito, focar = false) {
    setSelecionado(defeito);
    if (focar) {
      mapRef.current?.animarPara({
        latitude: defeito.latitude,
        longitude: defeito.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
    try {
      const detalhe = await api.detalharDefeito(defeito.id);
      // O detalhe não traz `sla_vencido`; preserva o da listagem.
      setSelecionado({ ...detalhe, sla_vencido: defeito.sla_vencido });
    } catch {
      // Mantém o resumo da listagem.
    }
  }

  const rodape = insets.bottom + Spacing[4];

  if (bloqueio || (carregando && defeitos.length === 0)) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}>
        {bloqueio ? (
          <View style={styles.bloqueio}>
            <Ionicons name="business-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.bloqueioTitulo, { color: colors.textPrimary }]}>
              Sem município de operação
            </Text>
            <Text style={[styles.bloqueioTexto, { color: colors.textSecondary }]}>
              Você só opera chamados da cidade a que está vinculado. Peça a um administrador para
              vincular seu usuário a um município. Como cidadão, você pode reportar em qualquer
              lugar pela aba Mapa.
            </Text>
            <Text style={[styles.bloqueioTexto, { color: colors.textMuted }]}>{bloqueio}</Text>
          </View>
        ) : (
          <LoadingState label="Carregando a fila..." />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}>
      <View style={styles.mapaWrapper}>
        <MapSurface
          ref={mapRef}
          regiaoInicial={regiaoInicial}
          circulos={[]}
          marcadores={marcadores}
          usuario={posicao}
          direcao={bussola ?? posicao?.heading ?? null}
          onLongPressMapa={() => {}}
          onPressMarcador={(key) => {
            const item = lista.find((i) => String(i.defeito.id) === key);
            if (item) abrir(item.defeito);
          }}
          onArrastar={() => {}}
          onPronto={() => setMapaPronto(true)}
          escuro={theme === 'dark'}
        />

        {/* Topo: recortes da fila. */}
        <View style={styles.topo} pointerEvents="box-none">
          <View
            style={[
              styles.topoBarra,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
            ]}>
            <FilterChips
              options={chips}
              value={recorte}
              onChange={(v) => {
                setRecorte(v);
                setSelecionado(null);
              }}
              accessibilityLabel="Recorte da operação"
            />
          </View>
        </View>

        {/* Lateral direita: enquadrar o recorte e voltar para mim. */}
        <View style={[styles.lateral, { bottom: rodape + (painelAberto ? 260 : 76) }]}>
          <Pressable
            onPress={enquadrar}
            accessibilityRole="button"
            accessibilityLabel="Enquadrar todos os chamados do recorte"
            style={[
              styles.botaoRedondo,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
            ]}>
            <Ionicons name="scan" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={recentrar}
            accessibilityRole="button"
            accessibilityLabel="Recentralizar na minha posição"
            style={[
              styles.botaoRedondo,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
            ]}>
            <Ionicons name="locate" size={18} color={colors.gold500} />
          </Pressable>
        </View>

        {MOSTRAR_JOYSTICK ? <GpsJoystick posicaoReal={posicao} /> : null}

        {/* Painel inferior: a fila em lista. */}
        <View style={[styles.rodape, { bottom: rodape }]} pointerEvents="box-none">
          <View
            style={[
              styles.painel,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
            ]}>
            <Pressable
              onPress={() => setPainelAberto((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={painelAberto ? 'Recolher lista' : 'Expandir lista'}
              style={styles.painelCabecalho}>
              <Ionicons name="construct" size={16} color={colors.gold500} />
              <View style={styles.painelTitulos}>
                <Text
                  style={[styles.painelTitulo, { color: colors.textPrimary }]}
                  numberOfLines={1}>
                  {RECORTES.find((r) => r.value === recorte)?.label}
                  {municipioOp ? ` · ${municipioOp.nome}/${municipioOp.uf_sigla}` : ''}
                </Text>
                <Text style={[styles.painelSubtitulo, { color: colors.textMuted }]}>
                  {lista.length === 1 ? '1 chamado' : `${lista.length} chamados`}
                  {posicao ? ' · mais perto primeiro' : ' · mais antigo primeiro'}
                </Text>
              </View>
              <Ionicons
                name={painelAberto ? 'chevron-down' : 'chevron-up'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            {painelAberto ? (
              <ScrollView style={styles.painelCorpo} contentContainerStyle={styles.painelConteudo}>
                {lista.length === 0 ? (
                  <Text style={[styles.vazio, { color: colors.textMuted }]}>
                    {recorte === 'fila'
                      ? 'Fila vazia — nenhum chamado aguardando.'
                      : recorte === 'meus'
                        ? 'Você não está atendendo nenhum chamado.'
                        : 'Nenhum chamado neste recorte.'}
                  </Text>
                ) : (
                  lista.map(({ defeito, distancia, icone }) => {
                    const slaVencido =
                      !!defeito.sla_vencido && !STATUS_FECHADOS.includes(defeito.status);
                    return (
                      <Pressable
                        key={String(defeito.id)}
                        onPress={() => abrir(defeito, true)}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.item,
                          {
                            borderColor:
                              selecionado?.id === defeito.id ? colors.gold500 : 'transparent',
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}>
                        <Text style={styles.itemIcone}>{icone ?? '📋'}</Text>
                        <View style={styles.itemTexto}>
                          <Text
                            style={[styles.itemTitulo, { color: colors.textPrimary }]}
                            numberOfLines={1}>
                            {defeito.categoria_nome ?? defeito.categoria ?? defeito.titulo}
                            {defeito.rua ? ` · ${defeito.rua}` : ''}
                          </Text>
                          <View style={styles.itemLinha}>
                            <StatusBadge
                              status={defeito.status}
                              concluidoEm={concluidoEm(defeito)}
                              compact
                            />
                            <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                              {diasDesde(defeito.criado_em)}
                              {Number.isFinite(distancia)
                                ? ` · ${formatarDistancia(distancia)}`
                                : ''}
                            </Text>
                            {slaVencido ? (
                              <View style={styles.sla}>
                                <Ionicons name="alarm" size={11} color={colors.error} />
                                <Text style={[styles.itemMeta, { color: colors.error }]}>SLA</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </View>

      <OperacaoSheet
        key={selecionado?.id}
        defeito={selecionado}
        onClose={() => setSelecionado(null)}
        onPatch={aplicarPatch}
        onReplace={substituir}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapaWrapper: {
    flex: 1,
  },
  // Os panes do Leaflet (web) usam z-index 400; sem isso os overlays somem.
  topo: {
    position: 'absolute',
    zIndex: 1000,
    top: Spacing[3],
    left: Spacing[4],
    right: Spacing[4],
  },
  topoBarra: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[2],
  },
  lateral: {
    position: 'absolute',
    zIndex: 1000,
    right: Spacing[4],
    gap: Spacing[2],
  },
  botaoRedondo: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  rodape: {
    position: 'absolute',
    zIndex: 1000,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[4],
  },
  painel: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[2],
    gap: Spacing[2],
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  painelCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
  },
  painelTitulos: {
    flex: 1,
  },
  painelTitulo: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  painelSubtitulo: {
    fontSize: FontSize.xs,
  },
  painelCorpo: {
    maxHeight: 200,
  },
  painelConteudo: {
    paddingHorizontal: Spacing[2],
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1] + 2,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  itemIcone: {
    fontSize: 20,
  },
  itemTexto: {
    flex: 1,
    gap: 3,
  },
  itemTitulo: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  itemLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  itemMeta: {
    fontSize: FontSize.xs,
  },
  sla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  vazio: {
    fontSize: FontSize.sm,
    padding: Spacing[2],
  },
  bloqueio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    padding: Spacing[6],
  },
  bloqueioTitulo: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  bloqueioTexto: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
