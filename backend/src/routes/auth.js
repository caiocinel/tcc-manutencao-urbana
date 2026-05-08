// Rotas de autenticação (registro e login)
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// POST /api/auth/registro - Cria nova conta
router.post('/registro', authLimiter, async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Verifica se email já está cadastrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    // Hash da senha com bcrypt (salt rounds = 10)
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Cria o usuário no banco
    const user = await User.create({
      nome,
      email,
      senha: hashedPassword,
      requestsResetAt: new Date(),
    });

    // Gera token JWT com validade de 24h
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, nome: user.nome, email: user.email },
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/login - Autentica usuário existente
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Busca usuário por email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    // Compara senha informada com hash armazenado
    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    // Gera token JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user._id, nome: user.nome, email: user.email, admin: user.admin },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
