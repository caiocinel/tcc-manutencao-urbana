const { z } = require('zod');

const updateUserSchema = z.object({
  municipio_id: z.string().optional(),
  admin: z.coerce.number().int().min(0).max(1).optional(),
});

const updateDefeitoAdminSchema = z.object({
  status: z.enum(['pendente', 'em_andamento', 'atendido', 'encerrado']).optional(),
  prioridade: z.enum(['baixa', 'media', 'alta']).optional(),
  previsao_conclusao: z.string().optional(),
});

module.exports = { updateUserSchema, updateDefeitoAdminSchema };
