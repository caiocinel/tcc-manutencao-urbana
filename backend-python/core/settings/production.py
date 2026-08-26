import os
from .base import *

DEBUG = False

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,backend').split(',')

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ.get('DB_NAME', 'manutencao_urbana'),
        'USER': os.environ.get('DB_USER', 'urbana'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'postgres'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'options': '-c timezone=UTC',
        },
    },
}

CORS_ALLOWED_ORIGINS = os.environ.get('FRONTEND_URL', '').split(',')

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# SECURITY: HSTS, SSL redirect, XSS filter (defense-in-depth beyond nginx)
SECURE_HSTS_SECONDS = 31536000
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'true').lower() in ('true', '1', 'yes')
SECURE_BROWSER_XSS_FILTER = False  # Deprecated, rely on CSP in nginx
SECURE_CONTENT_TYPE_NOSNIFF = True
