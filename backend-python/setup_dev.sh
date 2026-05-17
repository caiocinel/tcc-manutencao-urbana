#!/bin/sh
set -e

echo "=== Waiting for PostgreSQL ==="
until pg_isready -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"; do sleep 1; done

echo "=== Creating PostGIS extension ==="
python -c "
import psycopg2
conn = psycopg2.connect(host='$DB_HOST', dbname='$DB_NAME', user='$DB_USER', password='$DB_PASSWORD')
cur = conn.cursor()
cur.execute('CREATE EXTENSION IF NOT EXISTS postgis')
conn.commit()
cur.close()
conn.close()
print('PostGIS OK')
"

echo "=== Creating users table (managed=False) ==="
python -c "
import psycopg2
conn = psycopg2.connect(host='$DB_HOST', dbname='$DB_NAME', user='$DB_USER', password='$DB_PASSWORD')
cur = conn.cursor()
cur.execute('''
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    admin INTEGER NOT NULL DEFAULT 0,
    municipio_id TEXT,
    cpf TEXT,
    cpf_hash TEXT UNIQUE,
    email_verificado INTEGER NOT NULL DEFAULT 0,
    codigo_2fa TEXT,
    codigo_2fa_expira TEXT,
    requestsresetat TEXT,
    requestscount INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT NOW(),
    atualizado_em TEXT NOT NULL DEFAULT NOW()
)
''')
conn.commit()
cur.close()
conn.close()
print('users table OK')
"

echo "=== Creating municipios table (managed=False) ==="
python -c "
import psycopg2
conn = psycopg2.connect(host='$DB_HOST', dbname='$DB_NAME', user='$DB_USER', password='$DB_PASSWORD')
cur = conn.cursor()
cur.execute('DROP TABLE IF EXISTS municipios CASCADE')
cur.execute('''
  CREATE TABLE municipios (
    codigo TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    uf TEXT NOT NULL,
    uf_sigla TEXT NOT NULL,
    min_lat DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    min_lng DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    poligono_json JSONB,
    polygon_geom geometry(MultiPolygon, 4326)
  )
''')
conn.commit()
cur.close()
conn.close()
print('municipios table OK')
"

echo "=== Generating migrations ==="
python manage.py makemigrations users municipios --noinput 2>&1

echo "=== Faking users migration ==="
python manage.py migrate users --fake --noinput 2>&1

echo "=== Running Django core migrations ==="
python manage.py migrate contenttypes --noinput 2>&1
python manage.py migrate auth --noinput 2>&1
python manage.py migrate sessions --noinput 2>&1
python manage.py migrate admin --noinput 2>&1

echo "=== Faking municipios migration ==="
python manage.py migrate municipios --fake --noinput 2>&1

echo "=== Seeding municipios from IBGE ==="
python manage.py seed_municipios 2>&1

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput --clear 2>&1

echo "=== Starting gunicorn dev server ==="
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --reload \
    --log-level debug \
    --access-logfile - \
    --error-logfile -
