# Django Migration Design — Central de Inteligência Urbana

**Date:** 2026-05-17
**Author:** José Murilo Rodrigues Sabalo
**Status:** Approved

## §G — Goals

Migrate backend from Node.js/Express 5 to Python/Django 5.x to eliminate database-related bugs caused by raw SQL, manual ORM, and lack of schema migrations.

## §C — Constraints

1. Big Bang migration — rewrite entire backend, switch at once
2. API evolves to `/api/v1/` (not identical contract)
3. Frontend React adapts to new endpoints once
4. Same PostgreSQL 16 + PostGIS 3.4 database (no data migration)
5. Docker Compose orchestration unchanged

## §I — Implementation Strategy

### Architecture

```
NGINX (unchanged) → Django/Gunicorn :8000 → PostgreSQL 16 + PostGIS
                                    → Redis (circuit breaker + cache)
                                    → IA container (unchanged, FastAPI)
```

### Django Apps

| App | Responsibility | Endpoints |
|---|---|---|
| `users` | Auth, JWT, 2FA, CPF, push subs | `/api/v1/auth/*` |
| `defeitos` | CRUD, uploads, clusters, apoios, IA | `/api/v1/defeitos/*` |
| `municipios` | IBGE seed, perimeter validation | `/api/v1/municipios/*` |
| `categorias` | Seed, SLA, list | `/api/v1/categorias/*` |
| `core` | Settings, URLs, health, admin | `/api/v1/health`, `/admin/` |

### Services

| Service | Libraries | Purpose |
|---|---|---|
| `encryption.py` | `cryptography` | AES-256-GCM (CPF) + SHA-256 HMAC |
| `cpf_validator.py` | `requests` | Digit validation + BrasilAPI |
| `ia_client.py` | `httpx` | Circuit breaker (Redis) + proxy to IA container |
| `email_service.py` | `requests` + `resend` | Verification codes, 2FA |
| `push_service.py` | `pywebpush` | Web Push VAPID |
| `image_processor.py` | `Pillow` | WebP compress, thumbnail 200px, gaussian blur σ=0.6 |

### API Contract (`/api/v1/`)

| Node.js (old) | Django (new) | Changes |
|---|---|---|
| `POST /api/auth/registro` | `POST /api/v1/auth/register/` | snake_case → kebab, trailing slash |
| `POST /api/auth/login` | `POST /api/v1/auth/login/` | Trailing slash, simplejwt response |
| `GET /api/defeitos` | `GET /api/v1/defeitos/` | Trailing slash, DRF pagination |
| `POST /api/defeitos` | `POST /api/v1/defeitos/` | Same multipart format |
| `GET /api/auth/admin/estatisticas` | `GET /api/v1/admin/metrics/` | Dedicated endpoint |
| — | `GET /api/v1/admin/export/` | New CSV export |
| `GET /api/municipios` | `GET /api/v1/municipios/` | DRF ViewSet |
| `GET /api/categorias` | `GET /api/v1/categorias/` | DRF ViewSet |

### Security

| Mechanism | Implementation | DB Compat |
|---|---|---|
| Password hashing | `BCryptPasswordHasher` (salt=10) | ✅ Existing bcrypt hashes work |
| JWT | `djangorestframework-simplejwt`, same `JWT_SECRET` | ⚠️ Access+refresh token format |
| CSRF | Django Synchronizer Token (built-in) | ⚠️ Frontend sends `X-CSRFToken` |
| CPF encryption | `cryptography` AES-256-GCM | ✅ Same key, decrypts existing data |
| CPF hash | `hmac` + `hashlib.sha256` | ✅ Same key, same hash |
| Rate limiting | `django-ratelimit` (4 levels) | ✅ Same logic |
| 2FA | Resend API, 6-digit code | ✅ Same flow |
| Web Push | `pywebpush` VAPID | ✅ Same subscriptions |

### Models (GeoDjango)

