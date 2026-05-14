const express = require('express');
const jwt = require('jsonwebtoken');
const ia = require('../services/ia');
const { query } = require('../config/database');
const logger = require('../services/logger');

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const header = req.header('Authorization');
  if (!header) return res.status(401).json({ error: 'Acesso negado' });
  try {
    req.user = jwt.verify(header, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(400).json({ error: 'Token inválido' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    if (!user || !user.admin) return res.status(403).json({ error: 'Acesso negado' });
    next();
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
};

router.post('/classify', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Texto obrigatorio' });
  const result = await ia.classifyFull(text);
  if (!result) return res.status(503).json({ error: 'IA indisponivel' });
  res.json(result);
});

router.get('/routing/:categoria', (req, res) => {
  const result = ia.routing(req.params.categoria);
  res.json(result);
});

router.get('/dedup', async (req, res) => {
  const { lat, lng, texto, raio } = req.query;
  if (!lat || !lng || !texto) {
    return res.status(400).json({ error: 'lat, lng e texto obrigatorios' });
  }
  const raioMetros = parseInt(raio) || 50;
  const dias = parseInt(req.query.dias) || 7;
  try {
    const { rows } = await query(`
      SELECT id, titulo, descricao, latitude, longitude,
             (ABS(latitude - $2) + ABS(longitude - $3)) AS dist_aprox
      FROM defeitos
      WHERE latitude BETWEEN $2 - 0.01 AND $2 + 0.01
        AND longitude BETWEEN $3 - 0.01 AND $3 + 0.01
        AND criado_em::timestamp > NOW() - ($1 || ' days')::interval
      ORDER BY criado_em DESC
      LIMIT 20
    `, [dias, parseFloat(lat), parseFloat(lng)]);

    const similares = [];
    for (const row of rows) {
      const sim = await ia.textSimilarity(texto, row.descricao || row.titulo);
      if (sim && sim.score > 0.3) {
        similares.push({
          id: row.id,
          titulo: row.titulo,
          distancia: Math.round(row.distancia),
          similaridade: sim.score,
        });
      }
    }
    similares.sort((a, b) => b.similaridade - a.similaridade);
    res.json({ duplicatas: similares, total: similares.length });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar duplicatas');
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/critical-clusters', authenticateToken, requireAdmin, async (req, res) => {
  const { dias, raio } = req.query;
  const periodoDias = parseInt(dias) || 7;
  const raioMetros = parseInt(raio) || 100;
  try {
    const { rows } = await query(`
      SELECT categoria,
             ROUND(AVG(latitude)::numeric, 5) AS centro_lat,
             ROUND(AVG(longitude)::numeric, 5) AS centro_lng,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status IN ('pendente','em_andamento')) AS abertos,
             ROUND(STDDEV(latitude)::numeric * 111320, 0) AS dispersao
      FROM defeitos
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND criado_em::timestamp > NOW() - ($1 || ' days')::interval
      GROUP BY categoria
      HAVING COUNT(*) >= 5
      ORDER BY total DESC
    `, [periodoDias]);

    res.json(rows.map(r => ({
      categoria: r.categoria,
      centro: { latitude: parseFloat(r.centro_lat), longitude: parseFloat(r.centro_lng) },
      total: parseInt(r.total),
      abertos: parseInt(r.abertos),
      dispersao: parseInt(r.dispersao),
    })));
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar clusters criticos');
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/weekly-summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE criado_em::timestamp > NOW() - interval '7 days') AS semana,
        COUNT(*) FILTER (WHERE criado_em::timestamp > NOW() - interval '7 days' AND status IN ('pendente','em_andamento')) AS abertos_semana,
        COUNT(*) FILTER (WHERE criado_em::timestamp > NOW() - interval '7 days' AND status IN ('atendido','encerrado')) AS resolvidos_semana,
        ROUND(AVG(EXTRACT(EPOCH FROM (NULLIF(atendido_em, '')::timestamp - criado_em::timestamp)) / 86400) FILTER (WHERE atendido_em IS NOT NULL AND atendido_em != ''), 1) AS tempo_medio_dias,
        (SELECT categoria FROM defeitos WHERE criado_em::timestamp > NOW() - interval '7 days' GROUP BY categoria ORDER BY COUNT(*) DESC LIMIT 1) AS top_categoria,
        (SELECT bairro FROM defeitos WHERE criado_em::timestamp > NOW() - interval '7 days' AND bairro IS NOT NULL AND bairro != '' GROUP BY bairro ORDER BY COUNT(*) DESC LIMIT 1) AS top_bairro
      FROM defeitos
    `);

    const r = rows[0];
    res.json({
      periodo: '7 dias',
      total_geral: parseInt(r.total),
      semana: {
        total: parseInt(r.semana),
        abertos: parseInt(r.abertos_semana),
        resolvidos: parseInt(r.resolvidos_semana),
        taxa_resolucao: r.semana > 0 ? Math.round((r.resolvidos_semana / r.semana) * 100) : 0,
      },
      tempo_medio_dias: r.tempo_medio_dias ? parseFloat(r.tempo_medio_dias) : null,
      top_categoria: r.top_categoria,
      top_bairro: r.top_bairro,
    });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao gerar resumo semanal');
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
