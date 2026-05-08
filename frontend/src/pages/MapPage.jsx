// Página principal - Mapa interativo com Leaflet e CARTO tiles
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corrige ícones padrão do Leaflet (problema conhecido com webpack/vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Cores dos marcadores conforme o status do defeito
const statusColors = {
  pendente: 'red',
  em_andamento: 'orange',
  resolvido: 'green',
};

export default function MapPage() {
  const [defeitos, setDefeitos] = useState([]);
  const [userPos, setUserPos] = useState([-23.5505, -46.6333]); // SP como fallback
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  // Carrega defeitos e tenta obter geolocalização do usuário
  useEffect(() => {
    api.listDefeitos().then(setDefeitos).catch(console.error);
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  return (
    <div className="map-page">
      {/* Header com autenticação e navegação */}
      <header className="map-header">
        <h1>Manutenção Urbana</h1>
        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <span>{user?.email}</span>
              <button onClick={() => navigate('/criar')}>+ Novo</button>
              <button onClick={() => navigate('/lista')}>Lista</button>
              <button onClick={logout}>Sair</button>
            </>
          ) : (
            <button onClick={() => navigate('/login')}>Entrar</button>
          )}
        </div>
      </header>

      {/* Mapa Leaflet com tiles CARTO (gratuito para uso não comercial) */}
      <MapContainer center={userPos} zoom={14} className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Renderiza marcadores para cada defeito */}
        {defeitos.map((d) => {
          if (!d.latitude || !d.longitude) return null;
          const color = statusColors[d.status] || 'gray';
          // Marcador customizado: bolinha colorida
          const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          return (
            <Marker key={d.id} position={[d.latitude, d.longitude]} icon={icon}>
              {/* Popup com detalhes do defeito */}
              <Popup>
                <strong>{d.titulo}</strong>
                <p>{d.descricao}</p>
                <p>Status: <strong>{d.status}</strong></p>
                {d.imagem_url && <img src={d.imagem_url} alt={d.titulo} style={{ width: '100%', maxWidth: 200, borderRadius: 4 }} />}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
