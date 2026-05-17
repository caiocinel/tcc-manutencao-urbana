import { useEffect, useState, useCallback } from 'react';
import { Target, Handshake, MapPin, Calendar, User } from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { DataTable } from '../components/ui/data-table';
import { StatusBadge } from '../components/ui/status-badge';
import { Timeline } from '../components/ui/timeline';

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
  const [atendendo, setAtendendo] = useState(null);
  const [selectedDefect, setSelectedDefect] = useState(null);
  const { isAuthenticated, user } = useAuth();
  const addToast = useToast();

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

  const handleAtender = useCallback(async (id, e) => {
    e?.stopPropagation();
    setAtendendo(id);
    try {
      await api.atenderDefeito(id);
      addToast('Chamado vinculado com sucesso!');
      setDefeitos(prev => prev.map(d => d.id === id ? { ...d, status: 'vinculado_sem_resposta', atendente_id: user?.id } : d));
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    } finally {
      setAtendendo(null);
    }
  }, [addToast, user?.id]);

  const prioridadeLabels = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };

  const filtrados = defeitos.filter(d => {
    if (filtro === 'todos') return true;
    if (filtro === 'pendentes') return ['pendente', 'em_andamento', 'vinculado_sem_resposta', 'vinculado_com_resposta'].includes(d.status);
    if (filtro === 'atendidos') return ['atendido', 'encerrado', 'concluido'].includes(d.status);
    if (filtro === 'meus') return meusDefeitos.some(m => m.id === d.id);
    return true;
  });

  const columns = [
    {
      header: 'Título',
      accessor: 'titulo',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{row.titulo}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Urgência',
      accessor: 'score_urgencia',
      sortable: true,
      cell: (row) => <ScorePill score={row.score_urgencia} />,
    },
    {
      header: 'Prioridade',
      accessor: 'prioridade',
      cell: (row) => row.prioridade ? (
        <span style={{ color: `var(--color-${row.prioridade === 'alta' ? 'error' : row.prioridade === 'media' ? 'gold-500' : 'success'})`, fontWeight: 600, fontSize: 12 }}>
          {prioridadeLabels[row.prioridade]}
        </span>
      ) : null,
    },
    {
      header: 'Data',
      accessor: 'criado_em',
      sortable: true,
      cell: (row) => (
        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-tertiary)' }}>
          <Calendar size={11} />
          {new Date(row.criado_em).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Autor',
      accessor: 'usuario',
      cell: (row) => row.usuario?.nome ? (
        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-tertiary)' }}>
          <User size={11} />
          {row.usuario.nome}
        </span>
      ) : null,
    },
    {
      header: 'Ações',
      accessor: 'acoes',
      cell: (row) => (
        <div className="flex items-center gap-1">
          {user?.admin && !row.atendente_id && !['atendido', 'encerrado', 'concluido'].includes(row.status) && (
            <button
              onClick={(e) => handleAtender(row.id, e)}
              disabled={atendendo === row.id}
              className="btn-sm"
              style={{
                background: 'rgba(212,160,23,0.12)',
                border: '0.5px solid rgba(212,160,23,0.3)',
                color: 'var(--color-gold-500)',
                whiteSpace: 'nowrap',
              }}
            >
              <Handshake size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />
              {atendendo === row.id ? '...' : 'Atender'}
            </button>
          )}
        </div>
      ),
    },
  ];

  function getTimelineItems(defect) {
    const items = [];
    items.push({
      id: 'criado',
      active: true,
      title: 'Chamado Criado',
      description: defect.descricao?.slice(0, 120),
      date: new Date(defect.criado_em).toLocaleString(),
      meta: `Por ${defect.usuario?.nome || 'Anônimo'}`,
    });
    if (defect.status === 'vinculado_sem_resposta' || defect.status === 'vinculado_com_resposta' || defect.status === 'atendido' || defect.status === 'encerrado' || defect.status === 'concluido') {
      items.push({
        id: 'vinculado',
        active: true,
        title: 'Profissional Vinculado',
        date: defect.atualizado_em ? new Date(defect.atualizado_em).toLocaleString() : undefined,
        meta: defect.atendente_nome ? `Por ${defect.atendente_nome}` : undefined,
      });
    }
    if (defect.status === 'vinculado_com_resposta') {
      items.push({
        id: 'resposta',
        active: true,
        title: 'Resposta Enviada',
        date: defect.atualizado_em ? new Date(defect.atualizado_em).toLocaleString() : undefined,
      });
    }
    if (defect.status === 'atendido' || defect.status === 'encerrado' || defect.status === 'concluido') {
      items.push({
        id: 'concluido',
        active: true,
        title: 'Chamado Concluído',
        date: defect.data_conclusao ? new Date(defect.data_conclusao).toLocaleString() : undefined,
      });
    }
    return items;
  }

  return (
    <div className="admin-page">
      <div className="list-container">
        {isAuthenticated && (
          <div className="map-filters" style={{ marginBottom: 16, borderRadius: 8 }}>
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
          <DataTable
            columns={columns}
            data={filtrados}
            pageSize={10}
            searchable={true}
            searchPlaceholder="Buscar chamados por título, descrição, autor..."
            emptyMessage="Nenhum chamado encontrado."
            onRowClick={(row) => setSelectedDefect(row)}
          />
        )}

        {selectedDefect && (
          <div className="defect-overlay" onClick={() => setSelectedDefect(null)}>
            <div className="defect-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {selectedDefect.titulo}
                </h3>
                <StatusBadge status={selectedDefect.status} />
              </div>

              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {selectedDefect.descricao}
              </p>

              <div className="flex flex-wrap gap-3 mb-4 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                <span className="flex items-center gap-1">
                  <User size={12} /> {selectedDefect.usuario?.nome || 'Anônimo'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {new Date(selectedDefect.criado_em).toLocaleDateString()}
                </span>
                {selectedDefect.latitude && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {selectedDefect.latitude.toFixed(4)}, {selectedDefect.longitude.toFixed(4)}
                  </span>
                )}
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Histórico
                </h4>
                <Timeline items={getTimelineItems(selectedDefect)} />
              </div>

              {selectedDefect.imagem_thumbnail && (
                <img src={selectedDefect.imagem_thumbnail} alt={selectedDefect.titulo} className="w-full max-w-[200px] rounded-lg mb-3" />
              )}

              <div className="flex justify-end gap-2 mt-2">
                <button className="btn btn-ghost" onClick={() => setSelectedDefect(null)}>Fechar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
