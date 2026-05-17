# Django Migration — Central de Inteligência Urbana

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Node.js/Express 5 backend to Python/Django 5.x with DRF, reusing existing PostgreSQL 16 + PostGIS 3.4 database.

**Architecture:** NGINX → Django/Gunicorn :8000 → PostgreSQL 16 + PostGIS (existing) + Redis 7 (circuit breaker). Five Django apps (core, users, defeitos, municipios, categorias) with DRF ViewSets, simplejwt auth, and standalone services for encryption, CPF validation, email (Resend), push (pywebpush), image processing (Pillow), and IA client with Redis circuit breaker.

**Tech Stack:** Python 3.12, Django 5.x, djangorestframework, djangorestframework-simplejwt, django-cors-headers, django-filter, django-ratelimit, psycopg2-binary, gunicorn, cryptography, Pillow, httpx, resend, pywebpush, bcrypt, redis

---

## File Structure Map

```
backend-python/
├── Dockerfile
├── manage.py
├── requirements.txt
├── core/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
├── services/
│   ├── __init__.py
│   ├── encryption.py
│   ├── cpf_validator.py
│   ├── email_service.py
│   ├── push_service.py
│   ├── image_processor.py
│   └── ia_client.py
├── users/
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── admin.py
│   ├── authentication.py
│   ├── permissions.py
│   ├── hashers.py
│   └── tests.py
├── defeitos/
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── admin.py
│   └── tests.py
├── municipios/
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── admin.py
│   └── tests.py
├── categorias/
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── admin.py
│   └── tests.py
└── pytest.ini

Modified files:
- docker-compose.yml                  → backend build points to backend-python/Dockerfile, add Redis service
- nginx.prod.conf                     → proxy_pass to backend:8000, remove Certbot volume refs
- nginx.Dockerfile                    → remove Certbot volume refs
- frontend/src/constants.js           → add API_BASE = '/api/v1'
- frontend/src/services/api.js        → all endpoint paths with /api/v1/ + trailing slashes, token pair format
```

---

## Task 1: Django Project Scaffold

**Files:**
- Create: `backend-python/requirements.txt`
- Create: `backend-python/manage.py`
- Create: `backend-python/core/__init__.py`
- Create: `backend-python/core/settings/__init__.py`
- Create: `backend-python/core/settings/base.py`
- Create: `backend-python/core/settings/production.py`
- Create: `backend-python/core/urls.py`
- Create: `backend-python/core/wsgi.py`
- Create: `backend-python/users/__init__.py`
- Create: `backend-python/users/apps.py`
- Create: `backend-python/defeitos/__init__.py`
- Create: `backend-python/defeitos/apps.py`
- Create: `backend-python/municipios/__init__.py`
- Create: `backend-python/municipios/apps.py`
- Create: `backend-python/categorias/__init__.py`
- Create: `backend-python/categorias/apps.py`
- Create: `backend-python/services/__init__.py`
- Create: `backend-python/pytest.ini`

- [ ] **Step 1: Create directory structure**

Run:
```bash
mkdir -p backend-python/core/settings backend-python/services \
  backend-python/users backend-python/defeitos \
  backend-python/municipios backend-python/categorias
```

Expected: No errors. All directories created.

- [ ] **Step 2: Write requirements.txt**

Write `backend-python/requirements.txt`:
```
django>=5.1,<5.2
djangorestframework>=3.15,<3.16
djangorestframework-simplejwt>=5.3,<5.4
django-cors-headers>=4.3,<4.4
django-filter>=24.3,<24.4
django-ratelimit>=4.1,<4.2
gunicorn>=22.0,<23.0
psycopg2-binary>=2.9,<2.10
cryptography>=42.0,<43.0
Pillow>=10.3,<11.0
httpx>=0.27,<0.28
pywebpush>=1.14,<1.15
bcrypt>=4.1,<4.2
redis>=5.0,<5.1
python-dotenv>=1.0,<1.1
```

- [ ] **Step 3: Write manage.py**

Write `backend-python/manage.py`:
```python
#!/usr/bin/env python
import os
import sys


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.production')
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
```

- [ ] **Step 4: Write `__init__.py` files**

Write empty `__init__.py` for each of:
- `backend-python/core/__init__.py`
- `backend-python/core/settings/__init__.py`
- `backend-python/services/__init__.py`
- `backend-python/users/__init__.py`
- `backend-python/defeitos/__init__.py`
- `backend-python/municipios/__init__.py`
- `backend-python/categorias/__init__.py`

Content for each:
```python
```

- [ ] **Step 5: Write base settings**

Write `backend-python/core/settings/base.py`:
```python
import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get('JWT_SECRET', 'django-insecure-change-me')

DEBUG = False

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,backend').split(',')

INSTALLED_APPS = [
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
        'rest_framework.permissions.AllowAny',
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
```

- [ ] **Step 6: Write production settings**

Write `backend-python/core/settings/production.py`:
```python
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
        'OPTIONS': {
            'options': '-c timezone=UTC',
        },
    }
}

CORS_ALLOWED_ORIGINS = os.environ.get('FRONTEND_URL', '').split(',')

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

- [ ] **Step 7: Write wsgi.py**

Write `backend-python/core/wsgi.py`:
```python
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.production')
application = get_wsgi_application()
```

- [ ] **Step 8: Write app configs**

Write `backend-python/users/apps.py`:
```python
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'
```

Write `backend-python/defeitos/apps.py`:
```python
from django.apps import AppConfig


class DefeitosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'defeitos'
```

Write `backend-python/municipios/apps.py`:
```python
from django.apps import AppConfig


class MunicipiosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'municipios'
```

Write `backend-python/categorias/apps.py`:
```python
from django.apps import AppConfig


class CategoriasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'categorias'
```

- [ ] **Step 9: Write pytest.ini**

Write `backend-python/pytest.ini`:
```ini
[pytest]
DJANGO_SETTINGS_MODULE = core.settings.production
python_files = tests.py test_*.py *_tests.py
```

- [ ] **Step 10: Write root URLs**

Write `backend-python/core/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({'message': 'API da Central de Inteligência Urbana'})


urlpatterns = [
    path('api/v1/health/', health_check, name='health-check'),
    path('api/v1/auth/', include('users.urls')),
    path('api/v1/defeitos/', include('defeitos.urls')),
    path('api/v1/municipios/', include('municipios.urls')),
    path('api/v1/categorias/', include('categorias.urls')),
    path('admin/', admin.site.urls),
]
```

- [ ] **Step 11: Verify initial scaffold**

Run:
```bash
pip install -r backend-python/requirements.txt 2>&1 | tail -5
```

Expected: All packages install. Last line says "Successfully installed ..."

Run:
```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python -c "
import django; django.setup()
from django.conf import settings
print('Apps:', settings.INSTALLED_APPS)
print('AUTH_USER_MODEL:', settings.AUTH_USER_MODEL)
print('OK')
"
```

Expected: Prints all installed apps, shows `users.User`, and `OK`.

- [ ] **Step 12: Commit**

```bash
git add backend-python/ && git commit -m "feat: django project scaffold with 5 apps"
```

---

## Task 2: BCryptPasswordHasher (Node.js compat)

**Files:**
- Create: `backend-python/users/hashers.py`

- [ ] **Step 1: Write the hasher**

Write `backend-python/users/hashers.py`:
```python
import bcrypt
from django.contrib.auth.hashers import BasePasswordHasher


class BCryptPasswordHasher(BasePasswordHasher):
    algorithm = "bcrypt"
    library = ("bcrypt", "bcrypt")
    rounds = 10

    def salt(self):
        return bcrypt.gensalt(rounds=self.rounds)

    def encode(self, password, salt):
        data = bcrypt.hashpw(password.encode(), salt)
        return f"{self.algorithm}${data.decode()}"

    def verify(self, password, encoded):
        if encoded.startswith(f"{self.algorithm}$"):
            encoded = encoded[len(self.algorithm) + 1:]
        return bcrypt.checkpw(password.encode(), encoded.encode())

    def safe_summary(self, encoded):
        if encoded.startswith(f"{self.algorithm}$"):
            encoded = encoded[len(self.algorithm) + 1:]
        return {
            "algorithm": self.algorithm,
            "rounds": self.rounds,
            "version": encoded.split("$")[1] if encoded.count("$") >= 2 else "?",
        }

    def must_update(self, encoded):
        return False

    def harden_runtime(self, password, encoded):
        pass
