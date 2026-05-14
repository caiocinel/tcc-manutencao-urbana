import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polygon } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Plus, Heart, Paperclip, Sun, Fire, MapPin, NotePencil, Check, X } from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const statusColors = {
  pendente: '#eab308',
  em_andamento: '#f97316',
  resolvido: '#22c55e',
};

function censurarNome(nome) {
  if (!nome || nome.length <= 6) return nome || 'Anônimo';
  return nome.slice(0, 3) + '*'.repeat(nome.length - 6) + nome.slice(-3);
}

function MapClickHandler({ creating, onMapClick, setPinPos }) {
  useMapEvents({
    click(e) {
      if (creating) onMapClick(e.latlng);
    },
    mousemove(e) {
      if (creating) setPinPos(e.latlng);
    },
  });
  return null;
}

const pinIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

import HeatmapLayer from '../components/HeatmapLayer';

function IndividualMarker({ d, isAuthenticated, onApoiar, onAttach }) {
  if (!d.latitude || !d.longitude) return null;
  const color = statusColors[d.status] || 'gray';
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  const imagens = [];
  if (d.imagem_url || d.imagem_thumbnail) imagens.push(d.imagem_thumbnail || d.imagem_url);
  if (d.imagens_extra?.length > 0) imagens.push(...d.imagens_extra);

  return (
    <Marker position={[d.latitude, d.longitude]} icon={icon}>
      <Popup>
        <strong>{d.titulo}</strong>
        <p>{d.descricao}</p>
        <p>Status: <strong>{d.status}</strong></p>
        {d.usuario?.nome && <p style={{ fontSize: 12, color: '#9ca3af' }}>Por: {censurarNome(d.usuario.nome)}</p>}
        {imagens.map((url, i) => (
          <img key={i} src={url} alt={`${d.titulo} - ${i + 1}`} style={{ width: '100%', maxWidth: 200, borderRadius: 4, marginTop: i > 0 ? 4 : 0 }} />
        ))}
        {d.atualizacoes?.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
            {d.atualizacoes.map((a, i) => (
              <p key={i} style={{ marginTop: 2 }}>
                <NotePencil size={10} style={{ marginRight: 2, verticalAlign: 'middle' }} /> {a.texto} <em>({new Date(a.criado_em).toLocaleDateString()})</em>
              </p>
            ))}
          </div>
        )}
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn-sm btn-apoiar" onClick={() => onApoiar(d.id)}>
            <Heart size={13} weight={d.usuario_apoiou ? 'fill' : 'regular'} style={{ verticalAlign: 'middle', marginRight: 2 }} />
            Apoiar ({d.apoios_total || 0})
          </button>
          {isAuthenticated && d.status === 'pendente' && (
            <button className="btn-sm btn-apoiar" onClick={() => onAttach(d)}>
              <Paperclip size={13} style={{ verticalAlign: 'middle', marginRight: 2 }} />
              Anexar
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

const IndividualMarkerMemo = memo(IndividualMarker);

function ClusterMarker({ c, selectedIds, isAuthenticated, encerrando, onToggleSelect, onConfirmEncerrar, onApoiar, onAttach }) {
  const [visibleCount, setVisibleCount] = useState(() => 5);
  useEffect(() => { setVisibleCount(5); }, [c.id]);
  const selecionados = Object.keys(selectedIds).filter(k => selectedIds[k]).length;
  const clusterIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:#22c55e;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:13px">${c.total}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
  const visibleDefeitos = c.defeitos.slice(0, visibleCount);
  const hasMore = c.defeitos.length > visibleCount;
  return (
    <Marker position={[c.centro.latitude, c.centro.longitude]} icon={clusterIcon}>
      <Popup>
        <div className="cluster-popup">
          <div className="cluster-popup-header">{c.total} chamados nesta região</div>
          {isAuthenticated && selecionados > 0 && (
            <button
              onClick={() => onConfirmEncerrar(true)}
              disabled={encerrando}
              className="cluster-encerrar-btn"
            >
              {encerrando ? 'Encerrando...' : `Encerrar Selecionados (${selecionados})`}
            </button>
          )}
          <div className="cluster-popup-list">
            {visibleDefeitos.map((d) => {
              const imagens = [];
              if (d.imagem_url || d.imagem_thumbnail) imagens.push(d.imagem_thumbnail || d.imagem_url);
              if (d.imagens_extra?.length > 0) imagens.push(...d.imagens_extra);
              return (
                <div key={d.id} className="cluster-item">
                  <label className="cluster-item-label">
                    {isAuthenticated && (
                      <input
                        type="checkbox"
                        checked={!!selectedIds[d.id]}
                        onChange={() => onToggleSelect(d.id)}
                        className="cluster-item-checkbox"
                      />
                    )}
                    <div className="cluster-item-content">
                      <div className="cluster-item-title">{d.titulo}</div>
                      <div className="cluster-item-desc">{d.descricao}</div>
                      <div className="cluster-item-meta">
                        <span className={`status-badge status-${d.status}`}>{d.status}</span>
                        {d.usuario?.nome && <span>{censurarNome(d.usuario.nome)}</span>}
                      </div>
                      {imagens.map((url, i) => (
                        <img key={i} src={url} alt={`${d.titulo} - ${i + 1}`} className="cluster-item-img" />
                      ))}
                      {d.atualizacoes?.length > 0 && (
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {d.atualizacoes.map((a, j) => (
                            <p key={j}>
                              <NotePencil size={10} style={{ marginRight: 2, verticalAlign: 'middle' }} /> {a.texto}
                            </p>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        <button className="btn-sm btn-apoiar" style={{ fontSize: 11 }} onClick={() => onApoiar(d.id)}>
                          <Heart size={11} weight={d.usuario_apoiou ? 'fill' : 'regular'} style={{ verticalAlign: 'middle', marginRight: 1 }} />
                          {d.apoios_total || 0}
                        </button>
                        {isAuthenticated && d.status === 'pendente' && (
                          <button className="btn-sm btn-apoiar" style={{ fontSize: 11 }} onClick={() => onAttach(d)}>
                            <Paperclip size={11} style={{ verticalAlign: 'middle' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
          {hasMore && (
            <button
              onClick={() => setVisibleCount(prev => prev + 5)}
              className="btn-secondary"
              style={{ width: '100%', marginTop: 8, fontSize: 'var(--text-sm)' }}
            >
              Ver mais {Math.min(5, c.defeitos.length - visibleCount)} de {c.defeitos.length}
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

const ClusterMarkerMemo = memo(ClusterMarker);

export default function MapPage() {
  const [defeitos, setDefeitos] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const tileUrl = theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const boundaryColor = theme === 'light' ? '#22c55e' : '#16a34a';
  const navigate = useNavigate();
  const addToast = useToast();
  const geoTimeoutRef = useRef(null);
  const mapRef = useRef(null);
  const mun = user?.municipio;
  const hasBounds = mun &&
    typeof mun.min_lat === 'number' && isFinite(mun.min_lat) &&
    typeof mun.min_lng === 'number' && isFinite(mun.min_lng) &&
    typeof mun.max_lat === 'number' && isFinite(mun.max_lat) &&
    typeof mun.max_lng === 'number' && isFinite(mun.max_lng);
  const mapBounds = hasBounds ? L.latLngBounds([mun.min_lat, mun.min_lng], [mun.max_lat, mun.max_lng]) : null;
  const defaultCenter = hasBounds ? [(mun.min_lat + mun.max_lat) / 2, (mun.min_lng + mun.max_lng) / 2] : [-22.6069, -46.9190];

  let polygonPositions = null;
  let centroid = null;
  let overlayPositions = null;
  if (mun?.poligono_json) {
    try {
      const parsed = typeof mun.poligono_json === 'string' ? JSON.parse(mun.poligono_json) : mun.poligono_json;
      if (parsed?.coordinates?.[0]) {
        polygonPositions = parsed.coordinates[0].map(([lng, lat]) => [lat, lng]);
        const n = polygonPositions.length;
        centroid = polygonPositions.reduce(([al, an], [lat, lng]) => [al + lat / n, an + lng / n], [0, 0]);
        overlayPositions = [
          [[90, -180], [90, 180], [-90, 180], [-90, -180], [90, -180]],
          [...polygonPositions].reverse(),
        ];
      }
      } catch { /* geocode fail — non-critical */ }
  }

  const [creating, setCreating] = useState(false);
  const [pinPos, setPinPos] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagem, setImagem] = useState(null);
  const [rua, setRua] = useState('');
  const [bairro, setBairro] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [submitError, setSubmitError] = useState('');

  const [filtro, setFiltro] = useState('pendentes');
  const [diasFiltro, setDiasFiltro] = useState('');
  const [, setMeusDefeitos] = useState([]);
  const [selectedIds, setSelectedIds] = useState({});
  const [encerrando, setEncerrando] = useState(false);
  const [showConfirmEncerrar, setShowConfirmEncerrar] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(!isAuthenticated);
  const [attachDefeito, setAttachDefeito] = useState(null);
  const [attachImagem, setAttachImagem] = useState(null);
  const [attachTexto, setAttachTexto] = useState('');
  const [descricaoLen, setDescricaoLen] = useState(0);
  const [fileName, setFileName] = useState('');
  const [attachSaving, setAttachSaving] = useState(false);

  const geocodeLatLng = useCallback(async (latlng) => {
    if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
    geoTimeoutRef.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'CentralInteligenciaUrbana/1.0' } }
        );
        const data = await res.json();
        if (data.address) {
          setRua(data.address.road || data.address.path || '');
          setBairro(data.address.suburb || data.address.neighbourhood || data.address.district || '');
        }
      } catch {
        // erro de geocodificação ignorado - não crítico
      } finally {
        setGeocoding(false);
      }
    }, 300);
  }, []);

  const carregarDados = useCallback(() => {
    setLoading(true);
    setApiError('');
    const params = {};
    if (isAuthenticated) {
      if (filtro === 'pendentes') params.status = 'pendente,em_andamento';
      else if (filtro === 'atendidos') params.status = 'atendido,encerrado';
      else if (filtro === 'meus' && user?.id) params.usuario = user.id;
    }
    if (diasFiltro) params.dias = diasFiltro;
    api.listClusters(params)
      .then((data) => {
        setClusters(data);
        setDefeitos(data.flatMap(c => c.defeitos));
      })
      .catch((err) => {
        setApiError('Erro ao carregar: ' + err.message);
        api.listDefeitos().then(setDefeitos).catch(() => {});
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, filtro, diasFiltro, user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    const el = document.querySelector('.map-container');
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current.invalidateSize(), 200);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    api.listCategorias().then(setCategorias).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      api.meusDefeitos().then(setMeusDefeitos).catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key !== 'Escape') return;
      if (showConfirmEncerrar) setShowConfirmEncerrar(false);
      else if (attachDefeito) setAttachDefeito(null);
      else if (showForm) handleCancel();
    }
    if (showForm || showConfirmEncerrar || attachDefeito) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showForm, showConfirmEncerrar, attachDefeito]);

  function handleStartCreate() {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!user?.admin && !user?.email_verificado) {
      setApiError('Verifique seu email na página "Conta" antes de criar um chamado.');
      return;
    }
    setCreating(true);
    setPinPos(null);
    setShowForm(false);
    setTitulo('');
    setDescricao('');
    setDescricaoLen(0);
    setImagem(null);
    setFileName('');
    setRua('');
    setBairro('');
    setCategoria('');
    setSubmitError('');
  }

  const handleMapClick = useCallback(async (latlng) => {
    if (polygonPositions && user?.municipio_id && !user?.admin) {
      let inside = false;
      const verts = polygonPositions;
      for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
        const [lat_i, lng_i] = verts[i];
        const [lat_j, lng_j] = verts[j];
        if ((lat_i > latlng.lat) !== (lat_j > latlng.lat) && latlng.lng < (lng_j - lng_i) * (latlng.lat - lat_i) / (lat_j - lat_i) + lng_i) {
          inside = !inside;
        }
      }
      if (!inside) {
        setApiError('O chamado deve estar dentro do perímetro do seu município');
        return;
      }
    }
    setApiError('');
    setPinPos(latlng);
    setShowForm(true);
    setCreating(false);
    geocodeLatLng(latlng);
  }, [geocodeLatLng, polygonPositions, user]);

  function handleCancel() {
    setCreating(false);
    setPinPos(null);
    setShowForm(false);
    setTitulo('');
    setDescricao('');
    setImagem(null);
    setRua('');
    setBairro('');
    setCategoria('');
    setSubmitError('');
  }

  function handlePinDrag(e) {
    const latlng = e.target.getLatLng();
    setPinPos(latlng);
    geocodeLatLng(latlng);
  }

  const catSelecionada = categorias.find(c => c.nome === categoria);
  const previsaoLabel = catSelecionada ? new Date(Date.now() + catSelecionada.prazo_sla_dias * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR') : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    if (!pinPos) return;
    if (polygonPositions && user?.municipio_id && !user?.admin) {
      let inside = false;
      for (let i = 0, j = polygonPositions.length - 1; i < polygonPositions.length; j = i++) {
        const [lat_i, lng_i] = polygonPositions[i];
        const [lat_j, lng_j] = polygonPositions[j];
        if ((lat_i > pinPos.lat) !== (lat_j > pinPos.lat) && pinPos.lng < (lng_j - lng_i) * (pinPos.lat - lat_i) / (lat_j - lat_i) + lng_i) {
          inside = !inside;
        }
      }
      if (!inside) {
        setSubmitError('O chamado deve estar dentro do perímetro do seu município');
        return;
      }
    }
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('descricao', descricao);
    formData.append('latitude', pinPos.lat);
    formData.append('longitude', pinPos.lng);
    formData.append('rua', rua);
    formData.append('bairro', bairro);
    formData.append('categoria', categoria);
    if (imagem) formData.append('imagem', imagem);

    try {
      const res = await api.createDefeito(formData);
      if (res.offline) {
        addToast(res.message, 'success');
      } else {
        carregarDados();
      }
      handleCancel();
    } catch (err) {
      setSubmitError(err.message);
    }
  }

  async function handleApoiar(id) {
    try {
      await api.apoiarDefeito(id);
      carregarDados();
    } catch (err) {
      addToast('Erro ao apoiar: ' + err.message, 'error');
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleAnexar(e) {
    e.preventDefault();
    if (!attachImagem && !attachTexto.trim()) return;
    setAttachSaving(true);
    try {
      const fd = new FormData();
      if (attachImagem) fd.append('imagem', attachImagem);
      if (attachTexto.trim()) fd.append('atualizacao', attachTexto);
      await api.anexarDefeito(attachDefeito.id, fd);
      addToast('Anexado com sucesso!', 'success');
      setAttachDefeito(null);
      setAttachImagem(null);
      setAttachTexto('');
      carregarDados();
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    } finally {
      setAttachSaving(false);
    }
  }

  async function handleEncerrarSelecionados() {
    const ids = Object.keys(selectedIds).filter(k => selectedIds[k]);
    if (ids.length === 0) return;
    setEncerrando(true);
    try {
      await api.encerrarLote(ids);
      setSelectedIds({});
      carregarDados();
    } catch (err) {
      setApiError('Erro ao encerrar: ' + err.message);
    } finally {
      setEncerrando(false);
    }
  }

  const renderizarIndividuais = () => {
    const lista = clusters.length > 0
      ? clusters.flatMap(c => c.defeitos)
      : defeitos;
    return lista
      .filter(d => clusters.length === 0 || clusters.some(c => c.total < 3 && c.defeitos.some(x => x.id === d.id)))
      .map((d) => (
        <IndividualMarkerMemo
          key={d.id}
          d={d}
          isAuthenticated={isAuthenticated}
          onApoiar={handleApoiar}
          onAttach={(def) => { setAttachDefeito(def); setAttachImagem(null); setAttachTexto(''); }}
        />
      ));
  };

  const renderizarClusters = () => {
    return clusters
      .filter(c => c.total >= 3)
      .map((c) => (
        <ClusterMarkerMemo
          key={'c-' + c.id}
          c={c}
          selectedIds={selectedIds}
          isAuthenticated={isAuthenticated}
          encerrando={encerrando}
          onToggleSelect={toggleSelect}
          onConfirmEncerrar={setShowConfirmEncerrar}
          onApoiar={handleApoiar}
          onAttach={(def) => { setAttachDefeito(def); setAttachImagem(null); setAttachTexto(''); }}
        />
      ));
  };

  return (
    <div className="map-page">
      <Header creating={creating} />

      {apiError && <p className="error" style={{ textAlign: 'center', padding: 8 }} role="alert">{apiError}</p>}

      <AnimatePresence>
        {isAuthenticated && !creating && (
          <motion.div
            className="map-filters"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button className={filtro === 'todos' ? 'filter-active' : ''} onClick={() => setFiltro('todos')} aria-label="Filtrar todos os chamados">Todos</button>
            <button className={filtro === 'pendentes' ? 'filter-active' : ''} onClick={() => setFiltro('pendentes')} aria-label="Filtrar chamados pendentes">Pendentes</button>
            <button className={filtro === 'atendidos' ? 'filter-active' : ''} onClick={() => setFiltro('atendidos')} aria-label="Filtrar chamados atendidos">Atendidos</button>
            <button className={filtro === 'meus' ? 'filter-active' : ''} onClick={() => setFiltro('meus')} aria-label="Filtrar meus chamados">Meus Chamados</button>
            <motion.button
              className={heatmapVisible ? 'filter-active' : ''}
              onClick={() => setHeatmapVisible(v => !v)}
              whileTap={{ scale: 0.95 }}
            >
              {heatmapVisible ? <Sun size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> : <Fire size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
              {heatmapVisible ? 'Mapa Normal' : 'Mapa de Calor'}
            </motion.button>
            <select className="filter-select" value={diasFiltro} onChange={e => setDiasFiltro(e.target.value)}>
              <option value="">Todo período</option>
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 300 }}>
        <MapContainer
          center={centroid || defaultCenter}
          zoom={14}
          className="map-container"
          maxBounds={mapBounds}
          maxBoundsViscosity={1}
          minZoom={12}
          style={{ height: '100%', width: '100%', minHeight: 'inherit' }}
          ariaLabel={isAuthenticated ? 'Mapa de chamados públicos' : 'Mapa de chamados públicos — faça login para interagir'}
          whenReady={(ev) => {
            mapRef.current = ev.target;
            setTimeout(() => ev.target.invalidateSize(), 350);
            setTimeout(() => ev.target.invalidateSize(), 900);
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url={tileUrl}
          />

          {overlayPositions && (
            <Polygon
              positions={overlayPositions}
              pathOptions={{ color: 'none', fillColor: '#000', fillOpacity: 0.4, interactive: false, fillRule: 'evenodd' }}
            />
          )}
          {polygonPositions && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{ color: boundaryColor, weight: 2, fillColor: 'transparent', interactive: false }}
            />
          )}

          {creating && (
            <MapClickHandler creating={creating} onMapClick={handleMapClick} setPinPos={setPinPos} />
          )}

          {pinPos && showForm && (
            <Marker position={pinPos} icon={pinIcon} draggable={true} eventHandlers={{ dragend: handlePinDrag }} />
          )}

          {creating && pinPos && !showForm && (
            <Marker position={pinPos} icon={pinIcon} />
          )}

          {!isAuthenticated || heatmapVisible ? (
            <HeatmapLayer pontos={defeitos} ativo={true} />
          ) : (
            <>
              {renderizarIndividuais()}
              {renderizarClusters()}
            </>
          )}
        </MapContainer>

        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1000, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div className="skeleton skeleton-cluster" style={{ margin: '0 auto 8px' }} />
              <div className="skeleton skeleton-line" style={{ width: 160, margin: '0 auto' }} />
              <div className="skeleton skeleton-line" style={{ width: 100, margin: '4px auto 0' }} />
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div style={{
            position: 'absolute', bottom: 100, left: 0, right: 0, zIndex: 1000,
            display: 'flex', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <div style={{
              background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
              padding: '8px 16px', borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)', boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border-default)',
            }}>
              Faça login para ver detalhes e interagir com os chamados
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAuthenticated && !creating && (
          <motion.button
            className="fab"
            onClick={handleStartCreate}
            aria-label="Criar novo chamado"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <Plus size={24} weight="bold" />
          </motion.button>
        )}
      </AnimatePresence>

      {showConfirmEncerrar && (
        <div className="defect-overlay" onClick={() => setShowConfirmEncerrar(false)} role="dialog" aria-modal="true" aria-label="Confirmar encerramento" aria-describedby="confirm-desc">
          <div className="defect-modal" style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3>Confirmar Encerramento</h3>
            <p id="confirm-desc" className="chamado-desc" style={{ marginBottom: 'var(--space-4)' }}>
              Deseja realmente encerrar {Object.keys(selectedIds).filter(k => selectedIds[k]).length} chamado(s)?
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-primary" onClick={async () => { setShowConfirmEncerrar(false); await handleEncerrarSelecionados(); }}>
                <Check size={16} weight="bold" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Sim, Encerrar
              </button>
              <button className="btn-secondary" onClick={() => setShowConfirmEncerrar(false)}>
                <X size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {attachDefeito && (
        <div className="defect-overlay" onClick={() => setAttachDefeito(null)} role="dialog" aria-modal="true" aria-label="Anexar ao chamado" aria-describedby="attach-desc">
          <div className="defect-modal" onClick={e => e.stopPropagation()}>
            <h3>
              <Paperclip size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Anexar ao Chamado
            </h3>
            <p id="attach-desc" className="chamado-meta" style={{ marginBottom: 'var(--space-2)' }}><strong>{attachDefeito.titulo}</strong></p>
            <form onSubmit={handleAnexar} className="defect-form">
              <textarea placeholder="Adicione uma atualização sobre o chamado..." value={attachTexto} onChange={e => setAttachTexto(e.target.value)} rows={2} aria-label="Texto da atualização" />
              <input type="file" accept="image/*" onChange={e => setAttachImagem(e.target.files[0])} aria-label="Selecionar imagem para anexar" />
              <p className="hint">Máximo 3 imagens por chamado. Formatos: JPEG, PNG, WebP.</p>
              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={attachSaving}>
                  {attachSaving ? 'Salvando...' : (
                    <><Paperclip size={16} weight="bold" style={{ verticalAlign: 'middle', marginRight: 4 }} /> {(attachImagem || attachTexto.trim()) ? 'Anexar' : 'Selecione algo'}</>
                  )}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setAttachDefeito(null)}>
                  <X size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && pinPos && (
        <div className="defect-overlay" role="dialog" aria-modal="true" aria-label="Novo chamado" onClick={handleCancel}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-card-header">
              <div className="modal-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
                </svg>
              </div>
              <h2 className="modal-card-title">Novo chamado</h2>
            </div>

            {submitError && <p className="error" id="submit-error" role="alert" style={{ marginBottom: 12 }}>{submitError}</p>}

            <form onSubmit={handleSubmit} aria-describedby={submitError ? 'submit-error' : undefined}>
              <p className="modal-section-label">Informações do chamado</p>

              <div className="modal-field">
                <label htmlFor="titulo">Título <span className="req">*</span></label>
                <input id="titulo" type="text" placeholder="Ex: Buraco na calçada da Rua das Flores" value={titulo} onChange={e => setTitulo(e.target.value)} required />
              </div>

              <div className="modal-field">
                <label htmlFor="categoria">Categoria <span className="req">*</span></label>
                <div className="select-wrap">
                  <select id="categoria" value={categoria} onChange={e => setCategoria(e.target.value)} required>
                    <option value="" disabled>Selecione a categoria</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-field">
                <label htmlFor="descricao">Descrição <span className="req">*</span></label>
                <textarea id="descricao" placeholder="Descreva o problema com o máximo de detalhes possível..." value={descricao} onChange={e => { setDescricao(e.target.value); setDescricaoLen(e.target.value.length); }} rows={3} required />
                <div className="char-bar-wrap">
                  <div className="char-bar"><div className="char-bar-fill" style={{ width: Math.min((descricaoLen / 20) * 100, 100) + '%' }} data-done={descricaoLen >= 20} /></div>
                  <span className="char-hint" data-done={descricaoLen >= 20}>{descricaoLen >= 20 ? descricaoLen + ' caracteres ✓' : 'Mínimo 20 caracteres · ' + descricaoLen}</span>
                </div>
              </div>

              {catSelecionada && (
                <p className="hint" style={{ marginTop: -4, marginBottom: 16 }}>
                  Prioridade: <strong>{catSelecionada.prioridade_base}</strong> · Previsão: <strong>{previsaoLabel}</strong>
                </p>
              )}

              <p className="modal-section-label">Localização</p>

              <div className="row2">
                <div className="modal-field">
                  <label htmlFor="logradouro">Logradouro</label>
                  <input id="logradouro" type="text" placeholder="Rua" value={rua} onChange={e => setRua(e.target.value)} />
                </div>
                <div className="modal-field">
                  <label htmlFor="bairro">Bairro</label>
                  <input id="bairro" type="text" placeholder="Bairro" value={bairro} onChange={e => setBairro(e.target.value)} />
                </div>
              </div>

              <div className="location-box">
                <MapPin size={16} />
                <div className="loc-info">
                  <div className="loc-coord">{pinPos.lat.toFixed(5)}, {pinPos.lng.toFixed(5)}</div>
                  {geocoding ? <div className="loc-sub">Obtendo endereço...</div> : <div className="loc-sub">Arraste o alfinete no mapa para ajustar</div>}
                </div>
              </div>

              <p className="modal-section-label" style={{ marginTop: 20 }}>Anexo <span className="modal-section-opt">(opcional)</span></p>

              <label className="upload-zone" htmlFor="fileInput">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
                <div>
                  <div className="utext">{fileName || 'Clique para escolher uma foto'}</div>
                  <div className="usub">{fileName ? 'Arquivo selecionado' : 'JPEG, PNG, WebP · até 5 MB'}</div>
                </div>
                <input type="file" id="fileInput" accept="image/*" onChange={e => { const f = e.target.files[0]; setImagem(f); setFileName(f ? f.name : ''); }} />
              </label>

              <div className="privacy-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                </svg>
                <span>Fotos passam por desfoque automático para proteger rostos e placas.</span>
              </div>

              <p className="required-note"><span className="req">*</span> Campos obrigatórios</p>

              <div className="modal-card-actions">
                <button type="button" className="btn btn-cancel" onClick={handleCancel}>
                  <X size={15} /> Cancelar
                </button>
                <button type="submit" className="btn btn-submit">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
                  </svg>
                  Enviar chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
