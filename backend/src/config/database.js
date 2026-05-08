// Configuração do banco de dados SQLite
// better-sqlite3 é síncrono e mais leve que MongoDB/NeDB
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Garante que o diretório do banco existe
const dbDir = path.join(__dirname, '..', '..', '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Caminho do arquivo .db
const dbPath = path.join(dbDir, 'manutencao_urbana.db');
const db = new Database(dbPath);

// WAL mode: melhor performance em concorrência de leitura/escrita
db.pragma('journal_mode = WAL');
// Chaves estrangeiras: garante integridade referencial
db.pragma('foreign_keys = ON');

// Cria tabelas se não existirem (schema inicial)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    admin INTEGER NOT NULL DEFAULT 0,
    requestsResetAt TEXT,
    requestsCount INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS defeitos (
    id TEXT PRIMARY KEY,
    usuario TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    latitude REAL,
    longitude REAL,
    imagem_url TEXT,
    categoria TEXT,
    status TEXT NOT NULL DEFAULT 'pendente',
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    FOREIGN KEY (usuario) REFERENCES users(id)
  );
`);

function connectDB() {
  console.log(`Banco de dados SQLite inicializado em: ${dbPath}`);
  return Promise.resolve();
}

module.exports = { connectDB, db };
