// Modelo de Usuário - abstrai operações na tabela users
const crypto = require('crypto');
const { db } = require('../config/database');

// Prepared statements compilados uma vez (performance)
const stmts = {
  findOne: db.prepare('SELECT * FROM users WHERE email = ?'),
  findById: db.prepare('SELECT * FROM users WHERE id = ?'),
  insert: db.prepare(`INSERT INTO users (id, nome, email, senha, admin, requestsResetAt, requestsCount, criado_em, atualizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  update: db.prepare(`UPDATE users SET admin = ?, requestsResetAt = ?, requestsCount = ?, atualizado_em = ? WHERE id = ?`),
};

// Converte linha do SQLite em objeto com métodos
function toUser(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id, nome: row.nome, email: row.email,
    senha: row.senha, admin: row.admin === 1 || row.admin === true,
    requestsResetAt: row.requestsResetAt,
    requestsCount: row.requestsCount,
    criado_em: row.criado_em, atualizado_em: row.atualizado_em,
    async save() {
      const now = new Date().toISOString();
      stmts.update.run(
        this.admin ? 1 : 0, this.requestsResetAt, this.requestsCount, now, this._id
      );
    },
  };
}

const User = {
  // Busca usuário por email (para login)
  async findOne(query) {
    if (query.email) return toUser(stmts.findOne.get(query.email));
    return null;
  },

  // Busca usuário por ID (para autenticação/autorização)
  async findById(id) {
    return toUser(stmts.findById.get(id));
  },

  // Cria novo usuário com UUID e timestamps
  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    stmts.insert.run(
      id, data.nome, data.email, data.senha,
      data.admin ? 1 : 0, data.requestsResetAt || now, 0, now, now
    );
    return toUser({
      id, nome: data.nome, email: data.email, senha: data.senha,
      admin: data.admin ? 1 : 0, requestsResetAt: data.requestsResetAt || now,
      requestsCount: 0, criado_em: now, atualizado_em: now,
    });
  },
};

module.exports = User;
