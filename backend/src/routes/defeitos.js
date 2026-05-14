const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Defeito = require('../models/Defeito');
const User = require('../models/User');
const Apoio = require('../models/Apoio');
const { query } = require('../config/database');
const { notifyUser } = require('../services/push');
const { apiLimiter } = require('../middleware/rateLimit');
const { compressImage } = require('../middleware/imageProcessor');
const logger = require('../services/logger');
const ia = require('../services/ia');
const { createDefeitoSchema, updateDefeitoSchema, batchEncerrarSchema } = require('../validation/defeitos.schema');
const { validate } = require('../validation/validate');

const PERIMETER_BUFFER_DEG = 0.01;

async function validatePerimeter(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.municipio_id) return next();
    if (user.admin) return next();
    const lat = parseFloat(req.body.latitude);
    const lng = parseFloat(req.body.longitude);
    if (isNaN(lat) || isNaN(lng)) return next();

    const { rows: munRows } = await query(
      'SELECT min_lat, max_lat, min_lng, max_lng, polygon_geom FROM municipios WHERE codigo = $1',
      [user.municipio_id]
    );
    if (munRows.length === 0) return next();

    const m = munRows[0];

    if (m.polygon_geom) {
      const point = `ST_SetSRID(ST_MakePoint($2, $3), 4326)`;
      const { rows } = await query(
        `SELECT 1 FROM municipios
         WHERE codigo = $1
           AND (ST_Within(${point}, polygon_geom)
             OR ST_Within(${point}, ST_Buffer(polygon_geom, ${PERIMETER_BUFFER_DEG})))`,
        [user.municipio_id, lng, lat]
      );
      if (rows.length > 0) return next();
    } else if (m.min_lat != null && m.max_lat != null && m.min_lng != null && m.max_lng != null) {
      if (lat >= m.min_lat && lat <= m.max_lat && lng >= m.min_lng && lng <= m.max_lng) return next();
    } else {
      return next();
    }

    return res.status(403).json({
      error: 'O chamado está fora do perímetro do seu município.',
      dica: 'O GPS pode ter pequenos erros. Tente arrastar o marcador para dentro da área do seu município no mapa.',
    });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao validar perímetro com PostGIS');
    next();
  }
}

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de imagem não suportado. Use JPEG, PNG, WebP, GIF ou AVIF.'));
    }
  },
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Arquivo muito grande. Máximo 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

