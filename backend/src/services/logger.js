const pino = require('pino');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction
    ? {
        target: 'pino/file',
        options: {
          destination: path.join(__dirname, '..', '..', 'logs', 'app.log'),
          mkdir: true,
        },
      }
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      },
  redact: ['req.headers.authorization', 'req.headers.cookie', 'body.senha', 'body.cpf'],
});

module.exports = logger;
