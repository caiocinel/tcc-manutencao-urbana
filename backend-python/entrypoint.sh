#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL ready"

echo "Generating initial migrations..."
python manage.py makemigrations users municipios categorias --noinput 2>&1

echo "Running core migrations..."
python manage.py migrate contenttypes --noinput 2>&1
python manage.py migrate auth --noinput 2>&1
python manage.py migrate sessions --noinput 2>&1
python manage.py migrate admin --noinput 2>&1

echo "Running app migrations (faking managed=False)..."
python manage.py migrate users --noinput 2>&1
python manage.py migrate municipios --noinput 2>&1
python manage.py migrate categorias --noinput 2>&1
python manage.py migrate defeitos --fake --noinput 2>&1

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "Starting gunicorn..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --worker-class sync \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info