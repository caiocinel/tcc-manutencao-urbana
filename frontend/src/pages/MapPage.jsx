import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Plus, X, Camera, ThumbsUp, Sun, Moon, MagnifyingGlass, Fire, Funnel, Handshake } from '@phosphor-icons/react';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/toast-context';
import { api } from '../services/api';
import { StatusBadge } from '../components/ui/status-badge';
import { getStatusColor } from '../components/ui/status-utils';
import UserDropdown from '../components/ui/user-dropdown';
import { CommandMenu } from '../components/ui/command-menu';
import { useTheme } from '../context/ThemeContext';
import { createPlacementPinIcon, createDefectIcon } from '../utils/map-markers';
import { getTimelineItems } from '../utils/timeline';
import { Timeline } from '../components/ui/timeline';
import HeatmapLayer from '../components/HeatmapLayer';
import SyncIndicator from '../components/ui/sync-indicator';

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const BRAZIL_BOUNDS = [[-33.75, -73.99], [5.27, -28.85]];

function pointInPolygon(point, vs) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const [xi, yi] = vs[i], [xj, yj] = vs[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function MapClickHandler({ creatingRef, polygonCoordsRef, setCoords, setShowForm, addToast }) {
  useMapEvents({
    click(e) {
      if (!creatingRef.current) return;
      const point = [e.latlng.lng, e.latlng.lat];
      const dentro = !polygonCoordsRef.current || pointInPolygon(point, polygonCoordsRef.current);
      if (!dentro) {
        addToast('Localização fora do perímetro municipal.', 'error');
        return;
      }
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setShowForm(true);
    },
  });
  return null;
}

export default function MapPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();
  const mapRef = useRef(null);
  const [defeitos, setDefeitos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [heatmap, setHeatmap] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  useEffect(() => { creatingRef.current = creating; }, [creating]);
  const [coords, setCoords] = useState(null);
  const [formData, setFormData] = useState({ titulo: '', descricao: '', categoria: 'Buraco', rua: '', bairro: '' });
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [polygonCoords, setPolygonCoords] = useState(null);
  const polygonCoordsRef = useRef(null);
  useEffect(() => { polygonCoordsRef.current = polygonCoords; }, [polygonCoords]);
  const [atendendo, setAtendendo] = useState(null);
  const [apoiando, setApoiando] = useState(null);
  const [apoiei, setApoiei] = useState(new Set());
  const [selectedImage, setSelectedImage] = useState(null);
  const anexarRef = useRef(null);
  const [anexando, setAnexando] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const { theme, toggle: toggleTheme } = useTheme();

  const hasMunicipio = !!user?.municipio?.min_lat && user.municipio.min_lat !== 0;
  const mapCenter = hasMunicipio
    ? [(user.municipio.min_lat + user.municipio.max_lat) / 2, (user.municipio.min_lng + user.municipio.max_lng) / 2]
    : (userLocation || [-28.67, -49.38]);

  const filteredDefeitos = useMemo(() => {
    let f = defeitos;
    if (filtro === 'pendentes') f = f.filter(d => ['pendente','em_andamento','vinculado_sem_resposta','vinculado_com_resposta'].includes(d.status));
    if (filtro === 'atendidos') f = f.filter(d => ['atendido','encerrado','concluido'].includes(d.status));
    if (filtro === 'meus' && user) f = f.filter(d => d.usuario?.id === user.id);
    return f;
  }, [defeitos, filtro, user]);

  const leafletPolyCoords = useMemo(() => {
    if (!polygonCoords) return [];
    return polygonCoords.map(([lng, lat]) => [lat, lng]);
  }, [polygonCoords]);

  const leafletMaskCoords = useMemo(() => {
    if (!leafletPolyCoords.length) return null;
    const worldRing = [[90, -180], [90, 180], [-90, 180], [-90, -180], [90, -180]];
    return [worldRing, [...leafletPolyCoords].reverse()];
  }, [leafletPolyCoords]);

  const handleMapReady = useCallback((ev) => {
    mapRef.current = ev.target;
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !hasMunicipio) return;
    const center = [(user.municipio.min_lat + user.municipio.max_lat) / 2, (user.municipio.min_lng + user.municipio.max_lng) / 2];
    const current = m.getCenter();
    if (Math.abs(current.lat - center[0]) > 0.001 || Math.abs(current.lng - center[1]) > 0.001) {
      m.setView(center, 12, { animate: true });
    }
  }, [hasMunicipio, user?.municipio?.min_lat, user?.municipio?.max_lat, user?.municipio?.min_lng, user?.municipio?.max_lng]);

  useEffect(() => {
    if (!user?.municipio?.poligono_json) { setPolygonCoords(null); return; }
    const raw = user.municipio.poligono_json;
    const poly = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const coords = poly.type === 'Polygon' ? poly.coordinates[0] : poly.coordinates?.[0]?.[0];
    if (coords) setPolygonCoords(coords); else setPolygonCoords(null);
  }, [user?.municipio?.poligono_json]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const timer = setTimeout(() => m.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, showForm, creating, theme]);

  useEffect(() => {
    let cancelled = false;
    api.listDefeitos().then(d => { if (!cancelled) setDefeitos(d); }).catch(() => {});
    api.listCategorias().then(c => { if (!cancelled) setCategorias(c); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    api.apoiei().then(r => { if (!cancelled) setApoiei(new Set(r.ids)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
      },
      () => {
        // falha silenciosa — mantém fallback
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }, [isAuthenticated]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !userLocation) return;
    m.setView(userLocation, 12, { animate: true });
  }, [userLocation]);

  async function reverseGeocode(lat, lng) {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'CentralInteligenciaUrbana/1.0' } }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.address) {
        const rua = data.address.road || data.address.street || '';
        const bairro = data.address.suburb || data.address.neighbourhood || data.address.city_district || '';
        setFormData(p => ({ ...p, rua, bairro }));
      }
    } catch (err) { void err; } finally {
      setGeocoding(false);
    }
  }

  useEffect(() => {
    if (showForm && coords) reverseGeocode(coords.lat, coords.lng);
  }, [showForm, coords]);

  const handleSubmit = useCallback(async () => {
    if (!formData.titulo || formData.descricao.length < 20) {
      addToast('Título obrigatório e descrição mínima de 20 caracteres.', 'error');
      return;
    }
    if (!coords) {
      addToast('Selecione uma localização no mapa.', 'error');
      return;
    }
    if (!formData.categoria) {
      addToast('Selecione uma categoria.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('titulo', formData.titulo);
      fd.append('descricao', formData.descricao);
      fd.append('categoria', formData.categoria);
      fd.append('rua', formData.rua);
      fd.append('bairro', formData.bairro);
      fd.append('latitude', coords.lat);
      fd.append('longitude', coords.lng);
      if (file) fd.append('imagem', file);
      await api.createDefeito(fd);
      addToast('Chamado criado com sucesso!');
      setShowForm(false);
      setCreating(false);
      setCoords(null);
      setFile(null);
      setFormData({ titulo: '', descricao: '', categoria: 'Buraco', rua: '', bairro: '' });
      const d = await api.listDefeitos();
      setDefeitos(d);
    } catch (err) {
      addToast('Erro: ' + (err.message || 'Erro ao criar chamado'), 'error');
    } finally {
      setSubmitting(false);
    }
  }, [formData, coords, file, addToast]);

  const handleAtender = useCallback(async (id, e) => {
    e?.stopPropagation();
    setAtendendo(id);
    try {
      await api.atenderDefeito(id);
      addToast('Chamado vinculado com sucesso!');
      setDefeitos(prev => prev.map(d => d.id === id ? { ...d, status: 'vinculado_sem_resposta', atendente_id: user?.id } : d));
      setSelected(prev => prev?.id === id ? { ...prev, status: 'vinculado_sem_resposta', atendente_id: user?.id } : prev);
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
    finally { setAtendendo(null); }
  }, [addToast, user?.id]);

  const handleApoiar = useCallback(async (id) => {
    setApoiando(id);
    try {
      const res = await api.apoiarDefeito(id);
      setApoiei(prev => {
        const next = new Set(prev);
        if (res.apoiado) next.add(id); else next.delete(id);
        return next;
      });
      if (res.apoiado) {
        addToast('Apoio registrado!');
        setDefeitos(prev => prev.map(d => d.id === id ? { ...d, total_apoios: (d.total_apoios || 0) + 1 } : d));
        setSelected(prev => prev?.id === id ? { ...prev, total_apoios: (prev.total_apoios || 0) + 1 } : prev);
      } else {
        addToast('Apoio removido.');
        setDefeitos(prev => prev.map(d => d.id === id ? { ...d, total_apoios: Math.max(0, (d.total_apoios || 0) - 1) } : d));
        setSelected(prev => prev?.id === id ? { ...prev, total_apoios: Math.max(0, (prev.total_apoios || 0) - 1) } : prev);
      }
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
    finally { setApoiando(null); }
  }, [addToast]);

  const mapKey = `${theme}-${hasMunicipio ? `${user?.municipio_id}-${user?.municipio?.min_lat}-${user?.municipio?.min_lng}` : 'default'}`;

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0, position: 'relative' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, padding: '0 16px', flexShrink: 0, borderBottom: '1px solid var(--color-border-default)', background: 'var(--color-bg-elevated)', zIndex: 1000 }}>
        <div className="flex items-center gap-2">
          <div style={{ width: '1.75rem', height: '1.75rem', background: 'var(--color-gold-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="/icon.svg" alt="Central de Inteligência Urbana" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="max-sm:hidden">
            <h1 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Central de Inteligência Urbana</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Chamados para Serviços Públicos</p>
          </div>
        </div>
        {creating ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-gold-500)' }}>
            <MapPin size={14} /> Clique no mapa para posicionar o alfinete
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <SyncIndicator />
            {isAuthenticated && (
              <button onClick={() => setCmdOpen(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs transition-colors"
                style={{ color: 'var(--color-text-secondary)', background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                aria-label="Buscar (Cmd+K)">
                <MagnifyingGlass size={14} />
                <span className="hidden sm:inline opacity-60">Cmd+K</span>
              </button>
            )}
            <button onClick={toggleTheme} className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              aria-label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {isAuthenticated ? <UserDropdown /> : (
              <button onClick={() => navigate('/login')} className="text-xs font-medium h-8 px-3 rounded-md transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                Entrar
              </button>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {!isAuthenticated && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1500] px-4 py-2 rounded-lg text-xs border"
            style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-muted)' }}>
            Faça login para ver detalhes
          </div>
        )}
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={12}
          className=""
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, background: '#1a1a14' }}
          maxBounds={BRAZIL_BOUNDS}
          minZoom={3}
          maxBoundsViscosity={1.0}
          zoomControl={true}
          whenReady={handleMapReady}>
          <TileLayer url={theme === 'dark' ? DARK_TILES : LIGHT_TILES} noWrap />
          <MapClickHandler
            creatingRef={creatingRef}
            polygonCoordsRef={polygonCoordsRef}
            setCoords={setCoords}
            setShowForm={setShowForm}
            addToast={addToast}
          />
          {coords && (
            <Marker position={[coords.lat, coords.lng]} icon={createPlacementPinIcon()} />
          )}
          {leafletPolyCoords.length > 0 && (
            <>
              <Polygon positions={leafletPolyCoords} pathOptions={{ color: '#D4A017', weight: 2, fillColor: 'rgb(180,140,50)', fillOpacity: 0.15, interactive: false }} />
              {leafletMaskCoords && (
                <Polygon positions={leafletMaskCoords} pathOptions={{ color: 'none', fillColor: 'rgba(0,0,0,0.55)', fillRule: 'evenodd', interactive: false }} />
              )}
            </>
          )}
          {(heatmap || !isAuthenticated) ? (
            <HeatmapLayer pontos={filteredDefeitos} ativo={true} />
          ) : (
            filteredDefeitos.map(d => (
              <Marker
                key={d.id}
                position={[d.latitude, d.longitude]}
                icon={createDefectIcon(d.status, d.atendido_em || d.atualizado_em)}
                eventHandlers={{
                  click: () => {
                    setSelected(d);
                    api.detalharDefeito(d.id).then(full => setSelected(full)).catch(() => {});
                  },
                }}
              />
            ))
          )}
        </MapContainer>
        {isAuthenticated && (
          <div className="fixed right-5 z-[1500]" style={{ bottom: '5.5rem' }}>
            <MapControlsDropdown filtro={filtro} setFiltro={setFiltro} heatmap={heatmap} setHeatmap={setHeatmap} direction="up" />
          </div>
        )}

        {!creating && isAuthenticated && (
          <button onClick={() => setCreating(true)}
            className="fixed bottom-6 right-5 z-[1500] w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'var(--color-gold-500)', color: 'var(--color-text-inverse)' }}>
            <Plus size={22} weight="bold" />
          </button>
        )}

        {creating && (
          <button onClick={() => { setCreating(false); setShowForm(false); setCoords(null); }}
            className="fixed bottom-6 right-5 z-[1500] w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
            <X size={20} />
          </button>
        )}

        {showForm && coords && (
          <motion.div initial={{ y: 300, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-0 left-0 right-0 z-[2000] max-h-[85vh] overflow-y-auto rounded-t-2xl border p-6 pb-safe"
            style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Novo Chamado</h3>
            <div className="space-y-3">
              <input placeholder="Título" value={formData.titulo} onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))}
                className="w-full h-11 px-4 rounded-lg border text-sm outline-none transition-colors bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
                style={{ borderColor: 'var(--color-border-default)' }}
                onFocus={e => e.target.style.borderColor = 'var(--color-gold-500)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border-default)'} />
              <textarea placeholder="Descrição (mín. 20 caracteres)" value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} rows={3}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-colors resize-none bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
                style={{ borderColor: 'var(--color-border-default)' }}
                onFocus={e => e.target.style.borderColor = 'var(--color-gold-500)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border-default)'} />
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-hover)' }}>
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (formData.descricao.length / 20) * 100)}%`,
                      background: formData.descricao.length >= 20
                        ? 'var(--color-success)'
                        : 'var(--color-error)',
                    }} />
                </div>
                <span className="text-xs font-mono shrink-0"
                  style={{ color: formData.descricao.length >= 20 ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {formData.descricao.length}/20
                </span>
              </div>
              <select value={formData.categoria} onChange={e => setFormData(p => ({ ...p, categoria: e.target.value }))}
                className="w-full h-11 px-4 rounded-lg border text-sm outline-none bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
                style={{ borderColor: 'var(--color-border-default)' }}>
                {categorias.map(c => (
                  <option key={c.nome} value={c.nome}>{c.icone} {c.nome}</option>
                ))}
              </select>
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                <input placeholder="Rua" value={formData.rua} onChange={e => setFormData(p => ({ ...p, rua: e.target.value }))}
                  className="flex-1 h-11 px-4 rounded-lg border text-sm outline-none bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
                  style={{ borderColor: 'var(--color-border-default)' }} />
                <input placeholder="Bairro" value={formData.bairro} onChange={e => setFormData(p => ({ ...p, bairro: e.target.value }))}
                  className="flex-1 h-11 px-4 rounded-lg border text-sm outline-none bg-[var(--color-bg-input)] text-[var(--color-text-primary)]"
                  style={{ borderColor: 'var(--color-border-default)' }} />
              </div>
              {geocoding && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-text-muted)', borderTopColor: 'transparent' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Buscando endereço...</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-4 h-11 rounded-lg border text-sm cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-gold-500)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border-default)'}>
                  <Camera size={16} /> {file ? file.name.slice(0, 20) : 'Foto'}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={e => setFile(e.target.files?.[0] || null)} />
                </label>
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ao enviar, você autoriza o uso da imagem para fins de serviço público.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setShowForm(false); setCoords(null); }}
                  className="h-10 px-6 rounded-md text-sm font-medium transition-all"
                  style={{ background: 'transparent', color: 'var(--color-text-secondary)' }}>Cancelar</button>
                <button onClick={handleSubmit} disabled={submitting || formData.descricao.length < 20}
                  className="h-10 px-6 rounded-md text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'var(--color-gold-500)', color: 'var(--color-text-inverse)' }}>
                  {submitting ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {selected && (
          <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md rounded-t-2xl border p-5 pb-safe"
              style={{ background: 'var(--color-bg-surface)', borderColor: 'rgba(180,140,50,0.3)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getStatusColor(selected.status, selected.atendido_em || selected.atualizado_em) }} />
                    <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{selected.titulo}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selected.status} concluido_em={selected.atendido_em || selected.atualizado_em} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {selected.usuario?.nome ? `${selected.usuario.nome.charAt(0)}${'*'.repeat(selected.usuario.nome.length - 1)}` : 'Anônimo'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{selected.descricao}</p>
              {selected.imagem_thumbnail && (
                <img src={selected.imagem_thumbnail} alt="" className="w-full h-32 object-cover rounded-lg mb-3 cursor-pointer"
                  onClick={() => setSelectedImage(selected.imagem_thumbnail)} />
              )}
              {selected.imagens_extra && (() => {
                try { return JSON.parse(selected.imagens_extra); } catch { return []; }
              })().map((url, i) => (
                <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-lg mb-2 cursor-pointer"
                  onClick={() => setSelectedImage(url)} />
              ))}
              <div className="mb-4 mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Histórico</h4>
                <Timeline items={getTimelineItems(selected)} />
              </div>
              <div className="flex items-center gap-3 text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                <span>{new Date(selected.criado_em).toLocaleDateString()}</span>
                {selected.apoios_total > 0 && <span className="flex items-center gap-1"><ThumbsUp size={12} /> {selected.apoios_total}</span>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {user?.admin && !selected.atendente_id && !['atendido','encerrado','concluido'].includes(selected.status) && (
                  <button onClick={e => handleAtender(selected.id, e)} disabled={atendendo === selected.id}
                    className="w-full sm:w-auto h-9 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}>
                    <Handshake size={14} /> {atendendo === selected.id ? '...' : 'Atender Chamado'}
                  </button>
                )}
                <button onClick={() => handleApoiar(selected.id)} disabled={apoiando === selected.id}
                  className="flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  style={{
                    background: apoiei.has(selected.id) ? 'rgba(212,160,23,0.2)' : 'rgba(212,160,23,0.12)',
                    color: 'var(--color-gold-500)',
                    border: apoiei.has(selected.id) ? '1px solid var(--color-gold-500)' : 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = apoiei.has(selected.id) ? 'rgba(212,160,23,0.2)' : 'rgba(212,160,23,0.12)'; }}>
                  {apoiei.has(selected.id) ? <ThumbsUp size={14} weight="fill" /> : <ThumbsUp size={14} />}
                  {apoiando === selected.id ? '...' : apoiei.has(selected.id) ? 'Apoiado' : 'Apoiar'}
                </button>
                <button onClick={() => anexarRef.current?.click()} disabled={anexando === selected.id}
                  className="flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  style={{ background: 'transparent', border: '1px solid var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-gold-500)'; e.currentTarget.style.color = 'var(--color-gold-500)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-default)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                  <Camera size={14} /> {anexando === selected.id ? '...' : 'Anexar'}
                </button>
                <input ref={anexarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setAnexando(selected.id);
                    try {
                      await api.anexarImagem(selected.id, f);
                      addToast('Imagem anexada!');
                      const d = await api.detalharDefeito(selected.id);
                      setSelected(d);
                      setDefeitos(prev => prev.map(x => x.id === d.id ? d : x));
                    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
                    finally { setAnexando(null); e.target.value = ''; }
                  }} />
              </div>
            </motion.div>
          </div>
        )}
      </div>
      {selectedImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()} />
          <button onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white bg-black/40 hover:bg-black/60 transition-colors text-xl">
            ✕
          </button>
        </div>
      )}
      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} isAdmin={user?.admin} />
    </div>
  );
}

function MapControlsDropdown({ filtro, setFiltro, heatmap, setHeatmap, direction = 'down' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const dropdownPos = direction === 'up'
    ? 'absolute right-0 bottom-full mb-2'
    : 'absolute right-0 top-full mt-2';

  function activeDot(isActive) {
    return isActive
      ? <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-gold-500)' }} />
      : <span className="w-1.5 h-1.5 shrink-0" />;
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold transition-colors select-none"
        style={{
          borderColor: open ? 'var(--color-gold-500)' : 'var(--color-border-default)',
          color: 'var(--color-text-secondary)',
          background: open ? 'var(--color-bg-surface)' : 'var(--color-bg-surface)',
        }}>
        <Funnel size={14} weight={open ? 'fill' : 'regular'} />
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, y: direction === 'up' ? 4 : -4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: direction === 'up' ? 4 : -4, scale: 0.96 }} transition={{ duration: 0.15, ease: [0.16,1,0.3,1] }}
          className={`${dropdownPos} min-w-[180px] rounded-xl border p-1.5 shadow-lg z-[3000]`}
          style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-default)' }}>
          <button onClick={() => { setHeatmap(h => !h); setOpen(false); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: heatmap ? 'var(--color-gold-500)' : 'var(--color-text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = heatmap ? 'var(--color-gold-500)' : 'var(--color-text-secondary)'; }}>
            <Fire size={16} weight={heatmap ? 'fill' : 'regular'} /> Mapa de Calor
          </button>
          <div className="h-px mx-2 my-1" style={{ background: 'var(--color-border-default)' }} />
          <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Filtros</p>
          {['todos','pendentes','atendidos', 'meus'].map(f => (
            <button key={f} onClick={() => { setFiltro(f); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: filtro === f ? 'var(--color-gold-500)' : 'var(--color-text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = filtro === f ? 'var(--color-gold-500)' : 'var(--color-text-secondary)'; }}>
              {activeDot(filtro === f)}
              {f === 'todos' ? 'Todos' : f === 'pendentes' ? 'Pendentes' : f === 'atendidos' ? 'Atendidos' : 'Meus Chamados'}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
