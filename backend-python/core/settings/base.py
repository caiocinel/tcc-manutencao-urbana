import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY: Separate Django SECRET_KEY from JWT_SECRET
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    SECRET_KEY = os.environ.get('JWT_SECRET')
if not SECRET_KEY:
    raise ValueError('DJANGO_SECRET_KEY or JWT_SECRET must be set')

DEBUG = False

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,backend').split(',')

INSTALLED_APPS = [
    'core',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'users',
    'defeitos',
    'municipios',
    'categorias',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
        'rest_framework.filters.SearchFilter',
    ],
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'COERCE_DECIMAL_TO_STRING': True,
    'UPLOADED_FILES_USE_URL': False,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'SIGNING_KEY': os.environ.get('JWT_SECRET', SECRET_KEY),
}

CORS_ALLOWED_ORIGINS = os.environ.get(
    'FRONTEND_URL', 'http://localhost:5173'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# CSRF settings for JWT-based SPA (Double Submit Cookie pattern)
CSRF_USE_SESSIONS = False
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = 'Strict'

PASSWORD_HASHERS = [
    'users.hashers.BCryptPasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]

ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', '')
SUPER_ADMIN_EMAIL = os.environ.get('SUPER_ADMIN_EMAIL', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
IA_URL = os.environ.get('IA_URL', 'http://ia:8000')
REDIS_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
PRIVACY_BLUR_SIGMA = float(os.environ.get('PRIVACY_BLUR_SIGMA', '0.6'))
PERIMETER_BUFFER_DEG = float(os.environ.get('PERIMETER_BUFFER_DEG', '0.01'))
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'Central Urbana <onboarding@resend.dev>')

import logging
logging.basicConfig(
    level=os.environ.get('LOG_LEVEL', 'INFO').upper(),
    format='%(asctime)s %(levelname)s %(message)s',
)
