const { z } = require('zod');

const registerSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.string().trim().toLowerCase().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  municipio_id: z.string().min(1, 'Município é obrigatório'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

const verify2faSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  codigo: z.string().length(6, 'Código deve ter 6 dígitos'),
});

const changePasswordSchema = z.object({
  senha_atual: z.string().min(1, 'Senha atual é obrigatória'),
  nova_senha: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});

const updateProfileSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').optional(),
  email: z.string().trim().toLowerCase().email('Email inválido').optional(),
});

module.exports = { registerSchema, loginSchema, verify2faSchema, changePasswordSchema, updateProfileSchema };
