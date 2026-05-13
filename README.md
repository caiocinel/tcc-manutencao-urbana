# Central de Inteligência Urbana (Urban Intelligence Center)

A full-stack Progressive Web App for reporting and managing urban infrastructure issues (potholes, broken lighting, damaged sidewalks, fallen trees, etc.).

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + Phosphor Icons + Framer Motion |
| Backend | Node.js + Express 5 (serves SPA + API) |
| Database | PostgreSQL 16 (pg driver, pool of 10 connections) |
| Maps | Leaflet + react-leaflet + leaflet.heat |
| Charts | Recharts (admin metrics dashboard) |
| Auth | JWT + bcrypt + CSRF Double Submit Cookie |
| AI (optional) | Pluggable adapter (HuggingFace, OpenAI, or custom API) |
| Security | Helmet, Rate Limiting (3 levels), AES-256-GCM (CPF encryption) |
| Notifications | Web Push API (PWA) |
| Logger | Pino structured logging with rotation |

## Deploy

### Production (VPS ARM64 - 4GB RAM, 2 cores)

```bash
# 1. Clone the repository
git clone <repo-url>
cd tcc-manutencao-urbana

# 2. Configure environment variables
cp backend/.env.example .env
# Edit .env with your secrets:
#   JWT_SECRET=<random-32-char-string>
#   ENCRYPTION_KEY=<random-32-char-string>
#   DOMAIN=yourdomain.com
#   DB_PASSWORD=<secure-password>

# 3. Start all services (PostgreSQL + Backend + Nginx + Certbot)
docker compose up -d --build

# 4. Import IBGE municipalities (first run only)
docker compose exec -T backend node seed-municipios-ibge.js

# 5. Set up SSL certificate (first run only)
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot -d yourdomain.com

# 6. With SSL active, Nginx will serve HTTPS automatically
#    Frontend: https://yourdomain.com
#    API:      https://yourdomain.com/api
```

### Using docker-compose.host.yml (VPS without Nginx)

```bash
docker compose -f docker-compose.host.yml up -d --build
# App at http://localhost:5000
```

### Development (without Docker)

```bash
# Terminal 1 - PostgreSQL
docker compose up -d postgres

# Terminal 2 - Backend
cd backend
cp .env.example .env   # edit credentials
npm install
node --max-old-space-size=2048 index.js
# -> http://localhost:5000

# Terminal 3 - Frontend
cd frontend
npm install
npm run dev
# -> http://localhost:5173

# Terminal 4 - AI (optional)
cd ia
pip install -r requirements.txt
python main.py
# -> http://localhost:8000
```

## Project Structure

```
tcc-manutencao-urbana/
├── backend/              # Node.js + Express API
│   ├── index.js          # Entry point
│   ├── src/
│   │   ├── routes/       # auth.js, defeitos.js, categorias.js, municipios.js
│   │   ├── models/       # User.js, Defeito.js, Apoio.js
│   │   ├── middleware/   # csrf.js, imageProcessor.js, rateLimit.js
│   │   ├── services/     # email.js, encryption.js, push.js, logger.js
│   │   └── config/       # database.js
│   └── scripts/          # Migration, backup, restore
├── frontend/             # React + Vite SPA
│   └── src/
│       ├── pages/        # MapPage, DefectList, AdminDashboard, etc.
│       ├── components/   # Header, UserMenu, Toast, HeatmapLayer
│       ├── context/      # AuthContext
│       ├── services/     # api.js (HTTP client)
│       ├── styles/       # tokens.css (design system)
│       └── hooks/
├── ia/                   # Optional AI classification service (Python/FastAPI)
├── docker-compose.yml    # Production (with Nginx + SSL)
├── docker-compose.host.yml  # VPS without Nginx
├── nginx.prod.conf       # Nginx config (production)
├── nginx.conf            # Nginx config (development)
└── .env                  # Root environment variables
```

## API Endpoints

### Authentication
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/registro` | — | Register with CPF and municipality |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/validar-cpf` | — | Validate CPF via BrasilAPI |
| PATCH | `/api/auth/senha` | JWT | Change password |
| POST | `/api/auth/verificar-email` | JWT | Verify email with code |
| GET | `/api/auth/push/key` | — | VAPID public key |
| POST | `/api/auth/push/subscribe` | JWT | Save push subscription |

### Defects (Chamados)
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/defeitos` | — | List all (with support count) |
| GET | `/api/defeitos/meus` | JWT | List user's defects |
| GET | `/api/defeitos/clusters` | — | Clustered for map |
| GET | `/api/defeitos/:id` | — | Detail |
| POST | `/api/defeitos` | JWT + email verified | Create with photo |
| POST | `/api/defeitos/:id/apoiar` | JWT | Toggle upvote |
| PATCH | `/api/defeitos/:id` | JWT+admin | Update status/priority |
| PATCH | `/api/defeitos/:id/anexar` | JWT | Attach image or text |

### Admin
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/admin/users` | JWT+admin | List users |
| GET | `/api/auth/admin/estatisticas` | JWT+admin | Dashboard metrics |
| PATCH | `/api/auth/admin/users/:id` | JWT+admin | Assign municipality |
| PATCH | `/api/auth/admin/users/:id/admin` | JWT+super | Promote/remove admin |

### Support
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/categorias` | — | List categories |
| GET | `/api/municipios` | — | List municipalities |
| GET | `/api/csrf-token` | — | Get CSRF token |
| GET | `/api/health` | — | Health check |

## Security

- **Passwords:** bcrypt hashing (salt rounds = 10)
- **JWT:** 24h expiration, payload `{ userId, email, admin, municipio_id }`
- **CPF:** AES-256-GCM encrypted at rest + SHA-256 hash for unique lookups
- **CSRF:** Double Submit Cookie pattern on all mutations
- **Rate Limiting:** 3 levels (global 200/15min, auth 20/15min, API 200/h)
- **User Rate Limit:** 10 requests/hour per user (auto-reset)
- **Helmet:** Security headers (except CSP for Leaflet tiles)

## Design System

Dark theme with CSS custom properties (tokens):

- **Font:** Inter (sans-serif) + JetBrains Mono (mono)
- **Typography:** 11px to 36px scale with controlled tracking
- **Spacing:** 4px to 64px scale
- **Colors:** `--bg-primary: #0d0d0f`, `--accent-green: #22c55e`