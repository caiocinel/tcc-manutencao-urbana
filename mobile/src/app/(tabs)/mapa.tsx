/**
 * Mapa em modo de navegação — mistura de Waze (reportar onde se está) com
 * Pokémon Go (ver o que há ao redor e "capturar" confirmando no local).
 *
 * Tudo parte do GPS, que fica ligado enquanto a aba está aberta
 * (`useLocalizacao`):
 * - a câmera segue o usuário com zoom de rua; arrastar o mapa sai do modo
 *   "seguir" e o FAB vira "Recentralizar" até a câmera voltar ao usuário;
 * - o FAB redondo "Reportar" (centro inferior, só enquanto seguindo) abre o
 *   chamado na posição atual —
 *   sem tocar no mapa;
 *   toque longo ainda permite posicionar em outro ponto;
 * - as pendências são filtradas por um raio ao redor do usuário e listadas na
 *   bandeja inferior ordenadas por distância;
 * - dentro de `RAIO_CONFIRMACAO_M` o pino ganha anel dourado e o detalhe
 *   libera "Confirmar no local".
 *
 * Trocas em relação ao web: Leaflet -> react-native-maps; `leaflet.heat` ->
 * células de densidade (`utils/heatmap.ts`); máscara do município via `holes`.
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DefectSheet } from '@/components/defect-sheet';
import { MapSurface } from '@/components/map-surface';
import type {
  CirculoMapa,
  MapSurfaceHandle,
  MarcadorMapa,
  Regiao,
} from '@/components/map-surface.types';
import { RAIO_BUSCA_PADRAO_M, RAIO_CONFIRMACAO_M, RAIOS_BUSCA_M } from '@/constants/proximidade';
import { getStatusColor, STATUS_ABERTOS, STATUS_FECHADOS } from '@/constants/status';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors, useTheme } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { GpsJoystick } from '@/dev/gps-joystick';
import { useLocalizacao } from '@/hooks/use-localizacao';
import { api } from '@/services/api';
import type { Categoria, Defeito } from '@/types';
import { concluidoEm } from '@/utils/format';
import { distanciaAte, REGIAO_PADRAO } from '@/utils/geo';
import { agruparParaHeatmap, corDoPeso, raioDoPeso } from '@/utils/heatmap';

type Filtro = 'pendentes' | 'todos' | 'atendidos' | 'meus';

type ItemProximo = {
  defeito: Defeito;
  distancia: number;
  icone?: string;
  emAlcance: boolean;
};

/** Joystick de GPS só no desktop em desenvolvimento (no celular há GPS de verdade). */
const MOSTRAR_JOYSTICK = __DEV__ && Platform.OS === 'web';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'todos', label: 'Todos' },
  { value: 'atendidos', label: 'Atendidos' },
  { value: 'meus', label: 'Meus Chamados' },
];

function rotuloRaio(raio: number) {
  return raio >= 1000 ? `${raio / 1000} km` : `${raio} m`;
}

