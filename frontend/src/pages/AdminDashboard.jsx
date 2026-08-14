import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Target } from '@phosphor-icons/react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polygon, useMap } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { StatusBadge, getStatusColor } from '../components/ui/status-badge';
import { createDefectIcon } from '../utils/map-markers';

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const BRAZIL_BOUNDS = [[-33.75, -73.99], [5.27, -28.85]];

function FitBounds({ pontos, filtroRegiao }) {
  const map = useMap();
  useEffect(() => {
    if (filtroRegiao || pontos.length === 0) return;
    const bounds = L.latLngBounds(pontos.map(p => [p.latitude, p.longitude]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 800 });
    }
  }, [map, pontos, filtroRegiao]);
  return null;
}

function PerimeterLayer({ poligono_json }) {
  const leafletCoords = useMemo(() => {
    if (!poligono_json) return null;
    const raw = typeof poligono_json === 'string' ? JSON.parse(poligono_json) : poligono_json;
    const coords = raw.type === 'Polygon' ? raw.coordinates[0] : raw.coordinates?.[0]?.[0];
    if (!coords) return null;
    return coords.map(([lng, lat]) => [lat, lng]);
  }, [poligono_json]);

  if (!leafletCoords) return null;
  return (
    <Polygon positions={leafletCoords} pathOptions={{ color: '#D4A017', weight: 1.5, fillColor: '#D4A017', fillOpacity: 0.06, interactive: false }} />
  );
}

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [regioes, setRegioes] = useState({});
  const [filtroRegiao, setFiltroRegiao] = useState('');
  const [selectedDefeito, setSelectedDefeito] = useState(null);
  const mapRef = useRef(null);

  const allPins = useMemo(() => {
    const pins = [];
    Object.entries(regioes).forEach(([bairro, defeitos]) => {
      if (filtroRegiao && bairro !== filtroRegiao) return;
      defeitos.forEach(d => {
        if (!d.latitude || !d.longitude) return;
        pins.push(d);
      });
    });
    return pins;
  }, [regioes, filtroRegiao]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!user?.admin) { navigate('/mapa'); return; }
    api.listDefeitos().then(d => {
      const r = {};
      d.forEach(x => {
        const key = x.bairro || 'Sem bairro';
        if (!r[key]) r[key] = [];
        r[key].push(x);
      });
      setRegioes(r);
    }).catch(() => {});
  }, [isAuthenticated, user, navigate]);

  const handleStatus = async (id, novoStatus) => {
    try {
      await api.updateDefeito(id, { status: novoStatus });
      api.listDefeitos().then(d => {
        const r = {};
        d.forEach(x => { const k = x.bairro || 'Sem bairro'; if (!r[k]) r[k] = []; r[k].push(x); });
        setRegioes(r);
      });
    } catch { /* ignore */ }
  };

  const regioesList = Object.entries(regioes).filter(([k]) => !filtroRegiao || k === filtroRegiao);

  return (
    <div className="h-full flex flex-col xl:flex-row" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="xl:w-[420px] flex flex-col border-r" style={{ borderColor: 'var(--color-border-default)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-default)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Painel de Controle</h2>
          <select value={filtroRegiao} onChange={e => { setFiltroRegiao(e.target.value); setSelectedDefeito(null); }}
            className="ml-auto h-8 px-3 rounded-md border text-xs outline-none bg-[var(--color-bg-input)] max-w-[180px]"
            style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>
            <option value="">Todas as regiões</option>
            {Object.keys(regioes).sort().map(r => <option key={r} value={r}>{r} ({regioes[r].length})</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {selectedDefeito && (
            <div className="rounded-xl border p-3 mb-3" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-gold-500)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{selectedDefeito.titulo}</span>
                <button onClick={() => setSelectedDefeito(null)} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>✕</button>
              </div>
              <div className="flex items-center gap-1 mb-1">
                <StatusBadge status={selectedDefeito.status} concluido_em={selectedDefeito.atendido_em || selectedDefeito.atualizado_em} />
                {selectedDefeito.score_urgencia != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                    style={selectedDefeito.score_urgencia >= 7 ? { background: 'rgba(207,68,68,0.12)', color: 'var(--color-error)' } :
                      selectedDefeito.score_urgencia >= 4 ? { background: 'rgba(212,160,23,0.12)', color: 'var(--color-gold-500)' } :
                        { background: 'rgba(76,175,125,0.12)', color: 'var(--color-success)' }}>
                    <Target size={10} />{selectedDefeito.score_urgencia}
                  </span>
                )}
              </div>
              <select value={selectedDefeito.status} onChange={e => handleStatus(selectedDefeito.id, e.target.value)}
                className="w-full h-8 px-2 rounded border text-xs outline-none bg-[var(--color-bg-input)] mb-1"
                style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em andamento</option>
                <option value="atendido">Atendido</option>
                <option value="encerrado">Encerrado</option>
              </select>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{selectedDefeito.bairro} · {new Date(selectedDefeito.criado_em).toLocaleDateString()}</p>
            </div>
          )}
          {regioesList.length === 0 ? (
            <div className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Nenhum chamado nesta região</div>
          ) : regioesList.map(([bairro, defeitosList]) => (
            <div key={bairro} className="rounded-xl border p-3" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }}>
              <button onClick={() => setFiltroRegiao(filtroRegiao === bairro ? '' : bairro)}
                className="flex items-center justify-between w-full mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: filtroRegiao === bairro ? 'var(--color-gold-500)' : 'var(--color-text-primary)' }}>
                  <MapPin size={14} weight={filtroRegiao === bairro ? 'fill' : 'regular'} /> {bairro}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-gold-500)', color: 'var(--color-text-inverse)' }}>
                  {defeitosList.length}
                </span>
              </button>
              <div className="space-y-1">
                {defeitosList.slice(0, 5).map(d => (
                  <div key={d.id} onClick={() => setSelectedDefeito(d)}
                    className="flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors"
                    style={{ background: 'var(--color-bg-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-bg-primary)'}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{
                        background: getStatusColor(d.status, d.atendido_em || d.atualizado_em)
                      }} />
                      <span className="font-medium truncate">{d.titulo}</span>
                    </div>
                    <StatusBadge status={d.status} concluido_em={d.atendido_em || d.atualizado_em} />
                  </div>
                ))}
                {defeitosList.length > 5 && (
                  <p className="text-xs text-center pt-1" style={{ color: 'var(--color-text-muted)' }}>+{defeitosList.length - 5} chamados</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 relative min-h-[300px] xl:min-h-0">
        <MapContainer
          center={user?.municipio?.min_lat ? [(user.municipio.min_lat + user.municipio.max_lat) / 2, (user.municipio.min_lng + user.municipio.max_lng) / 2] : [-22.6069, -46.9190]}
          zoom={13}
          className="absolute inset-0"
          scrollWheelZoom={true}
          zoomControl={true}
          maxBounds={BRAZIL_BOUNDS}
          minZoom={3}
          maxBoundsViscosity={1.0}
          whenReady={(ev) => { mapRef.current = ev.target; }}>
          <TileLayer url={theme === 'dark' ? DARK_TILES : LIGHT_TILES} noWrap />
          <PerimeterLayer poligono_json={user?.municipio?.poligono_json} />
          <FitBounds pontos={allPins} filtroRegiao={filtroRegiao} />
          {allPins.map(d => (
            <Marker
              key={d.id}
              position={[d.latitude, d.longitude]}
              icon={createDefectIcon(d.status, d.atendido_em || d.atualizado_em)}
              eventHandlers={{
                click: () => setSelectedDefeito(d),
              }}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