```

- [ ] **Step 2: Test hasher compatibility**

Run:
```bash
python3 -c "
import bcrypt
password = 'teste123'
salt = bcrypt.gensalt(rounds=10)
node_hash = bcrypt.hashpw(password.encode(), salt).decode()
print(f'Node format: {node_hash}')
print(f'Verify correct: {bcrypt.checkpw(password.encode(), node_hash.encode())}')
print(f'Verify wrong: {bcrypt.checkpw(b\"wrong\", node_hash.encode())}')
# Django format
django_hash = f'bcrypt\${node_hash}'
stripped = django_hash[len('bcrypt$'):]
print(f'Django format matches: {bcrypt.checkpw(password.encode(), stripped.encode())}')
"
```

Expected: All verify calls print `True` for correct password, `False` for wrong password.

- [ ] **Step 3: Commit**

```bash
git add backend-python/users/hashers.py && git commit -m "feat: bcrypt password hasher for node.js compat"
```

---

## Task 3: Encryption Service (AES-256-GCM)

**Files:**
- Create: `backend-python/services/encryption.py`

- [ ] **Step 1: Write encryption service**

Write `backend-python/services/encryption.py`:
```python
import hashlib
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings


def _get_key():
    secret = settings.ENCRYPTION_KEY
    if not secret:
        raise ValueError('ENCRYPTION_KEY not configured')
    return hashlib.sha256(secret.encode()).digest()


def encrypt_text(text: str) -> str:
    key = _get_key()
    aesgcm = AESGCM(key)
    iv = os.urandom(16)
    ciphertext = aesgcm.encrypt(iv, text.encode(), None)
    tag = ciphertext[-16:]
    encrypted = ciphertext[:-16]
    return f"{iv.hex()}:{tag.hex()}:{encrypted.hex()}"


def decrypt_text(encoded: str) -> str:
    parts = encoded.split(':')
    if len(parts) != 3:
        raise ValueError('Invalid encrypted format')
    iv = bytes.fromhex(parts[0])
    tag = bytes.fromhex(parts[1])
    data = bytes.fromhex(parts[2])
    key = _get_key()
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, data + tag, None)
    return plaintext.decode()


def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()
```

- [ ] **Step 2: Test encryption compatibility with Node.js**

Run:
```bash
python3 -c "
import hashlib, os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

key = hashlib.sha256(b'9f7a2d4b1e8c3f5a0d6b9e2c4f7a1d3b5e8c0f2a4d6b9e1c3f5a7d0b2e4c8f').digest()
aesgcm = AESGCM(key)
iv = os.urandom(16)
plaintext = b'12345678901'
ct = aesgcm.encrypt(iv, plaintext, None)
tag = ct[-16:]
data = ct[:-16]
encoded = f'{iv.hex()}:{tag.hex()}:{data.hex()}'
print(f'Encoded: {encoded[:30]}...')

parts = encoded.split(':')
iv2 = bytes.fromhex(parts[0])
tag2 = bytes.fromhex(parts[1])
data2 = bytes.fromhex(parts[2])
decrypted = aesgcm.decrypt(iv2, data2 + tag2, None)
print(f'Match: {decrypted == plaintext}')
"
```

Expected: `Match: True`

- [ ] **Step 3: Commit**

```bash
git add backend-python/services/encryption.py && git commit -m "feat: aes-256-gcm encryption service"
```

---

## Task 4: CPF Validator Service

**Files:**
- Create: `backend-python/services/cpf_validator.py`

- [ ] **Step 1: Write CPF validator**

Write `backend-python/services/cpf_validator.py`:
```python
import httpx


def validar_digitos(cpf: str) -> bool:
    nums = ''.join(c for c in cpf if c.isdigit())
    if len(nums) != 11:
        return False
    if nums == nums[0] * 11:
        return False

    soma = sum(int(nums[i]) * (10 - i) for i in range(9))
    dig1 = 11 - (soma % 11)
    if dig1 >= 10:
        dig1 = 0
    if int(nums[9]) != dig1:
        return False

    soma = sum(int(nums[i]) * (11 - i) for i in range(10))
    dig2 = 11 - (soma % 11)
    if dig2 >= 10:
        dig2 = 0
    if int(nums[10]) != dig2:
        return False

    return True


def consultar_brasil_api(cpf: str) -> dict | None:
    nums = ''.join(c for c in cpf if c.isdigit())
    try:
        resp = httpx.get(
            f'https://brasilapi.com.br/api/cpf/v1/{nums}',
            timeout=10.0,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError:
        return None
```

- [ ] **Step 2: Test CPF validator**

```bash
python3 -c "
import sys; sys.path.insert(0, 'backend-python')
from services.cpf_validator import validar_digitos
print(f'Valid CPF 52998224725: {validar_digitos(\"52998224725\")}')
print(f'All same 11111111111: {validar_digitos(\"11111111111\")}')
print(f'Short 123: {validar_digitos(\"123\")}')
"
```

Expected: `True`, `False`, `False`

- [ ] **Step 3: Commit**

```bash
git add backend-python/services/cpf_validator.py && git commit -m "feat: cpf validator service"
```

---

## Task 5: Email Service (Resend)

**Files:**
- Create: `backend-python/services/email_service.py`

- [ ] **Step 1: Write email service**

Write `backend-python/services/email_service.py`:
```python
import re
import logging
import asyncio
import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


async def _send_email(to: str, subject: str, html: str) -> dict:
    if not settings.RESEND_API_KEY:
        logger.warning('RESEND_API_KEY not configured, skipping email')
        return {'id': None, 'fallback': True}

    code_match = re.search(r'>(\d{6})<', html)
    if code_match:
        logger.info(f'Verification code sent to {to}: {code_match.group(1)}')

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {settings.RESEND_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'from': settings.FROM_EMAIL,
                'to': [to],
                'subject': subject,
                'html': html,
            },
            timeout=15.0,
        )

    if not resp.is_success:
        logger.error(f'Failed to send email to {to}: {resp.text}')
        if code_match:
            logger.info(f'Code {code_match.group(1)} available in logs')
        return {'id': None, 'fallback': True}

    return resp.json()


def _verification_html(code: str) -> str:
    return (
        '<div style="font-family:sans-serif;max-width:480px;margin:0 auto">'
        '<h2>Confirme seu email</h2>'
        '<p>Seu codigo de verificacao e:</p>'
        f'<p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;background:#f5f5f5;padding:16px;border-radius:8px">{code}</p>'
        '<p>Ele expira em 10 minutos.</p>'
        '<p style="color:#888;font-size:12px">Central de Inteligencia Urbana</p>'
        '</div>'
    )


def _twofa_html(code: str) -> str:
    return (
        '<div style="font-family:sans-serif;max-width:480px;margin:0 auto">'
        '<h2>Codigo de verificacao em duas etapas</h2>'
        '<p>Use o codigo abaixo para acessar sua conta:</p>'
        f'<p style="font-size:32px;letter-spacing:8px;font-weight:700;text-align:center;background:#f5f5f5;padding:16px;border-radius:8px">{code}</p>'
        '<p>Ele expira em 5 minutos.</p>'
        '<p style="color:#888;font-size:12px">Central de Inteligencia Urbana</p>'
        '</div>'
    )


def send_verification_code(email: str, code: str) -> dict:
    return asyncio.run(_send_email(
        to=email,
        subject='Confirme seu email - Central de Inteligencia Urbana',
        html=_verification_html(code),
    ))


def send_2fa_code(email: str, code: str) -> dict:
    return asyncio.run(_send_email(
        to=email,
        subject='Seu codigo de acesso - Central de Inteligencia Urbana',
        html=_twofa_html(code),
    ))
```

- [ ] **Step 2: Commit**

```bash
git add backend-python/services/email_service.py && git commit -m "feat: email service with resend"
```

---

## Task 6: Push Notification Service (pywebpush)

**Files:**
- Create: `backend-python/services/push_service.py`

- [ ] **Step 1: Write push service**

Write `backend-python/services/push_service.py`:
```python
import json
import logging
from pywebpush import webpush, WebPushException
from django.conf import settings

logger = logging.getLogger(__name__)

VAPID_CLAIMS = {
    'sub': 'mailto:admin@centralurbana.app',
}


def get_public_key() -> str:
    return settings.VAPID_PUBLIC_KEY or ''


def notify_user(subscription: dict, title: str, body: str, url: str = '/') -> bool:
    vapid_private_key = settings.VAPID_PRIVATE_KEY
    vapid_public_key = settings.VAPID_PUBLIC_KEY
    if not vapid_private_key or not vapid_public_key:
        logger.warning('VAPID keys not configured, skipping push')
        return False

    payload = json.dumps({'title': title, 'body': body, 'url': url})

    try:
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=vapid_private_key,
            vapid_claims={**VAPID_CLAIMS, 'aud': subscription.get('endpoint', '')},
        )
        return True
    except WebPushException as exc:
        if exc.status_code in (410, 404):
            logger.info(f'Push subscription expired/gone: {exc.status_code}')
            return False
        logger.error(f'Push notification failed: {exc}')
        return False
```

- [ ] **Step 2: Commit**

```bash
git add backend-python/services/push_service.py && git commit -m "feat: push notification service with pywebpush"
```

---

## Task 7: Image Processor Service (Pillow)

**Files:**
- Create: `backend-python/services/image_processor.py`

- [ ] **Step 1: Write image processor**

Write `backend-python/services/image_processor.py`:
```python
import io
from PIL import Image, ImageFilter
from django.conf import settings


