/**
 * Mapa — porte de `frontend/src/pages/MapPage.jsx`.
 *
 * Trocas em relação ao web:
 * - Leaflet -> react-native-maps (Apple Maps no iOS, Google Maps no Android);
 * - `leaflet.heat` -> células de densidade desenhadas como círculos (ver
 *   `utils/heatmap.ts`);
 * - a máscara fora do município usa o `holes` do Polygon em vez do truque de
 *   fill-rule evenodd do Leaflet;
 * - o formulário de novo chamado virou uma tela modal própria (`/novo`).
 */

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DefectSheet } from '@/components/defect-sheet';
import { MapSurface } from '@/components/map-surface';
import type {
  CirculoMapa,
  MapSurfaceHandle,
  MarcadorMapa,
  Regiao,
} from '@/components/map-surface.types';
import { getStatusColor, STATUS_ABERTOS, STATUS_FECHADOS } from '@/constants/status';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColors, useTheme } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';
import type { Defeito } from '@/types';
import { concluidoEm } from '@/utils/format';
import {
  extrairPoligono,
  filterByRadius,
  paraLatLng,
  pointInPolygon,
  REGIAO_PADRAO,
  regiaoDoMunicipio,
  regiaoEmTorno,
  temBoundingBox,
} from '@/utils/geo';
import { agruparParaHeatmap, corDoPeso, raioDoPeso } from '@/utils/heatmap';

type Filtro = 'todos' | 'pendentes' | 'atendidos' | 'meus';
type PertoDeMim = { lat: number; lng: number; raio: number };

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'atendidos', label: 'Atendidos' },
  { value: 'meus', label: 'Meus Chamados' },
];

const RAIOS = [200, 500, 1000];

