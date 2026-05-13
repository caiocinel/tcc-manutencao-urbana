import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { ChartLineUp, Warning, Timer, Buildings, ChartBar, MapPin } from '@phosphor-icons/react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { useToast } from '../components/Toast';

const statusCores = {
  pendente: '#eab308',
  em_andamento: '#f97316',
  atendido: '#22c55e',
  encerrado: '#16a34a',
};

const impactoLabel = { alta: 'Alto', media: 'Médio', baixa: 'Baixo' };
const impactoCls = { alta: 'impacto-alto', media: 'impacto-media', baixa: 'impacto-baixa' };

function VariacaoBadge({ valor }) {
  if (valor == null) return <span className="variacao neutro">—</span>;
  if (valor > 0) return <span className="variacao positivo">↑ {valor}%</span>;
  if (valor < 0) return <span className="variacao negativo">↓ {Math.abs(valor)}%</span>;
  return <span className="variacao neutro">→ 0%</span>;
}

function ImpactoTag({ impacto }) {
  return <span className={`impacto-tag ${impactoCls[impacto] || 'impacto-media'}`}>{impactoLabel[impacto] || impacto}</span>;
}

function KpiSparkline({ data }) {
  if (!data || data.length < 2) return null;
  return (
    <div className="kpi-sparkline">
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} fill="url(#sparkGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminDashboardMetrics() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.adminEstatisticas();
      setStats(data);
    } catch (err) {
      addToast('Erro ao carregar estatísticas: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!user?.admin) { navigate('/'); return; }
    loadStats();
  }, [isAuthenticated, user, navigate, loadStats]);

  if (loading) return <div className="admin-page"><div className="loading">Carregando...</div></div>;
  if (!stats) return null;

  const statusData = (stats.por_status || []).map(s => ({
    name: s.status,
    value: s.total,
    color: statusCores[s.status] || '#6b7280',
  }));

  const catData = (stats.por_categoria || []).slice(0, 10).map(c => ({
    ...c,
    variacao: c.variacao,
  }));

  const recData = (stats.recorrencias || []);
  const tendenciaData = (stats.tendencia_mensal || []);
  const slaCatData = (stats.sla_por_categoria || []);
  const bairrosData = (stats.top_bairros || []);
  const recomendacoes = (stats.recomendacoes || []);
  const medias = stats.medias_moveis || {};
  const anomalias = (stats.anomalias || []);

  const mesesComparativo = [
    { name: 'Mês Anterior', total: stats.sazonalidade?.mes_anterior || 0 },
    { name: 'Mês Atual', total: stats.sazonalidade?.mes_atual || 0 },
  ];

  return (
    <div className="admin-page">
      <Header />

      <div className="metrics-container">
        <div className="metrics-kpis">
          <div className="kpi-card">
            <span className="kpi-value">{stats.total}</span>
            <span className="kpi-label">Total de Chamados</span>
            <KpiSparkline data={tendenciaData} />
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{stats.pendentes}</span>
            <span className="kpi-label">Pendentes</span>
            {tendenciaData.length > 1 && (
              <div className="kpi-sparkline">
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={tendenciaData}>
                    <defs><linearGradient id="s2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#eab308" stopOpacity={0.3} /><stop offset="100%" stopColor="#eab308" stopOpacity={0} /></linearGradient></defs>
                    <Area type="monotone" dataKey="total" stroke="#eab308" strokeWidth={2} fill="url(#s2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{stats.resolvidos}</span>
            <span className="kpi-label">Resolvidos</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{stats.taxa_resolucao}%</span>
            <span className="kpi-label">Taxa de Resolução</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{stats.sla_medio_minutos < 60 ? `${stats.sla_medio_minutos}min` : `${(stats.sla_medio_minutos / 60).toFixed(1)}h`}</span>
            <span className="kpi-label">Tempo Médio (SLA)</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{stats.sazonalidade?.mes_atual || 0}</span>
            <span className="kpi-label">
              Este mês <VariacaoBadge valor={stats.sazonalidade?.variacao_percentual} />
            </span>
          </div>
        </div>

        <div className="metrics-charts">
          <div className="chart-card">
            <h3>Chamados por Status</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Comparativo Mensal</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mesesComparativo}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Chamados por Categoria</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={catData} margin={{ bottom: 60 }}>
                <XAxis dataKey="categoria" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip
                  formatter={(v, n) => [v, n === 'total' ? 'Total' : n]}
                  labelFormatter={(label) => {
                    const item = catData.find(c => c.categoria === label);
                    return item ? `${label} (atual: ${item.mes_atual}, anterior: ${item.mes_anterior})` : label;
                  }}
                />
                <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Variação por Categoria (mês atual vs anterior)</h3>
            <div className="variacao-lista">
              {catData.filter(c => c.variacao != null).slice(0, 8).map(c => (
                <div key={c.categoria} className="variacao-item">
                  <span className="variacao-nome">{c.categoria}</span>
                  <VariacaoBadge valor={c.variacao} />
                  <span className="variacao-detalhe">{c.mes_atual} · {c.mes_anterior}</span>
                </div>
              ))}
              {catData.filter(c => c.variacao != null).length === 0 && (
                <p className="empty" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Dados insuficientes para comparação mensal.</p>
              )}
            </div>
          </div>
        </div>

        {tendenciaData.length > 1 && (
          <div className="metrics-section">
            <h2>
              <ChartLineUp size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Tendência Mensal (12 meses)
            </h2>
            <p className="section-subtitle">Volume de chamados por mês — identifique padrões sazonais</p>
            <div className="chart-card" style={{ marginTop: 'var(--space-2)' }}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={tendenciaData}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(v) => [`${v} chamados`, 'Total']} labelFormatter={(l, p) => {
                    const item = p?.[0]?.payload;
                    return item ? `${item.mes}/${item.ano}` : l;
                  }} />
                  <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {medias.semana_atual != null && (
          <div className="metrics-section">
            <h2>
              <ChartBar size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Médias Móveis — Surtos de Problemas
            </h2>
            <p className="section-subtitle">Chamados desta semana vs média das últimas 4 semanas</p>
            <div className="metrics-kpis" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              <div className="kpi-card">
                <span className="kpi-value" style={medias.variacao_percentual > 20 ? { color: 'var(--accent-red)' } : {}}>{medias.semana_atual}</span>
                <span className="kpi-label">Esta semana</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">{medias.media_4_semanas}</span>
                <span className="kpi-label">Média 4 semanas</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value" style={medias.variacao_percentual > 20 ? { color: 'var(--accent-red)' } : medias.variacao_percentual < -20 ? { color: 'var(--accent-green)' } : {}}>
                  {medias.variacao_percentual != null ? `${medias.variacao_percentual > 0 ? '+' : ''}${medias.variacao_percentual}%` : '—'}
                </span>
                <span className="kpi-label">Variação</span>
              </div>
            </div>
          </div>
        )}

        {anomalias.length > 0 && (
          <div className="metrics-section">
            <h2>
              <Warning size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Anomalias Detectadas (Z-Score)
            </h2>
            <p className="section-subtitle">Bairros com aumento anormal de chamados no mês (Z-Score &gt; 2)</p>
            <div className="anomalias-grid">
              {anomalias.map((a, i) => (
                <div key={i} className={`anomalia-card ${a.intensidade === 'alta' ? 'anomalia-alta' : 'anomalia-media'}`}>
                  <div className="anomalia-header">
                    <span className="anomalia-bairro">{a.bairro}</span>
                    <span className={`impacto-tag ${a.intensidade === 'alta' ? 'impacto-alto' : 'impacto-media'}`}>
                      {a.intensidade === 'alta' ? 'CRÍTICO' : 'ATENÇÃO'}
                    </span>
                  </div>
                  <div className="anomalia-stats">
                    <span><strong>{a.total_mes}</strong> este mês</span>
                    <span>Média histórica: <strong>{a.media_historica}</strong></span>
                    <span>Z-Score: <strong>{a.z_score}</strong></span>
                  </div>
                  <div className="anomalia-bar-wrapper">
                    <div className="anomalia-bar" style={{ width: `${Math.min((a.total_mes / a.media_historica) * 50, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {slaCatData.length > 0 && (
          <div className="metrics-section">
            <h2>
              <Timer size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Tempo Médio de Resolução por Categoria
            </h2>
            <p className="section-subtitle">Categorias com maior SLA médio (em minutos)</p>
            <div className="chart-card" style={{ marginTop: 'var(--space-2)' }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={slaCatData} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v) => [v < 60 ? `${v}min` : `${(v / 60).toFixed(1)}h`, 'SLA Médio']} />
                  <Bar dataKey="sla_medio_minutos" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {bairrosData.length > 0 && (
          <div className="metrics-section">
            <h2>
              <Buildings size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Bairros com Mais Chamados
            </h2>
            <p className="section-subtitle">Top 10 bairros por volume de ocorrências</p>
            <div className="bairros-grid">
              {bairrosData.map((b, i) => (
                <div key={i} className="bairro-card">
                  <span className="bairro-rank">#{i + 1}</span>
                  <div className="bairro-info">
                    <span className="bairro-nome">{b.bairro}</span>
                    <span className="bairro-stats">
                      {b.total} chamados · {b.taxa_resolucao}% resolvidos
                    </span>
                  </div>
                  <div className="bairro-bar-wrapper">
                    <div className="bairro-bar" style={{ width: `${b.taxa_resolucao}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recomendacoes.length > 0 && (
          <div className="metrics-section">
            <h2>Recomendações Inteligentes</h2>
            <p className="section-subtitle">Sugestões baseadas em dados para otimização de recursos</p>
            <div className="recomendacoes-lista">
              {recomendacoes.map((r, i) => (
                <div key={i} className={`recomendacao-card ${impactoCls[r.impacto] || ''}`}>
                  <div className="recomendacao-header">
                    <ImpactoTag impacto={r.impacto} />
                    <span className="recomendacao-tipo">{r.tipo === 'recapeamento' ? 'Recapeamento' : r.tipo === 'sazonalidade' ? 'Sazonalidade' : 'Bairro Crítico'}</span>
                  </div>
                  <p className="recomendacao-texto">{r.sugestao}</p>
                  <div className="recomendacao-meta">
                    {r.local && <span>{r.local}</span>}
                    {r.bairro && <span>{r.bairro}</span>}
                    <span>{r.ocorrencias} ocorrências</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recData.length > 0 && (
          <div className="metrics-section">
            <h2>
              <MapPin size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Pontos de Recorrência
            </h2>
            <p className="section-subtitle">Locais com 2+ chamados nos últimos 90 dias (mesma localização aproximada)</p>
            <div className="recorrencia-grid">
              {recData.map((r, i) => (
                <div key={i} className="recorrencia-card">
                  <span className="recorrencia-count">{r.total}x</span>
                  <div className="recorrencia-info">
                    <span className="recorrencia-coord">{r.label}</span>
                    <span className="recorrencia-cat">{r.categoria}</span>
                    {r.bairro && <span className="recorrencia-bairro">{r.bairro}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
