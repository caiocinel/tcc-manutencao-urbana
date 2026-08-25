/**
 * Cores e rótulos de status, portados de `frontend/src/components/ui/status-utils.js`
 * e `frontend/src/constants.js`.
 */

const STATUS_COLORS: Record<string, string> = {
  pendente: '#F97316',
  em_andamento: '#F97316',
  vinculado_sem_resposta: '#EAB308',
  vinculado_com_resposta: '#3B82F6',
  atendido: '#22C55E',
  concluido: '#22C55E',
  encerrado: '#6B7280',
  critico: '#CF4444',
  aberto: '#F97316',
  resolvido: '#22C55E',
  rejeitado: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Aguardando Atendimento',
  em_andamento: 'Aguardando Atendimento',
  vinculado_sem_resposta: 'Vinculado (Sem Resposta)',
  vinculado_com_resposta: 'Vinculado (Com Resposta)',
  atendido: 'Concluído e Finalizado',
  encerrado: 'Concluído e Finalizado',
  concluido: 'Concluído e Finalizado',
  critico: 'Crítico',
  aberto: 'Aguardando Atendimento',
  resolvido: 'Concluído e Finalizado',
  rejeitado: 'Rejeitado',
};

/** Cores curtas usadas nos gráficos do painel (equivale a STATUS_CONFIG do web). */
export const STATUS_CHART_COLORS: Record<string, string> = {
  pendente: '#4A90D9',
  em_andamento: '#D4AF37',
  vinculado_sem_resposta: '#D4AF37',
  vinculado_com_resposta: '#4A90D9',
  atendido: '#4CAF7D',
  encerrado: '#6B5B3E',
  concluido: '#4CAF7D',
};

export const STATUS_ABERTOS = [
  'pendente',
  'em_andamento',
  'vinculado_sem_resposta',
  'vinculado_com_resposta',
];

export const STATUS_FECHADOS = ['atendido', 'encerrado', 'concluido'];

const UMA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

function concluidoHaMaisDeUmaSemana(status: string, concluidoEm?: string | null) {
  if (!concluidoEm) return false;
  if (!STATUS_FECHADOS.includes(status)) return false;
  return Date.now() - new Date(concluidoEm).getTime() >= UMA_SEMANA_MS;
}

export function getStatusColor(status: string, concluidoEm?: string | null) {
  if (concluidoHaMaisDeUmaSemana(status, concluidoEm)) return '#6B7280';
  return STATUS_COLORS[status] ?? STATUS_COLORS.pendente;
}

export function getStatusLabel(status: string, concluidoEm?: string | null) {
  if (concluidoHaMaisDeUmaSemana(status, concluidoEm)) return 'Concluído há +1 semana';
  return STATUS_LABELS[status] ?? status;
}

/** Opções de alteração de status em lote (admin). */
export const BATCH_STATUS_OPTIONS: [string, string][] = [
  ['pendente', 'Pendente'],
  ['em_andamento', 'Em Andamento'],
  ['vinculado_sem_resposta', 'Vinculado'],
  ['rejeitado', 'Rejeitar'],
];