```python
# users/models.py
User(AbstractBaseUser, PermissionsMixin):
    id: UUIDField(primary_key, default=uuid.uuid4)
    nome: CharField
    email: EmailField(unique)
    admin: BooleanField(default=False)
    municipio: ForeignKey('municipios.Municipio', null=True)
    cpf_encrypted: TextField(null=True)     # AES-256-GCM
    cpf_hash: CharField(unique, null=True)  # SHA-256 HMAC
    email_verificado: BooleanField(default=False)
    codigo_2fa: CharField(null=True)
    codigo_2fa_expira: DateTimeField(null=True)
    requests_reset_at: DateTimeField(null=True)
    requests_count: IntegerField(default=0)
    criado_em: DateTimeField(auto_now_add=True)
    atualizado_em: DateTimeField(auto_now=True)

# defeitos/models.py
class Defeito(models.Model):
    id: UUIDField(primary_key, default=uuid.uuid4)
    usuario: ForeignKey(User)
    titulo: CharField
    descricao: TextField(null=True)
    location: PointField(srid=4326, spatial_index=True, null=True)  # PostGIS
    rua: CharField(null=True)
    bairro: CharField(null=True)
    imagem_url: CharField(null=True)
    categoria: ForeignKey('categorias.Categoria', null=True)
    status: CharField(choices=STATUS_CHOICES, default='pendente')
    prioridade: CharField(choices=PRIORIDADE_CHOICES, default='media')
    previsao_conclusao: DateTimeField(null=True)
    atendido_em: DateTimeField(null=True)
    atendente: ForeignKey(User, null=True, related_name='defeitos_atendidos')
    imagem_thumbnail: BinaryField(null=True, editable=False)
    imagens_extra: JSONField(default=list)
    atualizacoes: JSONField(default=list)
    criado_em: DateTimeField(auto_now_add=True)
    atualizado_em: DateTimeField(auto_now=True)

class Apoio(models.Model):
    usuario: ForeignKey(User)
    defeito: ForeignKey(Defeito)
    criado_em: DateTimeField(auto_now_add=True)
    class Meta: unique_together = ('usuario', 'defeito')

# Note: Existing database stores dates as TEXT (ISO 8601 strings).
# Initial Django migration keeps criado_em/atualizado_em as DateTimeField
# and converts existing text dates via data migration (parse ISO → timestamp).
# Django saves DateTimeField as `timestamp with time zone` internally.

# municipios/models.py
class Municipio(models.Model):
    codigo: CharField(primary_key)          # IBGE 7 digits
    nome: CharField
    uf: CharField
    uf_sigla: CharField
    polygon_geom: MultiPolygonField(srid=4326, spatial_index=True)
    bounding_box: PolygonField(null=True)
    poligono_json: TextField(null=True)

# categorias/models.py
class Categoria(models.Model):
    nome: CharField(unique)
    icone: CharField(null=True)
    prioridade_base: CharField(default='media')
    prazo_sla_dias: IntegerField(default=7)
```

### Bugs Resolved

| Bug (Node.js) | How Django Fixes |
|---|---|
| NaN rate limit (case sensitivity) | ORM uses Python attributes, never raw column names |
| `JSON.parse([])` crash | `JSONField` handles lists natively |
| PostGIS Polygon vs MultiPolygon | `MultiPolygonField` is explicit at type level |
| Raw SQL injection risk | ORM parameterized queries always |
| Schema changes = manual SQL | `python manage.py makemigrations` auto-generates |

### Docker Compose Changes

```yaml
services:
  backend:
    build: backend-python/Dockerfile
    image: python:3.12-slim + libgdal-dev
    command: gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 4
    environment:
      - DJANGO_SETTINGS_MODULE=core.settings.production
      - DATABASE_URL=postgres://urbana:${DB_PASSWORD}@postgres:5432/manutencao_urbana
      - REDIS_URL=redis://redis:6379/0
      # Existing env vars kept: JWT_SECRET, ENCRYPTION_KEY, etc.
    depends_on:
      postgres: condition: service_healthy
      redis: condition: service_started

  redis:
    image: redis:7-alpine
    networks: [app-network]
    restart: unless-stopped
```

### Image Processing (Pillow)

```python
# Same pipeline as Sharp, different library
from PIL import Image, ImageFilter

def process_image(input_path):
    img = Image.open(input_path)
    # Blur for LGPD (sigma 0.6)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.6))
    # Resize max 1200px
    img.thumbnail((1200, 1200), Image.LANCZOS)
    # Save as WebP
    img.save(output_path, 'WEBP', quality=80)
    # Thumbnail 200px
    thumb = img.copy()
    thumb.thumbnail((200, 200), Image.LANCZOS)
    thumb.save(thumb_path, 'WEBP', quality=70)
```

### IA Circuit Breaker (Redis)

```python
import aioredis

class CircuitBreaker:
    KEY = 'ia:circuit:{name}'

    async def is_open(self, redis, name='main'):
        state = await redis.hgetall(self.KEY.format(name=name))
        if not state:
            return False
        failures = int(state.get('failures', 0))
        if failures >= 3:
            cooldown_until = float(state.get('cooldown_until', 0))
            if time.time() < cooldown_until:
                return True
            await redis.delete(self.KEY.format(name=name))
        return False
```

### Testing Strategy

1. **Automated:** pytest + DRF's APIClient tests comparing JSON shape between old and new endpoints
2. **Manual checklist:** Register, login, create defect, admin dashboard, 2FA, push notification
3. **CI:** Django tests run in GitHub Actions before deploy

### Frontend Changes

| File | Change |
|---|---|
| `frontend/src/constants.js` | `API_BASE` → `/api/v1` |
| `frontend/src/services/api.js` | Endpoint paths + trailing slashes |
| Auth logic | Parse `{access, refresh}` instead of single token |
| CSRF | `X-CSRFToken` header (Double Submit → Synchronizer Token) |

### Rollback

No formal plan. Troubleshoot as needed. Old Node.js Docker image stays available for immediate rebuild if necessary.

## §V — Invariants

V1: Existing bcrypt password hashes must authenticate after migration (BCryptPasswordHasher configured)
V2: Same ENCRYPTION_KEY decrypts existing CPF encrypted data
V3: Same JWT_SECRET validates existing tokens (until expiry)
V4: PostgreSQL database schema evolves via Django migrations, never manual SQL
V5: IA circuit breaker state persists in Redis (survives worker restart)
V6: All existing API endpoints remain functional at `/api/v1/` with evolved naming
V7: Every uploaded image passes through Pillow blur (sigma >= 0.6) before storage
V8: Frontend receives `{access, refresh}` token pair from simplejwt
