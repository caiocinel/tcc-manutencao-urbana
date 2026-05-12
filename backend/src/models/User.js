const crypto = require('crypto');
const { query } = require('../config/database');
const { encrypt, decrypt, hash } = require('../services/encryption');

function toUser(row) {
  if (!row) return null;
  let cpfDecrypted = null;
  if (row.cpf) {
    try { cpfDecrypted = decrypt(row.cpf); } catch { cpfDecrypted = null; }
  }
  return {
    _id: row.id, id: row.id, nome: row.nome, email: row.email,
    senha: row.senha, admin: row.admin === 1 || row.admin === true,
    municipio_id: row.municipio_id, cpf: cpfDecrypted,
    email_verificado: row.email_verificado === 1 || row.email_verificado === true,
    codigo_2fa: row.codigo_2fa, codigo_2fa_expira: row.codigo_2fa_expira,
    cpf_hash: row.cpf_hash,
    requestsResetAt: row.requestsResetAt,
    requestsCount: row.requestsCount,
    criado_em: row.criado_em, atualizado_em: row.atualizado_em,
    async save() {
      const now = new Date().toISOString();
      await query(
        'UPDATE users SET admin = $1, requestsResetAt = $2, requestsCount = $3, atualizado_em = $4 WHERE id = $5',
        [this.admin ? 1 : 0, this.requestsResetAt, this.requestsCount, now, this._id]
      );
    },
  };
}

const User = {
  async findOne({ email }) {
    if (!email) return null;
    const { rows } = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return toUser(rows[0]);
  },

  async findById(id) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return toUser(rows[0]);
  },

  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const resetAt = data.requestsResetAt instanceof Date
      ? data.requestsResetAt.toISOString()
      : (data.requestsResetAt || now);
    const email = data.email ? data.email.toLowerCase() : data.email;
    const cpfEncrypted = data.cpf ? encrypt(data.cpf) : null;
    const cpfHashed = data.cpf ? hash(data.cpf) : null;
    await query(
      `INSERT INTO users (id, nome, email, senha, admin, municipio_id, requestsResetAt, requestsCount, criado_em, atualizado_em, cpf, cpf_hash, email_verificado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, data.nome, email, data.senha,
       data.admin ? 1 : 0, data.municipio_id || null, resetAt, 0, now, now,
       cpfEncrypted, cpfHashed, data.email_verificado ? 1 : 0]
    );
    return toUser({
      id, nome: data.nome, email, senha: data.senha,
      admin: data.admin ? 1 : 0, municipio_id: data.municipio_id || null,
      cpf: cpfEncrypted, email_verificado: !!data.email_verificado,
      requestsResetAt: resetAt,
      requestsCount: 0, criado_em: now, atualizado_em: now,
    });
  },

  async updatePassword(id, hashedPassword) {
    const now = new Date().toISOString();
    await query('UPDATE users SET senha = $1, atualizado_em = $2 WHERE id = $3', [hashedPassword, now, id]);
  },

  async findByCpf(cpf) {
    const { rows } = await query('SELECT * FROM users WHERE cpf_hash = $1', [hash(cpf)]);
    return toUser(rows[0]);
  },

  async verifyEmail(id) {
    const now = new Date().toISOString();
    await query('UPDATE users SET email_verificado = 1, atualizado_em = $1 WHERE id = $2', [now, id]);
  },

  async set2faCode(id, code, expiraEm) {
    const now = new Date().toISOString();
    await query('UPDATE users SET codigo_2fa = $1, codigo_2fa_expira = $2, atualizado_em = $3 WHERE id = $4',
      [code, expiraEm.toISOString(), now, id]);
  },

  async clear2faCode(id) {
    const now = new Date().toISOString();
    await query('UPDATE users SET codigo_2fa = NULL, codigo_2fa_expira = NULL, atualizado_em = $1 WHERE id = $2', [now, id]);
  },
};

module.exports = User;