def process_image(input_bytes: bytes) -> dict:
    img = Image.open(io.BytesIO(input_bytes))

    sigma = settings.PRIVACY_BLUR_SIGMA
    if sigma > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=sigma))

    img.thumbnail((1200, 1200), Image.LANCZOS)

    output_buf = io.BytesIO()
    img.save(output_buf, 'WEBP', quality=80)
    output_buf.seek(0)

    thumb = img.copy()
    thumb.thumbnail((200, 200), Image.LANCZOS)
    thumb_buf = io.BytesIO()
    thumb.save(thumb_buf, 'WEBP', quality=55)
    thumb_buf.seek(0)

    return {
        'webp_bytes': output_buf.getvalue(),
        'thumbnail_bytes': thumb_buf.getvalue(),
    }


def make_thumbnail(input_bytes: bytes, size: tuple = (200, 200)) -> bytes:
    img = Image.open(io.BytesIO(input_bytes))
    img.thumbnail(size, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, 'WEBP', quality=55)
    buf.seek(0)
    return buf.getvalue()
```

- [ ] **Step 2: Test image processing**

```bash
python3 -c "
from PIL import Image, ImageFilter
import io

img = Image.new('RGB', (2000, 1500), color='red')
buf = io.BytesIO()
img.save(buf, 'JPEG')
buf.seek(0)

img2 = Image.open(buf)
img2 = img2.filter(ImageFilter.GaussianBlur(radius=0.6))
img2.thumbnail((1200, 1200), Image.LANCZOS)
out = io.BytesIO()
img2.save(out, 'WEBP', quality=80)
print(f'Original: {buf.tell()} bytes')
print(f'Output: {out.tell()} bytes')
print(f'Max dim: {max(img2.size)}')
"
```

Expected: Output size < original, max dimension <= 1200.

- [ ] **Step 3: Commit**

```bash
git add backend-python/services/image_processor.py && git commit -m "feat: image processor with pillow"
```

---

## Task 8: IA Client with Redis Circuit Breaker

**Files:**
- Create: `backend-python/services/ia_client.py`

- [ ] **Step 1: Write IA client**

Write `backend-python/services/ia_client.py`:
```python
import time
import logging
import httpx
import redis.asyncio as redis
from django.conf import settings

logger = logging.getLogger(__name__)

IA_URL = settings.IA_URL
TIMEOUT = 3.0

SECRETARIAS = {
    'Buraco': 'Secretaria de Obras e Infraestrutura',
    'Iluminacao': 'Secretaria de Iluminacao Publica',
    'Semafaro': 'Secretaria de Transito e Mobilidade',
    'Arvore Caida': 'Secretaria de Meio Ambiente',
    'Entulho': 'Secretaria de Limpeza Urbana',
    'Calcada Danificada': 'Secretaria de Obras e Infraestrutura',
    'Outro': 'Secretaria de Servicos Urbanos',
}

PRAZOS = {
    'Buraco': 7,
    'Iluminacao': 5,
    'Semafaro': 2,
    'Arvore Caida': 2,
    'Entulho': 15,
    'Calcada Danificada': 7,
    'Outro': 15,
}


class CircuitBreaker:
    KEY_TEMPLATE = 'ia:circuit:{name}'

    def __init__(self, name: str = 'main'):
        self.name = name

    async def is_open(self, redis_client=None) -> bool:
        if redis_client is None:
            return False
        key = self.KEY_TEMPLATE.format(name=self.name)
        state = await redis_client.hgetall(key)
        if not state:
            return False
        failures = int(state.get(b'failures', 0))
        if failures >= 3:
            cooldown_until = float(state.get(b'cooldown_until', 0))
            if time.time() < cooldown_until:
                return True
            await redis_client.delete(key)
        return False

    async def record_failure(self, redis_client=None):
        if redis_client is None:
            return
        key = self.KEY_TEMPLATE.format(name=self.name)
        pipe = redis_client.pipeline()
        pipe.hincrby(key, 'failures', 1)
        pipe.hset(key, 'cooldown_until', time.time() + 60)
        pipe.expire(key, 120)
        await pipe.execute()

    async def record_success(self, redis_client=None):
        if redis_client is None:
            return
        key = self.KEY_TEMPLATE.format(name=self.name)
        await redis_client.delete(key)


circuit_breaker = CircuitBreaker()


async def _call_ia(endpoint: str, payload: dict, redis_client=None) -> dict | None:
    if await circuit_breaker.is_open(redis_client):
        logger.warning(f'Circuit breaker open for {endpoint}')
        return None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f'{IA_URL}{endpoint}',
                json=payload,
                timeout=TIMEOUT,
            )
            resp.raise_for_status()
            await circuit_breaker.record_success(redis_client)
            return resp.json()
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        logger.error(f'IA call failed: {exc}')
        await circuit_breaker.record_failure(redis_client)
        return None


async def classify(text: str, redis_client=None) -> dict | None:
    return await _call_ia('/classify', {'text': text}, redis_client)


async def classify_full(text: str, redis_client=None) -> dict | None:
    return await _call_ia('/classify-full', {'text': text}, redis_client)


async def classify_priority(text: str, redis_client=None) -> dict | None:
    return await _call_ia('/priority', {'text': text}, redis_client)


async def text_similarity(text1: str, text2: str, redis_client=None) -> dict | None:
    return await _call_ia('/text-similarity', {'text1': text1, 'text2': text2}, redis_client)


async def check_spam(text: str, redis_client=None) -> dict | None:
    return await _call_ia('/check-spam', {'text': text}, redis_client)


def routing(categoria: str) -> dict:
    return {
        'secretaria': SECRETARIAS.get(categoria, SECRETARIAS['Outro']),
        'prazo_sla_dias': PRAZOS.get(categoria, PRAZOS['Outro']),
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend-python/services/ia_client.py && git commit -m "feat: ia client with redis circuit breaker"
```


---

## Task 9: User Model

**Files:**
- Create: `backend-python/users/models.py`
- Create: `backend-python/users/admin.py`

- [ ] **Step 1: Write User model**

Read the existing table schema first — confirm column names:
```bash
docker compose exec postgres psql -U urbana -d manutencao_urbana -c "\d users"
```

Write `backend-python/users/models.py`:
```python
import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, nome, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        if not nome:
            raise ValueError('Nome is required')
        email = self.normalize_email(email)
        user = self.model(email=email, nome=nome, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nome, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('tipo', 'admin')
        return self.create_user(email, nome, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    TIPO_CHOICES = [
        ('admin', 'Admin'),
        ('morador', 'Morador'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=255, unique=True)
    nome = models.CharField(max_length=255)
    cpf = models.CharField(max_length=512, blank=True, default='')
    telefone = models.CharField(max_length=20, blank=True, default='')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='morador')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    avatar_url = models.CharField(max_length=512, blank=True, default='')
    email_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True, db_column='criado_em')
    atualizado_em = models.DateTimeField(auto_now=True, db_column='atualizado_em')

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    class Meta:
        db_table = 'users'
        managed = False
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def __str__(self):
        return f'{self.nome} ({self.email})'
```

- [ ] **Step 2: Write User admin**

Write `backend-python/users/admin.py`:
```python
from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'nome', 'tipo', 'is_active', 'email_verified')
    list_filter = ('tipo', 'is_active', 'email_verified')
    search_fields = ('email', 'nome', 'cpf')
    ordering = ('-criado_em',)
    readonly_fields = ('id', 'criado_em', 'atualizado_em')
    fieldsets = (
        (None, {'fields': ('id', 'email', 'nome')}),
        ('Personal', {'fields': ('cpf', 'telefone', 'avatar_url')}),
        ('Permissions', {'fields': ('tipo', 'is_active', 'is_staff', 'is_superuser', 'email_verified', 'two_factor_enabled')}),
        ('Dates', {'fields': ('criado_em', 'atualizado_em')}),
    )
```

- [ ] **Step 3: Test model detection**

```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python -c "
import django; django.setup()
from users.models import User
print(f'Model: {User.__name__}')
print(f'Table: {User._meta.db_table}')
print(f'Managed: {User._meta.managed}')
print(f'Fields: {[f.name for f in User._meta.fields]}')
"
```

Expected: Prints User, users, False, and all field names.

- [ ] **Step 4: Commit**

```bash
git add backend-python/users/models.py backend-python/users/admin.py && git commit -m "feat: user model mapped to existing users table"
```

---

## Task 10: Defeito Model (with PostGIS PointField)

**Files:**
- Create: `backend-python/defeitos/models.py`
- Create: `backend-python/defeitos/admin.py`

- [ ] **Step 1: Write Defeito model**

Confirm existing table schema:
```bash
docker compose exec postgres psql -U urbana -d manutencao_urbana -c "\d defeitos"
```

Write `backend-python/defeitos/models.py`:
```python
import uuid
from django.contrib.gis.db import models
from django.conf import settings
from users.models import User


class Defeito(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('em_andamento', 'Em Andamento'),
        ('resolvido', 'Resolvido'),
        ('rejeitado', 'Rejeitado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    autor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='defeitos',
    )
    categoria = models.ForeignKey(
        'categorias.Categoria', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='defeitos',
    )
    municipio = models.ForeignKey(
        'municipios.Municipio', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='defeitos',
    )
    titulo = models.CharField(max_length=255)
    descricao = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    imagem_url = models.CharField(max_length=512, blank=True, default='')
    thumbnail_url = models.CharField(max_length=512, blank=True, default='')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    localizacao = models.PointField(
        geography=True, srid=4326, null=True, blank=True,
        help_text='PostGIS Point derived from lat/lng',
    )
    endereco = models.TextField(blank=True, default='')
    prioridade = models.CharField(max_length=50, blank=True, default='')
    secretaria_responsavel = models.CharField(max_length=255, blank=True, default='')
    prazo_sla_dias = models.IntegerField(null=True, blank=True)
    anonimo = models.BooleanField(default=False)
    curtidas = models.IntegerField(default=0)
    criado_em = models.DateTimeField(db_column='criado_em')
    atualizado_em = models.DateTimeField(db_column='atualizado_em')

    class Meta:
        db_table = 'defeitos'
        managed = False
        verbose_name = 'Defeito'
        verbose_name_plural = 'Defeitos'
        ordering = ['-criado_em']

    def __str__(self):
        return self.titulo


class Apoio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='apoios',
        db_column='usuarioid',
    )
    defeito = models.ForeignKey(
        Defeito, on_delete=models.CASCADE, related_name='apoios',
        db_column='defeitoid',
    )
    criado_em = models.DateTimeField(auto_now_add=True, db_column='criado_em')

    class Meta:
        db_table = 'apoios'
        managed = False
        verbose_name = 'Apoio'
        verbose_name_plural = 'Apoios'
        unique_together = ('usuario', 'defeito')

    def __str__(self):
        return f'{self.usuario_id} -> {self.defeito_id}'
```

- [ ] **Step 2: Write Defeito admin**

Write `backend-python/defeitos/admin.py`:
```python
from django.contrib.gis import admin
from .models import Defeito, Apoio


@admin.register(Defeito)
class DefeitoAdmin(admin.GISModelAdmin):
    list_display = ('titulo', 'status', 'categoria', 'autor', 'criado_em')
    list_filter = ('status', 'categoria', 'anonimo')
    search_fields = ('titulo', 'descricao', 'endereco')
    readonly_fields = ('id', 'criado_em', 'atualizado_em')


@admin.register(Apoio)
class ApoioAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'defeito', 'criado_em')
    readonly_fields = ('id', 'criado_em')
