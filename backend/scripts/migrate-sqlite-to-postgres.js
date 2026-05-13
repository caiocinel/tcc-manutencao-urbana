require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const { encrypt, hash } = require('../src/services/encryption');

const SQLITE_PATH = path.join(__dirname, '..', '..', 'database', 'manutencao_urbana.db');

const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'manutencao_urbana',
  user: process.env.DB_USER || 'urbana',
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  let initSqlJs;
  try {
    initSqlJs = require('sql.js');
  } catch {
    console.error('sql.js nao instalado. Execute: npm install sql.js');
    process.exit(1);
  }

  if (!fs.existsSync(SQLITE_PATH)) {
    console.error('Arquivo SQLite nao encontrado:', SQLITE_PATH);
    console.error('Coloque o arquivo manutencao_urbana.db em database/ e tente novamente.');
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(SQLITE_PATH);
  const sqlite = new SQL.Database(buffer);
  console.log('SQLite conectado.');

  const exec = (sql) => {
    const result = sqlite.exec(sql);
    return result[0] ? result[0].values : [];
  };

  const start = Date.now();

  try {
    await pgPool.query('BEGIN');

    console.log('Migrando municipios...');
    const municipios = exec('SELECT * FROM municipios');
    let count = 0;
    for (const [codigo, nome, uf, uf_sigla, min_lat, max_lat, min_lng, max_lng, poligono_json] of municipios) {
      await pgPool.query(
        `INSERT INTO municipios (codigo, nome, uf, uf_sigla, min_lat, max_lat, min_lng, max_lng, poligono_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (codigo) DO UPDATE SET
           nome = EXCLUDED.nome, uf = EXCLUDED.uf, uf_sigla = EXCLUDED.uf_sigla,
           min_lat = EXCLUDED.min_lat, max_lat = EXCLUDED.max_lat,
           min_lng = EXCLUDED.min_lng, max_lng = EXCLUDED.max_lng,
           poligono_json = EXCLUDED.poligono_json`,
        [codigo, nome, uf, uf_sigla, min_lat, max_lat, min_lng, max_lng, poligono_json || null]
      );
      count++;
      if (count % 1000 === 0) console.log(`  ${count} municipios...`);
    }
    console.log(`  ${count} municipios migrados.`);

    console.log('Migrando categorias...');
    const categorias = exec('SELECT * FROM categorias');
    for (const [id, nome, icone, prioridade_base, prazo_sla_dias] of categorias) {
      await pgPool.query(
        `INSERT INTO categorias (id, nome, icone, prioridade_base, prazo_sla_dias)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (nome) DO NOTHING`,
        [id, nome, icone || null, prioridade_base || 'media', prazo_sla_dias || 7]
      );
    }
    console.log(`  ${categorias.length} categorias migradas.`);

    console.log('Migrando usuarios...');
    const users = exec('SELECT * FROM users');
    for (const [id, nome, email, senha, admin, requestsResetAt, requestsCount, criado_em, atualizado_em, municipio_id, cpf, email_verificado, codigo_2fa, codigo_2fa_expira, cpf_hash] of users) {
      const cpfEncrypted = cpf ? encrypt(cpf) : null;
      const cpfHashed = cpf ? hash(cpf) : null;
      await pgPool.query(
        `INSERT INTO users (id, nome, email, senha, admin, municipio_id, cpf, cpf_hash, email_verificado, codigo_2fa, codigo_2fa_expira, requestsResetAt, requestsCount, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET
           nome = EXCLUDED.nome, email = EXCLUDED.email,
           admin = EXCLUDED.admin, municipio_id = EXCLUDED.municipio_id,
           cpf = EXCLUDED.cpf, cpf_hash = EXCLUDED.cpf_hash,
           email_verificado = EXCLUDED.email_verificado,
           atualizado_em = EXCLUDED.atualizado_em`,
        [id, nome, (email || '').toLowerCase(), senha, admin ? 1 : 0, municipio_id || null,
         cpfEncrypted, cpfHashed, email_verificado ? 1 : 0, codigo_2fa || null,
         codigo_2fa_expira || null, requestsResetAt || criado_em, requestsCount || 0,
         criado_em, atualizado_em]
      );
    }
    console.log(`  ${users.length} usuarios migrados.`);

    console.log('Migrando defeitos...');
    const defeitos = exec('SELECT * FROM defeitos');
    for (const [id, usuario, titulo, descricao, latitude, longitude, imagem_url, categoria, status, criado_em, atualizado_em, prioridade, atendido_em, usuario_email, imagem_thumbnail, rua, bairro, previsao_conclusao, imagens_extra, atualizacoes] of defeitos) {
      const thumbnailBuf = imagem_thumbnail && imagem_thumbnail.length > 0 ? Buffer.from(imagem_thumbnail) : null;
      await pgPool.query(
        `INSERT INTO defeitos (id, usuario, titulo, descricao, latitude, longitude, rua, bairro, imagem_url, categoria, status, prioridade, previsao_conclusao, atendido_em, usuario_email, imagem_thumbnail, imagens_extra, atualizacoes, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status, prioridade = EXCLUDED.prioridade,
           atualizado_em = EXCLUDED.atualizado_em`,
        [id, usuario, titulo, descricao || null, latitude || null, longitude || null,
         rua || null, bairro || null, imagem_url || null, categoria || null,
         status || 'pendente', prioridade || 'media', previsao_conclusao || null,
         atendido_em || null, usuario_email || null, thumbnailBuf,
         imagens_extra || '[]', atualizacoes || '[]', criado_em, atualizado_em]
      );
    }
    console.log(`  ${defeitos.length} defeitos migrados.`);

    console.log('Migrando apoios...');
    const apoios = exec('SELECT * FROM apoios');
    for (const [id, usuario_id, defeito_id, criado_em] of apoios) {
      await pgPool.query(
        `INSERT INTO apoios (usuario_id, defeito_id, criado_em)
         VALUES ($1, $2, $3)
         ON CONFLICT (usuario_id, defeito_id) DO NOTHING`,
        [usuario_id, defeito_id, criado_em || new Date().toISOString()]
      );
    }
    console.log(`  ${apoios.length} apoios migrados.`);

    console.log('Migrando inscricoes push...');
    const subs = exec('SELECT * FROM push_subscriptions');
    for (const [id, usuario_id, endpoint, p256dh, auth, criado_em] of subs) {
      await pgPool.query(
        `INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth, criado_em)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (usuario_id, endpoint) DO UPDATE SET
           p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
        [usuario_id, endpoint, p256dh, auth, criado_em || new Date().toISOString()]
      );
    }
    console.log(`  ${subs.length} inscricoes push migradas.`);

    await pgPool.query('COMMIT');

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\nMigracao concluida em ${elapsed}s.`);
    console.log('Resumo:');
    console.log(`  Municipios: ${count}`);
    console.log(`  Categorias: ${categorias.length}`);
    console.log(`  Usuarios: ${users.length}`);
    console.log(`  Defeitos: ${defeitos.length}`);
    console.log(`  Apoios: ${apoios.length}`);
    console.log(`  Push Subs: ${subs.length}`);

  } catch (err) {
    await pgPool.query('ROLLBACK');
    console.error('Erro durante migracao:', err);
    process.exit(1);
  } finally {
    await pgPool.end();
    sqlite.close();
  }
}

migrate();
