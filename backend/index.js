require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 10) {
  console.error('JWT_SECRET deve ter no mínimo 10 caracteres');
  process.exit(1);
}
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 16) {
  console.error('ENCRYPTION_KEY deve ter no mínimo 16 caracteres');
  process.exit(1);
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { connectDB } = require('./src/config/database');
const { globalLimiter } = require('./src/middleware/rateLimit');
const { generateCsrfToken } = require('./src/middleware/csrf');
const logger = require('./src/services/logger');

const authRoutes = require('./src/routes/auth');
const defeitosRoutes = require('./src/routes/defeitos');
const municipiosRoutes = require('./src/routes/municipios');
const categoriasRoutes = require('./src/routes/categorias');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '5mb' }));

app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', globalLimiter);

app.get('/api/csrf-token', generateCsrfToken, (req, res) => {
  res.json({ csrfToken: req.csrfToken });
});

app.use('/api/auth', authRoutes);
app.use('/api/defeitos', defeitosRoutes);
app.use('/api/municipios', municipiosRoutes);
app.use('/api/categorias', categoriasRoutes);

app.get('/api/health', (req, res) => {
  res.json({ message: 'API da Central de Inteligência Urbana' });
});

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const publicDir = path.join(__dirname, 'public');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
} else if (require('fs').existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.use((req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Servidor backend rodando');
  });
}).catch((err) => {
  logger.fatal({ err }, 'Falha ao conectar ao banco de dados');
  process.exit(1);
});
