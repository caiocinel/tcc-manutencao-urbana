import { cn } from '../../lib/utils';

const variants = {
  aberto: 'border-[#4A90D9] text-[#4A90D9]',
  pendente: 'border-[#4A90D9] text-[#4A90D9]',
  em_andamento: 'border-[#D4A017] text-[#D4A017]',
  vinculado_sem_resposta: 'border-[#D4A017] text-[#D4A017]',
  vinculado_com_resposta: 'border-[#4A90D9] text-[#4A90D9]',
  resolvido: 'border-[#4CAF7D] text-[#4CAF7D]',
  atendido: 'border-[#4CAF7D] text-[#4CAF7D]',
  encerrado: 'border-[#6B7280] text-[#6B7280]',
  concluido: 'border-[#4CAF7D] text-[#4CAF7D]',
  critico: 'border-[#CF4444] text-[#CF4444] animate-pulse',
};

const labels = {
  aberto: 'Aberto',
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  vinculado_sem_resposta: 'Vinculado (sem resposta)',
  vinculado_com_resposta: 'Vinculado (com resposta)',
  resolvido: 'Resolvido',
  atendido: 'Atendido',
  encerrado: 'Encerrado',
  concluido: 'Concluído',
  critico: 'Crítico',
};

export function StatusBadge({ status, className, pulse }) {
  const variantKey = status || 'pendente';
  const variant = variants[variantKey] || variants.pendente;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold bg-transparent',
        variant,
        pulse && 'animate-pulse',
        className
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        variantKey === 'aberto' || variantKey === 'pendente' ? 'bg-[#4A90D9]' :
        variantKey === 'em_andamento' || variantKey === 'vinculado_sem_resposta' ? 'bg-[#D4A017]' :
        variantKey === 'vinculado_com_resposta' ? 'bg-[#4A90D9]' :
        variantKey === 'resolvido' || variantKey === 'atendido' || variantKey === 'concluido' ? 'bg-[#4CAF7D]' :
        variantKey === 'encerrado' ? 'bg-[#6B7280]' :
        variantKey === 'critico' ? 'bg-[#CF4444]' : 'bg-[#6B7280]'
      )} />
      {labels[variantKey] || status}
    </span>
  );
}
