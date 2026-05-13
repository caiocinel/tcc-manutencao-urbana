const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'manutencao_urbana',
  user: process.env.DB_USER || 'urbana',
  password: process.env.DB_PASSWORD,
});

function computeBbox(ring) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lng, lat] of ring) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

async function fetchPoligono(codigo) {
  const url = `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${codigo}?formato=application/vnd.geo+json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  IBGE ${res.status} para ${codigo}`);
    return null;
  }
  const data = await res.json();
  if (!data.features?.[0]?.geometry) {
    console.warn(`  Sem geometria para ${codigo}`);
    return null;
  }
  return data.features[0].geometry;
}

async function main() {
  const args = process.argv.slice(2);
  const codigoFilter = args[0] || null;

  let rows;
  if (codigoFilter) {
    const r = await pool.query('SELECT codigo, nome FROM municipios WHERE codigo = $1', [codigoFilter]);
    rows = r.rows;
    if (rows.length === 0) {
      console.error(`Município ${codigoFilter} não encontrado`);
      process.exit(1);
    }
  } else {
    const r = await pool.query('SELECT codigo, nome FROM municipios WHERE poligono_json IS NULL ORDER BY codigo');
    rows = r.rows;
  }

  console.log(`Processando ${rows.length} municípios...`);

  let ok = 0, fail = 0;
  for (let i = 0; i < rows.length; i++) {
    const { codigo, nome } = rows[i];
    process.stdout.write(`[${i + 1}/${rows.length}] ${codigo} ${nome}... `);

    const geometry = await fetchPoligono(codigo);
    if (!geometry) {
      console.log('IGNORADO');
      fail++;
      continue;
    }

    const outer = geometry.coordinates[0];
    const bbox = computeBbox(outer);

    await pool.query(
      `UPDATE municipios SET
        poligono_json = $1,
        min_lat = $2, max_lat = $3,
        min_lng = $4, max_lng = $5
       WHERE codigo = $6`,
      [JSON.stringify(geometry), bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng, codigo]
    );

    console.log('OK');
    ok++;

    if (i < rows.length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`\nConcluído: ${ok} OK, ${fail} ignorados`);
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
