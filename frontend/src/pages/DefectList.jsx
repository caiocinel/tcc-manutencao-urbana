import { useEffect, useState, useCallback } from 'react';
import { Target, Handshake, Calendar, User as UserIcon, MapPin, Camera, ThumbsUp, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { StatusBadge, getStatusColor } from '../components/ui/status-badge';
import { Timeline } from '../components/ui/timeline';
import { Button } from '../components/ui/button';

function ScorePill({ score }) {
  if (score == null) return null;
  const cls = score >= 7 ? 'text-[var(--color-error)] bg-[rgba(207,68,68,0.12)]' : score >= 4 ? 'text-[var(--color-gold-500)] bg-[rgba(212,160,23,0.12)]' : 'text-[var(--color-success)] bg-[rgba(76,175,125,0.12)]';
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}><Target size={11} />{score}</span>;
}

export default function DefectList() {
  const { isAuthenticated, user } = useAuth();
  const addToast = useToast();
  const [defeitos, setDefeitos] = useState([]);
  const [meusDefeitos, setMeusDefeitos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [ordenarScore, setOrdenarScore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [atendendo, setAtendendo] = useState(null);
  const [selectedDefect, setSelectedDefect] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.listDefeitos({ ordenar: ordenarScore ? 'score' : undefined }),
      isAuthenticated ? api.meusDefeitos() : Promise.resolve([]),
    ]).then(([defs, meus]) => { if (!cancelled) { setDefeitos(defs); setMeusDefeitos(meus || []); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated, ordenarScore]);

  const handleAtender = useCallback(async (id, e) => {
    e?.stopPropagation();
    setAtendendo(id);
    try {
      await api.atenderDefeito(id);
      addToast('Chamado vinculado com sucesso!');
      setDefeitos(prev => prev.map(d => d.id === id ? { ...d, status: 'vinculado_sem_resposta', atendente_id: user?.id } : d));
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
    finally { setAtendendo(null); }
  }, [addToast, user?.id]);

  const filtrados = defeitos.filter(d => {
    if (filtro === 'todos') return true;
    if (filtro === 'pendentes') return ['pendente','em_andamento','vinculado_sem_resposta','vinculado_com_resposta'].includes(d.status);
    if (filtro === 'atendidos') return ['atendido','encerrado','concluido'].includes(d.status);
    if (filtro === 'meus') return meusDefeitos.some(m => m.id === d.id);
    return true;
  });

  function getTimelineItems(d) {
    const items = [{ id: 'criado', active: true, title: 'Chamado Criado', description: d.descricao?.slice(0, 120), date: new Date(d.criado_em).toLocaleString(), meta: `Por ${d.usuario?.nome || 'Anônimo'}` }];
    if (['vinculado_sem_resposta','vinculado_com_resposta','atendido','encerrado','concluido'].includes(d.status))
      items.push({ id: 'vinculado', active: true, title: 'Profissional Vinculado', date: d.atualizado_em ? new Date(d.atualizado_em).toLocaleString() : undefined });
    if (d.status === 'vinculado_com_resposta')
      items.push({ id: 'resposta', active: true, title: 'Resposta Enviada', date: d.atualizado_em ? new Date(d.atualizado_em).toLocaleString() : undefined });
    if (['atendido','encerrado','concluido'].includes(d.status))
      items.push({ id: 'concluido', active: true, title: 'Chamado Concluído', date: d.atendido_em ? new Date(d.atendido_em).toLocaleString() : undefined });
    return items;
  }

  return (
    <div className="p-5 max-w-5xl mx-auto">
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Lista de Chamados</h1>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Acompanhe todos os chamados de serviços públicos</p>

      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {[['todos','Todos'],['pendentes','Pendentes'],['atendidos','Atendidos'],['meus','Meus Chamados']].map(([k,l]) => (
          isAuthenticated || k !== 'meus' ? (
            <button key={k} onClick={() => setFiltro(k)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
              style={filtro === k ? { background: 'var(--color-gold-500)', color: 'var(--color-text-inverse)' }
                : { border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', background: 'transparent' }}>
              {l}
            </button>
          ) : null
        ))}
        {user?.admin && (
          <button onClick={() => setOrdenarScore(o => !o)} style={{ marginLeft: 'auto' }}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
            style={ordenarScore ? { background: 'var(--color-gold-500)', color: 'var(--color-text-inverse)' }
              : { border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)', background: 'transparent' }}>
            <Target size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Urgência
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-40 rounded-xl border animate-pulse" style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }} />)}</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--color-text-muted)' }}>Nenhum chamado encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrados.map(d => (
            <div key={d.id} onClick={() => setSelectedDefect(d)}
              className="rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md"
              style={{ background: 'var(--color-bg-surface)', borderColor: 'rgba(180,140,50,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-gold-500)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(180,140,50,0.3)'; }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold truncate flex-1 pr-2 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getStatusColor(d.status, d.atendido_em || d.atualizado_em) }} />
                  {d.titulo}
                </h3>
                <StatusBadge status={d.status} concluido_em={d.atendido_em || d.atualizado_em} />
              </div>
              <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--color-text-secondary)' }}>{d.descricao}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                {d.score_urgencia != null && <ScorePill score={d.score_urgencia} />}
                {d.prioridade && (
                  <span style={{ color: d.prioridade === 'alta' ? 'var(--color-error)' : d.prioridade === 'media' ? 'var(--color-gold-500)' : 'var(--color-success)', fontWeight: 600 }}>
                    {d.prioridade === 'alta' ? 'Alta' : d.prioridade === 'media' ? 'Média' : 'Baixa'}
                  </span>
                )}
                <span className="flex items-center gap-1"><Calendar size={11} />{new Date(d.criado_em).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border-default)' }}>
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <UserIcon size={11} />{d.usuario?.nome ? `${d.usuario.nome.charAt(0)}${'*'.repeat(Math.max(d.usuario.nome.length - 1, 2))}` : 'Anônimo'}
                </span>
                <div className="flex items-center gap-1">
                  {d.apoios_total > 0 && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><ThumbsUp size={11} />{d.apoios_total}</span>}
                  {user?.admin && !d.atendente_id && !['atendido','encerrado','concluido'].includes(d.status) && (
                    <Button variant="secondary" size="xs" onClick={e => handleAtender(d.id, e)} disabled={atendendo === d.id}>
                      <Handshake size={11} /> {atendendo === d.id ? '...' : 'Atender'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedDefect && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedDefect(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-xl border p-6 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--color-bg-surface)', borderColor: 'rgba(180,140,50,0.3)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{selectedDefect.titulo}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedDefect.status} concluido_em={selectedDefect.atendido_em || selectedDefect.atualizado_em} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {selectedDefect.usuario?.nome ? `${selectedDefect.usuario.nome.charAt(0)}${'*'.repeat(selectedDefect.usuario.nome.length - 1)}` : 'Anônimo'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedDefect(null)} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <X size={14} />
                </button>
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{selectedDefect.descricao}</p>
              <div className="flex flex-wrap gap-3 mb-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(selectedDefect.criado_em).toLocaleDateString()}</span>
                {selectedDefect.latitude && <span className="flex items-center gap-1"><MapPin size={12} /> {selectedDefect.latitude.toFixed(4)}, {selectedDefect.longitude.toFixed(4)}</span>}
                {selectedDefect.apoios_total > 0 && <span className="flex items-center gap-1"><ThumbsUp size={12} /> {selectedDefect.apoios_total} apoios</span>}
              </div>
              {selectedDefect.imagem_thumbnail && <img src={selectedDefect.imagem_thumbnail} alt="" className="w-full h-40 object-cover rounded-lg mb-4" />}
              <div className="mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Histórico</h4>
                <Timeline items={getTimelineItems(selectedDefect)} />
              </div>
              <div className="flex gap-2">
                {user?.admin && !selectedDefect.atendente_id && !['atendido','encerrado','concluido'].includes(selectedDefect.status) && (
                  <Button variant="secondary" onClick={e => handleAtender(selectedDefect.id, e)} disabled={atendendo === selectedDefect.id}
                    className="flex items-center gap-1.5">
                    <Handshake size={14} /> {atendendo === selectedDefect.id ? '...' : 'Atender Chamado'}
                  </Button>
                )}
                <button className="flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  style={{ background: 'rgba(212,160,23,0.12)', color: 'var(--color-gold-500)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,160,23,0.12)'}>
                  <ThumbsUp size={14} /> Apoiar
                </button>
                <button className="flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  style={{ background: 'transparent', border: '1px solid var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-gold-500)'; e.currentTarget.style.color = 'var(--color-gold-500)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-default)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                  <Camera size={14} /> Anexar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
