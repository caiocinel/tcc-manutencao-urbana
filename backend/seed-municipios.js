const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'manutencao_urbana',
  user: process.env.DB_USER || 'urbana',
  password: process.env.DB_PASSWORD,
});

const dataPath = '/tmp/municipios-poligonos.json';

function computeBbox(coords) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  function walk(arr) {
    if (typeof arr[0] === 'number') {
      const lng = arr[0], lat = arr[1];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    } else {
      arr.forEach(walk);
    }
  }
  walk(coords);
  return { minLat, maxLat, minLng, maxLng };
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Importando ${raw.length} municípios...`);

  for (const item of raw) {
    const bbox = computeBbox(item.poligono.coordinates);
    await pool.query(
      `INSERT INTO municipios (codigo, nome, uf, uf_sigla, min_lat, max_lat, min_lng, max_lng, poligono_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (codigo) DO UPDATE SET
         nome = EXCLUDED.nome, uf = EXCLUDED.uf, uf_sigla = EXCLUDED.uf_sigla,
         min_lat = EXCLUDED.min_lat, max_lat = EXCLUDED.max_lat,
         min_lng = EXCLUDED.min_lng, max_lng = EXCLUDED.max_lng,
         poligono_json = EXCLUDED.poligono_json`,
      [
        item.municipioCodigo, item.municipioNome, item.ufNome, item.ufSigla,
        bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng,
        JSON.stringify(item.poligono),
      ]
    );
  }

  console.log('Seed concluído.');
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
