-- Migration: Add PostGIS polygon_geom column to municipios
-- Idempotent: safe to run multiple times

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add polygon_geom column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'municipios' AND column_name = 'polygon_geom'
  ) THEN
    ALTER TABLE municipios ADD COLUMN polygon_geom geometry(MultiPolygon, 4326);
    RAISE NOTICE 'Added polygon_geom column to municipios';
  END IF;
END $$;

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_municipios_polygon_geom
  ON municipios USING GIST (polygon_geom);

-- Populate polygon_geom from poligono_json for existing records
-- This converts stored GeoJSON polygons to PostGIS geometry
UPDATE municipios
SET polygon_geom = ST_GeomFromGeoJSON(poligono_json)
WHERE poligono_json IS NOT NULL
  AND poligono_json != ''
  AND polygon_geom IS NULL;

-- Verify
DO $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count FROM municipios WHERE polygon_geom IS NOT NULL;
  RAISE NOTICE 'Municipios with polygon_geom: %', count;
END $$;
