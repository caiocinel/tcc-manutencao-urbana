#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL ready"

echo "Bootstrapping database schema (managed=False tables)..."
python manage.py bootstrap_schema 2>&1

echo "Generating initial migrations (managed=False apps)..."
python manage.py makemigrations users municipios categorias --noinput 2>&1

echo "Running core migrations..."
python manage.py migrate contenttypes --noinput 2>&1
python manage.py migrate auth --noinput 2>&1
python manage.py migrate sessions --noinput 2>&1
python manage.py migrate admin --noinput 2>&1

echo "Running app migrations (faking managed=False)..."
python manage.py migrate users --fake --noinput 2>&1
python manage.py migrate municipios --fake --noinput 2>&1
python manage.py migrate categorias --fake --noinput 2>&1
python manage.py migrate defeitos --fake --noinput 2>&1

echo "Ensuring super admin exists..."
python - <<'PYEOF' 2>&1
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.production')
django.setup()

from users.models import User

email = os.environ.get('SUPER_ADMIN_EMAIL', '').strip().lower()
if not email:
    print('SUPER_ADMIN_EMAIL not set; skipping')
    raise SystemExit(0)

password = os.environ.get('SUPER_ADMIN_PASSWORD', 'Admin@2026')
if not User.objects.filter(email__iexact=email).exists():
    user = User(
        email=email,
        nome='Administrador',
        admin=1,
        email_verified=1,
    )
    user.set_password(password)
    user.save()
    print(f'Super admin criado: {email}')
else:
    print(f'Super admin já existe: {email}')
PYEOF

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "Starting gunicorn..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --threads 2 \
    --worker-class gthread \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info