// Limitadores de taxa (rate limiting) usando express-rate-limit
const rateLimit = require('express-rate-limit');

// Função para criar limitador reutilizável
const createRateLimiter = (windowMs, max) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,   // Envia headers RateLimit-*
  legacyHeaders: false,     // Não envia headers X-RateLimit-* (obsoletos)
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
});

// Global: 100 requisições a cada 15 minutos (todas as rotas)
const globalLimiter = createRateLimiter(15 * 60 * 1000, 100);

// Autenticação: 10 tentativas a cada 15 minutos (login/registro)
const authLimiter = createRateLimiter(15 * 60 * 1000, 10);

// API: 50 requisições por hora (rotas de defeitos)
const apiLimiter = createRateLimiter(60 * 60 * 1000, 50);

module.exports = { globalLimiter, authLimiter, apiLimiter };
