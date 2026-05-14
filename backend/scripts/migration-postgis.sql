-- migration-postgis.sql
-- Habilita PostGIS no banco
CREATE EXTENSION IF NOT EXISTS postgis;

-- Converte coluna poligono_json (TEXT GeoJSON) para geometry(Polygon, 4326)
-- Primeiro adiciona nova coluna, depois popula, depois remove a antiga
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS polygon_geom geometry(MultiPolygon, 4326);
UPDATE municipios
  SET polygon_geom = ST_SetSRID(ST_GeomFromGeoJSON(poligono_json), 4326)
  WHERE poligono_json IS NOT NULL AND poligono_json != '';

-- Remove coluna antiga de texto (opcional, comentado para segurança)
-- ALTER TABLE municipios DROP COLUMN poligono_json;

-- Adiciona coluna geom computada em defeitos (generada a partir de lat/lng)
ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED;

-- Índices GIST para consultas espaciais
CREATE INDEX IF NOT EXISTS idx_municipios_polygon_geom ON municipios USING GIST (polygon_geom);
CREATE INDEX IF NOT EXISTS idx_defeitos_geom ON defeitos USING GIST (geom);
