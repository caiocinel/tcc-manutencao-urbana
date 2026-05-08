// Página de listagem de defeitos - cards com status e detalhes
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DefectList() {
  const [defeitos, setDefeitos] = useState([]);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Carrega lista de defeitos ao montar o componente
  useEffect(() => {
    api.listDefeitos().then(setDefeitos).catch(console.error);
  }, []);

  const statusLabel = {
    pendente: 'Pendente',
    em_andamento: 'Em Andamento',
    resolvido: 'Resolvido',
  };

  return (
    <div className="list-container">
      <div className="list-header">
        <h1>Defeitos Reportados</h1>
        <button onClick={() => navigate('/')}>Voltar ao Mapa</button>
      </div>

      <div className="defect-grid">
        {defeitos.map((d) => (
          // Card com borda colorida conforme o status
          <div key={d.id} className={`defect-card status-${d.status}`}>
            <div className="defect-card-header">
              <h3>{d.titulo}</h3>
              <span className={`badge badge-${d.status}`}>{statusLabel[d.status] || d.status}</span>
            </div>
            <p className="defect-desc">{d.descricao}</p>
            <p className="defect-meta">
              {d.usuario?.nome && <>Por: {d.usuario.nome} | </>}
              {new Date(d.criado_em).toLocaleDateString()}
            </p>
            {d.latitude && d.longitude && (
              <p className="defect-coords">
                📍 {d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}
              </p>
            )}
            {d.imagem_url && (
              <img src={d.imagem_url} alt={d.titulo} className="defect-thumb" />
            )}
          </div>
        ))}
        {defeitos.length === 0 && <p className="empty">Nenhum defeito reportado ainda.</p>}
      </div>
    </div>
  );
}