const authenticateToken = (req, res, next) => {
  const header = req.header('Authorization');
  if (!header) {
    return res.status(401).json({ error: 'Acesso negado' });
  }

  try {
    const verified = jwt.verify(header, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Token inválido' });
  }
};

const requireEmailVerified = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    if (user.admin) return next();
    if (!user.email_verificado) {
      return res.status(403).json({ error: 'Verifique seu email antes de criar um chamado' });
    }
    next();
  } catch (error) {
    logger.error({ err: error }, 'Erro ao verificar email');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const checkUserRateLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

    const now = Date.now();
    const resetAt = user.requestsResetAt ? new Date(user.requestsResetAt).getTime() : 0;
    if (now - resetAt > 60 * 60 * 1000) {
      user.requestsCount = 0;
      user.requestsResetAt = new Date(now);
    }

    if (user.requestsCount >= 10) {
      return res.status(429).json({ error: 'Limite de requisições excedido. Aguarde 1 hora.' });
    }

    user.requestsCount += 1;
    await user.save();
    next();
  } catch (error) {
    logger.error({ err: error }, 'Erro no rate limit');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.post('/', authenticateToken, requireEmailVerified, checkUserRateLimit, apiLimiter, validate(createDefeitoSchema), upload.single('imagem'), handleMulterError, compressImage, validatePerimeter, async (req, res) => {
  try {
    const { titulo, descricao, latitude, longitude, rua, bairro, categoria } = req.body;

    const { rows: catRows } = await query(
      'SELECT prioridade_base, prazo_sla_dias FROM categorias WHERE nome = $1',
      [categoria]
    );
    if (!catRows[0]) {
      return res.status(400).json({ error: 'Categoria inválida' });
    }

    const prioridade = catRows[0].prioridade_base;
    const previsao_conclusao = new Date(Date.now() + catRows[0].prazo_sla_dias * 24 * 60 * 60 * 1000).toISOString();

    const imagem_url = req.file ? `/uploads/${req.file.filename}` : null;

    const defeito = await Defeito.create({
      usuario: req.user.userId,
      titulo,
      descricao,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      rua: rua || null,
      bairro: bairro || null,
      categoria,
      prioridade,
      previsao_conclusao,
      imagem_url,
      imagem_thumbnail: req.file?.thumbnailBlob || null,
    });

    let iaSugestao = null;
    let iaPrioridade = null;
    let iaDuplicatas = null;
    let iaSpam = null;
    let iaEncaminhamento = null;

    if (!ia.circuitBreaker.isOpen()) {
      const full = await ia.classifyFull(descricao);
      if (full) {
        if (full.category && full.category !== categoria && full.confidence > 0.5) {
          iaSugestao = { categoria: full.category, confianca: full.confidence };
        }
        iaPrioridade = { prioridade: full.priority, confianca: full.priority_confidence };
      }

      if (latitude && longitude) {
        try {
          const { rows } = await query(`
            SELECT id, titulo, descricao, latitude, longitude,
                   ST_Distance(geom, ST_SetSRID(ST_MakePoint($2, $1), 4326)) AS dist
            FROM defeitos
            WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint($2, $1), 4326), 0.01)
              AND criado_em::timestamp > NOW() - interval '7 days'
            ORDER BY dist
            LIMIT 10
          `, [parseFloat(latitude), parseFloat(longitude)]);
          const similares = [];
          for (const row of rows) {
            const sim = await ia.textSimilarity(descricao, row.descricao || row.titulo);
            if (sim && sim.score > 0.3) {
              similares.push({ id: row.id, titulo: row.titulo, similaridade: sim.score });
            }
          }
          if (similares.length > 0) iaDuplicatas = { duplicatas: similares, total: similares.length };
        } catch (e) {
          logger.error({ err: e.message }, 'Erro ao buscar duplicatas');
        }
      }

      const spam = await ia.checkSpam(descricao);
      if (spam) {
        iaSpam = { is_spam: spam.is_spam, confianca: spam.confidence, motivo: spam.reason };
      }

      iaEncaminhamento = ia.routing(categoria);

      if (req.file) {
        const imageBase64 = req.file.buffer ? req.file.buffer.toString('base64') : null;
        if (imageBase64) {
          const imgResp = await (await fetch(`${process.env.IA_URL || 'http://ia:8000'}/classify-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageBase64 }),
            signal: AbortSignal.timeout(3000),
          })).json().catch(() => null);
          if (imgResp && imgResp.category && imgResp.category !== categoria && imgResp.confidence > 0.5) {
            iaSugestao = { categoria: imgResp.category, confianca: imgResp.confidence };
          }
        }
      }
    }

    const responseData = { ...defeito };
    if (iaSugestao) responseData.categoria_sugerida_ia = iaSugestao;
    if (iaPrioridade) responseData.prioridade_sugerida_ia = iaPrioridade;
    if (iaDuplicatas) responseData.duplicatas_ia = iaDuplicatas;
    if (iaSpam) responseData.spam_ia = iaSpam;
    if (iaEncaminhamento) responseData.encaminhamento_ia = iaEncaminhamento;

    res.status(201).json(responseData);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao criar defeito');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

const PESO_PRIORIDADE = { alta: 10, media: 6, baixa: 2 };

function calcularScoreUrgencia(d) {
  const pesoCat = PESO_PRIORIDADE[d.prioridade] || 6;
  const diasEspera = Math.max(0, (Date.now() - new Date(d.criado_em).getTime()) / (24 * 60 * 60 * 1000));
  const apoios = d.apoios_total || 0;
  return Math.round((pesoCat * 0.6) + (Math.min(diasEspera, 30) * 0.3) + (Math.min(apoios, 20) * 0.1));
}

router.get('/', async (req, res) => {
  try {
    const filter = {};
    const { dias, ordenar, status } = req.query;
    if (status) {
      const statusList = status.split(',').map(s => s.trim());
      filter.status = statusList.length === 1 ? statusList[0] : statusList;
    }
    let defeitos = await Defeito.find(filter)
      .populate('usuario', 'nome email')
      .sort({ criado_em: -1 });
    if (dias) {
      const cutoff = new Date(Date.now() - parseInt(dias) * 24 * 60 * 60 * 1000);
      defeitos = defeitos.filter(d => new Date(d.criado_em) >= cutoff);
    }

    const defeitoIds = defeitos.map(d => d.id);
    const apoioCounts = await Apoio.countsByDefeitos(defeitoIds);
    for (const d of defeitos) {
      d.apoios_total = apoioCounts[d.id] || 0;
    }

    const authHeader = req.header('Authorization');
    let usuarioApoios = {};
    if (authHeader) {
      try {
        const verified = jwt.verify(authHeader, process.env.JWT_SECRET);
        usuarioApoios = await Apoio.hasApoiadoMany(verified.userId, defeitoIds);
      } catch {}
      for (const d of defeitos) {
        d.usuario_apoiou = !!usuarioApoios[d.id];
      }
    }

    for (const d of defeitos) {
      d.score_urgencia = calcularScoreUrgencia(d);
    }

    if (ordenar === 'score') {
      defeitos.sort((a, b) => (b.score_urgencia || 0) - (a.score_urgencia || 0));
    }

    res.json(defeitos);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar defeitos');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/meus', authenticateToken, async (req, res) => {
  try {
    const defeitos = await Defeito.find({ usuario: req.user.userId })
      .populate('usuario', 'nome email')
      .sort({ criado_em: -1 });
    res.json(defeitos);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar meus defeitos');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/regioes', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const rf = {};
    const { dias, status: rStatus } = req.query;
    if (rStatus) {
      const statusList = rStatus.split(',').map(s => s.trim());
      rf.status = statusList.length === 1 ? statusList[0] : statusList;
    }
    let todos = await Defeito.find(rf).populate('usuario', 'nome email');
    if (dias) {
      const cutoff = new Date(Date.now() - parseInt(dias) * 24 * 60 * 60 * 1000);
      todos = todos.filter(d => new Date(d.criado_em) >= cutoff);
    }

    const clusters = clusterizarDefeitos(todos);
    res.json(clusters);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao agrupar regiões');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

function clusterizarDefeitos(lista, raio = 0.005) {
  const clusters = [];
  const visitados = new Set();
  for (const d of lista) {
    if (visitados.has(d.id) || !d.latitude || !d.longitude) continue;
    const grupo = [];
    for (const outro of lista) {
      if (visitados.has(outro.id) || !outro.latitude || !outro.longitude) continue;
      const dist = Math.sqrt(
        Math.pow(d.latitude - outro.latitude, 2) +
        Math.pow(d.longitude - outro.longitude, 2)
      );
      if (dist < raio) {
        grupo.push(outro);
        visitados.add(outro.id);
      }
    }
    if (grupo.length > 0) {
      const centroLat = grupo.reduce((s, x) => s + x.latitude, 0) / grupo.length;
      const centroLng = grupo.reduce((s, x) => s + x.longitude, 0) / grupo.length;
      const comImagem = grupo.filter(x => x.imagem_url).length;
      const statusCount = {};
      for (const g of grupo) {
        statusCount[g.status] = (statusCount[g.status] || 0) + 1;
      }
      clusters.push({
        id: grupo.map(x => x.id).join(','),
        centro: { latitude: centroLat, longitude: centroLng },
        total: grupo.length,
        com_imagem: comImagem,
        status: statusCount,
        defeitos: grupo.slice(0, 20),
      });
    }
  }
  clusters.sort((a, b) => b.total - a.total);
  return clusters;
}

router.get('/clusters', async (req, res) => {
  try {
    const filter = {};
    const { status, usuario, dias } = req.query;
    if (status) {
      const statusList = status.split(',').map(s => s.trim());
      filter.status = statusList.length === 1 ? statusList[0] : statusList;
    }
    if (usuario) filter.usuario = usuario;
    let todos = await Defeito.find(filter).populate('usuario', 'nome email');
    if (dias) {
      const cutoff = new Date(Date.now() - parseInt(dias) * 24 * 60 * 60 * 1000);
      todos = todos.filter(d => new Date(d.criado_em) >= cutoff);
    }

    const defeitoIds = todos.map(d => d.id);
    const apoioCounts = await Apoio.countsByDefeitos(defeitoIds);
    for (const d of todos) {
      d.apoios_total = apoioCounts[d.id] || 0;
    }
    const authHeader = req.header('Authorization');
    let usuarioApoios = {};
    if (authHeader) {
      try {
        const verified = jwt.verify(authHeader, process.env.JWT_SECRET);
        usuarioApoios = await Apoio.hasApoiadoMany(verified.userId, defeitoIds);
      } catch {}
      for (const d of todos) {
        d.usuario_apoiou = !!usuarioApoios[d.id];
      }
    }

    const clusters = clusterizarDefeitos(todos);
    res.json(clusters);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao clusterizar');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/encerrar-lote', authenticateToken, validate(batchEncerrarSchema), async (req, res) => {
  try {
    const { ids } = req.body;
    const now = new Date().toISOString();
    let count = 0;
    for (const id of ids) {
      const result = await Defeito.findByIdAndUpdate(id, { status: 'encerrado', atendido_em: now });
      if (result) count++;
    }
    res.json({ message: `${count} chamado(s) encerrado(s)`, encerrados: count });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao encerrar lote');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/:id/apoiar', authenticateToken, async (req, res) => {
  try {
    const defeito = await Defeito.findById(req.params.id);
    if (!defeito) return res.status(404).json({ error: 'Defeito não encontrado' });
    const result = await Apoio.toggle(req.user.userId, req.params.id);
    result.total = await Apoio.countByDefeito(req.params.id);
    result.apoiado = await Apoio.hasApoiado(req.user.userId, req.params.id);
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao alternar apoio');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const defeito = await Defeito.findById(req.params.id)
      .populate('usuario', 'nome email');

    if (!defeito) {
      return res.status(404).json({ error: 'Defeito não encontrado' });
    }

    defeito.apoios_total = await Apoio.countByDefeito(req.params.id);

    const authHeader = req.header('Authorization');
    if (authHeader) {
      try {
        const verified = jwt.verify(authHeader, process.env.JWT_SECRET);
        defeito.usuario_apoiou = await Apoio.hasApoiado(verified.userId, req.params.id);
      } catch {
        defeito.usuario_apoiou = false;
      }
    }

    res.json(defeito);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao obter defeito');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/:id', authenticateToken, apiLimiter, validate(updateDefeitoSchema), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const oldDefeito = await Defeito.findById(req.params.id);
    if (!oldDefeito) {
      return res.status(404).json({ error: 'Defeito não encontrado' });
    }

    const { status, prioridade } = req.body;
    const update = {};
    if (status) update.status = status;
    if (prioridade) update.prioridade = prioridade;

    const defeito = await Defeito.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (status && status !== oldDefeito.status) {
      const statusLabels = { pendente: 'Pendente', em_andamento: 'Em Andamento', atendido: 'Atendido', encerrado: 'Encerrado' };
      notifyUser(
        defeito.usuario,
        'Status atualizado',
        `Seu chamado "${defeito.titulo}" mudou para: ${statusLabels[status] || status}`,
        '/'
      ).catch(() => {});
    }

    res.json(defeito);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao atualizar defeito');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/:id/anexar', authenticateToken, upload.single('imagem'), handleMulterError, compressImage, async (req, res) => {
  try {
    const { rows: defeitoRows } = await query('SELECT * FROM defeitos WHERE id = $1', [req.params.id]);
    const defeitoRow = defeitoRows[0];
    if (!defeitoRow) return res.status(404).json({ error: 'Defeito não encontrado' });

    if (defeitoRow.status !== 'pendente') {
      return res.status(400).json({ error: 'Apenas chamados pendentes podem receber anexos.' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(403).json({ error: 'Acesso negado' });

    const { atualizacao } = req.body;

    const imagensExtra = JSON.parse(defeitoRow.imagens_extra || '[]');
    const totalImagens = (defeitoRow.imagem_url ? 1 : 0) + imagensExtra.length;

    if (req.file && totalImagens >= 3) {
      return res.status(400).json({ error: 'Limite máximo de 3 imagens por chamado atingido.' });
    }

    if (req.file) {
      const novaImagem = `/uploads/${req.file.filename}`;
      imagensExtra.push(novaImagem);
    }

    const atualizacoes = JSON.parse(defeitoRow.atualizacoes || '[]');
    if (atualizacao && atualizacao.trim()) {
      atualizacoes.push({
        texto: atualizacao.trim(),
        usuario: user.nome || user.email,
        criado_em: new Date().toISOString(),
      });
    }

    await query(
      'UPDATE defeitos SET imagens_extra = $1, atualizacoes = $2, atualizado_em = $3 WHERE id = $4',
      [JSON.stringify(imagensExtra), JSON.stringify(atualizacoes), new Date().toISOString(), req.params.id]
    );

    const updated = await Defeito.findById(req.params.id).populate('usuario', 'nome email');
    res.json(updated);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao anexar ao defeito');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
