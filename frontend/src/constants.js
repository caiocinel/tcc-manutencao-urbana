export const STATUS_CONFIG = {
  pendente: { color: '#F97316', label: 'Aguardando Atendimento', bg: 'rgba(249,115,22,0.12)' },
  em_andamento: { color: '#F97316', label: 'Aguardando Atendimento', bg: 'rgba(249,115,22,0.12)' },
  vinculado_sem_resposta: { color: '#EAB308', label: 'Chamado Vinculado (Mas sem Resposta)', bg: 'rgba(234,179,8,0.12)' },
  vinculado_com_resposta: { color: '#3B82F6', label: 'Chamado Vinculado (Com Resposta)', bg: 'rgba(59,130,246,0.12)' },
  atendido: { color: '#22C55E', label: 'Chamado Concluído e Finalizado', bg: 'rgba(34,197,94,0.12)' },
  encerrado: { color: '#22C55E', label: 'Chamado Concluído e Finalizado', bg: 'rgba(34,197,94,0.12)' },
  concluido: { color: '#22C55E', label: 'Chamado Concluído e Finalizado', bg: 'rgba(34,197,94,0.12)' },
};

export function getStatusConfig(status, dataConclusao) {
  const config = STATUS_CONFIG[status];
  if (!config) return { color: '#6B7280', label: status || 'Desconhecido', bg: 'rgba(107,114,128,0.12)' };

  if (status === 'atendido' || status === 'encerrado' || status === 'concluido') {
    if (dataConclusao) {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (new Date(dataConclusao).getTime() < weekAgo) {
        return { color: '#6B7280', label: 'Chamado Concluído e Finalizado (após 1 semana)', bg: 'rgba(107,114,128,0.12)' };
      }
    }
  }

  return config;
}
