const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'manutencao_urbana',
  user: process.env.DB_USER || 'urbana',
  password: process.env.DB_PASSWORD,
});

const TBURGZ_URL = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-mun.json';

async function fetchTbrugz() {
  console.log('Baixando dados do tbrugz/geodata-br...');
  const res = await fetch(TBURGZ_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const data = await fetchTbrugz();
  const features = data.features || [];
  console.log(`Recebidos ${features.length} municípios. Atualizando...`);

  let count = 0;
  for (const feat of features) {
    const props = feat.properties || {};
    const cod = String(props.cd_geocmu || props.id || '');
    if (!cod) continue;

    const geometry = feat.geometry;
    if (!geometry) continue;

    const coords = geometry.coordinates?.[0];
    if (!coords?.length) continue;

    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const geomStr = JSON.stringify(geometry);

    await pool.query(
      `UPDATE municipios SET
        poligono_json = $1,
        min_lat = $2, max_lat = $3,
        min_lng = $4, max_lng = $5
       WHERE codigo = $6
         AND (poligono_json IS NULL OR poligono_json = '' OR min_lat = 0)`,
      [geomStr, minLat, maxLat, minLng, maxLng, cod]
    );
    count++;
    if (count % 500 === 0) console.log(`  ${count} municípios...`);
  }

  // Update PostGIS geometry column
  await pool.query(
    `UPDATE municipios SET polygon_geom = ST_SetSRID(ST_GeomFromGeoJSON(poligono_json), 4326)
     WHERE poligono_json IS NOT NULL AND poligono_json != ''`
  );

  console.log(`Concluído! ${count} municípios atualizados com polígonos.`);
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
