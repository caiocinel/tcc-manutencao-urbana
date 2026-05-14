const logger = require('../services/logger');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      logger.warn({ path: firstError.path, message: firstError.message }, 'Validação Zod rejeitada');
      return res.status(400).json({ error: firstError.message });
    }
    req.body = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return res.status(400).json({ error: firstError.message });
    }
    req.query = result.data;
    next();
  };
}

module.exports = { validate, validateQuery };
