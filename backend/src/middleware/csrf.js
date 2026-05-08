// Middleware de proteção CSRF (Double Submit Cookie Pattern)
const crypto = require('crypto');

const TOKEN_COOKIE = 'XSRF-TOKEN';
const SESSION_COOKIE = 'XSRF-SESSION';

// Gera token CSRF em requisições GET e define cookies
const generateCsrfToken = (req, res, next) => {
  if (req.method !== 'GET') return next();

  // Sessão httpOnly (não acessível via JS) - identifica o cliente
  let sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) {
    sessionId = crypto.randomBytes(16).toString('hex');
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,       // Invisível para JavaScript
      sameSite: 'strict',   // Protege contra ataques de outro site
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  // Token acessível via JS (httpOnly: false) - enviado no header X-XSRF-TOKEN
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
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
