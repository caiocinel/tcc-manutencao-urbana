const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'manutencao_urbana',
  user: process.env.DB_USER || 'urbana',
  password: process.env.DB_PASSWORD,
});

// Fetch municipality boundaries from IBGE API
function fetchMunicipiosFromIBGE() {
  return new Promise((resolve, reject) => {
    let data = '';
    https.get(
      'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR/qualidades/municipios?formato=application/vnd.geo+json',
      (res) => {
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    ).on('error', reject);
  });
}

function computeBbox(coordinates) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  function walk(arr) {
    if (typeof arr[0] === 'number') {
      const [lng, lat] = arr;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    } else {
      arr.forEach(walk);
    }
  }
  walk(coordinates);
  return { minLat, maxLat, minLng, maxLng };
}

async function main() {
  console.log('Fetching municipality boundaries from IBGE...');
  const geojson = await fetchMunicipiosFromIBGE();
  const features = geojson.features || [];
  console.log(`Found ${features.length} municipalities`);

  let updated = 0;
  let skipped = 0;

  for (const feature of features) {
    const props = feature.properties;
    const codigo = String(props.codarea || '');
    const nome = props.name || '';
    const uf = props.mesorregiao?.UF?.sigla || '';
    const uf_sigla = uf;

    if (!codigo || !nome) {
      skipped++;
      continue;
    }

    const geometry = feature.geometry;
    let poligono_json = null;
    let bbox = null;

    if (geometry) {
      poligono_json = JSON.stringify(geometry);
      bbox = computeBbox(geometry.coordinates);
    }

    if (!bbox || bbox.minLat === Infinity) {
      skipped++;
      continue;
    }

    await pool.query(
      `INSERT INTO municipios (codigo, nome, uf, uf_sigla, min_lat, max_lat, min_lng, max_lng, poligono_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (codigo) DO UPDATE SET
         nome = EXCLUDED.nome, uf = EXCLUDED.uf, uf_sigla = EXCLUDED.uf_sigla,
         min_lat = EXCLUDED.min_lat, max_lat = EXCLUDED.max_lat,
         min_lng = EXCLUDED.min_lng, max_lng = EXCLUDED.max_lng,
         poligono_json = COALESCE(EXCLUDED.poligono_json, municipios.poligono_json)`,
      [
        codigo, nome, uf, uf_sigla,
        bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng,
        poligono_json,
      ]
    );
    updated++;

    if (updated % 100 === 0) {
      console.log(`  Processed ${updated}...`);
    }
  }

  console.log(`\nSeed complete: ${updated} updated, ${skipped} skipped`);

  // Verify
  const { rows } = await pool.query(
    'SELECT COUNT(*) as total, COUNT(CASE WHEN min_lat != 0 THEN 1 END) as with_bbox FROM municipios'
  );
  console.log(`Database: ${rows[0].total} total, ${rows[0].with_bbox} with valid bbox`);

  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