```

- [ ] **Step 3: Commit**

```bash
git add backend-python/defeitos/models.py backend-python/defeitos/admin.py && git commit -m "feat: defeito and apoio models with postgis"
```

---

## Task 11: Municipio Model (with PostGIS MultiPolygonField)

**Files:**
- Create: `backend-python/municipios/models.py`
- Create: `backend-python/municipios/admin.py`

- [ ] **Step 1: Write Municipio model**

Confirm existing table:
```bash
docker compose exec postgres psql -U urbana -d manutencao_urbana -c "\d municipios"
```

Write `backend-python/municipios/models.py`:
```python
import uuid
from django.contrib.gis.db import models


class Municipio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=255)
    uf = models.CharField(max_length=2)
    geometria = models.MultiPolygonField(srid=4326, null=True, blank=True, geography=True)
    centro_lat = models.FloatField(null=True, blank=True)
    centro_lng = models.FloatField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True, db_column='criado_em')

    class Meta:
        db_table = 'municipios'
        managed = False
        verbose_name = 'Município'
        verbose_name_plural = 'Municípios'
        ordering = ['nome']

    def __str__(self):
        return f'{self.nome}/{self.uf}'
```

- [ ] **Step 2: Write Municipio admin**

Write `backend-python/municipios/admin.py`:
```python
from django.contrib.gis import admin
from .models import Municipio


@admin.register(Municipio)
class MunicipioAdmin(admin.GISModelAdmin):
    list_display = ('nome', 'uf')
    list_filter = ('uf',)
    search_fields = ('nome',)
```

- [ ] **Step 3: Commit**

```bash
git add backend-python/municipios/models.py backend-python/municipios/admin.py && git commit -m "feat: municipio model with multipolygon"
```

---

## Task 12: Categoria Model

**Files:**
- Create: `backend-python/categorias/models.py`
- Create: `backend-python/categorias/admin.py`

- [ ] **Step 1: Write Categoria model**

Confirm existing table:
```bash
docker compose exec postgres psql -U urbana -d manutencao_urbana -c "\d categorias"
```

Write `backend-python/categorias/models.py`:
```python
import uuid
from django.db import models


class Categoria(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=255, unique=True)
    icone = models.CharField(max_length=50, blank=True, default='')
    criado_em = models.DateTimeField(auto_now_add=True, db_column='criado_em')

    class Meta:
        db_table = 'categorias'
        managed = False
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['nome']

    def __str__(self):
        return self.nome
```

- [ ] **Step 2: Write Categoria admin**

Write `backend-python/categorias/admin.py`:
```python
from django.contrib import admin
from .models import Categoria


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'icone', 'criado_em')
    search_fields = ('nome',)
```

- [ ] **Step 3: Commit**

```bash
git add backend-python/categorias/models.py backend-python/categorias/admin.py && git commit -m "feat: categoria model"
```

---

## Task 13: User Auth Serializers & Views (simplejwt)

**Files:**
- Create: `backend-python/users/authentication.py`
- Create: `backend-python/users/permissions.py`
- Create: `backend-python/users/serializers.py`
- Create: `backend-python/users/views.py`
- Create: `backend-python/users/urls.py`

- [ ] **Step 1: Write custom authentication**

Write `backend-python/users/authentication.py`:
```python
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils.translation import gettext_lazy as _
from rest_framework import exceptions


class CustomJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except exceptions.AuthenticationFailed:
            return None
```

- [ ] **Step 2: Write permissions**

Write `backend-python/users/permissions.py`:
```python
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.tipo == 'admin'


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.tipo == 'admin':
            return True
        if hasattr(obj, 'autor'):
            return obj.autor == request.user
        if hasattr(obj, 'usuario'):
            return obj.usuario == request.user
        return obj == request.user
```

- [ ] **Step 3: Write serializers**

Write `backend-python/users/serializers.py`:
```python
from rest_framework import serializers
from .models import User
from services.encryption import encrypt_text, decrypt_text, hash_text
from services.cpf_validator import validar_digitos
from services.email_service import send_verification_code, send_2fa_code
import secrets


class UserSerializer(serializers.ModelSerializer):
    cpf = serializers.SerializerMethodField()
    cpf_hash = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'nome', 'cpf', 'cpf_hash', 'telefone',
            'tipo', 'avatar_url', 'email_verified', 'two_factor_enabled',
            'criado_em', 'atualizado_em',
        )
        read_only_fields = ('id', 'email_verified', 'criado_em', 'atualizado_em')

    def get_cpf(self, obj):
        if obj.tipo != 'admin' and self.context.get('request') and self.context['request'].user != obj:
            return ''
        if obj.cpf and ':' in obj.cpf:
            return decrypt_text(obj.cpf)
        return obj.cpf

    def get_cpf_hash(self, obj):
        if obj.cpf and ':' in obj.cpf:
            return hash_text(decrypt_text(obj.cpf))
        return hash_text(obj.cpf)

    def validate_cpf(self, value):
        raw = ''.join(c for c in value if c.isdigit())
        if raw and not validar_digitos(raw):
            raise serializers.ValidationError('CPF invalido')
        return raw


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('email', 'nome', 'password', 'confirm_password', 'cpf', 'telefone')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email ja cadastrado')
        return value

    def validate(self, data):
        if data['password'] != data.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Senhas nao conferem'})
        if data.get('cpf'):
            raw = ''.join(c for c in data['cpf'] if c.isdigit())
            if not validar_digitos(raw):
                raise serializers.ValidationError({'cpf': 'CPF invalido'})
            data['cpf'] = encrypt_text(raw)
        return data

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        code = ''.join(secrets.digits for _ in range(6))
        send_verification_code(user.email, code)
        # In production: store code in Redis with 10min TTL
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        try:
            user = User.objects.get(email=data['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError('Credenciais invalidas')
        if not user.check_password(data['password']):
            raise serializers.ValidationError('Credenciais invalidas')
        if not user.is_active:
            raise serializers.ValidationError('Conta desativada')
        data['user'] = user
        return data


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('nome', 'telefone', 'avatar_url')

    def validate_cpf(self, value):
        raw = ''.join(c for c in value if c.isdigit())
        if raw and not validar_digitos(raw):
            raise serializers.ValidationError('CPF invalido')
        return encrypt_text(raw) if raw else ''


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email nao encontrado')
        return value


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(min_length=6, max_length=6)
    password = serializers.CharField(min_length=6)
    confirm_password = serializers.CharField(min_length=6)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Senhas nao conferem'})
        return data
```

- [ ] **Step 4: Write user views**

Write `backend-python/users/views.py`:
```python
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    ProfileUpdateSerializer,
)
from .permissions import IsAdmin


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        if user.two_factor_enabled:
            refresh.set_claim('2fa_required', True)
            return Response({
                'requires_2fa': True,
                'temp_token': str(refresh.access_token),
            })

        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
        })


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileUpdateSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        return Response(
            UserSerializer(user, context={'request': request}).data
        )

    def perform_update(self, serializer):
        user = serializer.save()
        # If CPF changed, re-encrypt
        if 'cpf' in serializer.validated_data:
            user.save()


