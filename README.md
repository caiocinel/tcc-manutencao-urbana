# Central de Inteligência Urbana (Urban Intelligence Center)

Full-stack PWA for reporting and managing urban infrastructure issues (potholes, broken lighting, damaged sidewalks, fallen trees, etc.). Citizens can submit photo + GPS reports; AI classifies and prioritizes automatically. Admin dashboard with heatmap and BI metrics. **Migrating from Node.js/Express to Python/Django 5.x.**

**Deployed at:** [tcc.josemurilors.com.br](https://tcc.josemurilors.com.br)
**Stack (current):** React 19 + Vite 8 + Node.js/Express 5 + PostgreSQL 16/PostGIS 3.4 + ONNX Runtime (Python)
**Stack (migrating to):** React 19 + Vite 8 + Django 5.x/DRF + PostgreSQL 16/PostGIS 3.4 + ONNX Runtime (Python)
**Infrastructure:** Hetzner (Nuremberg, Germany) — ARM64 CX11, 4GB RAM, 2 cores, 40GB NVMe

## Architecture

| Layer | Legacy | New (Django) |
|---|---|---|
| Frontend | React 19 + Vite 8 + Phosphor Icons + Framer Motion + Leaflet | React 19 + Vite 8 (unchanged) |
| Backend | Node.js + Express 5 (pg, pool 10 connections) | Django 5.x + DRF (Gunicorn) |
| Database | PostgreSQL 16 + PostGIS 3.4 (spatial queries) | PostgreSQL 16 + PostGIS (managed=False) |
| AI | ONNX Runtime (Python/FastAPI) — all-MiniLM-L6-v2 | ONNX Runtime (same, no change) |
| Maps | Leaflet + react-leaflet + leaflet.heat + CartoDB | Leaflet (unchanged) |
| Auth | JWT + bcrypt + CSRF Double Submit Cookie | simplejwt + BCryptPasswordHasher (compatible) |
| Security | Helmet, Rate Limiting (3 levels), AES-256-GCM | CSRF middleware, IsAuthenticated default, same encryption |
| Notifications | Web Push API (VAPID) | pywebpush (compatible) |
| Logger | Pino structured logging (Node.js) | Python logging (Django) |

## Features

- **Anonymous browsing** — view heatmap of defects without login (individual markers require login)
- **Citizen reporting** — photo + GPS + category with AI classification
- **AI classification** — ONNX embeddings (all-MiniLM-L6-v2) → 7 categories, spam detection, dedup, priority extraction
- **Duplicate detection** — spatial proximity (ST_DWithin ~1km) + semantic similarity (embedding cosine > 0.3)
- **Spam moderation** — automatic detection of short, generic, or repetitive descriptions
- **Smart routing** — category → responsible municipal secretary (e.g., Buraco → Obras, Iluminação → Serviços Urbanos)
- **Priority scoring** — keyword match (urgente/alta/media/baixa) extracted from description
- **Critical cluster alert** — 5+ same-category defects in 7-day window triggers notification
- **Weekly summary** — auto-generated report (totals, resolution rate, top category/bairro)
- **Circuit breaker** — 3 IA failures → 60s cooldown, timeout 3s, silent fallback
- **Admin dashboard** — KPI metrics, per-region controls, CSV export, bar/pie charts
- **Cluster map** — auto-grouping of nearby defects with batch actions, heatmap toggle
- **Upvote system** — citizen support for defects
- **Attachments** — text/image updates on open defects
- **User management** — CPF validation (BrasilAPI), admin hierarchy, email verification
- **Push notifications** — Web Push API with VAPID keys
- **Dark/light theme** — respects system preference, manual toggle, persisted in localStorage
- **Keyboard navigation** — `g + key` shortcuts (m=map, a=admin, d=dashboard, t=theme, ?=help)
- **Accessibility** — WCAG AA: aria-labels, skip-link, keyboard navigation, focus-visible, combobox, live regions
- **Responsive** — mobile-first with bottom sheets, hamburger menu <768px
- **PWA** — service worker with cache-first for static assets, manifest with splash screen
- **Privacy** — Gaussian blur on all uploaded photos to protect faces and license plates (configurable sigma)
- **GPS tolerance** — perimeter validation with ST_Buffer (~1km) + bounding box fallback for city border GPS errors

## Migration Status

The Django backend (`backend-python/`) is in parallel development — same database, same frontend, same API contract. Switch-over planned after full test coverage.

| Component | Status | Notes |
|---|---|---|
| Project scaffold | ✅ Complete | 5 apps (users, defeitos, municipios, categorias, core) |
| BCryptPasswordHasher | ✅ Complete | Compatible with existing Node.js bcrypt hashes |
| Encryption service | ✅ Complete | AES-256-GCM, same `iv:tag:data` hex format |
| Auth (register/login) | ✅ Complete | simplejwt + email verification |
| Defeitos CRUD | ✅ Complete | PostGIS PointField + filters |
| Admin endpoints | ✅ Complete | SuperAdmin + VinculateMunicipio |
| Frontend integration | ✅ Complete | api.js updated for `/api/v1/` prefix |
| Docker + Redis | ✅ Complete | Gunicorn + django-ratelimit |
| Nginx config | ✅ Complete | Proxy to :8000 |
| Testes | 🔄 In progress | pytest + conftest |
| Switch to production | ⏳ Pending | Cutover from Node.js to Django |

## Quick Start (Development)

```bash
# 1. Clone
git clone git@github.com:josemurilors/tcc-manutencao-urbana.git
cd tcc-manutencao-urbana

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env: JWT_SECRET, ENCRYPTION_KEY, DB_PASSWORD, etc.

# 3. Start database (legacy backend + PostGIS)
docker compose -f docker-compose.host.yml up -d --build postgres

# 4. Run PostGIS migration
docker compose -f docker-compose.host.yml exec postgres \
  psql -U urbana -d manutencao_urbana -f /scripts/migration-postgis.sql

# 5. Seed municipality data (IBGE)
docker compose -f docker-compose.host.yml exec backend \
  node scripts/seed-municipios.js

# 6. (Optional) Start Django backend
docker compose -f docker-compose.dev.yml up -d backend-python redis

# 7. (Optional) Start IA service
docker compose -f docker-compose.host.yml --profile ia up -d

# 8. Frontend dev server
cd frontend && npm run dev
```

## Quick Start (Production)

```bash
# 1. Clone on VPS
git clone git@github.com:josemurilors/tcc-manutencao-urbana.git
cd tcc-manutencao-urbana

# 2. Configure environment
cp .env.production backend/.env
# Edit backend/.env with production secrets

# 3. Build full stack (legacy Node.js)
docker compose up -d --build

# 4. Run PostGIS migration
docker compose exec -T postgres psql -U urbana -d manutencao_urbana \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker compose exec -T postgres psql -U urbana -d manutencao_urbana -c "
  ALTER TABLE municipios ADD COLUMN IF NOT EXISTS polygon_geom geometry(MultiPolygon, 4326);
  CREATE INDEX IF NOT EXISTS idx_municipios_polygon_geom ON municipios USING GIST (polygon_geom);
  ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED;
  CREATE INDEX IF NOT EXISTS idx_defeitos_geom ON defeitos USING GIST (geom);"

# 5. Seed IBGE municipalities (5571 cities, first time only)
docker compose exec -T backend node seed-municipios-ibge.js

# 6. SSL certificate (first time)
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot -d tcc.josemurilors.com.br

# 7. Verify health
curl https://tcc.josemurilors.com.br/api/health
```

## Project Structure

```
tcc-manutencao-urbana/
├── backend/                       # Node.js + Express API (legacy)
│   ├── index.js
│   ├── src/
│   │   ├── routes/                # auth, defeitos, categorias, municipios, ia
│   │   ├── models/                # User, Defeito, Apoio (knex-based)
│   │   ├── middleware/            # csrf, imageProcessor, rateLimit, validate
│   │   ├── services/              # ia, email (Resend), encryption, push, logger
│   │   ├── validation/            # Zod schemas (auth, defeitos, admin)
│   │   └── config/                # database.js (pg pool + schema init)
│   └── scripts/                   # migration-postgis.sql, seed-municipios.js
├── backend-python/                # Django 5.x API (migration target)
│   ├── core/                      # Django project (settings, urls, wsgi)
│   │   ├── settings/
│   │   │   ├── base.py            # Shared settings (DB, CORS, CSRF, DRF)
│   │   │   ├── production.py      # Prod overrides (HSTS, SSL, sentry)
│   │   │   └── ...
│   ├── apps/
│   │   ├── users/                 # User model, auth views, serializers
│   │   ├── defeitos/              # Defeito model (PostGIS), CRUD views
│   │   ├── municipios/            # Municipio model (PostGIS), lookup
│   │   ├── categorias/            # Category model, listing
│   │   └── core/                  # Health, CSRF, shared utilities
│   ├── services/                  # Encryption, CPF, email, push, IA client
│   ├── requirements.txt           # Django + DRF + psycopg + Pillow
│   ├── entrypoint.sh              # Migrate + collectstatic + gunicorn
│   └── Dockerfile                 # Multi-stage: builder → slim (~200MB)
├── frontend/                      # React + Vite SPA
│   ├── src/
│   │   ├── pages/                 # MapPage, Login, Register, AdminDashboard, DefectList
│   │   ├── components/            # Header, UserMenu, Toast, Heatmap, SearchableSelect
│   │   ├── context/               # AuthContext, ThemeContext
│   │   ├── services/              # api.js (HTTP client w/ fetch + CSRF)
│   │   ├── styles/                # tokens.css (design system), App.css
│   │   ├── hooks/                 # useKeyboardNav
│   │   └── assets/
│   └── sw.js                      # Service worker (Vite injectManifest)
├── ia/                            # AI classification (Python/FastAPI/ONNX)
│   ├── main.py                    # FastAPI app (6 endpoints)
│   ├── inference.py               # ONNX embedding + centroid similarity
│   ├── models/                    # model download scripts
│   └── Dockerfile                 # Multi-stage: builder → runtime (~200MB)
├── scripts/                       # backup-postgres.sh, zram-setup.sh
├── .github/workflows/             # deploy.yml (CI/CD: lint + build + deploy)
├── docker-compose.yml             # Production stack (postgres + backend + nginx + ia)
├── docker-compose.host.yml        # Host-mode dev stack (no Nginx)
├── docker-compose.dev.yml         # Django dev stack (Redis + backend-python)
├── nginx.prod.conf                # Nginx prod config (SSL, proxy, cache)
├── nginx.host.conf                # Nginx dev config
├── nginx.Dockerfile               # Nginx with pre-built frontend
├── SPEC.md                        # Project spec (caveman encoded)
├── doc.md                         # Detailed docs (migration, architecture, audit)
└── .env.production                # Environment template (not versioned)
```

## API Endpoints

### Authentication
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register with CPF and municipality |
| POST | `/api/auth/login` | — | Login (returns JWT + user) |
| POST | `/api/auth/validate-cpf` | — | Validate CPF via BrasilAPI |
| PATCH | `/api/auth/password` | JWT | Change password |
| POST | `/api/auth/verify-email` | JWT | Verify email with code |
| POST | `/api/auth/resend-code` | JWT | Resend verification code |
| GET | `/api/auth/push/key` | — | VAPID public key |
| POST | `/api/auth/push/subscribe` | JWT | Save push subscription |
| GET | `/api/auth/admin/users` | Admin | List all users |
| GET | `/api/auth/admin/statistics` | Admin | Dashboard metrics |
| PATCH | `/api/auth/admin/users/:id` | Admin | Update user |
| PATCH | `/api/auth/admin/users/:id/admin` | Super | Promote/remove admin |

### Defeitos
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/defeitos` | — | List all (paginated, with support count) |
| GET | `/api/defeitos/meus` | JWT | List user's own defects |
| GET | `/api/defeitos/clusters` | — | GeoJSON clustered for map |
| GET | `/api/defeitos/:id` | — | Full detail with attachments |
| POST | `/api/defeitos` | JWT | Create (photo + desc + GPS → IA classify) |
| POST | `/api/defeitos/:id/support` | JWT | Toggle upvote |
| PATCH | `/api/defeitos/:id` | Admin | Update status/priority/secretaria |
| PATCH | `/api/defeitos/:id/attach` | JWT | Attach image/text update |
| POST | `/api/defeitos/batch-close` | Admin | Batch close by IDs |
| GET | `/api/defeitos/vinculados` | Admin | List defects with assigned attendant |

### Django API (v1, in migration)
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register/` | — | Django register endpoint |
| POST | `/api/v1/auth/login/` | — | Django login endpoint |
| GET | `/api/v1/auth/profile/` | JWT | Django profile endpoint |
| GET/PATCH | `/api/v1/defeitos/` | varied | Django defeitos CRUD |
| GET/POST | `/api/v1/municipios/` | varied | Django municipios lookup |
| GET | `/api/v1/categorias/` | — | Django categories |
| GET | `/api/health/django/` | — | Django health check |
| GET | `/api/v1/admin/vinculate/` | Super| Django vincular municípios |
| GET | `/api/v1/admin/super/users/` | Super| Django user management |

### IA Service (port 8000 — ONNX Runtime)
| Method | Route | Description |
|---|---|---|
| POST | `/classify` | Text → category + confidence |
| POST | `/classify-full` | Category + priority + spam + routing |
| POST | `/classify-image` | Image base64 → category |
| POST | `/text-similarity` | Cosine similarity score |
| POST | `/summarize` | Weekly summary |
| GET | `/health` | Model loading status |

### Support
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/categorias` | — | List categories with metadata |
| GET | `/api/municipios` | — | List municipalities (name, uf, polygon) |
| GET | `/api/csrf-token` | — | CSRF double-submit cookie |
| GET | `/api/health` | — | Health check (db, ia, uptime) |

## Security

- **Passwords:** bcrypt hashing (salt rounds = 10); Django BCryptPasswordHasher compatible with existing hashes
- **JWT:** 24h expiration, payload `{ userId, email, admin, municipio_id }`, 256-bit secret
- **CPF:** AES-256-GCM encrypted at rest + SHA-256 HMAC for unique lookups
- **CSRF:** Double Submit Cookie (Node.js); Django CsrfViewMiddleware with SameSite=Strict (Django)
- **DRF Default:** `IsAuthenticated` — all endpoints locked by default; public ones explicitly use `AllowAny`
- **Rate Limiting:** 4 levels — global (200/15min), auth (20/15min), API (200/h), per-user (10/h); Django side uses `django-ratelimit` + Redis circuit breaker
- **Helmet:** Security headers (CSP relaxed for Leaflet CDN tiles)
- **HSTS/SSL:** Enforced in production settings (Django `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`)
- **Non-root user:** Django Docker container runs as `django` (uid 1001)
- **Upload validation:** Sharp compress to WebP 1200px max, whitelist (JPEG/PNG/WebP/AVIF), 5MB limit
- **IA Circuit Breaker:** 3 failures → 60s cooldown, never blocks defect creation
- **Validation:** Zod schemas (Node.js); DRF serializers (Django) on all inputs
- **2FA:** Optional TOTP-based two-factor authentication
- **Encryption key:** AES-256-GCM (32 bytes / 64 hex chars), generated via `openssl rand -hex 32`

## PostGIS & Geoespacial

PostgreSQL 16 with PostGIS 3.4 extension for all spatial operations:

- **`municipios.polygon_geom`** — MultiPolygon(4326) from IBGE GeoJSON (5570 municipalities, ~120MB)
- **`defeitos.geom`** — Generated always as `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`
- **Perimeter validation:** `ST_Within(point, polygon_geom)` — defect must be inside user's municipality
- **Duplicate detection:** `ST_DWithin(geom, 0.01)` (~1km radius) + embedding similarity > 0.3
- **Migration:** `backend/scripts/migration-postgis.sql` with `run-migration.js` wrapper

## AI Classification Pipeline

```
User input → Tokenize (BERT tokenizer) → all-MiniLM-L6-v2 (ONNX)
  → Mean pooling → L2 normalize → Cosine similarity × 7 centroids
  → Softmax(t=3.0) → Category + confidence
```

- **Model:** `sentence-transformers/all-MiniLM-L6-v2` (384-dim embeddings, ~90MB)
- **Fallback:** Keyword classifier activates if ONNX fails to load or IA container is down
- **Categories:** Buraco, Iluminação, Semáforo, Árvore Caída, Entulho, Calçada Danificada, Outro
- **Image:** MobileNetV3-small feature extractor (576-dim) — requires fine-tuning for classification
- **Duplicate detection:** `ST_DWithin(geom, 0.01)` (~1km) + embedding cosine similarity > 0.3
- **Spam filter:** Rejects texts < 10 chars, high-repeat-ratio, or generic patterns
- **Priority extraction:** Keyword match on urgent/alta/media/baixa in description
- **Secretary routing:** Category → responsible municipal department
- **Weekly summary:** Auto-generated report (totals, resolution rate, top 3 categories/bairros)
- **Critical clusters:** 5+ same-category defects within 7 days triggers priority alert
- **Circuit breaker:** 3 consecutive IA failures → 60s cooldown period, timeout 3s
- **Multi-stage Docker:** Builder (PyTorch 3GB) → exports ONNX → runtime (~200MB)

### Text Classification Detail

| Step | Description |
|---|---|
| Tokenize | BERT tokenizer, max_length=128, pad/truncate |
| Embed | all-MiniLM-L6-v2 ONNX → 384-dim vector |
| Pool | Mean pooling of token embeddings |
| Normalize | L2 normalize to unit vector |
| Compare | Cosine similarity with 7 pre-computed category centroids |
| Softmax | Temperature=3.0, maps similarities to probabilities |
| Threshold | Confidence < 0.3 → "Outro" category |

### IA Container Architecture

```
┌─────────────────────────────────────────────────┐
│  ia:8000 (Python 3.12-slim, 800M RAM max)      │
│                                                   │
│  FastAPI ← POST /classify, /classify-full, etc.   │
│     ↓                                              │
│  inference.py (ONNX Runtime session)                │
│     ├── text_session → all-MiniLM-L6-v2.onnx       │
│     └── image_session → mobilenetv3.onnx            │
│     └── centroids.json (7 pre-computed vectors)     │
│                                                     │
│  Healthcheck: GET /health (every 30s)               │
│  Restart: unless-stopped                             │
└─────────────────────────────────────────────────┘
```

## Docker Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   nginx:80   │────▶│  backend:5000│────▶│  postgres:5432│
│   (SSL+proxy) │     │  (Express)   │     │  (PG16+GIS)  │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │                         ▲
                            ▼                         │
                     ┌──────────────┐     ┌──────────────┐
                     │   ia:8000    │     │  backend-py  │
                     │  (FastAPI    │     │  :8000(Django)│
                     │   + ONNX)    │     │  (next phase) │
                     └──────────────┘     └──────────────┘
```

All services communicate over a Docker bridge network (`app-network`). Nginx serves the SPA build and reverse-proxies `/api/*` to backend. Django runs alongside for gradual migration.

## Keyboard Navigation

Press `g`, release, then the destination key (1s buffer window):

| Shortcut | Page | Shortcut | Page |
|---|---|---|---|
| `g+m` | Map | `g+d` | Dashboard |
| `g+l` | List | `g+u` | Users |
| `g+a` | Admin | `g+s` | Settings |
| `g+i` | Login | `g+c` | Account |
| `g+r` | Register | `g+t` | Toggle theme |
| `?` | Show help | `Esc` | Clear buffer |

Shortcuts are disabled when focus is inside input/textarea/select elements.

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy.yml`):

```
Push to master
  → Lint backend (eslint) + frontend (eslint)
  → Build frontend (Vite)
  → Build Docker images
  → Deploy to VPS via SSH
  → docker compose pull && up -d
  → Health check verification
```

## Backup System

Automated PostgreSQL backup via `scripts/backup-postgres.sh`:

- **Schedule:** Daily via cron (Docker service `backup`, profile `backup`)
- **Output:** Compressed SQL dump (gzip)
- **Retention:** 30 days (configurable via `RETENTION_DAYS`)
- **Remote:** Optional S3-compatible upload via rclone
- **Notifications:** Optional Telegram alerts on failure

## Design System

Dark-first theme with CSS custom properties (`tokens.css`):

- **Font:** Inter (sans-serif) + JetBrains Mono (mono)
- **Typography:** 12px to 36px scale
- **Spacing:** 4px to 64px scale (8-step)
- **Dark:** `--bg-primary: #0d0d0f`, `--text-primary: #fafafa`, `--accent-green: #22c55e`
- **Light:** `--bg-primary: #f5f5f0`, `--text-primary: #1a1a1c`, contrast ~16.4:1 (AAA)

## Accessibility (WCAG AA)

| Criteria | Implementation |
|---|---|
| Focus visible | `:focus-visible` 2px green outline on all interactive elements |
| Icon labels | `aria-label` on every icon-only button |
| Modal semantics | `role="dialog"` + `aria-modal="true"` + `aria-label` |
| Live regions | `aria-live="polite"` on toast notifications |
| Combobox | Full WAI-ARIA `role="combobox"` with `aria-expanded` |
| Skip link | Skip-to-content link at page top (`#main-content`) |
| Escape key | Closes all modals and clears keyboard nav buffer |
| Error messages | `role="alert"` on inline validation |
| Contrast (dark) | AA+ on all combos (7.58:1 AAA on primary/secondary) |
| Contrast (light) | 16.4:1 AAA on primary |
| Keyboard nav | `g+key` shortcuts with visual help overlay (`?`) |
| Reduced motion | `prefers-reduced-motion` respected via framer-motion |

## Validation

| Schema | Source | Rules |
|---|---|---|
| Auth | Zod / DRF serializers | CPF (11 digits), email, password (min 8), name, municipality |
| Defeitos | Zod / DRF serializers | Title (3-100), description (10-2000), lat/lng, image (5MB max) |
| Admin | Zod / DRF serializers | Status enum, priority, secretary, user role |

## Admin Hierarchy

Three admin levels enforced via JWT payload `{ role: 'user' \| 'admin' \| 'super' }`:

| Level | Permissions |
|---|---|
| **User** | Create/edit own defects, toggle support, attach updates |
| **Admin** | All user + change status/priority/secretaria of any defect, batch close, manage users |
| **Super** | All admin + promote/remove admin roles, vincular municipios |

## Spec & Docs

- **`SPEC.md`** — Project spec in caveman encoding (§G, §C, §I, §V, §T, §B)
- **`doc.md`** — Detailed documentation (migration justification, architecture, security audit, deployment)
