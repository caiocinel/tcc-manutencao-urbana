// Modelo de Defeito - abstrai operações na tabela defeitos
const crypto = require('crypto');
const { db } = require('../config/database');

// Prepared statements para consultas frequentes
const userStmt = db.prepare('SELECT id, nome, email, admin FROM users WHERE id = ?');
const insertStmt = db.prepare(`INSERT INTO defeitos
  (id, usuario, titulo, descricao, latitude, longitude, imagem_url, categoria, status, criado_em, atualizado_em)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const findStmt = db.prepare('SELECT * FROM defeitos ORDER BY criado_em DESC');
const findByIdStmt = db.prepare('SELECT * FROM defeitos WHERE id = ?');
const updateStmt = db.prepare(`UPDATE defeitos SET titulo = ?, descricao = ?, latitude = ?, longitude = ?, imagem_url = ?, categoria = ?, status = ?, atualizado_em = ? WHERE id = ?`);

// Converte linha do SQLite em objeto com métodos
function toDefeito(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id, usuario: row.usuario,
    titulo: row.titulo, descricao: row.descricao,
    localizacao: row.latitude != null ? {
      type: 'Point',
      coordinates: [row.longitude, row.latitude],
    } : null,
    latitude: row.latitude, longitude: row.longitude,
    imagem_url: row.imagem_url, categoria: row.categoria,
    status: row.status, criado_em: row.criado_em, atualizado_em: row.atualizado_em,
    async save() {
      const now = new Date().toISOString();
      updateStmt.run(
        this.titulo, this.descricao, this.latitude, this.longitude,
        this.imagem_url, this.categoria, this.status, now, this._id
      );
    },
  };
}

// Popula um campo referenciando outro documento (ex: usuario -> User)
function populateField(docs, field, select) {
  const list = Array.isArray(docs) ? docs : [docs];
  for (const doc of list) {
    if (doc && doc[field]) {
      const ref = userStmt.get(doc[field]);
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

// Query builder para listar defeitos com filtro, ordenação e populate
class DefeitoQuery {
  constructor(query) {
    this._query = query;
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

  exec() {
    let sql = 'SELECT * FROM defeitos';
    const params = [];

    const where = [];
    if (this._query && Object.keys(this._query).length > 0) {
      for (const [key, val] of Object.entries(this._query)) {
        where.push(`${key} = ?`);
        params.push(val);
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

    const rows = db.prepare(sql).all(...params);
    const docs = rows.map(toDefeito);

    if (this._populateOpts) {
      populateField(docs, this._populateOpts.field, this._populateOpts.select);
    }

    return docs;
  }

  then(resolve, reject) {
    try {
      resolve(this.exec());
    } catch (e) {
      reject(e);
    }
  }
}

// Query builder para buscar um único defeito por ID
class SingleDefeitoQuery {
  constructor(id) {
    this._id = id;
    this._populateOpts = null;
  }

  populate(field, select) {
    this._populateOpts = { field, select };
    return this;
  }

  exec() {
    const doc = toDefeito(findByIdStmt.get(this._id));
    if (doc && this._populateOpts) {
      populateField([doc], this._populateOpts.field, this._populateOpts.select);
    }
    return doc;
  }

  then(resolve, reject) {
    try {
      resolve(this.exec());
    } catch (e) {
      reject(e);
    }
  }
}

const Defeito = {
  // Inicia query com filtro opcional
  find(query = {}) {
    return new DefeitoQuery(query);
  },

  // Busca por ID
  findById(id) {
    return new SingleDefeitoQuery(id);
  },

  // Cria novo defeito com UUID e timestamps
  async create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = data.status || 'pendente';
    const coord = data.localizacao && data.localizacao.coordinates;
    const lng = coord ? coord[0] : null;
    const lat = coord ? coord[1] : (data.latitude || null);

    insertStmt.run(
      id, data.usuario, data.titulo, data.descricao || null,
      lat, lng, data.imagem_url || null, data.categoria || null,
      status, now, now
    );
    return toDefeito({
      id, usuario: data.usuario, titulo: data.titulo, descricao: data.descricao,
      latitude: lat, longitude: lng, imagem_url: data.imagem_url,
      categoria: data.categoria, status, criado_em: now, atualizado_em: now,
    });
  },

  // Atualiza parcialmente um defeito (merge com dados existentes)
  async findByIdAndUpdate(id, update, options = {}) {
    const now = new Date().toISOString();
    const existing = findByIdStmt.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...update, atualizado_em: now };
    updateStmt.run(
      merged.titulo, merged.descricao, merged.latitude, merged.longitude,
      merged.imagem_url, merged.categoria, merged.status, now, id
    );
    if (options.new) {
      return toDefeito(findByIdStmt.get(id));
    }
  },
};

module.exports = Defeito;
