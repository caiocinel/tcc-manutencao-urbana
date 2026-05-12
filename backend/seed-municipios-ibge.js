const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'manutencao_urbana',
  user: process.env.DB_USER || 'urbana',
  password: process.env.DB_PASSWORD || 'CHANGE_ME',
});

async function main() {
  console.log('Baixando municípios da API do IBGE...');
  const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');
  const data = await res.json();
  console.log(`Recebidos ${data.length} municípios. Inserindo...`);

  let count = 0;
  for (const item of data) {
    await pool.query(
      `INSERT INTO municipios (codigo, nome, uf, uf_sigla, min_lat, max_lat, min_lng, max_lng, poligono_json)
       VALUES ($1, $2, $3, $4, 0, 0, 0, 0, NULL)
       ON CONFLICT (codigo) DO UPDATE SET
         nome = EXCLUDED.nome, uf = EXCLUDED.uf, uf_sigla = EXCLUDED.uf_sigla`,
      [
        String(item.id),
        item.nome,
        item.microrregiao?.mesorregiao?.UF?.nome || 'Desconhecido',
        item.microrregiao?.mesorregiao?.UF?.sigla || 'XX',
      ]
    );
    count++;
    if (count % 500 === 0) console.log(`  ${count} municípios...`);
  }

  console.log(`Seed concluído! ${count} municípios importados.`);
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