export default function MapaScreen() {
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const addToast = useToast();
  const { user, isAuthenticated, isDemoMode } = useAuth();

  const mapRef = useRef<MapSurfaceHandle>(null);
  const [defeitos, setDefeitos] = useState<Defeito[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  // O web liga o heatmap por padrão, exceto no modo demonstração.
  const [heatmap, setHeatmap] = useState(!isDemoMode);
  const [menuAberto, setMenuAberto] = useState(false);
  const [pertoDeMim, setPertoDeMim] = useState<PertoDeMim | null>(null);
  const [criando, setCriando] = useState(false);
  const [selecionado, setSelecionado] = useState<Defeito | null>(null);
  const [apoiei, setApoiei] = useState<Set<number>>(new Set());

  const municipio = user?.municipio ?? null;

  const poligono = useMemo(() => extrairPoligono(municipio?.poligono_json), [municipio]);
  const poligonoLatLng = useMemo(() => (poligono ? paraLatLng(poligono) : null), [poligono]);

  const regiaoInicial: Regiao = useMemo(
    () => (temBoundingBox(municipio) ? regiaoDoMunicipio(municipio) : REGIAO_PADRAO),
    [municipio],
  );

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

  // Sem município vinculado, centraliza na posição do usuário (como no web).
  useEffect(() => {
    if (temBoundingBox(municipio)) {
      mapRef.current?.animarPara(regiaoDoMunicipio(municipio));
      return;
    }
    let cancelado = false;
    (async () => {
      const permissao = await Location.requestForegroundPermissionsAsync();
      if (!permissao.granted || cancelado) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (cancelado) return;
      mapRef.current?.animarPara(regiaoEmTorno(pos.coords.latitude, pos.coords.longitude));
    })().catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [municipio]);

  const filtrados = useMemo(() => {
    let lista = defeitos;
    if (filtro === 'pendentes') lista = lista.filter((d) => STATUS_ABERTOS.includes(d.status));
    if (filtro === 'atendidos') lista = lista.filter((d) => STATUS_FECHADOS.includes(d.status));
    if (filtro === 'meus' && user) lista = lista.filter((d) => d.usuario?.id === user.id);
    if (pertoDeMim) lista = filterByRadius(lista, pertoDeMim.lat, pertoDeMim.lng, pertoDeMim.raio);
    return lista;
  }, [defeitos, filtro, user, pertoDeMim]);

  const celulasCalor = useMemo(() => agruparParaHeatmap(filtrados), [filtrados]);
  const pesoMaximo = useMemo(
    () => celulasCalor.reduce((max, c) => Math.max(max, c.peso), 1),
    [celulasCalor],
  );

  // Visitantes só veem o agregado; marcadores individuais exigem login.
  const mostrarCalor = heatmap || !isAuthenticated;

  const circulos = useMemo<CirculoMapa[]>(() => {
    const lista: CirculoMapa[] = [];
    if (pertoDeMim) {
      lista.push({
        key: 'perto-de-mim',
        centro: { latitude: pertoDeMim.lat, longitude: pertoDeMim.lng },
        raio: pertoDeMim.raio,
        corPreenchimento: 'rgba(212,160,23,0.15)',
        corBorda: '#D4A017',
        larguraBorda: 2,
      });
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
  }, [pertoDeMim, mostrarCalor, celulasCalor, pesoMaximo]);

  const marcadores = useMemo<MarcadorMapa[]>(
    () =>
      mostrarCalor
        ? []
        : filtrados.map((defeito) => ({
            key: String(defeito.id),
            coordenada: { latitude: defeito.latitude, longitude: defeito.longitude },
            cor: getStatusColor(defeito.status, concluidoEm(defeito)),
          })),
    [mostrarCalor, filtrados],
  );

  function handleMapPress(coordinate: { latitude: number; longitude: number }) {
    if (!criando) return;
    if (poligono && !pointInPolygon([coordinate.longitude, coordinate.latitude], poligono)) {
      addToast('Localização fora do perímetro municipal.', 'error');
      return;
    }
    setCriando(false);
    router.push({
      pathname: '/novo',
      params: { lat: String(coordinate.latitude), lng: String(coordinate.longitude) },
    });
  }

  async function ativarPertoDeMim() {
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) {
      addToast('Não foi possível obter sua localização.', 'error');
      return;
    }
    addToast('Buscando sua localização...', 'info');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPertoDeMim({ lat: pos.coords.latitude, lng: pos.coords.longitude, raio: 500 });
      mapRef.current?.animarPara(regiaoEmTorno(pos.coords.latitude, pos.coords.longitude, 0.02));
      addToast('Filtro "Perto de Mim" ativado.');
    } catch {
      addToast('Não foi possível obter sua localização.', 'error');
    }
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

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}>
      <AppHeader hint={criando ? 'Toque no mapa para posicionar o chamado' : undefined} />

      <View style={styles.mapaWrapper}>
        <MapSurface
          ref={mapRef}
          regiaoInicial={regiaoInicial}
          poligonoMunicipio={poligonoLatLng}
          circulos={circulos}
          marcadores={marcadores}
          onPressMapa={handleMapPress}
          onPressMarcador={(key) => {
            const defeito = filtrados.find((d) => String(d.id) === key);
            if (defeito) abrirDetalhe(defeito);
          }}
          escuro={theme === 'dark'}
          mostrarUsuario={isAuthenticated}
        />

        {!isAuthenticated ? (
          <View
            style={[
              styles.aviso,
              { backgroundColor: colors.bgElevated, borderColor: colors.borderDefault },
            ]}>
            <Text style={[styles.avisoTexto, { color: colors.textMuted }]}>
              Faça login para ver os chamados individuais
            </Text>
          </View>
        ) : null}

        {isAuthenticated ? (
          <View style={[styles.controles, { bottom: insets.bottom + Spacing[16] }]}>
            {pertoDeMim ? (
              <View
                style={[
                  styles.raioCaixa,
                  { backgroundColor: colors.bgElevated, borderColor: colors.gold500 },
                ]}>
                <Text style={[styles.raioTexto, { color: colors.textSecondary }]}>
                  {filtrados.length} no raio
                </Text>
                {RAIOS.map((raio) => (
                  <Pressable
                    key={raio}
                    onPress={() => setPertoDeMim((p) => (p ? { ...p, raio } : p))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: pertoDeMim.raio === raio }}>
                    <Text
                      style={[
                        styles.raioOpcao,
                        {
                          color: pertoDeMim.raio === raio ? colors.gold500 : colors.textMuted,
                          fontWeight:
                            pertoDeMim.raio === raio ? FontWeight.bold : FontWeight.regular,
                        },
                      ]}>
                      {raio >= 1000 ? `${raio / 1000}km` : `${raio}m`}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => {
                    setPertoDeMim(null);
                    addToast('Filtro "Perto de Mim" desativado.');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Desativar filtro Perto de Mim"
                  hitSlop={6}>
                  <Ionicons name="close" size={14} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={ativarPertoDeMim}
                accessibilityRole="button"
                style={[
                  styles.botaoPill,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
                ]}>
                <Ionicons name="locate" size={14} color={colors.textSecondary} />
                <Text style={[styles.botaoPillTexto, { color: colors.textSecondary }]}>
                  Perto de Mim
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => setMenuAberto(true)}
              accessibilityRole="button"
              accessibilityLabel="Filtros do mapa"
              style={[
                styles.botaoRedondo,
                { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
              ]}>
              <Ionicons name="funnel" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {isAuthenticated ? (
          <Pressable
            onPress={() => setCriando((c) => !c)}
            accessibilityRole="button"
            accessibilityLabel={criando ? 'Cancelar novo chamado' : 'Novo chamado'}
            style={[
              styles.fab,
              {
                bottom: insets.bottom + Spacing[6],
                backgroundColor: criando ? colors.bgElevated : colors.gold500,
              },
            ]}>
            <Ionicons
              name={criando ? 'close' : 'add'}
              size={24}
              color={criando ? colors.textSecondary : colors.textInverse}
            />
          </Pressable>
        ) : null}
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
          </View>
        </Pressable>
      </Modal>

      <DefectSheet
        key={selecionado?.id}
        defeito={selecionado}
        apoiado={selecionado ? apoiei.has(selecionado.id) : false}
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
  aviso: {
    position: 'absolute',
    top: Spacing[4],
    alignSelf: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderWidth: 1,
  },
  avisoTexto: {
    fontSize: FontSize.xs,
  },
  controles: {
    position: 'absolute',
    right: Spacing[4],
    alignItems: 'flex-end',
    gap: Spacing[2],
  },
  botaoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1] + 2,
    height: 32,
    paddingHorizontal: Spacing[3],
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  botaoPillTexto: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  botaoRedondo: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raioCaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderWidth: 1,
  },
  raioTexto: {
    fontSize: FontSize.xs - 1,
  },
  raioOpcao: {
    fontSize: FontSize.xs - 1,
  },
  fab: {
    position: 'absolute',
    right: Spacing[4],
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  menuBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: Spacing[4],
    paddingBottom: Spacing[16],
  },
  menu: {
    minWidth: 200,
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
});
