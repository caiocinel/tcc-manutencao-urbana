const { Pool } = require('pg');
const logger = require('../services/logger');

const sslConfig = process.env.DB_SSL === 'true'
  ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } }
  : {};

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'manutencao_urbana',
  user: process.env.DB_USER || 'urbana',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...sslConfig,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Erro inesperado no pool do PostgreSQL');
});

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 500) {
    logger.warn({ query: text, duration }, 'Query lenta');
  }
  return result;
}

async function getClient() {
  const client = await pool.connect();
  return client;
}

async function connectDB() {
  try {
    await pool.query('SELECT 1');
    logger.info('Conectado ao PostgreSQL');

    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await pool.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS municipios (
        codigo TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        uf TEXT NOT NULL,
        uf_sigla TEXT NOT NULL,
        min_lat DOUBLE PRECISION NOT NULL,
        max_lat DOUBLE PRECISION NOT NULL,
        min_lng DOUBLE PRECISION NOT NULL,
        max_lng DOUBLE PRECISION NOT NULL,
        poligono_json TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        admin INTEGER NOT NULL DEFAULT 0,
        municipio_id TEXT REFERENCES municipios(codigo),
        cpf TEXT,
        cpf_hash TEXT UNIQUE,
        email_verificado INTEGER NOT NULL DEFAULT 0,
        codigo_2fa TEXT,
        codigo_2fa_expira TEXT,
        requestsResetAt TEXT,
        requestsCount INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS defeitos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario UUID NOT NULL REFERENCES users(id),
        titulo TEXT NOT NULL,
        descricao TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        rua TEXT,
        bairro TEXT,
        imagem_url TEXT,
        categoria TEXT,
        status TEXT DEFAULT 'pendente',
        prioridade TEXT DEFAULT 'media',
        previsao_conclusao TEXT,
        atendido_em TEXT,
        usuario_email TEXT,
        imagem_thumbnail BYTEA,
        imagens_extra TEXT DEFAULT '[]',
        atualizacoes TEXT DEFAULT '[]',
        criado_em TEXT NOT NULL,
        atualizado_em TEXT NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nome TEXT UNIQUE NOT NULL,
        icone TEXT,
        prioridade_base TEXT NOT NULL DEFAULT 'media',
        prazo_sla_dias INTEGER NOT NULL DEFAULT 7
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS apoios (
        id SERIAL PRIMARY KEY,
        usuario_id UUID NOT NULL REFERENCES users(id),
        defeito_id UUID NOT NULL REFERENCES defeitos(id),
        criado_em TEXT NOT NULL DEFAULT (TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        UNIQUE(usuario_id, defeito_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        usuario_id UUID NOT NULL REFERENCES users(id),
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        criado_em TEXT NOT NULL DEFAULT (TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
        UNIQUE(usuario_id, endpoint)
      )
    `);

    await pool.query(`ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS atendente_id UUID REFERENCES users(id)`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_defeitos_categoria ON defeitos(categoria)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_defeitos_status ON defeitos(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_defeitos_usuario ON defeitos(usuario)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_cpf_hash ON users(cpf_hash)`);

    const { rows } = await pool.query('SELECT COUNT(*) as c FROM categorias');
    if (parseInt(rows[0].c) === 0) {
      const cats = [
        ['Segurança Crítica', '⚠️', 'alta', 1],
        ['Saneamento/Saúde', '💧', 'alta', 3],
        ['Mobilidade', '🛣️', 'media', 7],
        ['Zeladoria', '🧹', 'baixa', 15],
        ['Iluminação', '💡', 'media', 5],
        ['Árvore Caída', '🌳', 'alta', 2],
        ['Semáforo', '🚦', 'alta', 2],
        ['Buraco', '🕳️', 'media', 7],
        ['Outro', '📋', 'baixa', 15],
      ];
      for (const c of cats) {
        await pool.query('INSERT INTO categorias (nome, icone, prioridade_base, prazo_sla_dias) VALUES ($1, $2, $3, $4)', c);
      }
      logger.info('Categorias padrao inseridas.');
    }

    return pool;
  } catch (err) {
    logger.error({ err }, 'Falha ao conectar ao PostgreSQL');
    throw err;
  }
}

module.exports = { query, getClient, pool, connectDB };
