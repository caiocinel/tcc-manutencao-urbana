const { query } = require('../config/database');

const Apoio = {
  async toggle(usuarioId, defeitoId) {
    const { rows } = await query(
      'SELECT id FROM apoios WHERE usuario_id = $1 AND defeito_id = $2',
      [usuarioId, defeitoId]
    );
    if (rows[0]) {
      await query('DELETE FROM apoios WHERE id = $1', [rows[0].id]);
      return { apoiou: false };
    }
    await query(
      'INSERT INTO apoios (usuario_id, defeito_id, criado_em) VALUES ($1, $2, $3)',
      [usuarioId, defeitoId, new Date().toISOString()]
    );
    return { apoiou: true };
  },

  async countByDefeito(defeitoId) {
    const { rows } = await query('SELECT COUNT(*) as total FROM apoios WHERE defeito_id = $1', [defeitoId]);
    return parseInt(rows[0].total, 10);
  },

  async countsByDefeitos(defeitoIds) {
    if (defeitoIds.length === 0) return {};
    const placeholders = defeitoIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await query(
      `SELECT defeito_id, COUNT(*) as total FROM apoios WHERE defeito_id IN (${placeholders}) GROUP BY defeito_id`,
      defeitoIds
    );
    const map = {};
    for (const row of rows) map[row.defeito_id] = parseInt(row.total, 10);
    return map;
  },

  async hasApoiado(usuarioId, defeitoId) {
    const { rows } = await query(
      'SELECT id FROM apoios WHERE usuario_id = $1 AND defeito_id = $2',
      [usuarioId, defeitoId]
    );
    return !!rows[0];
  },

  async hasApoiadoMany(usuarioId, defeitoIds) {
    if (defeitoIds.length === 0) return {};
    const placeholders = defeitoIds.map((_, i) => `$${i + 2}`).join(',');
    const { rows } = await query(
      `SELECT defeito_id FROM apoios WHERE usuario_id = $1 AND defeito_id IN (${placeholders})`,
      [usuarioId, ...defeitoIds]
    );
    const set = {};
    for (const row of rows) set[row.defeito_id] = true;
    return set;
  },
};

module.exports = Apoio;
