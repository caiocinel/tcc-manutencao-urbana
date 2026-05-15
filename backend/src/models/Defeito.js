const crypto = require('crypto');
const { query } = require('../config/database');

function parseJsonField(val, fallback = '[]') {
  if (val == null) return [];
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return JSON.parse(fallback); }
}

function toDefeito(row) {
  if (!row) return null;
  const rawBlob = row.imagem_thumbnail && row.imagem_thumbnail instanceof Buffer
    ? row.imagem_thumbnail : null;
  const thumbnailBase64 = rawBlob
    ? `data:image/webp;base64,${rawBlob.toString('base64')}` : null;
  return {
    _id: row.id, id: row.id, usuario: row.usuario,
    titulo: row.titulo, descricao: row.descricao,
    latitude: row.latitude, longitude: row.longitude,
    rua: row.rua, bairro: row.bairro,
    imagem_url: row.imagem_url, categoria: row.categoria,
    status: row.status, prioridade: row.prioridade,
    previsao_conclusao: row.previsao_conclusao,
    atendido_em: row.atendido_em, usuario_email: row.usuario_email,
    atendente_id: row.atendente_id,
    imagem_thumbnail: thumbnailBase64,
    _imagem_thumbnail: rawBlob,
    imagens_extra: parseJsonField(row.imagens_extra),
    atualizacoes: parseJsonField(row.atualizacoes),
    criado_em: row.criado_em, atualizado_em: row.atualizado_em,
    async save() {
      const now = new Date().toISOString();
      await query(
        `UPDATE defeitos SET titulo = $1, descricao = $2, latitude = $3, longitude = $4,
         rua = $5, bairro = $6, imagem_url = $7, categoria = $8, status = $9,
         prioridade = $10, previsao_conclusao = $11, atendido_em = $12,
         imagem_thumbnail = $13, atualizado_em = $14 WHERE id = $15`,
        [this.titulo, this.descricao, this.latitude, this.longitude,
         this.rua, this.bairro, this.imagem_url, this.categoria, this.status,
         this.prioridade, this.previsao_conclusao, this.atendido_em,
         this._imagem_thumbnail || null, now, this._id]
      );
    },
  };
}

async function populateField(docs, field, select) {
  if (!select) return docs;
  const list = Array.isArray(docs) ? docs : [docs];
  for (const doc of list) {
    if (doc && doc[field]) {
      const { rows } = await query('SELECT id, nome, email, admin FROM users WHERE id = $1', [doc[field]]);
      const ref = rows[0];
      if (ref) {
        const fields = select.split(' ');
        const populated = { _id: ref.id, id: ref.id };
        for (const f of fields) {
          if (ref[f] !== undefined) populated[f] = ref[f];
        }
        doc[field] = populated;
      }
    }
  }
  return docs;
}

const allowedCols = ['id', 'usuario', 'titulo', 'descricao', 'latitude', 'longitude', 'rua', 'bairro', 'categoria', 'status', 'prioridade', 'criado_em', 'atualizado_em', 'usuario_email'];

class DefeitoQuery {
  constructor(filters) {
    this._filters = filters;
    this._sortObj = {};
    this._populateOpts = null;
  }

  sort(obj) {
    this._sortObj = obj;
    return this;
  }

  populate(field, select) {
    this._populateOpts = { field, select };
    return this;
  }

  async exec() {
    let sql = 'SELECT * FROM defeitos';
    const params = [];
    const where = [];

    if (this._filters && Object.keys(this._filters).length > 0) {
      for (const [key, val] of Object.entries(this._filters)) {
        if (!allowedCols.includes(key)) continue;
        if (Array.isArray(val)) {
          const placeholders = val.map((_, i) => `$${params.length + i + 1}`).join(',');
          where.push(`${key} IN (${placeholders})`);
          params.push(...val);
        } else {
          params.push(val);
          where.push(`${key} = $${params.length}`);
        }
      }
    }

    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');

    const keys = Object.keys(this._sortObj);
    if (keys.length > 0) {
      const dirs = keys.map(k => {
        const d = this._sortObj[k];
        return `${k} ${d === -1 ? 'DESC' : 'ASC'}`;
      }).join(', ');
      sql += ' ORDER BY ' + dirs;
    } else {
      sql += ' ORDER BY criado_em DESC';
    }

    const { rows } = await query(sql, params);
    const docs = rows.map(toDefeito);

    if (this._populateOpts) {
      await populateField(docs, this._populateOpts.field, this._populateOpts.select);
    }

    return docs;
  }

