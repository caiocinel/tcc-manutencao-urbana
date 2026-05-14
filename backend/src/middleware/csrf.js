// Middleware de proteção CSRF (Double Submit Cookie Pattern)
const crypto = require('crypto');

const TOKEN_COOKIE = 'XSRF-TOKEN';
const SESSION_COOKIE = 'XSRF-SESSION';

// Gera token CSRF apenas se ainda não existir (evita multi-tab race)
const generateCsrfToken = (req, res, next) => {
  if (req.method !== 'GET') return next();

  let sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) {
    sessionId = crypto.randomBytes(16).toString('hex');
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production' || !!process.env.HTTPS,
      path: '/',
    });
  }

  // Só gera novo token se não existir um cookie XSRF-TOKEN válido
  let token = req.cookies?.[TOKEN_COOKIE];
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(TOKEN_COOKIE, token, {
      httpOnly: false,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      secure: process.env.NODE_ENV === 'production' || !!process.env.HTTPS,
      path: '/',
    });
  }
  req.csrfToken = token;
  next();
};

// Valida se o token do header corresponde ao cookie (em mutations)
const validateCsrfToken = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const headerToken = req.headers['x-xsrf-token'];
  const cookieToken = req.cookies?.[TOKEN_COOKIE];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: 'Token CSRF inválido' });
  }

  next();
};

module.exports = { generateCsrfToken, validateCsrfToken };
