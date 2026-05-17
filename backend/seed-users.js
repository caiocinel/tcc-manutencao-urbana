const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'manutencao_urbana',
  user: process.env.DB_USER || 'urbana',
  password: process.env.DB_PASSWORD,
});

async function createUser({ nome, email, admin, municipio_id, cpf }) {
  const senha = await bcrypt.hash('123', 10);
  const id = crypto.randomUUID();
  const cpf_hash = crypto.createHash('sha256').update(cpf).digest('hex');
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO users (id, nome, email, senha, admin, municipio_id, cpf, cpf_hash, email_verificado, requestsResetAt, requestsCount, criado_em, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [id, nome, email, senha, admin ? 1 : 0, municipio_id, cpf, cpf_hash, 1, null, 0, now, now]
  );
  console.log(`  ✓ ${email} (${admin ? 'Admin' : 'User'})`);
}

async function main() {
  console.log('Criando usuários...');

  // Get a valid municipio_id
  const { rows } = await pool.query('SELECT codigo FROM municipios ORDER BY RANDOM() LIMIT 1');
  const municipio_id = rows[0]?.codigo || null;

  await createUser({
    nome: 'José Murilo RS',
    email: 'josemurilorodriguessabalo@gmail.com',
    admin: true,
    municipio_id,
    cpf: '12345678901',
  });

  await createUser({
    nome: 'Admin Padrão',
    email: 'admin@tcc.local',
    admin: true,
    municipio_id,
    cpf: '12345678902',
  });

  const testUsers = [
    { nome: 'Maria Silva', email: 'maria.silva@teste.com', cpf: '11122233301' },
    { nome: 'João Santos', email: 'joao.santos@teste.com', cpf: '11122233302' },
    { nome: 'Ana Oliveira', email: 'ana.oliveira@teste.com', cpf: '11122233303' },
    { nome: 'Carlos Pereira', email: 'carlos.pereira@teste.com', cpf: '11122233304' },
    { nome: 'Lucia Costa', email: 'lucia.costa@teste.com', cpf: '11122233305' },
  ];

  for (const u of testUsers) {
    await createUser({ ...u, admin: false, municipio_id });
  }

  console.log(`\nTodos os usuários criados. Senha padrão: 123`);
  await pool.end();
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
