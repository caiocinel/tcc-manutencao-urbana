/** Histórico do chamado — porte de `frontend/src/utils/timeline.js`. */

import type { Defeito } from '@/types';

import { formatarDataHora, maskName } from './format';

export type TimelineItem = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  meta?: string;
};

const STATUS_VINCULADOS = [
  'vinculado_sem_resposta',
  'vinculado_com_resposta',
  'atendido',
  'encerrado',
  'concluido',
];

const STATUS_CONCLUIDOS = ['atendido', 'encerrado', 'concluido'];

export function getTimelineItems(d: Defeito): TimelineItem[] {
  const items: TimelineItem[] = [
    {
      id: 'criado',
      title: 'Chamado Criado',
      description: d.descricao?.slice(0, 120),
      date: formatarDataHora(d.criado_em),
      meta: `Por ${maskName(d.usuario?.nome)}`,
    },
  ];

  if (STATUS_VINCULADOS.includes(d.status)) {
    items.push({
      id: 'vinculado',
      title: 'Profissional Vinculado',
      date: formatarDataHora(d.atualizado_em),
    });
  }

  if (d.status === 'vinculado_com_resposta') {
    items.push({
      id: 'resposta',
      title: 'Resposta Enviada',
      date: formatarDataHora(d.atualizado_em),
    });
  }

  if (STATUS_CONCLUIDOS.includes(d.status)) {
    items.push({
      id: 'concluido',
      title: 'Chamado Concluído',
      date: formatarDataHora(d.atendido_em),
      meta: ultimaAtualizacao(d),
    });
  }

  return items;
}

/** Último registro automático do backend (ex.: "Concluído por confirmação de cidadãos"). */
function ultimaAtualizacao(d: Defeito): string | undefined {
  if (!d.atualizacoes) return undefined;
  try {
    const lista = JSON.parse(d.atualizacoes) as { texto?: string }[];
    const texto = lista[lista.length - 1]?.texto;
    return texto || undefined;
  } catch {
    return undefined;
  }
}