export default function MapaScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const addToast = useToast();
  const { user, isAuthenticated } = useAuth();
  const { posicao, bussola, permitido, erro: erroGps, tentarNovamente } = useLocalizacao();
  // `?abrir=<id>`: o formulário de novo chamado manda para cá quando o backend
  // apontou um duplicado — abre o existente para a pessoa confirmar.
  const { abrir } = useLocalSearchParams<{ abrir?: string }>();

  const mapRef = useRef<MapSurfaceHandle>(null);
  const [defeitos, setDefeitos] = useState<Defeito[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('pendentes');
  const [raio, setRaio] = useState<number>(RAIO_BUSCA_PADRAO_M);
  const [heatmap, setHeatmap] = useState(false);
  const [seguindo, setSeguindo] = useState(true);
  // O mapa nativo ignora `seguir` antes de `onMapReady`; o efeito abaixo
  // depende disto para centralizar assim que ele estiver pronto.
  const [mapaPronto, setMapaPronto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<Defeito | null>(null);
  const [apoiei, setApoiei] = useState<Set<number>>(new Set());

  // O mapa não é preso a município nenhum: qualquer cidade do país vale. Ele
  // abre num enquadramento neutro e pula para o GPS assim que houver posição.
  const regiaoInicial: Regiao = REGIAO_PADRAO;

  const iconePorCategoria = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of categorias) if (c.icone) mapa.set(c.nome, c.icone);
    return mapa;
  }, [categorias]);

  const carregarDefeitos = useCallback(async () => {
    try {
      setDefeitos(await api.listDefeitos());
    } catch {
      // Sem rede o mapa apenas fica sem marcadores.
    }
  }, []);

  // Recarrega ao voltar do formulário de novo chamado.
  useFocusEffect(
    useCallback(() => {
      carregarDefeitos();
    }, [carregarDefeitos]),
  );

  useEffect(() => {
    api
      .listCategorias()
      .then(setCategorias)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelado = false;
    api
      .apoiei()
      .then((r) => {
        if (!cancelado) setApoiei(new Set(r.ids));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!abrir) return;
    let cancelado = false;
    api
      .detalharDefeito(abrir as unknown as number)
      .then((d) => {
        if (!cancelado) setSelecionado(d);
      })
      .catch(() => {});
    router.setParams({ abrir: undefined });
    return () => {
      cancelado = true;
    };
  }, [abrir]);

  // Câmera de navegação: acompanha cada atualização do GPS enquanto "seguindo".
  // A posição do usuário manda; o município é só o enquadramento de fallback.
  useEffect(() => {
    if (!mapaPronto || !seguindo || !posicao) return;
    mapRef.current?.seguir(posicao);
  }, [mapaPronto, seguindo, posicao]);

  const filtrados = useMemo(() => {
    let lista = defeitos;
    if (filtro === 'pendentes') lista = lista.filter((d) => STATUS_ABERTOS.includes(d.status));
    if (filtro === 'atendidos') lista = lista.filter((d) => STATUS_FECHADOS.includes(d.status));
    if (filtro === 'meus' && user) lista = lista.filter((d) => d.usuario?.id === user.id);
    return lista;
  }, [defeitos, filtro, user]);

  /** Chamados dentro do raio, mais perto primeiro. Sem GPS, cai na lista inteira. */
  const proximos = useMemo<ItemProximo[]>(() => {
    if (!posicao) {
      return filtrados.map((defeito) => ({
        defeito,
        distancia: Number.POSITIVE_INFINITY,
        icone: iconePorCategoria.get(defeito.categoria ?? defeito.categoria_nome ?? ''),
        emAlcance: false,
      }));
    }
    return filtrados
      .map((defeito) => {
        const distancia = distanciaAte(defeito, posicao.latitude, posicao.longitude);
        return {
          defeito,
          distancia,
          icone: iconePorCategoria.get(defeito.categoria ?? defeito.categoria_nome ?? ''),
          emAlcance: distancia <= RAIO_CONFIRMACAO_M && STATUS_ABERTOS.includes(defeito.status),
        };
      })
      .filter((item) => item.distancia <= raio)
      .sort((a, b) => a.distancia - b.distancia);
  }, [filtrados, posicao, raio, iconePorCategoria]);

  const celulasCalor = useMemo(
    () => agruparParaHeatmap(proximos.map((p) => p.defeito)),
    [proximos],
  );
  const pesoMaximo = useMemo(
    () => celulasCalor.reduce((max, c) => Math.max(max, c.peso), 1),
    [celulasCalor],
  );

  // Visitantes só veem o agregado; marcadores individuais exigem login.
  const mostrarCalor = heatmap || !isAuthenticated;

  const circulos = useMemo<CirculoMapa[]>(() => {
    const lista: CirculoMapa[] = [];
    if (posicao) {
      const centro = { latitude: posicao.latitude, longitude: posicao.longitude };
      lista.push({
        key: 'raio-busca',
        centro,
        raio,
        corPreenchimento: 'rgba(59,130,246,0.05)',
        corBorda: 'rgba(59,130,246,0.35)',
        larguraBorda: 1,
      });
      if (isAuthenticated) {
        lista.push({
          key: 'raio-confirmacao',
          centro,
          raio: RAIO_CONFIRMACAO_M,
          corPreenchimento: 'rgba(212,175,55,0.10)',
          corBorda: '#D4AF37',
          larguraBorda: 2,
        });
      }
    }
    if (mostrarCalor) {
      for (const celula of celulasCalor) {
        lista.push({
          key: celula.key,
          centro: { latitude: celula.latitude, longitude: celula.longitude },
          raio: raioDoPeso(celula.peso, pesoMaximo),
          corPreenchimento: corDoPeso(celula.peso, pesoMaximo),
        });
      }
    }
    return lista;
  }, [posicao, raio, isAuthenticated, mostrarCalor, celulasCalor, pesoMaximo]);

  const marcadores = useMemo<MarcadorMapa[]>(
    () =>
      mostrarCalor
        ? []
        : proximos.map(({ defeito, icone, emAlcance }) => ({
            key: String(defeito.id),
            coordenada: { latitude: defeito.latitude, longitude: defeito.longitude },
            cor: getStatusColor(defeito.status, concluidoEm(defeito)),
            icone,
            emAlcance,
            selecionado: selecionado?.id === defeito.id,
          })),
    [mostrarCalor, proximos, selecionado?.id],
  );

  function abrirNovoChamado(coordinate: { latitude: number; longitude: number }) {
    // Em qual cidade o ponto caiu é o backend que resolve (PostGIS) e grava
    // no chamado — o app não precisa saber de município.
    router.push({
      pathname: '/novo',
      params: { lat: String(coordinate.latitude), lng: String(coordinate.longitude) },
    });
  }

  /** Waze: reporta onde o usuário está agora. Sem sessão, leva ao login. */
  function reportarAqui() {
    if (!isAuthenticated) {
      addToast('Entre para abrir um chamado.', 'info');
      router.push('/login');
      return;
    }
    if (!posicao) {
      addToast(erroGps ?? 'Aguardando sinal do GPS...', 'error');
      return;
    }
    abrirNovoChamado({ latitude: posicao.latitude, longitude: posicao.longitude });
  }

  function recentrar() {
    if (!posicao) {
      if (permitido === false) tentarNovamente();
      addToast(erroGps ?? 'Aguardando sinal do GPS...', 'info');
      return;
    }
    setSeguindo(true);
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

  function alternarApoio(id: number, apoiado: boolean) {
    setApoiei((prev) => {
      const next = new Set(prev);
      if (apoiado) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function abrirDetalhe(defeito: Defeito) {
    setSelecionado(defeito);
    try {
      setSelecionado(await api.detalharDefeito(defeito.id));
    } catch {
      // Mantém os dados resumidos da listagem.
    }
  }

  const distanciaSelecionado =
    selecionado && posicao ? distanciaAte(selecionado, posicao.latitude, posicao.longitude) : null;

  const rodape = insets.bottom + Spacing[4];

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}>
      <View style={styles.mapaWrapper}>
        <MapSurface
          ref={mapRef}
          regiaoInicial={regiaoInicial}
          circulos={circulos}
          marcadores={marcadores}
          usuario={posicao}
          direcao={bussola ?? posicao?.heading ?? null}
          onLongPressMapa={(c) => {
            if (isAuthenticated) abrirNovoChamado(c);
          }}
          onPressMarcador={(key) => {
            const item = proximos.find((p) => String(p.defeito.id) === key);
            if (item) {
              setSeguindo(false);
              abrirDetalhe(item.defeito);
            }
          }}
          onArrastar={() => setSeguindo(false)}
          onPronto={() => setMapaPronto(true)}
          escuro={theme === 'dark'}
        />

        {/* Só o erro de GPS aparece no topo: é a única forma de tentar de novo. */}
        {permitido === false || erroGps ? (
          <View style={styles.topo} pointerEvents="box-none">
            <Pressable
              onPress={tentarNovamente}
              accessibilityRole="button"
              style={[
                styles.pill,
                { backgroundColor: colors.bgElevated, borderColor: colors.error },
              ]}>
              <Ionicons name="warning" size={13} color={colors.error} />
              <Text style={[styles.pillTexto, { color: colors.error }]}>
                {erroGps ?? 'Localização indisponível'} · tocar para tentar de novo
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Controles laterais: filtros. */}
        <View style={[styles.lateral, { bottom: rodape + 60 }]}>
          {isAuthenticated ? (
            <Pressable
              onPress={() => setMenuAberto(true)}
              accessibilityRole="button"
              accessibilityLabel="Filtros do mapa"
              style={[
                styles.botaoRedondo,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
              ]}>
              <Ionicons name="options" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {MOSTRAR_JOYSTICK ? <GpsJoystick posicaoReal={posicao} /> : null}

        <View style={[styles.rodape, { bottom: rodape }]} pointerEvents="box-none">
          <View style={styles.fabLinha} pointerEvents="box-none">
            {seguindo ? (
              <Pressable
                onPress={reportarAqui}
                accessibilityRole="button"
                accessibilityLabel="Reportar chamado na minha posição"
                style={[
                  styles.fab,
                  {
                    backgroundColor:
                      posicao || !isAuthenticated ? colors.gold500 : colors.bgElevated,
                    borderColor:
                      posicao || !isAuthenticated ? colors.gold500 : colors.borderDefault,
                  },
                ]}>
                <Ionicons
                  name="megaphone"
                  size={20}
                  color={posicao || !isAuthenticated ? colors.textInverse : colors.textMuted}
                />
                <Text
                  style={[
                    styles.fabTexto,
                    { color: posicao || !isAuthenticated ? colors.textInverse : colors.textMuted },
                  ]}>
                  Reportar
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={recentrar}
                accessibilityRole="button"
                accessibilityLabel="Recentralizar na minha posição"
                style={[
                  styles.fab,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
                ]}>
                <Ionicons name="locate" size={20} color={colors.gold500} />
                <Text style={[styles.fabTexto, { color: colors.textPrimary }]}>Recentralizar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <Modal
        visible={menuAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAberto(false)}>
        <Pressable
          style={[styles.menuBackdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setMenuAberto(false)}>
          <View
            style={[
              styles.menu,
              { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault },
            ]}>
            <Text style={[styles.menuGrupo, { color: colors.textMuted }]}>Raio ao redor</Text>
            <View style={styles.raios}>
              {RAIOS_BUSCA_M.map((opcao) => (
                <Pressable
                  key={opcao}
                  onPress={() => setRaio(opcao)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: raio === opcao }}
                  style={[
                    styles.raioChip,
                    {
                      borderColor: raio === opcao ? colors.gold500 : colors.borderDefault,
                      backgroundColor: raio === opcao ? colors.goldMuted : 'transparent',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.raioTexto,
                      {
                        color: raio === opcao ? colors.gold500 : colors.textSecondary,
                        fontWeight: raio === opcao ? FontWeight.bold : FontWeight.regular,
                      },
                    ]}>
                    {rotuloRaio(opcao)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.menuDivisor, { backgroundColor: colors.borderDefault }]} />
            <Text style={[styles.menuGrupo, { color: colors.textMuted }]}>Filtros</Text>

            {FILTROS.map((opcao) => (
              <Pressable
                key={opcao.value}
                onPress={() => {
                  setFiltro(opcao.value);
                  setMenuAberto(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: filtro === opcao.value }}
                style={styles.menuItem}>
                <View
                  style={[
                    styles.menuPonto,
                    filtro === opcao.value && { backgroundColor: colors.gold500 },
                  ]}
                />
                <Text
                  style={[
                    styles.menuTexto,
                    { color: filtro === opcao.value ? colors.gold500 : colors.textSecondary },
                  ]}>
                  {opcao.label}
                </Text>
              </Pressable>
            ))}

            <View style={[styles.menuDivisor, { backgroundColor: colors.borderDefault }]} />
            <Pressable
              onPress={() => {
                setHeatmap((h) => !h);
                setMenuAberto(false);
              }}
              accessibilityRole="button"
              style={styles.menuItem}>
              <Ionicons
                name="flame"
                size={16}
                color={heatmap ? colors.gold500 : colors.textSecondary}
              />
              <Text
                style={[
                  styles.menuTexto,
                  { color: heatmap ? colors.gold500 : colors.textSecondary },
                ]}>
                Mapa de Calor
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <DefectSheet
        key={selecionado?.id}
        defeito={selecionado}
        apoiado={selecionado ? apoiei.has(selecionado.id) : false}
        distanciaM={distanciaSelecionado}
        onClose={() => setSelecionado(null)}
        onPatch={aplicarPatch}
        onReplace={substituir}
        onApoioToggle={alternarApoio}
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
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1] + 2,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderWidth: 1,
    borderRadius: Radius.full,
    maxWidth: '100%',
  },
  pillTexto: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    flexShrink: 1,
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
    gap: Spacing[2],
  },
  fabLinha: {
    paddingHorizontal: Spacing[4],
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    height: 56,
    paddingHorizontal: Spacing[5],
    borderWidth: 1,
    borderRadius: Radius.full,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabTexto: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  menuBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: Spacing[4],
    paddingBottom: Spacing[16],
  },
  menu: {
    minWidth: 220,
    borderWidth: 1,
    padding: Spacing[2],
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2] + 2,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  menuTexto: {
    fontSize: FontSize.sm,
  },
  menuDivisor: {
    height: 1,
    marginHorizontal: Spacing[2],
    marginVertical: Spacing[1],
  },
  menuGrupo: {
    paddingHorizontal: Spacing[3],
    paddingTop: Spacing[1],
    fontSize: FontSize.xs - 2,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuPonto: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: 'transparent',
  },
  raios: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  raioChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  raioTexto: {
    fontSize: FontSize.xs,
  },
});
