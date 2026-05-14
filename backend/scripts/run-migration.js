const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'manutencao_urbana',
  user: process.env.DB_USER || 'urbana',
  password: process.env.DB_PASSWORD || 'urbana123',
});

async function run() {
  const args = process.argv.slice(2);
  const sqlFile = args[0] || path.join(__dirname, 'migration-postgis.sql');

  if (!fs.existsSync(sqlFile)) {
    console.error(`Arquivo SQL não encontrado: ${sqlFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf-8');

  // Remove comentarios SQL (-- ate o fim da linha) antes de split
  const noComments = sql.replace(/--.*$/gm, '');

  const statements = noComments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Executando migration: ${path.basename(sqlFile)}`);
  console.log(`${statements.length} comandos SQL\n`);

  for (const stmt of statements) {
    try {
      console.log(`> ${stmt.slice(0, 80)}...`);
      await pool.query(stmt);
      console.log('  OK\n');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`  Já existe (ignorado)\n`);
      } else {
        console.error(`  ERRO: ${err.message}\n`);
      }
    }
  }

  console.log('Migration concluída.');
  await pool.end();
}

run().catch(err => {
  console.error('Falha na migration:', err);
  process.exit(1);
});
