// Rotas de defeitos (CRUD + upload de imagem)
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Defeito = require('../models/Defeito');
const User = require('../models/User');
const { apiLimiter } = require('../middleware/rateLimit');
const { compressImage } = require('../middleware/imageProcessor');

const router = express.Router();

// Configura o multer para salvar arquivos em /uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
  // Verifica se o token de autenticação foi fornecido
  const header = req.header('Authorization');
  if (!header) {
    return res.status(401).json({ error: 'Acesso negado' });
  }

  try {
    // Valida o token JWT
    const verified = jwt.verify(header, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Token inválido' });
  }
};

// Rate limit por usuário: máximo 10 requisições por hora
const checkUserRateLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

    const now = new Date();
    // Reseta o contador se passou 1 hora
    if (now - user.requestsResetAt > 60 * 60 * 1000) {
      user.requestsCount = 0;
      user.requestsResetAt = now;
    }

    if (user.requestsCount >= 10) {
      return res.status(429).json({ error: 'Limite de requisições excedido. Aguarde 1 hora.' });
    }

    user.requestsCount += 1;
    await user.save();
    next();
  } catch (error) {
    console.error('Erro no rate limit:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Garante que a pasta de uploads existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// POST /api/defeitos - Cria novo defeito (autenticado, com foto opcional)
router.post('/', authenticateToken, checkUserRateLimit, apiLimiter, upload.single('imagem'), compressImage, async (req, res) => {
  try {
    const { titulo, descricao, latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude e longitude são obrigatórios' });
    }

    const imagem_url = req.file ? `/uploads/${req.file.filename}` : null;

    const defeito = await Defeito.create({
      usuario: req.user.userId,
      titulo,
      descricao,
      localizacao: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      imagem_url,
    });

    // Tenta classificar automaticamente via IA (falha silenciosa se indisponível)
    try {
      const iaUrl = process.env.IA_URL || 'http://localhost:8000';
      const response = await axios.post(`${iaUrl}/classify`, {
        text: descricao,
      }, { timeout: 10000 });

      defeito.categoria = response.data.category;
      await defeito.save();
    } catch (error) {
      console.error('Erro ao classificar com IA:', error.message);
    }

    res.status(201).json(defeito);
  } catch (error) {
    console.error('Erro ao criar defeito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/defeitos - Lista todos os defeitos (público)
router.get('/', async (req, res) => {
  try {
    const defeitos = await Defeito.find()
      .populate('usuario', 'nome email')
      .sort({ criado_em: -1 });
    res.json(defeitos);
  } catch (error) {
    console.error('Erro ao listar defeitos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/defeitos/:id - Detalhe de um defeito (público)
router.get('/:id', async (req, res) => {
  try {
    const defeito = await Defeito.findById(req.params.id)
      .populate('usuario', 'nome email');

    if (!defeito) {
      return res.status(404).json({ error: 'Defeito não encontrado' });
    }

    res.json(defeito);
  } catch (error) {
    console.error('Erro ao obter defeito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /api/defeitos/:id - Atualiza status do defeito (admin only)
router.patch('/:id', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.admin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { status } = req.body;
    const defeito = await Defeito.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!defeito) {
      return res.status(404).json({ error: 'Defeito não encontrado' });
    }

    res.json(defeito);
  } catch (error) {
    console.error('Erro ao atualizar defeito:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
