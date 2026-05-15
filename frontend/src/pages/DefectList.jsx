import { useEffect, useState } from 'react';
import { ThumbsUp, Crosshair, Target } from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { getStatusConfig } from '../constants';

function ScorePill({ score }) {
  if (score == null) return null;
  const cls = score >= 7 ? 'score-alta' : score >= 4 ? 'score-media' : 'score-baixa';
  return <span className={`score-pill ${cls}`}>
    <Target size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />
    {score}
  </span>;
}

export default function DefectList() {
  const [defeitos, setDefeitos] = useState([]);
  const [meusDefeitos, setMeusDefeitos] = useState([]);
  const [apiError, setApiError] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [ordenarScore, setOrdenarScore] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.listDefeitos({ ordenar: ordenarScore ? 'score' : undefined }),
      isAuthenticated ? api.meusDefeitos() : Promise.resolve([]),
    ])
      .then(([defs, meus]) => {
        if (!cancelled) { setDefeitos(defs); setMeusDefeitos(meus || []); }
      })
      .catch((err) => {
        if (!cancelled) setApiError('Erro ao carregar chamados: ' + err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, ordenarScore]);

  const prioridadeCores = { baixa: '#22c55e', media: '#f59e0b', alta: '#dc2626' };
  const prioridadeLabels = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };

  const filtrados = defeitos.filter(d => {
    if (filtro === 'todos') return true;
    if (filtro === 'pendentes') return ['pendente', 'em_andamento', 'vinculado_sem_resposta', 'vinculado_com_resposta'].includes(d.status);
    if (filtro === 'atendidos') return ['atendido', 'encerrado', 'concluido'].includes(d.status);
    if (filtro === 'meus') return meusDefeitos.some(m => m.id === d.id);
    return true;
  });

  return (
    <div className="admin-page">
      <Header />

      <div className="list-container">
        {isAuthenticated && (
          <div className="map-filters" style={{ marginBottom: 16 }}>
            <button className={filtro === 'todos' ? 'filter-active' : ''} onClick={() => setFiltro('todos')}>Todos</button>
            <button className={filtro === 'pendentes' ? 'filter-active' : ''} onClick={() => setFiltro('pendentes')}>Pendentes</button>
            <button className={filtro === 'atendidos' ? 'filter-active' : ''} onClick={() => setFiltro('atendidos')}>Atendidos</button>
            <button className={filtro === 'meus' ? 'filter-active' : ''} onClick={() => setFiltro('meus')}>Meus Chamados</button>
            {user?.admin && (
              <button
                className={ordenarScore ? 'filter-active' : ''}
                onClick={() => setOrdenarScore(o => !o)}
                style={{ marginLeft: 'auto' }}
              >
                <Target size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Urgência
              </button>
            )}
          </div>
        )}

        {apiError && <p className="error" style={{ textAlign: 'center' }}>{apiError}</p>}
        {loading && (
          <div className="chamado-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="chamado-card" style={{ borderLeft: '4px solid var(--border-default)' }}>
                <div className="skeleton skeleton-line" style={{ width: '60%', height: 16, marginBottom: 8 }} />
                <div className="skeleton skeleton-line" style={{ width: '90%', height: 12, marginBottom: 4 }} />
                <div className="skeleton skeleton-line" style={{ width: '40%', height: 12, marginBottom: 8 }} />
                <div className="skeleton skeleton-line" style={{ width: '30%', height: 10 }} />
              </div>
            ))}
          </div>
        )}
        {!loading && (
        <div className="chamado-grid">
          {filtrados.map((d) => (
            <div key={d.id} className={`chamado-card status-${d.status}`}>
              <div className="chamado-card-header">
                <h3>{d.titulo}</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <ScorePill score={d.score_urgencia} />
                  <span className="badge" style={{ background: getStatusConfig(d.status).bg, color: getStatusConfig(d.status).color, border: `0.5px solid ${getStatusConfig(d.status).color}40` }}>{getStatusConfig(d.status).label}</span>
                </div>
              </div>
              <p className="chamado-desc">{d.descricao}</p>
              <p className="chamado-meta">
                {d.usuario?.nome && <>Por: {d.usuario.nome} | </>}
                {new Date(d.criado_em).toLocaleDateString()}
                {d.prioridade && (
                  <> | Prioridade: <span style={{ color: prioridadeCores[d.prioridade], fontWeight: 600 }}>{prioridadeLabels[d.prioridade]}</span></>
                )}
                {d.apoios_total > 0 && (
                  <> | <ThumbsUp size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} /> {d.apoios_total} apoio(s)</>
                )}
              </p>
              {d.latitude && d.longitude && (
                <p className="chamado-coords">
                  <Crosshair size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                  {d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}
                </p>
              )}
              {(d.imagem_thumbnail || d.imagem_url) && (
                <img src={d.imagem_thumbnail || d.imagem_url} alt={d.titulo} className="chamado-thumb" />
              )}
            </div>
          ))}
          {filtrados.length === 0 && <p className="empty">Nenhum chamado encontrado.</p>}
        </div>
        )}
      </div>
    </div>
  );
}
