const express = require('express');
const { query } = require('../config/database');
const logger = require('../services/logger');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT codigo, nome, uf_sigla FROM municipios ORDER BY uf_sigla, nome');
    res.json(rows);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar municípios');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:codigo', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM municipios WHERE codigo = $1', [req.params.codigo]);
    if (!rows[0]) return res.status(404).json({ error: 'Município não encontrado' });
    res.json(rows[0]);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar município');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