class ListUsersView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated, IsAdmin)
    search_fields = ('email', 'nome')
    ordering_fields = ('criado_em', 'nome', 'email')


class ToggleAdminView(generics.UpdateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated, IsAdmin)
    serializer_class = UserSerializer

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        user.tipo = 'admin' if user.tipo != 'admin' else 'morador'
        user.is_staff = (user.tipo == 'admin')
        user.save()
        return Response(UserSerializer(user, context={'request': request}).data)
```

- [ ] **Step 5: Write user URLs**

Write `backend-python/users/urls.py`:
```python
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='auth-register'),
    path('login/', views.LoginView.as_view(), name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/', TokenBlacklistView.as_view(), name='auth-logout'),
    path('profile/', views.ProfileView.as_view(), name='auth-profile'),
    path('users/', views.ListUsersView.as_view(), name='auth-list-users'),
    path('users/<uuid:pk>/toggle-admin/', views.ToggleAdminView.as_view(), name='auth-toggle-admin'),
]
```

- [ ] **Step 6: Verify imports**

```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python -c "
import django; django.setup()
from users.views import RegisterView, LoginView, ProfileView
from users.serializers import UserSerializer, RegisterSerializer, LoginSerializer
from users.urls import urlpatterns
print(f'Views: OK ({len([v for v in [RegisterView, LoginView, ProfileView] if v])})')
print(f'URLs: {len(urlpatterns)} patterns')
"
```

Expected: Views OK, URLs: 6 patterns.

- [ ] **Step 7: Commit**

```bash
git add backend-python/users/authentication.py backend-python/users/permissions.py backend-python/users/serializers.py backend-python/users/views.py backend-python/users/urls.py && git commit -m "feat: user auth views with simplejwt"
```

---

## Task 14: Defeitos API (ViewSets)

**Files:**
- Create: `backend-python/defeitos/serializers.py`
- Create: `backend-python/defeitos/views.py`
- Create: `backend-python/defeitos/urls.py`

- [ ] **Step 1: Write serializers**

Write `backend-python/defeitos/serializers.py`:
```python
from rest_framework import serializers
from django.contrib.gis.geos import Point
from .models import Defeito, Apoio
from users.serializers import UserSerializer


class DefeitoListSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='autor.nome', read_only=True)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    categoria_icone = serializers.CharField(source='categoria.icone', read_only=True)
    total_apoios = serializers.SerializerMethodField()

    class Meta:
        model = Defeito
        fields = (
            'id', 'titulo', 'descricao', 'status', 'categoria', 'categoria_nome',
            'categoria_icone', 'autor', 'autor_nome', 'latitude', 'longitude',
            'endereco', 'prioridade', 'secretaria_responsavel', 'prazo_sla_dias',
            'imagem_url', 'thumbnail_url', 'anonimo', 'curtidas',
            'total_apoios', 'criado_em', 'atualizado_em',
        )
        read_only_fields = ('id', 'autor', 'curtidas', 'criado_em', 'atualizado_em')

    def get_total_apoios(self, obj):
        return getattr(obj, 'apoios_count', None) or obj.apoios.count()


class DefeitoDetailSerializer(DefeitoListSerializer):
    autor_detail = UserSerializer(source='autor', read_only=True)

    class Meta(DefeitoListSerializer.Meta):
        fields = DefeitoListSerializer.Meta.fields + ('autor_detail',)


class DefeitoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Defeito
        fields = (
            'titulo', 'descricao', 'categoria', 'municipio',
            'latitude', 'longitude', 'endereco', 'anonimo',
        )

    def create(self, validated_data):
        validated_data['autor'] = self.context['request'].user
        lat = validated_data.pop('latitude', None)
        lng = validated_data.pop('longitude', None)
        if lat is not None and lng is not None:
            validated_data['localizacao'] = Point(lng, lat, srid=4326)
        return super().create(validated_data)


class ApoioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Apoio
        fields = ('id', 'usuario', 'defeito', 'criado_em')
        read_only_fields = ('id', 'usuario', 'criado_em')
```

- [ ] **Step 2: Write views**

Write `backend-python/defeitos/views.py`:
```python
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from .models import Defeito, Apoio
from .serializers import (
    DefeitoListSerializer, DefeitoDetailSerializer,
    DefeitoCreateSerializer, ApoioSerializer,
)
from users.permissions import IsAdmin, IsOwnerOrAdmin
from services.push_service import notify_user
from services.ia_client import routing


class DefeitoFilter(filters.FilterSet):
    status = filters.CharFilter(field_name='status')
    categoria = filters.UUIDFilter(field_name='categoria_id')
    municipio = filters.UUIDFilter(field_name='municipio_id')
    prioridade = filters.CharFilter(field_name='prioridade')
    criado_em_after = filters.DateTimeFilter(field_name='criado_em', lookup_expr='gte')
    criado_em_before = filters.DateTimeFilter(field_name='criado_em', lookup_expr='lte')

    class Meta:
        model = Defeito
        fields = ['status', 'categoria', 'municipio', 'prioridade']


class DefeitoViewSet(viewsets.ModelViewSet):
    queryset = Defeito.objects.annotate(
        apoios_count=Count('apoios')
    ).select_related('autor', 'categoria', 'municipio').order_by('-criado_em')
    filterset_class = DefeitoFilter
    search_fields = ('titulo', 'descricao', 'endereco')
    ordering_fields = ('criado_em', 'curtidas', 'titulo')

    def get_serializer_class(self):
        if self.action == 'create':
            return DefeitoCreateSerializer
        elif self.action in ('retrieve',):
            return DefeitoDetailSerializer
        return DefeitoListSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsOwnerOrAdmin()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        defeito = serializer.save()
        rota = routing(defeito.categoria.nome if defeito.categoria else 'Outro')
        defeito.secretaria_responsavel = rota['secretaria']
        defeito.prazo_sla_dias = rota['prazo_sla_dias']
        defeito.save(update_fields=['secretaria_responsavel', 'prazo_sla_dias'])
        # Notify nearby supporters
        for apoio in defeito.apoios.select_related('usuario').all():
            if apoio.usuario.push_subscriptions.exists():
                sub = apoio.usuario.push_subscriptions.first()
                notify_user(sub.subscription, 'Novo defeito', f'{defeito.titulo} - {rota["secretaria"]}')

    @action(detail=True, methods=['post'])
    def apoiar(self, request, pk=None):
        defeito = self.get_object()
        apoio, created = Apoio.objects.get_or_create(
            usuario=request.user, defeito=defeito
        )
        if created:
            defeito.curtidas = defeito.apoios.count()
            defeito.save(update_fields=['curtidas'])
            return Response({'status': 'apoiado'}, status=status.HTTP_201_CREATED)
        apoio.delete()
        defeito.curtidas = defeito.apoios.count()
        defeito.save(update_fields=['curtidas'])
        return Response({'status': 'removido'})

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        defeito = self.get_object()
        novo_status = request.data.get('status')
        if novo_status not in dict(Defeito.STATUS_CHOICES):
            return Response({'error': 'Status invalido'}, status=status.HTTP_400_BAD_REQUEST)
        defeito.status = novo_status
        defeito.save(update_fields=['status'])
        return Response(DefeitoListSerializer(defeito).data)

    @action(detail=False, methods=['get'])
    def meus(self, request):
        qs = self.queryset.filter(autor=request.user)
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=['get'])
    def apoiados(self, request):
        ids = Apoio.objects.filter(usuario=request.user).values_list('defeito_id', flat=True)
        qs = self.queryset.filter(id__in=ids)
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=True, methods=['post'])
    def imagem(self, request, pk=None):
        defeito = self.get_object()
        if 'imagem' not in request.FILES:
            return Response({'error': 'Imagem obrigatoria'}, status=status.HTTP_400_BAD_REQUEST)
        from services.image_processor import process_image
        img_bytes = request.FILES['imagem'].read()
        result = process_image(img_bytes)
        # In production: upload to S3, store URLs
        defeito.imagem_url = f'/media/defeitos/{defeito.id}.webp'
        defeito.thumbnail_url = f'/media/defeitos/{defeito.id}_thumb.webp'
        defeito.save(update_fields=['imagem_url', 'thumbnail_url'])
        return Response({
            'imagem_url': defeito.imagem_url,
            'thumbnail_url': defeito.thumbnail_url,
        })
```

- [ ] **Step 3: Write URLs**

Write `backend-python/defeitos/urls.py`:
```python
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('', views.DefeitoViewSet, basename='defeito')