  then(resolve, reject) {
    this.exec().then(resolve).catch(reject);
  }
}

class SingleDefeitoQuery {
  constructor(id) {
    this._id = id;
    this._populateOpts = null;
  }

  populate(field, select) {
    this._populateOpts = { field, select };
    return this;
  }

  async exec() {
    const { rows } = await query('SELECT * FROM defeitos WHERE id = $1', [this._id]);
    const doc = toDefeito(rows[0]);
    if (doc && this._populateOpts) {
      await populateField([doc], this._populateOpts.field, this._populateOpts.select);
    }
    return doc;
  }

  then(resolve, reject) {
    this.exec().then(resolve).catch(reject);
  }
}

const Defeito = {
  find(filters = {}) {
    return new DefeitoQuery(filters);
  },

  findById(id) {
    return new SingleDefeitoQuery(id);
  },

  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = data.status || 'pendente';
    const prioridade = data.prioridade || 'media';
    const lat = data.latitude != null ? data.latitude : null;
    const lng = data.longitude != null ? data.longitude : null;
    const previsao = data.previsao_conclusao || null;

    await query(
      `INSERT INTO defeitos (id, usuario, titulo, descricao, latitude, longitude, rua, bairro, imagem_url, categoria, status, prioridade, previsao_conclusao, criado_em, atualizado_em, imagem_thumbnail, imagens_extra, atualizacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [id, data.usuario, data.titulo, data.descricao || null,
       lat, lng, data.rua || null, data.bairro || null,
       data.imagem_url || null, data.categoria || null,
       status, prioridade, previsao, now, now, data.imagem_thumbnail || null,
       JSON.stringify(data.imagens_extra || []), JSON.stringify(data.atualizacoes || [])]
    );

    return toDefeito({
      id, usuario: data.usuario, titulo: data.titulo, descricao: data.descricao,
      latitude: lat, longitude: lng, rua: data.rua || null, bairro: data.bairro || null,
      imagem_url: data.imagem_url, categoria: data.categoria, prioridade, status,
      previsao_conclusao: previsao,
      usuario_email: data.usuario_email, atendido_em: null,
      imagem_thumbnail: data.imagem_thumbnail || null,
      imagens_extra: '[]', atualizacoes: '[]',
      criado_em: now, atualizado_em: now,
    });
  },

  async findByIdAndUpdate(id, update, options = {}) {
    const now = new Date().toISOString();
    const { rows } = await query('SELECT * FROM defeitos WHERE id = $1', [id]);
    const existing = rows[0];
    if (!existing) return null;

    const allowed = ['titulo', 'descricao', 'latitude', 'longitude', 'rua', 'bairro', 'imagem_url', 'categoria', 'status', 'prioridade', 'previsao_conclusao', 'atendido_em', 'usuario_email', 'imagem_thumbnail', 'imagens_extra', 'atualizacoes', 'atendente_id'];
    const sanitized = {};
    for (const key of allowed) {
      sanitized[key] = key in update ? update[key] : existing[key];
    }

    if (update.status === 'atendido' && !existing.atendido_em) {
      sanitized.atendido_em = now;
    }

    await query(
      `UPDATE defeitos SET titulo = $1, descricao = $2, latitude = $3, longitude = $4,
       rua = $5, bairro = $6, imagem_url = $7, categoria = $8, status = $9,
       prioridade = $10, previsao_conclusao = $11, atendido_em = $12,
       imagem_thumbnail = $13, atualizado_em = $14 WHERE id = $15`,
      [sanitized.titulo, sanitized.descricao, sanitized.latitude, sanitized.longitude,
       sanitized.rua, sanitized.bairro, sanitized.imagem_url, sanitized.categoria,
       sanitized.status, sanitized.prioridade, sanitized.previsao_conclusao,
       sanitized.atendido_em, sanitized.imagem_thumbnail || null, now, id]
    );

    if (options.new) {
      const { rows: newRows } = await query('SELECT * FROM defeitos WHERE id = $1', [id]);
      return toDefeito(newRows[0]);
    }
  },
};

module.exports = Defeito;
