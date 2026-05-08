// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { connectDB } = require('./src/config/database');
const { globalLimiter } = require('./src/middleware/rateLimit');
const { generateCsrfToken, validateCsrfToken } = require('./src/middleware/csrf');

const authRoutes = require('./src/routes/auth');
const defeitosRoutes = require('./src/routes/defeitos');

const app = express();
const PORT = process.env.PORT || 5000;

// Confia no proxy reverso (nginx, etc) para IP real do cliente
app.set('trust proxy', 1);

// Libera requisições do frontend (CORS)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Limite de 5MB para JSON (comporta fotos em base64 se necessário)
app.use(express.json({ limit: '5mb' }));

// Parse de cookies para CSRF
app.use(cookieParser());

// Rate limit global: 100 requisições a cada 15 minutos
app.use(globalLimiter);

// Servir arquivos de upload estaticamente
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rota para gerar token CSRF (chamada antes de mutations)
app.get('/api/csrf-token', generateCsrfToken, (req, res) => {
  res.json({ csrfToken: req.csrfToken });
});

// Rotas de autenticação (sem CSRF - usam token JWT)
app.use('/api/auth', authRoutes);

// Rotas de defeitos (com validação CSRF em mutations)
app.use('/api/defeitos', validateCsrfToken, defeitosRoutes);

// Rota raiz de saúde da API
app.get('/', (req, res) => {
  res.json({ message: 'API do Sistema de Manutenção Urbana' });
});

// Inicializa o banco SQLite e sobe o servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
  });
}).catch((err) => {
  console.error('Falha ao conectar ao banco de dados:', err);
  process.exit(1);
});