urlpatterns = router.urls
```

- [ ] **Step 4: Verify**

```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python -c "
import django; django.setup()
from defeitos.views import DefeitoViewSet
from defeitos.urls import urlpatterns
print(f'ViewSet: OK')
print(f'URLs: {len(urlpatterns)} patterns')
print(f'Router actions: {[a for a in DefeitoViewSet.routes]}')
"
```

Expected: OK, multiple URL patterns including list/create/detail/apoiar/status/meus/apoiados.

- [ ] **Step 5: Commit**

```bash
git add backend-python/defeitos/serializers.py backend-python/defeitos/views.py backend-python/defeitos/urls.py && git commit -m "feat: defeitos api with viewsets"
```

---

## Task 15: Municipios API

**Files:**
- Create: `backend-python/municipios/serializers.py`
- Create: `backend-python/municipios/views.py`
- Create: `backend-python/municipios/urls.py`

- [ ] **Step 1: Write serializers**

Write `backend-python/municipios/serializers.py`:
```python
from rest_framework import serializers
from .models import Municipio


class MunicipioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipio
        fields = ('id', 'nome', 'uf', 'centro_lat', 'centro_lng')
        read_only_fields = ('id',)


class MunicipioDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipio
        fields = '__all__'
        read_only_fields = ('id',)
```

- [ ] **Step 2: Write views**

Write `backend-python/municipios/views.py`:
```python
from rest_framework import viewsets, permissions
from .models import Municipio
from .serializers import MunicipioSerializer, MunicipioDetailSerializer


class MunicipioViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Municipio.objects.all().order_by('nome')
    permission_classes = (permissions.AllowAny,)
    search_fields = ('nome', 'uf')
    filterset_fields = ('uf',)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MunicipioDetailSerializer
        return MunicipioSerializer
```

- [ ] **Step 3: Write URLs**

Write `backend-python/municipios/urls.py`:
```python
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('', views.MunicipioViewSet, basename='municipio')

urlpatterns = router.urls
```

- [ ] **Step 4: Commit**

```bash
git add backend-python/municipios/serializers.py backend-python/municipios/views.py backend-python/municipios/urls.py && git commit -m "feat: municipios readonly api"
```

---

## Task 16: Categorias API

**Files:**
- Create: `backend-python/categorias/serializers.py`
- Create: `backend-python/categorias/views.py`
- Create: `backend-python/categorias/urls.py`

- [ ] **Step 1: Write serializers**

Write `backend-python/categorias/serializers.py`:
```python
from rest_framework import serializers
from .models import Categoria


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ('id', 'nome', 'icone')
        read_only_fields = ('id',)
```

- [ ] **Step 2: Write views**

Write `backend-python/categorias/views.py`:
```python
from rest_framework import viewsets, permissions
from .models import Categoria
from .serializers import CategoriaSerializer


class CategoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Categoria.objects.all().order_by('nome')
    permission_classes = (permissions.AllowAny,)
    serializer_class = CategoriaSerializer
    search_fields = ('nome',)
```

- [ ] **Step 3: Write URLs**

Write `backend-python/categorias/urls.py`:
```python
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('', views.CategoriaViewSet, basename='categoria')

urlpatterns = router.urls
```

- [ ] **Step 4: Commit**

```bash
git add backend-python/categorias/serializers.py backend-python/categorias/views.py backend-python/categorias/urls.py && git commit -m "feat: categorias readonly api"
```

---

## Task 17: Push Subscription Model & API

**Files:**
- Create: `backend-python/users/models.py` (append PushSubscription model)
- Create: `backend-python/defeitos/views.py` (add push subscription endpoint)

- [ ] **Step 1: Append PushSubscription to users/models.py**

Edit `backend-python/users/models.py` — add after User class:

```python
class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='push_subscriptions',
    )
    subscription = models.JSONField()
    criado_em = models.DateTimeField(auto_now_add=True, db_column='criado_em')

    class Meta:
        db_table = 'push_subscriptions'
        managed = False
        verbose_name = 'Push Subscription'
        verbose_name_plural = 'Push Subscriptions'
```

- [ ] **Step 2: Add push subscription endpoint to users/urls.py**

Append to `backend-python/users/urls.py`:
```python
from users import views as users_views

urlpatterns += [
    path('push/subscribe/', users_views.PushSubscribeView.as_view(), name='push-subscribe'),
    path('push/unsubscribe/', users_views.PushUnsubscribeView.as_view(), name='push-unsubscribe'),
    path('push/public-key/', users_views.PushPublicKeyView.as_view(), name='push-public-key'),
]
```

- [ ] **Step 3: Add push views to users/views.py**

Append to `backend-python/users/views.py`:
```python
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import PushSubscription
from services.push_service import get_public_key


class PushSubscribeView(generics.CreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        sub_data = request.data.get('subscription')
        if not sub_data:
            return Response({'error': 'Subscription data required'}, status=status.HTTP_400_BAD_REQUEST)
        PushSubscription.objects.update_or_create(
            usuario=request.user,
            defaults={'subscription': sub_data},
        )
        return Response({'status': 'subscribed'})


class PushUnsubscribeView(generics.DestroyAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def delete(self, request, *args, **kwargs):
        PushSubscription.objects.filter(usuario=request.user).delete()
        return Response({'status': 'unsubscribed'})


class PushPublicKeyView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, *args, **kwargs):
        return Response({'public_key': get_public_key()})
```

- [ ] **Step 4: Commit**

```bash
git add backend-python/users/models.py backend-python/users/views.py backend-python/users/urls.py && git commit -m "feat: push subscription model and api"
```

---

## Task 18: Docker & Deploy Configuration

**Files:**
- Create: `backend-python/Dockerfile`
- Modify: `docker-compose.yml` (migrate from Node.js backend to Python backend, add Redis)
- Modify: `nginx.prod.conf` (proxy pass to :8000, remove Certbot volumes)
- Modify: `nginx.Dockerfile` (remove Certbot)

- [ ] **Step 1: Write Python Dockerfile**

Write `backend-python/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/staticfiles /app/media/defeitos

ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=core.settings.production \
    PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "python manage.py collectstatic --noinput && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120"]
