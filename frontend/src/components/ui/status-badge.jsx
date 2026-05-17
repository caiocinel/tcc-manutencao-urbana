import { cn } from '@/lib/utils';

const STATUS_COLORS = {
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
};

const labels = {
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
};

export function getStatusColor(status, concluido_em) {
  if ((status === 'concluido' || status === 'encerrado' || status === 'atendido') && concluido_em) {
    const diff = Date.now() - new Date(concluido_em).getTime();
    if (diff >= 7 * 24 * 60 * 60 * 1000) return '#6B7280';
  }
  return STATUS_COLORS[status] || STATUS_COLORS.pendente;
}

export function getStatusLabel(status, concluido_em) {
  if ((status === 'concluido' || status === 'encerrado' || status === 'atendido') && concluido_em) {
    const diff = Date.now() - new Date(concluido_em).getTime();
    if (diff >= 7 * 24 * 60 * 60 * 1000) return 'Concluído há +1 semana';
  }
  return labels[status] || status;
}

export function StatusBadge({ status, concluido_em, className, pulse }) {
  const color = getStatusColor(status, concluido_em);
  const label = getStatusLabel(status, concluido_em);

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold bg-transparent',
      pulse && 'animate-pulse', className
    )} style={{ borderColor: color, color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
