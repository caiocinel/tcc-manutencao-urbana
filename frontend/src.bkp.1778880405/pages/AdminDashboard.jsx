import { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Camera, ChatCircle, Download, Calendar } from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const statusColors = {
  pendente: '#D4A017',
  em_andamento: '#D48744',
  atendido: '#4CAF7D',
  encerrado: '#6B5B3E',
};

const prioridadeLabels = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const prioridadeCores = { baixa: '#4CAF7D', media: '#D4A017', alta: '#CF4444' };

function imagensDoDefeito(d) {
  const urls = [];
  if (d.imagem_url || d.imagem_thumbnail) urls.push(d.imagem_thumbnail || d.imagem_url);
  if (d.imagens_extra?.length > 0) urls.push(...d.imagens_extra);
  return urls;
}

const DefeitoPin = memo(function DefeitoPin({ d }) {
  if (!d.latitude || !d.longitude) return null;
  const color = statusColors[d.status] || 'gray';
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  const imagensExtra = d.imagens_extra || [];
  const atualizacoes = d.atualizacoes || [];
  return (
    <Marker position={[d.latitude, d.longitude]} icon={icon}>
      <Popup>
        <strong>{d.titulo}</strong>
        <p>{d.descricao}</p>
        <p>Status: <strong>{d.status}</strong></p>
        <p>Prioridade: <span style={{ color: prioridadeCores[d.prioridade], fontWeight: 600 }}>{prioridadeLabels[d.prioridade] || d.prioridade}</span></p>
        {(d.imagem_thumbnail || d.imagem_url) && <img src={d.imagem_thumbnail || d.imagem_url} alt={d.titulo} style={{ width: '100%', maxWidth: 200, borderRadius: 4 }} />}
        {imagensExtra.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {imagensExtra.map((url, i) => (
              <img key={i} src={url} alt={`Anexo ${i + 1}`} style={{ width: '100%', maxWidth: 200, borderRadius: 4, marginTop: 4 }} />
            ))}
          </div>
        )}
        {atualizacoes.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12 }}>
            {atualizacoes.map((a, i) => (
              <p key={i} style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: 4, marginTop: 4 }}>
                <em>{a.usuario}:</em> {a.texto}
              </p>
            ))}
          </div>
        )}
      </Popup>
    </Marker>
  );
});
 
