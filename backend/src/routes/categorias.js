const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT id, nome, icone, prioridade_base, prazo_sla_dias FROM categorias ORDER BY id');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
