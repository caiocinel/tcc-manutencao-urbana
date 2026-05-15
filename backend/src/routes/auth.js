const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const { query } = require('../config/database');
const logger = require('../services/logger');
const { authLimiter } = require('../middleware/rateLimit');
const { validarDigitos, consultarBrasilAPI } = require('../services/cpfValidator');
const { sendVerificationCode, send2faCode } = require('../services/email');
const { getPublicKey, saveSubscription } = require('../services/push');
const { registerSchema, loginSchema, verify2faSchema, changePasswordSchema } = require('../validation/auth.schema');
const { validate } = require('../validation/validate');

const router = express.Router();

async function attachMunicipio(user) {
  if (!user.municipio_id) return user;
  const { rows } = await query(
    'SELECT codigo, nome, uf_sigla, min_lat, max_lat, min_lng, max_lng FROM municipios WHERE codigo = $1',
    [user.municipio_id]
  );
  return { ...user, municipio: rows[0] || null };
}

router.post('/validar-cpf', authLimiter, async (req, res) => {
  try {
    const { cpf } = req.body;
    if (!cpf) return res.status(400).json({ error: 'CPF é obrigatório' });

    const nums = cpf.replace(/\D/g, '');
    if (nums.length !== 11) return res.status(400).json({ error: 'CPF deve ter 11 dígitos' });
    if (!validarDigitos(nums)) return res.status(400).json({ error: 'CPF inválido' });

    const data = await consultarBrasilAPI(nums);
    if (!data) return res.json({ valido: true, nome: null, situacao: 'CPF válido mas sem dados públicos' });

    res.json({ valido: true, nome: data.nome, situacao: data.situacao || 'regular' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao validar CPF');
    res.status(500).json({ error: 'Erro ao consultar CPF' });
  }
});

router.post('/registro', authLimiter, validate(registerSchema), async (req, res) => {
  try {
    const { nome, email, senha, municipio_id, cpf } = req.body;

    const emailNormalized = email.toLowerCase();
    const existingUser = await User.findOne({ email: emailNormalized });
    if (existingUser) return res.status(400).json({ error: 'Usuário já existe' });

    if (cpf) {
      const nums = cpf.replace(/\D/g, '');
      if (nums.length !== 11 || !validarDigitos(nums)) return res.status(400).json({ error: 'CPF inválido' });
      const existingCpf = await User.findByCpf(nums);
      if (existingCpf) return res.status(400).json({ error: 'CPF já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const user = await User.create({
      nome, email: emailNormalized, senha: hashedPassword,
      municipio_id, cpf: cpf ? cpf.replace(/\D/g, '') : null,
      requestsResetAt: new Date(),
    });

    try {
      const code = crypto.randomInt(100000, 999999).toString();
      await User.set2faCode(user._id, code, new Date(Date.now() + 10 * 60 * 1000));
      await sendVerificationCode(emailNormalized, code);
    } catch (err) {
      logger.error({ err: err.message }, 'Erro ao enviar email de verificação');
    }

    const userWithMun = await attachMunicipio(user);

    const token = jwt.sign(
      { userId: user._id, email: user.email, municipio_id: user.municipio_id, admin: user.admin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id, nome: user.nome, email: user.email,
        admin: user.admin, municipio: userWithMun.municipio,
        cpf: user.cpf, email_verificado: user.email_verificado,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Erro no registro');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/check-email', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
    const user = await User.findOne({ email: email.toLowerCase() });
    res.json({ exists: !!user });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao verificar email');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, senha } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciais inválidas' });
    }

    const userWithMun = await attachMunicipio(user);

    const token = jwt.sign(
      { userId: user._id, email: user.email, admin: user.admin, municipio_id: user.municipio_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id, nome: user.nome, email: user.email,
        admin: user.admin, municipio: userWithMun.municipio,
        email_verificado: user.email_verificado, cpf: user.cpf,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Erro no login');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

function authenticateToken(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const { nome } = req.body;
    if (nome) {
      await query('UPDATE users SET nome = $1, atualizado_em = $2 WHERE id = $3',
        [nome, new Date().toISOString(), req.user.userId]);
    }
    const user = await User.findById(req.user.userId);
    res.json({ nome: user.nome, email: user.email });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao atualizar perfil');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/municipio', authenticateToken, async (req, res) => {
  try {
    const { municipio_id } = req.body;
    if (!municipio_id) return res.status(400).json({ error: 'municipio_id é obrigatório' });

    const { rows } = await query(
    'SELECT codigo, nome, uf_sigla, min_lat, max_lat, min_lng, max_lng, poligono_json FROM municipios WHERE codigo = $1',
      [municipio_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Município não encontrado' });

    await query('UPDATE users SET municipio_id = $1, atualizado_em = $2 WHERE id = $3',
      [municipio_id, new Date().toISOString(), req.user.userId]);

    res.json({ municipio: rows[0] });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao atualizar município');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/verificar-email', authenticateToken, async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ error: 'Código é obrigatório' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.email_verificado) return res.json({ message: 'Email já verificado' });
    if (!user.codigo_2fa) return res.status(400).json({ error: 'Nenhum código pendente' });

    const expira = new Date(user.codigo_2fa_expira);
    if (Date.now() > expira.getTime()) return res.status(400).json({ error: 'Código expirado' });
    if (user.codigo_2fa !== codigo) return res.status(400).json({ error: 'Código inválido' });

    await User.verifyEmail(user._id);
    await User.clear2faCode(user._id);

    res.json({ message: 'Email verificado com sucesso' });
  } catch (error) {
    logger.error({ err: error }, 'Erro na verificação de email');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/reenviar-codigo', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.email_verificado) return res.json({ message: 'Email já verificado' });

    const code = crypto.randomInt(100000, 999999).toString();
    await User.set2faCode(user._id, code, new Date(Date.now() + 10 * 60 * 1000));
    await sendVerificationCode(user.email, code);

    res.json({ message: 'Código reenviado' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao reenviar código');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/enviar-2fa', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const code = crypto.randomInt(100000, 999999).toString();
    await User.set2faCode(user._id, code, new Date(Date.now() + 5 * 60 * 1000));
    await send2faCode(user.email, code);

    res.json({ message: 'Código enviado para seu email' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao enviar 2FA');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/verificar-2fa', authLimiter, async (req, res) => {
  try {
    const { email, codigo } = req.body;
    if (!email || !codigo) return res.status(400).json({ error: 'Email e código são obrigatórios' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (!user.codigo_2fa) return res.status(400).json({ error: 'Nenhum código pendente' });

    const expira = new Date(user.codigo_2fa_expira);
    if (Date.now() > expira.getTime()) return res.status(400).json({ error: 'Código expirado' });
    if (user.codigo_2fa !== codigo) return res.status(400).json({ error: 'Código inválido' });

    await User.clear2faCode(user._id);

    const userWithMun = await attachMunicipio(user);
    const token = jwt.sign(
      { userId: user._id, email: user.email, admin: user.admin, municipio_id: user.municipio_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user._id, nome: user.nome, email: user.email, admin: user.admin, municipio: userWithMun.municipio },
    });
  } catch (error) {
    logger.error({ err: error }, 'Erro na verificação 2FA');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/senha', authenticateToken, async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({ error: 'senha_atual e nova_senha são obrigatórios' });
    }
    if (nova_senha.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const valid = await bcrypt.compare(senha_atual, user.senha);
    if (!valid) return res.status(400).json({ error: 'Senha atual incorreta' });

    const hashed = await bcrypt.hash(nova_senha, 10);
    await User.updatePassword(user._id, hashed);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao alterar senha');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/push/key', (req, res) => {
  res.json({ publicKey: getPublicKey() });
});

router.post('/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Subscription inválida' });
    }
    await saveSubscription(req.user.userId, subscription);
    res.json({ message: 'Inscrição salva com sucesso' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao salvar subscription');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.admin) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    return res.status(500).json({ error: 'SUPER_ADMIN_EMAIL não configurado' });
  }
  if (!req.user || !req.user.admin || req.user.email !== superAdminEmail) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o administrador supremo pode executar esta ação.' });
  }
  next();
}

router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const { rows: users } = await query('SELECT id, nome, email, admin, municipio_id FROM users ORDER BY nome');
    const { rows: municipios } = await query('SELECT codigo, nome, uf_sigla FROM municipios');
    const munMap = {};
    for (const m of municipios) munMap[m.codigo] = m;
    for (const u of users) {
      u.admin = !!u.admin;
      u.super_admin = superAdminEmail ? u.email === superAdminEmail : false;
      if (u.municipio_id) u.municipio = munMap[u.municipio_id] || null;
    }
    res.json(users);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar usuários');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { municipio_id } = req.body;
    const { rows: userRows } = await query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (!userRows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (municipio_id) {
      const { rows: munRows } = await query('SELECT codigo FROM municipios WHERE codigo = $1', [municipio_id]);
      if (!munRows[0]) return res.status(404).json({ error: 'Município não encontrado' });
    }

    await query('UPDATE users SET municipio_id = $1, atualizado_em = $2 WHERE id = $3',
      [municipio_id || null, new Date().toISOString(), req.params.id]);

    res.json({ message: 'Usuário atualizado' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao atualizar usuário');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/admin/estatisticas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows: totalRow } = await query('SELECT COUNT(*) as v FROM defeitos');
    const total = parseInt(totalRow[0].v, 10);

    const { rows: porCategoria } = await query(`
      SELECT COALESCE(categoria, 'sem_categoria') as categoria, COUNT(*) as total
      FROM defeitos GROUP BY categoria ORDER BY total DESC
    `);

    const { rows: porStatus } = await query(`
      SELECT status, COUNT(*) as total FROM defeitos GROUP BY status
    `);

    const statusPendentes = ['pendente', 'em_andamento', 'vinculado_sem_resposta', 'vinculado_com_resposta'];
    const pendentes = porStatus
      .filter(s => statusPendentes.includes(s.status))
      .reduce((sum, s) => sum + parseInt(s.total, 10), 0);
    const statusResolvidos = ['atendido', 'encerrado', 'concluido'];
    const resolvidos = porStatus
      .filter(s => statusResolvidos.includes(s.status))
      .reduce((sum, s) => sum + parseInt(s.total, 10), 0);

    const { rows: slaRow } = await query(`
      SELECT AVG(
        EXTRACT(EPOCH FROM (COALESCE(atendido_em, atualizado_em)::timestamp - criado_em::timestamp)) / 60
      ) as sla_minutos
      FROM defeitos WHERE status IN ('atendido', 'encerrado')
    `);

    const resolucaoRate = total > 0 ? Math.min(Math.round((resolvidos / total) * 100), 100) : 0;

    logger.info({ pendentes, resolvidos, total, taxa: resolucaoRate }, 'Métricas calculadas');

    const now = new Date();
    const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const mesAnteriorInicio = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const mesAnteriorFim = mesInicio;

    const { rows: mesAtualRow } = await query('SELECT COUNT(*) as v FROM defeitos WHERE criado_em >= $1', [mesInicio]);
    const mesAtualCount = parseInt(mesAtualRow[0].v, 10);
    const { rows: mesAnteriorRow } = await query(
      'SELECT COUNT(*) as v FROM defeitos WHERE criado_em >= $1 AND criado_em < $2',
      [mesAnteriorInicio, mesAnteriorFim]
    );
    const mesAnteriorCount = parseInt(mesAnteriorRow[0].v, 10);

    const variacaoPercentual = mesAnteriorCount > 0
      ? Math.round(((mesAtualCount - mesAnteriorCount) / mesAnteriorCount) * 100)
      : 0;

    const cutoff90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { rows: recorrentes } = await query(`
      SELECT MAX(latitude) as latitude, MAX(longitude) as longitude,
             MAX(categoria) as categoria, MAX(rua) as rua, MAX(bairro) as bairro,
             COUNT(*) as total
      FROM defeitos
      WHERE criado_em >= $1 AND latitude IS NOT NULL AND longitude IS NOT NULL
      GROUP BY ROUND(latitude::numeric, 3), ROUND(longitude::numeric, 3)
      HAVING COUNT(*) >= 2
      ORDER BY total DESC
      LIMIT 10
    `, [cutoff90d]);

    const recorrentesFormatados = recorrentes.map(r => ({
      latitude: r.latitude,
      longitude: r.longitude,
      categoria: r.categoria || 'sem_categoria',
      rua: r.rua || null,
      bairro: r.bairro || null,
      total: parseInt(r.total, 10),
      label: r.rua || `±${Math.abs(r.latitude).toFixed(3)}, ${Math.abs(r.longitude).toFixed(3)}`,
    }));

    const { rows: porCategoriaMesAtual } = await query(`
      SELECT COALESCE(categoria, 'sem_categoria') as categoria, COUNT(*) as total
      FROM defeitos WHERE criado_em >= $1 GROUP BY categoria
    `, [mesInicio]);
    const catAtual = {};
    for (const c of porCategoriaMesAtual) catAtual[c.categoria] = parseInt(c.total, 10);

    const { rows: porCategoriaMesAnterior } = await query(`
      SELECT COALESCE(categoria, 'sem_categoria') as categoria, COUNT(*) as total
      FROM defeitos WHERE criado_em >= $1 AND criado_em < $2 GROUP BY categoria
    `, [mesAnteriorInicio, mesAnteriorFim]);
    const catAnterior = {};
    for (const c of porCategoriaMesAnterior) catAnterior[c.categoria] = parseInt(c.total, 10);

    const categoriasCrescimento = porCategoria.map(c => {
      const atual = catAtual[c.categoria] || 0;
      const anterior = catAnterior[c.categoria] || 0;
      return {
        categoria: c.categoria,
        total: parseInt(c.total, 10),
        mes_atual: atual,
        mes_anterior: anterior,
        variacao: anterior > 0 ? Math.round(((atual - anterior) / anterior) * 100) : null,
      };
    });

    const tendenciaMensal = [];
    for (let i = 11; i >= 0; i--) {
      const inicio = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString();
      const fim = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).toISOString();
      const { rows } = await query(
        'SELECT COUNT(*) as v FROM defeitos WHERE criado_em >= $1 AND criado_em < $2',
        [inicio, fim]
      );
      const mesNome = new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleString('pt-BR', { month: 'short' });
      tendenciaMensal.push({ mes: mesNome, ano: inicio.substring(0, 4), total: parseInt(rows[0].v, 10) });
    }

    const { rows: slaPorCategoria } = await query(`
      SELECT COALESCE(d.categoria, 'sem_categoria') as categoria,
        AVG(EXTRACT(EPOCH FROM (COALESCE(d.atendido_em, d.atualizado_em)::timestamp - d.criado_em::timestamp)) / 60) as sla_minutos,
        COUNT(*) as total_resolvidos
      FROM defeitos d
      WHERE d.status IN ('atendido', 'encerrado')
      GROUP BY d.categoria
      ORDER BY sla_minutos DESC
    `);
    const slaPorCategoriaFmt = slaPorCategoria.map(r => ({
      categoria: r.categoria,
      sla_medio_minutos: Math.round(r.sla_minutos || 0),
      total_resolvidos: parseInt(r.total_resolvidos, 10),
    }));

    const { rows: topBairros } = await query(`
      SELECT bairro, COUNT(*) as total,
        SUM(CASE WHEN status IN ('atendido','encerrado') THEN 1 ELSE 0 END) as resolvidos
      FROM defeitos WHERE bairro IS NOT NULL AND bairro != ''
      GROUP BY bairro ORDER BY total DESC LIMIT 10
    `);
    const topBairrosFmt = topBairros.map(r => ({
      bairro: r.bairro,
      total: parseInt(r.total, 10),
      resolvidos: parseInt(r.resolvidos, 10),
      taxa_resolucao: parseInt(r.total, 10) > 0 ? Math.round((parseInt(r.resolvidos, 10) / parseInt(r.total, 10)) * 100) : 0,
    }));

    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 7);

    const { rows: totalSemanaAtualRow } = await query(
      'SELECT COUNT(*) as v FROM defeitos WHERE criado_em >= $1 AND criado_em < $2',
      [inicioSemana.toISOString(), fimSemana.toISOString()]
    );
    const totalSemanaAtual = parseInt(totalSemanaAtualRow[0].v, 10);

    const semanasAnteriores = [];
    for (let i = 1; i <= 4; i++) {
      const sInicio = new Date(inicioSemana);
      sInicio.setDate(inicioSemana.getDate() - i * 7);
      const sFim = new Date(sInicio);
      sFim.setDate(sInicio.getDate() + 7);
      const { rows } = await query(
        'SELECT COUNT(*) as v FROM defeitos WHERE criado_em >= $1 AND criado_em < $2',
        [sInicio.toISOString(), sFim.toISOString()]
      );
      semanasAnteriores.push(parseInt(rows[0].v, 10));
    }
    const media4Semanas = semanasAnteriores.length > 0
      ? Math.round(semanasAnteriores.reduce((a, b) => a + b, 0) / semanasAnteriores.length)
      : 0;
    const variacaoSemanal = media4Semanas > 0
      ? Math.round(((totalSemanaAtual - media4Semanas) / media4Semanas) * 100)
      : null;

    const mesInicioOutlier = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { rows: bairrosComHistorico } = await query(`
      SELECT bairro, COUNT(*) as total_mes
      FROM defeitos
      WHERE bairro IS NOT NULL AND bairro != '' AND criado_em >= $1
      GROUP BY bairro
      ORDER BY total_mes DESC
    `, [mesInicioOutlier]);

    const anomalias = [];
    for (const b of bairrosComHistorico) {
      const { rows: mesesHist } = await query(`
        SELECT TO_CHAR(criado_em::timestamp, 'YYYY-MM') as mes, COUNT(*) as cnt
        FROM defeitos WHERE bairro = $1 AND criado_em < $2
        GROUP BY mes
      `, [b.bairro, mesInicioOutlier]);

      if (mesesHist.length >= 3) {
        const counts = mesesHist.map(m => parseInt(m.cnt, 10));
        const media = counts.reduce((a, c) => a + c, 0) / counts.length;
        const variancia = counts.reduce((a, c) => a + (c - media) ** 2, 0) / counts.length;
        const stddev = Math.sqrt(variancia);
        const totalMes = parseInt(b.total_mes, 10);
        const zScore = stddev > 0 ? (totalMes - media) / stddev : 0;
        if (zScore > 2 && totalMes >= 3) {
          anomalias.push({
            bairro: b.bairro,
            total_mes: totalMes,
            media_historica: Math.round(media * 10) / 10,
            z_score: Math.round(zScore * 100) / 100,
            intensidade: zScore > 3 ? 'alta' : 'media',
          });
        }
      }
    }
    anomalias.sort((a, b) => b.z_score - a.z_score);

    const recomendacoes = [];
    const categoriasRecape = ['Buraco', 'Mobilidade'];
    for (const r of recorrentes) {
      if (categoriasRecape.includes(r.categoria) && parseInt(r.total, 10) >= 3) {
        recomendacoes.push({
          tipo: 'recapeamento',
          local: r.rua || `±${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`,
          bairro: r.bairro || null,
          categoria: r.categoria,
          ocorrencias: parseInt(r.total, 10),
          sugestao: `${r.total}x chamados de "${r.categoria}" no mesmo local. Avaliar recapeamento total da via.`,
          impacto: 'alta',
        });
      }
    }
    for (const c of categoriasCrescimento) {
      if (c.variacao != null && c.variacao > 30 && c.mes_atual >= 3) {
        recomendacoes.push({
          tipo: 'sazonalidade',
          local: null,
          bairro: null,
          categoria: c.categoria,
          ocorrencias: c.mes_atual,
          sugestao: `Aumento de ${c.variacao}% em "${c.categoria}". Reforçar equipe preventiva.`,
          impacto: c.variacao > 60 ? 'alta' : 'media',
        });
      }
    }
    for (const b of topBairrosFmt.slice(0, 3)) {
      if (b.taxa_resolucao < 50 && b.total >= 3) {
        recomendacoes.push({
          tipo: 'bairro_critico',
          local: b.bairro,
          bairro: b.bairro,
          categoria: null,
          ocorrencias: b.total,
          sugestao: `Bairro "${b.bairro}" tem ${b.total} chamados com apenas ${b.taxa_resolucao}% resolvidos. Priorizar atendimento na região.`,
          impacto: 'media',
        });
      }
    }

    res.json({
      total,
      por_categoria: categoriasCrescimento,
      por_status: porStatus.map(s => ({ status: s.status, total: parseInt(s.total, 10) })),
      pendentes,
      resolvidos,
      taxa_resolucao: resolucaoRate,
      sla_medio_minutos: Math.round(slaRow[0]?.sla_minutos || 0),
      sazonalidade: {
        mes_atual: mesAtualCount,
        mes_anterior: mesAnteriorCount,
        variacao_percentual: variacaoPercentual,
      },
      recorrencias: recorrentesFormatados,
      tendencia_mensal: tendenciaMensal,
      sla_por_categoria: slaPorCategoriaFmt,
      top_bairros: topBairrosFmt,
      recomendacoes: recomendacoes,
      medias_moveis: {
        semana_atual: totalSemanaAtual,
        media_4_semanas: media4Semanas,
        variacao_percentual: variacaoSemanal,
        semanas_anteriores: semanasAnteriores,
      },
      anomalias: anomalias,
    });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao buscar estatísticas');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/admin/users/:id/admin', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { admin } = req.body;
    if (typeof admin !== 'boolean') {
      return res.status(400).json({ error: 'Campo "admin" booleano é obrigatório' });
    }

    const { rows } = await query('SELECT id, email, admin FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (rows[0].email === process.env.SUPER_ADMIN_EMAIL) {
      return res.status(400).json({ error: 'Não é possível alterar o próprio status de admin' });
    }

    await query('UPDATE users SET admin = $1, atualizado_em = $2 WHERE id = $3',
      [admin ? 1 : 0, new Date().toISOString(), req.params.id]);

    res.json({ message: admin ? 'Usuário promovido a admin' : 'Admin removido do usuário' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao alternar admin');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