export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const addToast = useToast();

  const [defeitos, setDefeitos] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const [filterRegiao, setFilterRegiao] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('pendente,em_andamento');
  const [selectedDefeito, setSelectedDefeito] = useState(null);
  const [diasFiltro, setDiasFiltro] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
  }, [isAuthenticated, navigate]);

  const loadData = useCallback(async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (diasFiltro) params.dias = diasFiltro;
      const [d] = await Promise.all([
        api.listDefeitos(params),
      ]);
      setDefeitos(d);
      if (user?.admin) {
        const rParams = {};
        if (filterStatus) rParams.status = filterStatus;
        if (diasFiltro) rParams.dias = diasFiltro;
        const r = await api.regioesDefeitos(rParams);
        setRegioes(r);
      }
    } catch (err) {
      addToast('Erro ao carregar dados: ' + err.message, 'error');
    }
  }, [filterStatus, diasFiltro, user, addToast]);

  const exportCSV = useCallback(() => {
    if (defeitos.length === 0) { addToast('Nenhum dado para exportar', 'error'); return; }
    const header = 'ID,Título,Descrição,Status,Prioridade,Categoria,Rua,Bairro,Latitude,Longitude,Data,Criado por';
    const rows = defeitos.map(d =>
      `"${d.id}","${(d.titulo||'').replace(/"/g,'""')}","${(d.descricao||'').replace(/"/g,'""')}","${d.status}","${d.prioridade||''}","${d.categoria||''}","${(d.rua||'').replace(/"/g,'""')}","${(d.bairro||'').replace(/"/g,'""')}",${d.latitude||''},${d.longitude||''},"${d.criado_em||''}","${d.usuario?.nome||''}"`
    );
    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `chamados-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    addToast('CSV exportado com sucesso!');
  }, [defeitos, addToast]);

  useEffect(() => {
    loadData();
  }, [filterStatus, diasFiltro, loadData]);

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') setSelectedDefeito(null); }
    if (selectedDefeito) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedDefeito]);

  async function handleUpdateDefeito(id, data) {
    try {
      await api.updateDefeito(id, data);
      addToast('Atualizado com sucesso!');
      loadData();
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    }
  }

  const regioesFiltradas = regioes.filter(r => {
    if (filterRegiao === 'todos') return true;
    if (filterRegiao === 'com_imagem') return r.com_imagem > 0;
    if (filterRegiao === 'mais_reports') return r.total >= 3;
    return true;
  });

  const defaultCenter = [-22.6069, -46.9190];

  return (
    <div className="admin-page">
      <Header />

      <div className="admin-painel">
        <div className="admin-map-section">
          <MapContainer center={defaultCenter} zoom={13} className="admin-map" scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url={theme === 'light' ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'}
            />
            {defeitos.map(d => <DefeitoPin key={d.id} d={d} />)}
          </MapContainer>
        </div>

        <div className="admin-regioes-section">
          <div className="admin-regioes-header">
            <h2>
              <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Regiões com Chamados
            </h2>
            <div className="admin-filters">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="pendente,em_andamento">Pendentes + Em Andamento</option>
                <option value="">Todos os status</option>
                <option value="pendente">Pendentes</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="atendido">Atendidos</option>
                <option value="encerrado">Encerrados</option>
              </select>
              <select value={diasFiltro} onChange={e => setDiasFiltro(e.target.value)} style={{ minWidth: 100 }}>
                <option value="">Todo período</option>
                <option value="7">Últimos 7 dias</option>
                <option value="15">Últimos 15 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
              </select>
              <select value={filterRegiao} onChange={e => setFilterRegiao(e.target.value)}>
                <option value="todos">Todos os chamados</option>
                <option value="com_imagem">Com imagens</option>
                <option value="mais_reports">Mais reports (3+)</option>
              </select>
              <button className="btn-export" onClick={exportCSV} aria-label="Exportar CSV">
                <Download size={14} aria-hidden="true" />
                CSV
              </button>
            </div>
          </div>
          <div className="admin-regioes-grid">
            {regioesFiltradas.map(r => (
              <div key={r.id} className="regiao-card">
                <div className="regiao-card-header">
                  <h3>Região {r.centro.latitude.toFixed(4)}, {r.centro.longitude.toFixed(4)}</h3>
                  <span className="regiao-total">{r.total} chamados</span>
                </div>
                <div className="regiao-stats">
                  <span><Camera size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} /> {r.com_imagem} imagens</span>
                  {Object.entries(r.status).map(([s, c]) => (
                    <span key={s} className={`badge badge-${s}`}>{s}: {c}</span>
                  ))}
                </div>
                 <div className="regiao-defeitos">
                   {r.defeitos.map(d => (
                     <div key={d.id} className="regiao-defeito-item" style={{ cursor: 'pointer' }} onClick={() => setSelectedDefeito(d)}>
                        <div className="regiao-defeito-info">
                         <strong>{d.titulo}</strong>
                         <span className={`badge badge-${d.status}`}>{d.status}</span>
                         <span style={{ color: prioridadeCores[d.prioridade], fontWeight: 600, fontSize: 11 }}>
                           {prioridadeLabels[d.prioridade] || d.prioridade}
                         </span>
                        {(d.imagens_extra?.length > 0 || d.atualizacoes?.length > 0) && (
                           <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 4 }}>
                             {d.imagens_extra?.length > 0 && <Camera size={10} style={{ verticalAlign: 'middle' }} />}
                             {d.imagens_extra?.length > 0 && d.atualizacoes?.length > 0 && ' '}
                             {d.atualizacoes?.length > 0 && <ChatCircle size={10} style={{ verticalAlign: 'middle' }} />}
                           </span>
                         )}
                       </div>
                        {user?.admin && (
                          <div className="regiao-defeito-actions" onClick={e => e.stopPropagation()}>
                            <select
                              value={d.prioridade || 'media'}
                              onChange={e => handleUpdateDefeito(d.id, { prioridade: e.target.value })}
                            >
                              <option value="baixa">Baixa</option>
                              <option value="media">Média</option>
                              <option value="alta">Alta</option>
                            </select>
                            {d.status !== 'atendido' && d.status !== 'encerrado' && (
                              <>
                                <button className="btn-sm btn-atender" onClick={() => handleUpdateDefeito(d.id, { status: 'atendido' })}>
                                  Atender
                                </button>
                                <button className="btn-sm btn-encerrar" onClick={() => handleUpdateDefeito(d.id, { status: 'encerrado' })}>
                                  Encerrar
                                </button>
                              </>
                            )}
                            {d.status === 'atendido' && (
                              <button className="btn-sm btn-encerrar" onClick={() => handleUpdateDefeito(d.id, { status: 'encerrado' })}>
                                Encerrar
                              </button>
                            )}
                          </div>
                        )}
                     </div>
                   ))}
                 </div>
              </div>
            ))}
             {regioesFiltradas.length === 0 && <p className="empty">Nenhuma região encontrada.</p>}
           </div>
         </div>
       </div>

        {selectedDefeito && (
          <div className="defect-overlay" onClick={() => setSelectedDefeito(null)} role="dialog" aria-modal="true" aria-label={selectedDefeito.titulo}>
            <div className="defect-modal" onClick={e => e.stopPropagation()}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
               <div>
                 <h3 style={{ margin: 0 }}>{selectedDefeito.titulo}</h3>
                 <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                   <span className={`badge badge-${selectedDefeito.status}`}>{selectedDefeito.status}</span>
                   <span style={{ color: prioridadeCores[selectedDefeito.prioridade], fontWeight: 600 }}>
                     {prioridadeLabels[selectedDefeito.prioridade] || selectedDefeito.prioridade}
                   </span>
                    {selectedDefeito.usuario?.nome && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>Por: {selectedDefeito.usuario.nome}</span>}
                 </div>
               </div>
                <button onClick={() => setSelectedDefeito(null)} aria-label="Fechar" style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
             </div>

             {selectedDefeito.descricao && <p className="chamado-desc">{selectedDefeito.descricao}</p>}

             {(selectedDefeito.rua || selectedDefeito.bairro) && (
               <p className="chamado-meta" style={{ marginBottom: 8 }}>
                 📍 {[selectedDefeito.rua, selectedDefeito.bairro].filter(Boolean).join(', ')}
               </p>
             )}

             {imagensDoDefeito(selectedDefeito).length > 0 && (
               <div style={{ marginTop: 12 }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>Imagens ({imagensDoDefeito(selectedDefeito).length})</h4>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                   {imagensDoDefeito(selectedDefeito).map((url, i) => (
                     <img key={i} src={url} alt={`Imagem ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} onClick={() => window.open(url, '_blank')} />
                   ))}
                 </div>
               </div>
             )}

             {selectedDefeito.atualizacoes?.length > 0 && (
               <div style={{ marginTop: 16 }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>Atualizações ({selectedDefeito.atualizacoes.length})</h4>
                 <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                   {selectedDefeito.atualizacoes.map((a, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'var(--color-bg-hover)', borderRadius: 8, marginBottom: 8 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <strong style={{ fontSize: 12, color: 'var(--color-gold-500)' }}>{a.usuario || 'Usuário'}</strong>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(a.criado_em).toLocaleString('pt-BR')}</span>
                       </div>
                       <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-primary)' }}>{a.texto}</p>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             <div className="modal-actions" style={{ marginTop: 16 }}>
               <button className="btn-secondary" onClick={() => setSelectedDefeito(null)}>Fechar</button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }
