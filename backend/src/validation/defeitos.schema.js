const { z } = require('zod');

const createDefeitoSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório'),
  descricao: z.string().trim().min(20, 'Descreva o problema em detalhes (mínimo 20 caracteres)'),
  latitude: z.coerce.number().min(-90).max(90, 'Latitude inválida'),
  longitude: z.coerce.number().min(-180).max(180, 'Longitude inválida'),
  rua: z.string().optional().default(''),
  bairro: z.string().optional().default(''),
  categoria: z.string().min(1, 'Selecione uma categoria'),
});

const updateDefeitoSchema = z.object({
  status: z.enum(['pendente', 'em_andamento', 'atendido', 'encerrado']).optional(),
  prioridade: z.enum(['baixa', 'media', 'alta']).optional(),
});

const batchEncerrarSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Lista de IDs inválida'),
});

const anexarSchema = z.object({
  atualizacao: z.string().trim().optional(),
});

module.exports = { createDefeitoSchema, updateDefeitoSchema, batchEncerrarSchema, anexarSchema };
