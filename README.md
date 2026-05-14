# Central de Inteligência Urbana (Urban Intelligence Center)

Full-stack PWA for reporting and managing urban infrastructure issues (potholes, broken lighting, damaged sidewalks, fallen trees, etc.). Citizens can submit photo + GPS reports; AI classifies and prioritizes automatically. Admin dashboard with heatmap and BI metrics.

**Deployed at:** [tcc.josemurilors.com.br](https://tcc.josemurilors.com.br)
**Stack:** React 19 + Vite 8 + Node.js/Express 5 + PostgreSQL 16/PostGIS 3.4 + ONNX Runtime (Python)
**Infrastructure:** Hetzner (Nuremberg, Germany) — ARM64 CX11, 4GB RAM, 2 cores, 40GB NVMe

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + Phosphor Icons + Framer Motion + Leaflet |
| Backend | Node.js + Express 5 (pg, pool 10 connections) |
| Database | PostgreSQL 16 + PostGIS 3.4 (spatial queries) |
| AI | ONNX Runtime (Python/FastAPI) — all-MiniLM-L6-v2 embeddings |
| Maps | Leaflet + react-leaflet + leaflet.heat + CartoDB tiles |
| Auth | JWT + bcrypt + CSRF Double Submit Cookie |
| Security | Helmet, Rate Limiting (3 levels), AES-256-GCM (CPF encryption) |
| Notifications | Web Push API (VAPID) |
| Logger | Pino structured logging with daily rotation |

## Features

- **Anonymous browsing** — view defects on map without login
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

## Quick Start (Development)

```bash
# 1. Clone
git clone git@github.com:josemurilors/tcc-manutencao-urbana.git
cd tcc-manutencao-urbana

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env: JWT_SECRET, ENCRYPTION_KEY, DB_PASSWORD, etc.

# 3. Start database + backend (host mode, no Nginx)
docker compose -f docker-compose.host.yml up -d --build

# 4. Run PostGIS migration (creates extensions + geometry columns)
docker compose -f docker-compose.host.yml exec postgres \
  psql -U urbana -d manutencao_urbana -f /scripts/migration-postgis.sql

# 5. (Optional) Start IA service
docker compose -f docker-compose.host.yml --profile ia up -d

# 6. Seed municipality data (IBGE)
docker compose -f docker-compose.host.yml exec backend \
  node scripts/seed-municipios.js

# 7. Frontend dev server
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

# 3. Build full stack
docker compose up -d --build

# 4. Run PostGIS migration
docker compose exec postgres psql -U urbana -d manutencao_urbana \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker compose exec postgres psql -U urbana -d manutencao_urbana \
  -f /backend/scripts/migration-postgis.sql

# 5. Seed IBGE municipality polygons (first time only)
docker compose exec backend node backend/scripts/seed-municipios-ibge.js

# 6. SSL certificate (first time)
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot -d tcc.josemurilors.com.br

# 7. Verify health
curl https://tcc.josemurilors.com.br/api/health
```

## Project Structure

```
tcc-manutencao-urbana/
├── backend/                     # Node.js + Express API
│   ├── index.js                 # Entry point
│   ├── src/
│   │   ├── routes/              # auth, defeitos, categorias, municipios, ia
│   │   ├── models/              # User, Defeito, Apoio (Mongoose-style)
│   │   ├── middleware/          # csrf, imageProcessor, rateLimit, validate
│   │   ├── services/           # ia.js, email (Resend), encryption, push, logger
│   │   ├── validation/         # Zod schemas (auth, defeitos, admin)
│   │   └── config/             # database.js (pg pool + schema init)
│   └── scripts/                # migration-postgis.sql, run-migration.js
├── frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── pages/              # MapPage, Login, Register, AdminDashboard, etc.
│   │   ├── components/         # Header, UserMenu, Toast, Heatmap, SearchableSelect
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── services/           # api.js (HTTP client w/ fetch + CSRF)
│   │   ├── styles/             # tokens.css (design system), App.css
│   │   ├── hooks/              # useKeyboardNav
│   │   └── assets/             # static assets
│   └── sw.js                   # Service worker (Vite injectManifest)
├── ia/                          # AI classification (Python/FastAPI/ONNX)
│   ├── main.py                 # FastAPI app (6 endpoints)
│   ├── inference.py            # ONNX embedding + centroid similarity
│   ├── models/                 # download_text_model.py, download_image_model.py
│   ├── requirements.txt        # Runtime deps (onnxruntime, etc.)
│   ├── requirements-build.txt  # Build deps (PyTorch for export)
│   ├── test_load.py            # Model load validation
│   └── Dockerfile              # Multi-stage: builder → runtime (~200MB)
├── scripts/                     # backup-postgres.sh, zram-setup.sh
├── .github/workflows/           # deploy.yml (CI/CD: lint + build + deploy)
├── docker-compose.yml           # Production stack (postgres + backend + nginx + ia)
├── docker-compose.host.yml      # Host-mode (without Nginx, for dev)
├── nginx.prod.conf              # Nginx prod config (SSL, proxy, cache, gzip)
├── nginx.Dockerfile             # Nginx with pre-built frontend
├── SPEC.md                      # Project specification (invariants, tasks, bug log)
└── .env.production              # Environment template (not versioned)
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
| GET | `/api/auth/admin/statistics` | Admin | Dashboard metrics (defeitos, users, daily) |
| PATCH | `/api/auth/admin/users/:id` | Admin | Update user (name, municipio, status) |
| PATCH | `/api/auth/admin/users/:id/admin` | Super | Promote/remove admin role |

### Defeitos
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/defeitos` | — | List all (support count, IA data, paginated) |
| GET | `/api/defeitos/meus` | JWT | List user's own defects |
| GET | `/api/defeitos/clusters` | — | GeoJSON clustered for map markers |
| GET | `/api/defeitos/:id` | — | Full detail with attachments and support |
| POST | `/api/defeitos` | JWT | Create (photo + desc + GPS → IA classify + dedup + route) |
| POST | `/api/defeitos/:id/support` | JWT | Toggle upvote |
| PATCH | `/api/defeitos/:id` | Admin | Update status/priority/secretaria |
| PATCH | `/api/defeitos/:id/attach` | JWT | Attach image or text update |
| POST | `/api/defeitos/batch-close` | Admin | Batch close by IDs |

### IA Service (port 8000 — ONNX Runtime)
| Method | Route | Description |
|---|---|---|
| POST | `/classify` | Text → category + confidence (all-MiniLM-L6-v2 embeddings) |
| POST | `/classify-full` | Text → category + priority + spam + routing in one call |
| POST | `/classify-image` | Image base64 → category (MobileNetV3 feature extractor) |
| POST | `/text-similarity` | Two texts → cosine similarity score |
| POST | `/summarize` | Weekly summary from defect list |
| GET | `/health` | Model loading status and available models |

### Support
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/categorias` | — | List defect categories with metadata |
| GET | `/api/municipios` | — | List municipalities (name, uf, polygon) |
| GET | `/api/csrf-token` | — | Get CSRF double-submit cookie |
| GET | `/api/health` | — | Health check (db, ia, uptime) |

## Security

- **Passwords:** bcrypt hashing (salt rounds = 10)
- **JWT:** 24h expiration, payload `{ userId, email, admin, municipio_id }`, signed with 256-bit secret
- **CPF:** AES-256-GCM encrypted at rest + SHA-256 HMAC for unique lookups
- **CSRF:** Double Submit Cookie pattern (XSRF-SESSION httpOnly + XSRF-TOKEN via JS)
- **Rate Limiting:** 4 levels — global (200/15min), auth (20/15min), API (200/h), per-user (10/h)
- **Helmet:** Security headers (CSP relaxed for Leaflet CDN tiles)
- **Upload validation:** Sharp compress to WebP 1200px max, whitelist (JPEG/PNG/WebP/AVIF), 5MB limit
- **IA Circuit Breaker:** 3 failures → 60s cooldown, never blocks defect creation
- **Validation:** Zod schemas on all inputs (auth, defeitos, admin routes)
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
- **Secretary routing:** Category → responsible municipal department (e.g., Buraco → Secretaria de Obras)
- **Weekly summary:** Auto-generated report (totals, resolution rate, top 3 categories/bairros)
- **Critical clusters:** 5+ same-category defects within 7 days triggers priority alert
- **Circuit breaker:** 3 consecutive IA failures → 60s cooldown period, timeout 3s
- **Multi-stage Docker:** Builder (PyTorch 3GB) → exports ONNX → runtime (~200MB, onnxruntime only)

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

## PostGIS

PostgreSQL 16 with PostGIS 3.4 spatial extension:
- `municipios.polygon_geom` — MultiPolygon from IBGE GeoJSON (5570 municipalities)
- `defeitos.geom` — Computed Point(4326) from latitude/longitude
- **Perimeter validation:** `ST_Within(point, polygon_geom)` on defect creation
- **Duplicate detection:** `ST_DWithin(geom, 0.01)` (~1km) + semantic similarity

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

- **Schedule:** Daily via cron (docker service `backup`, profile `backup`)
- **Output:** Compressed SQL dump (gzip)
- **Retention:** 30 days (configurable via `RETENTION_DAYS`)
- **Remote:** Optional S3-compatible upload via rclone
- **Notifications:** Optional Telegram alerts on failure

## Design System

Dark-first theme with CSS custom properties (tokens.css):

- **Font:** Inter (sans-serif) + JetBrains Mono (mono)
- **Typography:** 12px to 36px scale
- **Spacing:** 4px to 64px scale (8-step)
- **Dark:** `--bg-primary: #0d0d0f`, `--text-primary: #fafafa`, `--accent-green: #22c55e`
- **Light:** `--bg-primary: #f5f5f0`, `--text-primary: #1a1a1c`, contrast ~16.4:1 (AAA)

## Accessibility (WCAG AA)

| Criteria | Implementation |
|---|---|
| Focus visible | `:focus-visible` 2px green outline on all interactive elements |
| Icon labels | `aria-label` on every icon-only button (Header, FAB, UserMenu, modals) |
| Modal semantics | `role="dialog"` + `aria-modal="true"` + `aria-label` + `aria-describedby` |
| Live regions | `aria-live="polite"` on toast notifications, `aria-atomic="true"` |
| Combobox | Full WAI-ARIA `role="combobox"` with `aria-expanded`, `aria-activedescendant` |
| Skip link | Skip-to-content link at page top (`#main-content`) |
| Escape key | Closes all modals and clears keyboard nav buffer |
| Error messages | `role="alert"` on inline validation, `aria-describedby` linking input to error |
| Contrast (dark) | AA+ on all combos (e.g., `--text-secondary #a1a1aa` on `--bg-primary #0d0d0f` → 7.58:1 AAA) |
| Contrast (light) | `--text-primary #1a1a1c` on `--bg-primary #f5f5f0` → 16.4:1 AAA |
| Keyboard nav | `g+key` shortcuts with visual help overlay (`?`) |
| Reduced motion | `prefers-reduced-motion` respected via framer-motion |

## Docker Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   nginx:80   │────▶│  backend:5000│────▶│  postgres:5432│
│   (SSL+proxy) │     │  (Express)   │     │  (PG16+GIS)  │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   ia:8000    │
                     │  (FastAPI    │
                     │   + ONNX)    │
                     └──────────────┘
```

All services communicate over a Docker bridge network (`app-network`). The IA service runs under the `ia` profile (optional start). Nginx serves the SPA build and reverse-proxies `/api/*` to backend.
