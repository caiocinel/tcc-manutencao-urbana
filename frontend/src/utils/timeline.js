export function getTimelineItems(d) {
  const items = [{ id: 'criado', active: true, title: 'Chamado Criado', description: d.descricao?.slice(0, 120), date: new Date(d.criado_em).toLocaleString(), meta: `Por ${d.usuario?.nome || 'Anônimo'}` }];
  if (['vinculado_sem_resposta','vinculado_com_resposta','atendido','encerrado','concluido'].includes(d.status))
    items.push({ id: 'vinculado', active: true, title: 'Profissional Vinculado', date: d.atualizado_em ? new Date(d.atualizado_em).toLocaleString() : undefined });
  if (d.status === 'vinculado_com_resposta')
    items.push({ id: 'resposta', active: true, title: 'Resposta Enviada', date: d.atualizado_em ? new Date(d.atualizado_em).toLocaleString() : undefined });
  if (['atendido','encerrado','concluido'].includes(d.status))
    items.push({ id: 'concluido', active: true, title: 'Chamado Concluído', date: d.atendido_em ? new Date(d.atendido_em).toLocaleString() : undefined });
  return items;
}