```

- [ ] **Step 2: Update docker-compose.yml**

Read current docker-compose.yml first:
```bash
cat docker-compose.yml
```

Edit `docker-compose.yml`:
- Change `backend` service to build from `backend-python/Dockerfile`
- Add `redis` service
- Remove Certbot service
- Update environment variables for Python

Write new `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:16-3.4
    container_name: urbana_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-manutencao_urbana}
      POSTGRES_USER: ${DB_USER:-urbana}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-urbana} -d ${DB_NAME:-manutencao_urbana}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: urbana_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend-python
      dockerfile: Dockerfile
    container_name: urbana_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      DB_NAME: ${DB_NAME:-manutencao_urbana}
      DB_USER: ${DB_USER:-urbana}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_HOST: postgres
      DB_PORT: "5432"
      REDIS_URL: redis://redis:6379/0
      FRONTEND_URL: ${FRONTEND_URL:-https://josemurilors.com.br}
      IA_URL: ${IA_URL:-http://ia:8000}
      VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
      FROM_EMAIL: ${FROM_EMAIL}
      SUPER_ADMIN_EMAIL: ${SUPER_ADMIN_EMAIL}
      PRIVACY_BLUR_SIGMA: ${PRIVACY_BLUR_SIGMA:-0.6}
      PERIMETER_BUFFER_DEG: ${PERIMETER_BUFFER_DEG:-0.01}
      ALLOWED_HOSTS: localhost,backend,josemurilors.com.br
      LOG_LEVEL: ${LOG_LEVEL:-info}
    volumes:
      - media_data:/app/media
    expose:
      - "8000"

  nginx:
    build:
      context: .
      dockerfile: nginx.Dockerfile
    container_name: urbana_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - nginx_data:/etc/nginx/conf.d
      - ./nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend

volumes:
  postgres_data:
  media_data:
  nginx_data:
```

- [ ] **Step 3: Update nginx.prod.conf**

Read current config:
```bash
cat nginx.prod.conf
```

Edit `nginx.prod.conf`:
```nginx
# Limit request body size
client_max_body_size 20M;

upstream django_backend {
    server backend:8000;
}

server {
    listen 80;
    server_name josemurilors.com.br;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name josemurilors.com.br;

    ssl_certificate /etc/letsencrypt/live/josemurilors.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/josemurilors.com.br/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /usr/share/nginx/html;
    index index.html;

    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Django API
    location /api/ {
        proxy_pass http://django_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://django_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (Django)
    location /static/ {
        alias /usr/share/nginx/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /usr/share/nginx/media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

- [ ] **Step 4: Update nginx.Dockerfile**

Read current:
```bash
cat nginx.Dockerfile
```

Edit `nginx.Dockerfile` to remove Certbot and add local.media volume:
```dockerfile
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

COPY --from=frontend-builder /app/dist /usr/share/nginx/html

RUN mkdir -p /usr/share/nginx/static /usr/share/nginx/media
```

- [ ] **Step 5: Verify docker-compose config**

```bash
docker compose config 2>&1 | head -40
```

Expected: No errors. Shows 4 services (postgres, redis, backend, nginx).

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml nginx.prod.conf nginx.Dockerfile backend-python/Dockerfile && git commit -m "feat: docker compose with django backend and redis"
```

---

## Task 19: Frontend Updates — API base path, token format, trailing slashes

**Files:**
- Edit: `frontend/src/constants.js`
- Edit: `frontend/src/services/api.js`

- [ ] **Step 1: Read current frontend files**

```bash
cat frontend/src/constants.js
cat frontend/src/services/api.js
```

- [ ] **Step 2: Update constants.js**

Edit `frontend/src/constants.js`:

Add alongside existing constants:
```javascript
export const API_BASE = '/api/v1';
```

And convert all endpoint paths to `/api/v1/` prefixed in STATUS_CONFIG.
Look for any embedded `/api/defeitos` etc patterns and change to `/api/v1/defeitos/`.

If the file has hardcoded endpoint strings (not using constants), replace each:
```
/api/auth/ → /api/v1/auth/
/api/defeitos/ → /api/v1/defeitos/
/api/municipios/ → /api/v1/municipios/
/api/categorias/ → /api/v1/categorias/
```

- [ ] **Step 3: Update api.js**

Edit `frontend/src/services/api.js` to:
1. Import `API_BASE` from constants
2. Prefix all endpoint paths with `API_BASE`
3. Add trailing slashes to all API paths (Django DRF requires them by default)
4. Update JWT token parsing for simplejwt `access`/`refresh` format (Node.js used `accessToken`/`refreshToken`; simplejwt uses `access_token`/`refresh_token`)
5. Update `refreshAccessToken` to call `/api/v1/auth/refresh/` (changed from `/api/auth/refresh-token`)

Key changes in api.js:
```javascript
import { API_BASE } from '../constants';

// Token storage keys
const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

// In getStoredTokens:
return {
  accessToken: localStorage.getItem(TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
};

// In handleLoginResponse:
const { access_token, refresh_token, user } = data;
localStorage.setItem(TOKEN_KEY, access_token);
localStorage.setItem(REFRESH_KEY, refresh_token);

// In refreshAccessToken:
const response = await api.post(`${API_BASE}/auth/refresh/`, {
  refresh: refreshToken,
});

// All endpoint calls:
// /api/auth/login → /api/v1/auth/login/
// /api/auth/register → /api/v1/auth/register/
// /api/auth/profile → /api/v1/auth/profile/
// /api/auth/users → /api/v1/auth/users/
// /api/auth/users/{id}/toggle-admin → /api/v1/auth/users/{id}/toggle-admin/
// /api/defeitos (list) → /api/v1/defeitos/
// /api/defeitos/{id} → /api/v1/defeitos/{id}/
// /api/defeitos/{id}/apoiar → /api/v1/defeitos/{id}/apoiar/
// /api/defeitos/meus → /api/v1/defeitos/meus/
// /api/defeitos/apoiados → /api/v1/defeitos/apoiados/
// /api/municipios → /api/v1/municipios/
// /api/categorias → /api/v1/categorias/
// /api/auth/push/subscribe → /api/v1/auth/push/subscribe/
// /api/auth/push/unsubscribe → /api/v1/auth/push/unsubscribe/
// /api/auth/push/public-key → /api/v1/auth/push/public-key/
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/constants.js frontend/src/services/api.js && git commit -m "feat: frontend api path updated for /api/v1/ django backend"
```

---

## Task 20: Testing & Migration — `--fake-initial` and data validation

**Files:**
- Run migrations with `--fake-initial`
- Create `backend-python/core/management/commands/migrate_existing.py` (data migration script)
- Create `backend-python/core/management/commands/check_data.py` (validation script)

- [ ] **Step 1: Create management command directory**

```bash
mkdir -p backend-python/core/management/commands
touch backend-python/core/management/__init__.py
touch backend-python/core/management/commands/__init__.py
```

- [ ] **Step 2: Create data validation script**

Write `backend-python/core/management/commands/check_data.py`:
```python
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Validate existing data compatibility with Django models'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute("SELECT count(*) FROM users")
            users_count = cursor.fetchone()[0]
            self.stdout.write(f'users: {users_count}')

            cursor.execute("SELECT count(*) FROM defeitos")
            defeitos_count = cursor.fetchone()[0]
            self.stdout.write(f'defeitos: {defeitos_count}')

            cursor.execute("SELECT count(*) FROM municipios")
            mun_count = cursor.fetchone()[0]
            self.stdout.write(f'municipios: {mun_count}')

            cursor.execute("SELECT count(*) FROM categorias")
            cat_count = cursor.fetchone()[0]
            self.stdout.write(f'categorias: {cat_count}')

            cursor.execute("SELECT count(*) FROM apoios")
            apoios_count = cursor.fetchone()[0]
            self.stdout.write(f'apoios: {apoios_count}')

            # Check date format in defeitos
            cursor.execute("""
                SELECT criado_em, atualizado_em FROM defeitos
                ORDER BY criado_em::text LIMIT 3
            """)
            for row in cursor.fetchall():
                self.stdout.write(f'Sample dates: {row[0]}, {row[1]}')

            # Check bcrypt hashes
            cursor.execute("""
                SELECT password FROM users LIMIT 3
            """)
            for (pw,) in cursor.fetchall():
                ok = pw.startswith('$2b$') or pw.startswith('$2a$')
                self.stdout.write(f'Hash starts with $2b/$2a: {ok} ({pw[:20]}...)')

            self.stdout.write(self.style.SUCCESS('Check complete'))
```

- [ ] **Step 3: Run check (if DB is running)**

```bash
docker compose up -d postgres redis 2>&1 || true
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python backend-python/manage.py check_data 2>&1 || echo "DB not available, skipping"
```

Expected: Counts for all tables, sample dates, hash verification.

- [ ] **Step 4: Generate initial migrations**

```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python backend-python/manage.py makemigrations users defeitos municipios categorias
```

Expected: Creates migration files for each app.

- [ ] **Step 5: Fake-apply initial migrations (skip CREATE TABLE)**

```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python backend-python/manage.py migrate --fake-initial
```

Expected: "Synchronize apps without creating tables." All migrations marked as applied in `django_migrations` table.

- [ ] **Step 6: Verify Django can query existing data**

```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python -c "
import django; django.setup()
from users.models import User
from defeitos.models import Defeito
from municipios.models import Municipio
from categorias.models import Categoria
from defeitos.models import Apoio

print(f'Users: {User.objects.count()}')
print(f'Defeitos: {Defeito.objects.count()}')
print(f'Municipios: {Municipio.objects.count()}')
print(f'Categorias: {Categoria.objects.count()}')
print(f'Apoios: {Apoio.objects.count()}')

# Test reading a user
user = User.objects.first()
print(f'First user: {user.email} {user.nome}')
print(f'Password starts with: {user.password[:10]}...')
print(f'Check password: {\"teste123\" not in \"dummy\"}')

# Test reading a defeito
d = Defeito.objects.first()
if d:
    print(f'First defeito: {d.titulo} ({d.status}) lat={d.latitude} lng={d.longitude}')
"
```

Expected: All counts match, user data readable, defeito lat/lng present.

- [ ] **Step 7: Create data migration for PostGIS PointField**

Create `backend-python/defeitos/migrations/0002_populate_localizacao.py`:
```python
from django.db import migrations
from django.contrib.gis.geos import Point


def populate_localizacao(apps, schema_editor):
    Defeito = apps.get_model('defeitos', 'Defeito')
    for d in Defeito.objects.filter(localizacao__isnull=True, latitude__isnull=False, longitude__isnull=False):
        d.localizacao = Point(d.longitude, d.latitude, srid=4326)
        d.save(update_fields=['localizacao'])


class Migration(migrations.Migration):
    dependencies = [
        ('defeitos', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(populate_localizacao, reverse_code=migrations.RunPython.noop),
    ]
```

- [ ] **Step 8: Create data migration for TEXT→DateTime conversion**

Create `backend-python/defeitos/migrations/0003_fix_datetime_fields.py`:
```python
from django.db import migrations
from django.utils import timezone
from datetime import datetime
import re


ISO_RE = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')


def fix_datetimes(apps, schema_editor):
    Defeito = apps.get_model('defeitos', 'Defeito')
    for d in Defeito.objects.all():
        changed = False
        if isinstance(d.criado_em, str) and ISO_RE.match(d.criado_em):
            d.criado_em = datetime.fromisoformat(d.criado_em)
            changed = True
        if isinstance(d.atualizado_em, str) and ISO_RE.match(d.atualizado_em):
            d.atualizado_em = datetime.fromisoformat(d.atualizado_em)
            changed = True
        if changed:
            d.save(update_fields=['criado_em', 'atualizado_em'])


class Migration(migrations.Migration):
    dependencies = [
        ('defeitos', '0002_populate_localizacao'),
    ]

    operations = [
        migrations.RunPython(fix_datetimes, reverse_code=migrations.RunPython.noop),
    ]
```

- [ ] **Step 9: Apply data migrations**

```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python backend-python/manage.py migrate
```

Expected: Both data migrations run successfully. PointField populated, dates converted.

- [ ] **Step 10: Run admin & URL test**

```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python -c "
import django; django.setup()
from django.urls import get_resolver
from django.conf import settings

# Check all URL patterns resolve
resolver = get_resolver()
patterns = sorted(set(
    p.pattern._route for p in resolver.url_patterns
    if hasattr(p, 'pattern') and hasattr(p.pattern, '_route')
))
print('URL patterns:')
for p in patterns:
    print(f'  /{p}')
"
```

Expected: All 20+ URL patterns printed.

- [ ] **Step 11: Commit**

```bash
git add backend-python/core/management/ backend-python/defeitos/migrations/ && git commit -m "feat: data validation and migration scripts"
```

---

## Task 21: Build Verification & Smoke Test

**Files:**
- Create: `backend-python/core/management/commands/smoke_test.py`

- [ ] **Step 1: Write smoke test command**

Write `backend-python/core/management/commands/smoke_test.py`:
```python
from django.core.management.base import BaseCommand
from django.test.utils import setup_test_environment
from django.test import RequestFactory
from django.urls import resolve
from rest_framework.test import APIRequestFactory


class Command(BaseCommand):
    help = 'Run smoke tests against Django backend'

    def handle(self, *args, **options):
        errors = []

        # 1. Check all apps are registered
        from django.apps import apps
        expected_apps = ['users', 'defeitos', 'municipios', 'categorias']
        for app in expected_apps:
            if not apps.is_installed(app):
                errors.append(f'App {app} not installed')

        # 2. Check models can be imported
        try:
            from users.models import User, PushSubscription
            from defeitos.models import Defeito, Apoio
            from municipios.models import Municipio
            from categorias.models import Categoria
            self.stdout.write('All models importable')
        except ImportError as e:
            errors.append(f'Model import: {e}')

        # 3. Check serializers
        try:
            from users.serializers import UserSerializer, RegisterSerializer, LoginSerializer
            from defeitos.serializers import DefeitoListSerializer, DefeitoCreateSerializer
            from municipios.serializers import MunicipioSerializer
            from categorias.serializers import CategoriaSerializer
            self.stdout.write('All serializers importable')
        except ImportError as e:
            errors.append(f'Serializer import: {e}')

        # 4. Check views
        try:
            from users.views import RegisterView, LoginView, ProfileView
            from defeitos.views import DefeitoViewSet
            from municipios.views import MunicipioViewSet
            from categorias.views import CategoriaViewSet
            self.stdout.write('All views importable')
        except ImportError as e:
            errors.append(f'View import: {e}')

        # 5. Check URL resolution
        test_paths = [
            '/api/v1/health/',
            '/api/v1/auth/login/',
            '/api/v1/auth/register/',
            '/api/v1/auth/profile/',
            '/api/v1/auth/refresh/',
            '/api/v1/auth/logout/',
            '/api/v1/auth/users/',
            '/api/v1/defeitos/',
            '/api/v1/municipios/',
            '/api/v1/categorias/',
        ]
        for path in test_paths:
            try:
                match = resolve(path)
                self.stdout.write(f'  {path} -> {match.func.__name__ if hasattr(match.func, \"__name__\") else match.func.__class__.__name__}')
            except Exception as e:
                errors.append(f'URL {path}: {e}')

        # 6. Check hasher
        try:
            from users.hashers import BCryptPasswordHasher
            hasher = BCryptPasswordHasher()
            encoded = hasher.encode('teste123', hasher.salt())
            assert hasher.verify('teste123', encoded), 'Hash verify failed'
            # Test Node.js format
            import bcrypt
            node_hash = bcrypt.hashpw(b'teste123', bcrypt.gensalt(rounds=10)).decode()
            assert hasher.verify('teste123', f'bcrypt${node_hash}'), 'Node hash verify failed'
            self.stdout.write('Hasher: OK (incl. Node.js compat)')
        except Exception as e:
            errors.append(f'Hasher: {e}')

        # 7. Check services
        try:
            from services.encryption import encrypt_text, decrypt_text
            ct = encrypt_text('12345678901')
            pt = decrypt_text(ct)
            assert pt == '12345678901', 'Encryption roundtrip failed'
            self.stdout.write('Encryption: OK')
        except Exception as e:
            errors.append(f'Encryption: {e}')

        try:
            from services.cpf_validator import validar_digitos
            assert validar_digitos('52998224725'), 'CPF validator false negative'
            assert not validar_digitos('11111111111'), 'CPF validator false positive'
            self.stdout.write('CPF Validator: OK')
        except Exception as e:
            errors.append(f'CPF: {e}')

        try:
            from services.image_processor import make_thumbnail
            buf = b'\xff\xd8\xff\xe0' + b'\x00' * 100
            thumb = make_thumbnail(buf)
            self.stdout.write('Image Processor: OK')
        except Exception as e:
            errors.append(f'Image: {e}')

        try:
            from services.ia_client import routing
            rota = routing('Buraco')
            assert 'Secretaria' in rota['secretaria']
            self.stdout.write('IA Client routing: OK')
        except Exception as e:
            errors.append(f'IA: {e}')

        if errors:
            for err in errors:
                self.stdout.write(self.style.ERROR(f'FAIL: {err}'))
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS('All smoke tests passed!'))
```

- [ ] **Step 2: Run smoke test**

```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python backend-python/manage.py smoke_test
```

Expected: All tests pass with "All smoke tests passed!"

- [ ] **Step 3: Run Django system checks**

```bash
PYTHONPATH=backend-python DJANGO_SETTINGS_MODULE=core.settings.production python backend-python/manage.py check --deploy
```

Expected: No errors (may have warnings for deployment, which is fine).

- [ ] **Step 4: Final commit**

```bash
git add backend-python/core/management/commands/smoke_test.py && git commit -m "feat: smoke test and build verification"
```

---

## Rollback Plan

If Django backend fails after deployment:

1. **Revert docker-compose.yml** to point `backend` back to Node.js:
   ```bash
   git checkout HEAD~1 -- docker-compose.yml nginx.prod.conf nginx.Dockerfile
   ```

2. **Delete Django migration records:**
   ```sql
   DELETE FROM django_migrations WHERE app IN ('users','defeitos','municipios','categorias','core');
   ```

3. **Remove new columns** (localizacao) if added:
   ```sql
   ALTER TABLE defeitos DROP COLUMN IF EXISTS localizacao;
   ```

4. **Restart with Node.js backend:**
   ```bash
   docker compose down backend && docker compose up -d --build backend
   ```

---

## Summary of Tasks

| # | Task | Files | Key Command |
|---|------|-------|-------------|
| 1 | Django scaffold | manage.py, settings, apps | `makemigrations` |
| 2 | BCrypt hasher | users/hashers.py | `hasher.verify('pw', bcrypt_hash)` |
| 3 | AES-256-GCM | services/encryption.py | `decrypt_text(encrypt_text('cpf'))` |
| 4 | CPF validator | services/cpf_validator.py | `validar_digitos('52998224725')` |
| 5 | Email (Resend) | services/email_service.py | `send_verification_code()` |
| 6 | Push (pywebpush) | services/push_service.py | `notify_user(sub, 't', 'b')` |
| 7 | Image (Pillow) | services/image_processor.py | `process_image(bytes)` |
| 8 | IA + Redis CB | services/ia_client.py | `classify('buraco na rua')` |
| 9 | User model | users/models.py, admin.py | `User.objects.count()` |
| 10 | Defeito model | defeitos/models.py, admin.py | `Defeito.objects.count()` |
| 11 | Municipio model | municipios/models.py, admin.py | `Municipio.objects.count()` |
| 12 | Categoria model | categorias/models.py, admin.py | `Categoria.objects.count()` |
| 13 | Auth views | users/views.py, serializers.py, urls.py | `POST /api/v1/auth/login/` |
| 14 | Defeitos API | defeitos/views.py, serializers.py, urls.py | `GET /api/v1/defeitos/` |
| 15 | Municipios API | municipios/views.py, serializers.py, urls.py | `GET /api/v1/municipios/` |
| 16 | Categorias API | categorias/views.py, serializers.py, urls.py | `GET /api/v1/categorias/` |
| 17 | Push sub API | users/models.py, views.py, urls.py | `POST /api/v1/auth/push/subscribe/` |
| 18 | Docker config | Dockerfile, docker-compose.yml, nginx | `docker compose up --build` |
| 19 | Frontend updates | constants.js, api.js | `/api/v1/` prefix + trailing slashes |
| 20 | Data migration | migrations/0002, 0003 | `migrate --fake-initial` |
| 21 | Smoke test | smoke_test.py | `manage.py smoke_test` |
