<p align="center">
  <img src="icone-projeto.svg" alt="Central de Inteligência Urbana" width="200">
</p>

<h1 align="center">Central de Inteligência Urbana — Urban Intelligence Center</h1>

<p align="center">
  <img src="https://img.shields.io/badge/STATUS-EM%20PRODU%C3%87%C3%83O-green?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License: MIT">
  <img src="https://img.shields.io/badge/stack-React%2019%20%7C%20Django%205%20%7C%20PostGIS-blueviolet?style=for-the-badge" alt="Stack">
  <img src="https://img.shields.io/badge/deploy-Hetzner%20VPS-important?style=for-the-badge" alt="Deploy: Hetzner VPS">
  <img src="https://img.shields.io/badge/python-3.13-3776AB?style=for-the-badge" alt="Python 3.13">
</p>

<p align="center">
  <a href="#português">🇧🇷 Português</a> · <a href="#english">🇺🇸 English</a>
</p>

---

<a id="português"></a>

## 🇧🇷 Português

## Índice

- [Descrição do Projeto](#descrição-do-projeto)
- [Status do Projeto](#status-do-projeto)
- [Funcionalidades e Demonstração da Aplicação](#funcionalidades-e-demonstração-da-aplicação)
- [Acesso ao Projeto](#acesso-ao-projeto)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Arquitetura](#arquitetura)
- [API Endpoints](#api-endpoints)
- [Segurança](#segurança)
- [PostGIS & Geoespacial](#postgis--geoespacial)
- [Pipeline de Classificação IA](#pipeline-de-classificação-ia)
- [Apêndice Técnico](#apêndice-técnico)
- [Pessoas Contribuidoras](#pessoas-contribuidoras)
- [Autores](#autores)
- [Licença](#licença)

## Descrição do Projeto

Central de Inteligência Urbana é uma PWA full-stack para reportar e gerenciar problemas de infraestrutura urbana (buracos, iluminação quebrada, calçadas danificadas, árvores caídas etc.). Cidadãos podem enviar relatos com foto + GPS; a IA classifica e prioriza automaticamente. Painel administrativo com mapa de calor e métricas de BI.

**Deploy em produção:** [tcc.josemurilors.com.br](https://tcc.josemurilors.com.br)

**Stack:** React 19 + Vite 8 + Django 5.2/DRF + PostgreSQL 16/PostGIS 3.4 + ONNX Runtime (Python)

> **Requisitos de ambiente:**
> - **Node.js** ≥ 22.12 (Vite 8 exige `^20.19.0 || >=22.12.0`; testado localmente com v26.4)
> - **Python** 3.12 / 3.13 / 3.14 (Django 5.2 suporta 3.10–3.14; a imagem Docker usa `python:3.13-slim`)
> - **Docker** + Docker Compose v2
> - **GDAL** no host (`libgdal-dev`/`gdal-bin`) se for rodar o backend Django fora do Docker (djangorestframework-gis exige GDAL)
> - `uv` opcional para recriar o venv Python (o venv versionado em `.venv` foi gerado com `uv 0.11.13`)

**Infraestrutura:** Hetzner (Nuremberg, Alemanha) — ARM64 CX11, 4GB RAM, 2 cores, 40GB NVMe

## Status do Projeto

> 🚧 Projeto em produção

A aplicação está no ar e em uso contínuo em `tcc.josemurilors.com.br`. O backend Django é o backend oficial de produção; novas funcionalidades e correções seguem sendo entregues incrementalmente.

## Funcionalidades e Demonstração da Aplicação

- `Navegação anônima`: visualização do mapa de calor de defeitos sem login (marcadores individuais exigem login)
- `Relato cidadão`: foto + GPS + categoria com classificação por IA
- `Classificação IA`: embeddings ONNX (all-MiniLM-L6-v2) → 7 categorias, detecção de spam, dedup e extração de prioridade
- `Detecção de duplicados`: proximidade espacial (ST_DWithin ~1km) + similaridade semântica (cosseno > 0,3)
- `Moderação de spam`: detecção automática de descrições curtas, genéricas ou repetitivas
- `Roteamento inteligente`: categoria → secretaria municipal responsável (ex.: Buraco → Obras, Iluminação → Serviços Urbanos)
- `Pontuação de prioridade`: correspondência de palavras-chave (urgente/alta/media/baixa) extraídas da descrição
- `Alerta de cluster crítico`: 5+ defeitos da mesma categoria em janela de 7 dias dispara notificação
- `Resumo semanal`: relatório automático (totais, taxa de resolução, top categoria/bairro)
- `Circuit breaker`: 3 falhas de IA → cooldown de 60s, timeout 3s, fallback silencioso
- `Painel admin`: métricas KPI, controles por região, export CSV, gráficos de barra/pizza
- `Mapa de clusters`: auto-agrupamento de defeitos próximos com ações em lote, toggle de heatmap
- `Sistema de upvotes`: apoio cidadão aos defeitos
- `Anexos`: atualizações de texto/imagem em defeitos abertos
- `Gestão de usuários`: validação de CPF (BrasilAPI), hierarquia admin, verificação de e-mail
- `Notificações push`: Web Push API com chaves VAPID
- `Tema claro/escuro`: respeita preferência do sistema, toggle manual, persistido em localStorage
- `Navegação por teclado`: atalhos `g + tecla` (m=mapa, a=admin, d=dashboard, t=tema, ?=ajuda)
- `Acessibilidade`: WCAG AA — aria-labels, skip-link, navegação por teclado, focus-visible, combobox, live regions
- `Responsivo`: mobile-first com bottom sheets, menu hamburguer <768px
- `PWA`: service worker com cache-first para assets estáticos, manifest com splash screen
- `Privacidade`: blur gaussiano em todas as fotos enviadas para proteger rostos e placas (sigma configurável)
- `Tolerância de GPS`: validação de perímetro com ST_Buffer (~1km) + bounding box fallback para erros de GPS na borda do município

### Demonstração

A aplicação está disponível ao vivo em: **[tcc.josemurilors.com.br](https://tcc.josemurilors.com.br)**

## Acesso ao Projeto

### Quick Start (Desenvolvimento)

```bash
# 1. Clone
git clone git@github.com:josemurilors/tcc-manutencao-urbana.git
cd tcc-manutencao-urbana

# 2. Configure o ambiente do backend Django
cp .env.production backend-python/.env
# Edite backend-python/.env: ENCRYPTION_KEY, DB_PASSWORD, etc.

# 3. Suba o banco (Postgres + PostGIS) e o backend Django + Redis
docker compose -f docker-compose.dev.yml up -d backend redis

# 4. Rode as migrações do Django
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate

# 5. (Opcional) Suba o serviço de IA
docker compose -f docker-compose.dev.yml --profile ia up -d ia

# 6. Frontend dev server
cd frontend && npm run dev
```

### Quick Start (Produção)

```bash
# 1. Clone na VPS
git clone git@github.com:josemurilors/tcc-manutencao-urbana.git
cd tcc-manutencao-urbana

# 2. Configure o ambiente
cp .env.production backend-python/.env
# Edite backend-python/.env com os segredos de produção

# 3. Build da stack completa (Django backend)
docker compose up -d --build

# 4. Rode a migração PostGIS (extensão + geometrias)
docker compose exec -T postgres psql -U urbana -d manutencao_urbana \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker compose exec -T postgres psql -U urbana -d manutencao_urbana -c "
  ALTER TABLE municipios ADD COLUMN IF NOT EXISTS polygon_geom geometry(MultiPolygon, 4326);
  CREATE INDEX IF NOT EXISTS idx_municipios_polygon_geom ON municipios USING GIST (polygon_geom);
  ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED;
  CREATE INDEX IF NOT EXISTS idx_defeitos_geom ON defeitos USING GIST (geom);"

# 5. Certificado SSL (primeira vez)
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot -d tcc.josemurilors.com.br

# 6. Verifique a saúde
curl https://tcc.josemurilors.com.br/api/health
```

## Tecnologias utilizadas

- **Frontend:** React 19 + Vite 8 + Phosphor Icons + Framer Motion + Leaflet + react-leaflet + leaflet.heat + CartoDB
- **Backend:** Django 5.2 + Django REST Framework (Gunicorn)
- **Database:** PostgreSQL 16 + PostGIS 3.4 (consultas espaciais)
- **IA:** ONNX Runtime (Python/FastAPI) — all-MiniLM-L6-v2
- **Maps:** Leaflet + react-leaflet + leaflet.heat + CartoDB
- **Auth:** simplejwt + BCryptPasswordHasher
- **Security:** CSRF middleware, IsAuthenticated default, AES-256-GCM
- **Notifications:** Web Push API (VAPID) via pywebpush
- **Logger:** Python logging (Django)

## Arquitetura

| Camada | Stack |
|---|---|
| Frontend | React 19 + Vite 8 + Phosphor Icons + Framer Motion + Leaflet |
| Backend | Django 5.2 + DRF (Gunicorn) |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| IA | ONNX Runtime (Python/FastAPI) — all-MiniLM-L6-v2 |
| Maps | Leaflet + react-leaflet + leaflet.heat + CartoDB |
| Auth | simplejwt + BCryptPasswordHasher |
| Security | CSRF middleware, IsAuthenticated default, AES-256-GCM |
| Notifications | Web Push API (VAPID) via pywebpush |
| Logger | Python logging (Django) |

### Diagrama Docker

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   nginx:80   │────▶│  backend-python:8000  │────▶│  postgres:5432   │
│  :443 (SSL)  │     │  (Django/Gunicorn)   │     │  (PG16+PostGIS)  │
└──────────────┘     └──────────┬───────────┘     └──────────────────┘
                               │                        ▲
                               ▼                        │
                        ┌──────────────┐       (consultas espaciais)
                        │   ia:8000    │
                        │  (FastAPI    │
                        │   + ONNX)    │
                        └──────────────┘
```

Todos os serviços comunicam-se sobre a rede bridge do Docker (`app-network`). O Nginx serve o build da SPA e faz reverse-proxy `/api/*` para o Django em :8000; o serviço de IA em :8000 roda ao lado, consumido pelo backend.

## API Endpoints

### Autenticação Django `/api/v1/auth/*`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/v1/auth/register/` | — | Registro com CPF e município |
| POST | `/api/v1/auth/login/` | — | Login (retorna JWT + usuário) |
| POST | `/api/v1/auth/validate-cpf/` | — | Valida CPF via BrasilAPI |
| GET | `/api/v1/auth/profile/` | JWT | Perfil do usuário |
| PATCH | `/api/v1/auth/password/` | JWT | Alterar senha |
| POST | `/api/v1/auth/verify-email/` | JWT | Verificar e-mail com código |
| POST | `/api/v1/auth/resend-code/` | JWT | Reenviar código de verificação |
| GET | `/api/v1/auth/push/key/` | — | Chave pública VAPID |
| POST | `/api/v1/auth/push/subscribe/` | JWT | Salvar inscrição push |
| GET | `/api/v1/auth/admin/users/` | Admin | Listar todos os usuários |
| GET | `/api/v1/auth/admin/statistics/` | Admin | Métricas do painel |
| PATCH | `/api/v1/auth/admin/users/:id/` | Admin | Atualizar usuário |
| PATCH | `/api/v1/auth/admin/users/:id/admin/` | Super | Promover/remover admin |

### Defeitos `/api/v1/defeitos/*`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/v1/defeitos/` | — | Listar todos (paginação, contagem de apoios) |
| GET | `/api/v1/defeitos/meus/` | JWT | Listar defeitos do próprio usuário |
| GET | `/api/v1/defeitos/clusters/` | — | GeoJSON agrupado para o mapa |
| GET | `/api/v1/defeitos/:id/` | — | Detalhe completo com anexos |
| POST | `/api/v1/defeitos/` | JWT | Criar (foto + desc + GPS → IA classifica) |
| POST | `/api/v1/defeitos/:id/support/` | JWT | Alternar upvote |
| PATCH | `/api/v1/defeitos/:id/` | Admin | Atualizar status/prioridade/secretaria |
| PATCH | `/api/v1/defeitos/:id/attach/` | JWT | Anexar atualização de imagem/texto |
| POST | `/api/v1/defeitos/batch-close/` | Admin | Fechar em lote por IDs |
| GET | `/api/v1/defeitos/vinculados/` | Admin | Listar defeitos com atendente atribuído |

### Municípios & Categorias `/api/v1/*`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET/POST | `/api/v1/municipios/` | variado | Lookup de municípios |
| GET | `/api/v1/categorias/` | — | Listar categorias |

### Admin Django `/api/v1/admin/*`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/v1/admin/vinculate/` | Super | Vincular municípios |
| GET | `/api/v1/admin/super/users/` | Super | Gestão de usuários |

### IA Service (porta 8000 — ONNX Runtime)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/classify` | Texto → categoria + confiança |
| POST | `/classify-full` | Categoria + prioridade + spam + roteamento |
| POST | `/classify-image` | Imagem base64 → categoria |
| POST | `/text-similarity` | Score de similaridade cosseno |
| POST | `/summarize` | Resumo semanal |
| GET | `/health` | Status de carregamento do modelo |

### Support / Categoria / Municipio lookups

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/v1/categorias/` | — | Listar categorias com metadados |
| GET | `/api/v1/municipios/` | — | Listar municípios (nome, uf, polygon) |
| GET | `/api/v1/csrf-token/` | — | Token CSRF |
| GET | `/api/health` | — | Health check (db, ia, uptime) |

## Segurança

- **Senhas:** bcrypt hashing (salt rounds = 10); Django `BCryptPasswordHasher` compatível com hashes existentes
- **JWT (simplejwt):** expiração de 24h, payload `{ userId, email, admin, municipio_id }`, secret de 256-bit
- **CPF:** criptografado em repouso com AES-256-GCM + SHA-256 HMAC para lookups únicos
- **CSRF:** `CsrfViewMiddleware` do Django com `SameSite=Strict`
- **DRF default:** `IsAuthenticated` — todos os endpoints travados por padrão; públicos usam `AllowAny` explicitamente
- **Rate Limiting:** `django-ratelimit` + Redis (circuit breaker) — global, auth, API e por usuário
- **HSTS/SSL:** enforce em settings de produção (`SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`)
- **Usuário não-root:** container Django roda como `django` (uid 1001)
- **Validação de upload:** compressão para WebP 1200px máx, whitelist (JPEG/PNG/WebP/AVIF), limite 5MB
- **IA Circuit Breaker:** 3 falhas → cooldown 60s, nunca bloqueia criação de defeito
- **Validação:** serializers DRF em todas as entradas
- **2FA:** TOTP de dois fatores opcional
- **Chave de criptografia:** AES-256-GCM (32 bytes / 64 hex chars), gerada via `openssl rand -hex 32`

## PostGIS & Geoespacial

PostgreSQL 16 com extensão PostGIS 3.4 para todas as operações espaciais:

- **`municipios.polygon_geom`** — MultiPolygon(4326) a partir do GeoJSON IBGE (5570 municípios, ~120MB)
- **`defeitos.geom`** — gerado sempre como `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)` via migração Django/PostGIS
- **Validação de perímetro:** `ST_Within(point, polygon_geom)` — o defeito deve estar dentro do município do usuário
- **Detecção de duplicados:** `ST_DWithin(geom, 0.01)` (~1km de raio) + similaridade de embedding > 0,3

O Django gerencia a geometria via PostGIS diretamente nas migrações — nenhum script SQL legado externo é necessário.

## Pipeline de Classificação IA

```
User input → Tokenize (BERT tokenizer) → all-MiniLM-L6-v2 (ONNX)
  → Mean pooling → L2 normalize → Cosine similarity × 7 centroids
  → Softmax(t=3.0) → Category + confidence
```

- **Modelo:** `sentence-transformers/all-MiniLM-L6-v2` (embeddings 384-dim, ~90MB)
- **Fallback:** classificador por palavras-chave ativa se o ONNX falhar ao carregar ou o container de IA cair
- **Categorias:** Buraco, Iluminação, Semáforo, Árvore Caída, Entulho, Calçada Danificada, Outro
- **Imagem:** extrator de features MobileNetV3-small (576-dim) — requer fine-tuning para classificação
- **Detecção de duplicados:** `ST_DWithin(geom, 0.01)` (~1km) + similaridade cosseno de embedding > 0,3
- **Filtro de spam:** rejeita textos < 10 chars, alta taxa de repetição ou padrões genéricos
- **Extração de prioridade:** match de palavras-chave urgent/alta/media/baixa na descrição
- **Roteamento de secretaria:** categoria → departamento municipal responsável
- **Resumo semanal:** relatório automático (totais, taxa de resolução, top 3 categorias/bairros)
- **Clusters críticos:** 5+ defeitos da mesma categoria em 7 dias dispara alerta de prioridade
- **Circuit breaker:** 3 falhas de IA consecutivas → cooldown 60s, timeout 3s
- **Docker multi-stage:** Builder (PyTorch 3GB) → exporta ONNX → runtime (~200MB)

### Text Classification Detail

| Passo | Descrição |
|---|---|
| Tokenize | BERT tokenizer, max_length=128, pad/truncate |
| Embed | all-MiniLM-L6-v2 ONNX → vetor 384-dim |
| Pool | Mean pooling dos embeddings de token |
| Normalize | L2 normalize para vetor unitário |
| Compare | Cosseno com 7 centróides de categoria pré-computados |
| Softmax | Temperature=3.0, mapeia similaridades a probabilidades |
| Threshold | Confiança < 0,3 → categoria "Outro" |

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
│     └── centroids.json (7 vetores pré-computados)   │
│                                                     │
│  Healthcheck: GET /health (a cada 30s)              │
│  Restart: unless-stopped                             │
└─────────────────────────────────────────────────┘
```

## Apêndice Técnico

### Docker Architecture detail

A stack de produção usa `docker-compose.yml` (postgres + backend-python + nginx + ia) sobre a rede `app-network`. O `docker-compose.dev.yml` (Redis + backend-python) é usado em desenvolvimento. O nginx faz SSL termination e reverse-proxy `/api/*` para o Django em :8000; o serviço de IA em :8000 roda ao lado.

### CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy.yml`):

```
Push to master
  → Lint backend (ruff/flake8) + frontend (eslint)
  → Build frontend (Vite)
  → Build Docker images
  → Deploy to VPS via SSH
  → docker compose pull && up -d
  → Health check verification
```

### Backup System

Backup automatizado do PostgreSQL via `scripts/backup-postgres.sh`:

- **Agendamento:** diário via cron (serviço Docker `backup`, profile `backup`)
- **Saída:** dump SQL comprimido (gzip)
- **Retenção:** 30 dias (configurável via `RETENTION_DAYS`)
- **Remoto:** upload opcional S3-compatible via rclone
- **Notificações:** alertas Telegram opcionais em caso de falha

### Design System

Tema dark-first com CSS custom properties (`tokens.css`):

- **Fonte:** Inter (sans-serif) + JetBrains Mono (mono)
- **Tipografia:** escala 12px a 36px
- **Espaçamento:** escala 4px a 64px (8 passos)
- **Dark:** `--bg-primary: #0d0d0f`, `--text-primary: #fafafa`, `--accent-green: #22c55e`
- **Light:** `--bg-primary: #f5f5f0`, `--text-primary: #1a1a1c`, contraste ~16.4:1 (AAA)

### Acessibilidade (WCAG AA)

| Critério | Implementação |
|---|---|
| Focus visible | `:focus-visible` outline verde 2px em todos os elementos interativos |
| Icon labels | `aria-label` em todo botão somente-ícone |
| Modal semantics | `role="dialog"` + `aria-modal="true"` + `aria-label` |
| Live regions | `aria-live="polite"` em notificações toast |
| Combobox | WAI-ARIA completo `role="combobox"` com `aria-expanded` |
| Skip link | link skip-to-content no topo (`#main-content`) |
| Escape key | fecha todos os modais e limpa buffer de nav por teclado |
| Error messages | `role="alert"` em validação inline |
| Contrast (dark) | AA+ em todos os combos (7.58:1 AAA primary/secondary) |
| Contrast (light) | 16.4:1 AAA primary |
| Keyboard nav | atalhos `g+key` com overlay de ajuda visual (`?`) |
| Reduced motion | `prefers-reduced-motion` respeitado via framer-motion |

### Navegação por Teclado

Pressione `g`, solte, depois a tecla de destino (janela de buffer de 1s):

| Atalho | Página | Atalho | Página |
|---|---|---|---|
| `g+m` | Mapa | `g+d` | Dashboard |
| `g+l` | Lista | `g+u` | Usuários |
| `g+a` | Admin | `g+s` | Configurações |
| `g+i` | Login | `g+c` | Conta |
| `g+r` | Registro | `g+t` | Alternar tema |
| `?` | Mostrar ajuda | `Esc` | Limpar buffer |

Os atalhos são desabilitados quando o foco está em elemento input/textarea/select.

## Pessoas Contribuidoras

Até o momento não há contribuidores externos além do autor. O repositório é mantido individualmente como parte de um trabalho de conclusão de curso (TCC).

## Autores

| Foto do Autor | Nome | Link |
|---|---|---|
| <img src="https://github.com/josemurilors.png" width=115 alt="José Murilo Rodrigues Sabalo"> | José Murilo Rodrigues Sabalo | [Perfil no GitHub](https://github.com/josemurilors) |

Demais membros do grupo do TCC serão adicionados aqui posteriormente.

## Licença

Este projeto está licenciado sob a licença **MIT**. O texto completo está disponível no arquivo `LICENSE`.

---

<a id="english"></a>

## 🇺🇸 English

## Index

- [Project Description](#project-description)
- [Project Status](#project-status)
- [Features and Application Demo](#features-and-application-demo)
- [Project Access](#project-access)
- [Technologies Used](#technologies-used)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Security](#security)
- [PostGIS & Geospatial](#postgis--geospatial)
- [AI Classification Pipeline](#ai-classification-pipeline)
- [Technical Appendix](#technical-appendix)
- [Contributors](#contributors)
- [Authors](#authors)
- [License](#license)

## Project Description

Central de Inteligência Urbana (Urban Intelligence Center) is a full-stack PWA for reporting and managing urban infrastructure issues (potholes, broken lighting, damaged sidewalks, fallen trees, etc.). Citizens can submit photo + GPS reports, and an AI model classifies and prioritizes them automatically. An admin dashboard provides heatmaps and BI metrics for municipal teams.

**Deployed at:** [tcc.josemurilors.com.br](https://tcc.josemurilors.com.br)

**Stack:** React 19 + Vite 8 + Django 5.2/DRF + PostgreSQL 16/PostGIS 3.4 + ONNX Runtime (Python)

> **Environment requirements:**
> - **Python** 3.12 / 3.13 / 3.14 (Django 5.2 supports 3.10–3.14; the Docker image uses `python:3.13-slim`)
> - **Docker** + Docker Compose v2
> - **GDAL** on the host (`libgdal-dev`/`gdal-bin`) if running the Django backend outside Docker (djangorestframework-gis requires GDAL)
> - `uv` optional for recreating the Python venv (the versioned venv in `.venv` was generated with `uv 0.11.13`)

**Infrastructure:** Hetzner (Nuremberg, Germany) — ARM64 CX11, 4GB RAM, 2 cores, 40GB NVMe

## Project Status

> 🚧 In production

The Django backend is the active production backend. The application is deployed and serving real traffic at [tcc.josemurilors.com.br](https://tcc.josemurilors.com.br). Active development continues on new features, BI metrics, and test coverage.

## Features and Application Demo

- `Anonymous browsing`: view the heatmap of defects without login (individual markers require login)
- `Citizen reporting`: photo + GPS + category with AI classification
- `AI classification`: ONNX embeddings (all-MiniLM-L6-v2) → 7 categories, spam detection, dedup, priority extraction
- `Duplicate detection`: spatial proximity (ST_DWithin ~1km) + semantic similarity (embedding cosine > 0.3)
- `Spam moderation`: automatic detection of short, generic, or repetitive descriptions
- `Smart routing`: category → responsible municipal secretary (e.g., Buraco → Obras, Iluminação → Serviços Urbanos)
- `Priority scoring`: keyword match (urgente/alta/media/baixa) extracted from description
- `Critical cluster alert`: 5+ same-category defects in a 7-day window triggers a notification
- `Weekly summary`: auto-generated report (totals, resolution rate, top category/bairro)
- `Circuit breaker`: 3 IA failures → 60s cooldown, timeout 3s, silent fallback
- `Admin dashboard`: KPI metrics, per-region controls, CSV export, bar/pie charts
- `Cluster map`: auto-grouping of nearby defects with batch actions, heatmap toggle
- `Upvote system`: citizen support for defects
- `Attachments`: text/image updates on open defects
- `User management`: CPF validation (BrasilAPI), admin hierarchy, email verification
- `Push notifications`: Web Push API with VAPID keys
- `Dark/light theme`: respects system preference, manual toggle, persisted in localStorage
- `Keyboard navigation`: `g + key` shortcuts (m=map, a=admin, d=dashboard, t=theme, ?=help)
- `Accessibility`: WCAG AA: aria-labels, skip-link, keyboard navigation, focus-visible, combobox, live regions
- `Responsive`: mobile-first with bottom sheets, hamburger menu <768px
- `PWA`: service worker with cache-first for static assets, manifest with splash screen
- `Privacy`: Gaussian blur on all uploaded photos to protect faces and license plates (configurable sigma)
- `GPS tolerance`: perimeter validation with ST_Buffer (~1km) + bounding box fallback for city border GPS errors

### Demo

The live application is available at **[https://tcc.josemurilors.com.br](https://tcc.josemurilors.com.br)**.

## Project Access

### Quick Start (Development)

```bash
# 1. Clone
git clone git@github.com:josemurilors/tcc-manutencao-urbana.git
cd tcc-manutencao-urbana

# 2. Configure environment
cp .env.production backend-python/.env
# Edit backend-python/.env: SECRET_KEY, ENCRYPTION_KEY, DB_PASSWORD, etc.

# 3. Start backend + Redis (Django dev stack)
docker compose -f docker-compose.dev.yml up -d backend redis

# 4. Apply Django migrations
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate

# 5. (Optional) Start IA service (port 8000)
docker compose --profile ia up -d ia

# 6. Frontend dev server
cd frontend && npm run dev
```

### Quick Start (Production)

```bash
# 1. Clone on VPS
git clone git@github.com:josemurilors/tcc-manutencao-urbana.git
cd tcc-manutencao-urbana

# 2. Configure environment
cp .env.production backend-python/.env
# Edit backend-python/.env with production secrets

# 3. Build full stack (Django backend)
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

# 5. SSL certificate (first time)
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot -d tcc.josemurilors.com.br

# 6. Verify health
curl https://tcc.josemurilors.com.br/api/health
```

## Technologies Used

- **Frontend:** React 19 + Vite 8 + Phosphor Icons + Framer Motion + Leaflet (react-leaflet, leaflet.heat, CartoDB)
- **Backend:** Django 5.2 + Django REST Framework (DRF) served by Gunicorn
- **Database:** PostgreSQL 16 + PostGIS 3.4 (spatial queries)
- **AI:** ONNX Runtime (Python/FastAPI) — all-MiniLM-L6-v2
- **Maps:** Leaflet + react-leaflet + leaflet.heat + CartoDB
- **Auth:** simplejwt + BCryptPasswordHasher
- **Security:** CSRF middleware, IsAuthenticated default, AES-256-GCM encryption
- **Notifications:** Web Push API (VAPID) via pywebpush
- **Logging:** Python logging (Django)
- **Container:** Docker + Docker Compose, Nginx reverse proxy with SSL

## Architecture

| Layer | Django Stack |
|---|---|
| Frontend | React 19 + Vite 8 + Phosphor Icons + Framer Motion + Leaflet |
| Backend | Django 5.2 + DRF (Gunicorn) |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| AI | ONNX Runtime (Python/FastAPI) — all-MiniLM-L6-v2 |
| Maps | Leaflet + react-leaflet + leaflet.heat + CartoDB |
| Auth | simplejwt + BCryptPasswordHasher |
| Security | CSRF middleware, IsAuthenticated default, AES-256-GCM |
| Notifications | Web Push API (VAPID) / pywebpush |
| Logger | Python logging (Django) |

### Docker Architecture

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   nginx:80   │────▶│  backend-python:8000  │────▶│  postgres:5432   │
│  (SSL+proxy) │     │   (Django/Gunicorn)   │     │   (PG16+GIS)     │
└──────────────┘     └──────────────────────┘     └──────────────────┘
                               ▲
                               │ (classification calls)
                               ▼
                        ┌──────────────┐
                        │   ia:8000    │
                        │ (FastAPI     │
                        │  + ONNX)     │
                        └──────────────┘
```

All services communicate over a Docker bridge network (`app-network`). Nginx serves the SPA build and reverse-proxies `/api/*` to the Django backend; Django calls the IA service on port 8000 for classification.

## API Endpoints

### Authentication `/api/v1/auth/*`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register/` | — | Register with CPF and municipality |
| POST | `/api/v1/auth/login/` | — | Login (returns JWT + user) |
| POST | `/api/v1/auth/validate-cpf/` | — | Validate CPF via BrasilAPI |
| PATCH | `/api/v1/auth/password/` | JWT | Change password |
| POST | `/api/v1/auth/verify-email/` | JWT | Verify email with code |
| POST | `/api/v1/auth/resend-code/` | JWT | Resend verification code |
| POST | `/api/v1/auth/push/subscribe/` | JWT | Save push subscription |
| GET | `/api/v1/auth/admin/users/` | Admin | List all users |
| GET | `/api/v1/auth/admin/statistics/` | Admin | Dashboard metrics |
| PATCH | `/api/v1/auth/admin/users/:id/` | Admin | Update user |
| PATCH | `/api/v1/auth/admin/users/:id/admin/` | Super | Promote/remove admin |

### Defeitos `/api/v1/defeitos/*`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/defeitos/` | — | List all (paginated, with support count) |
| GET | `/api/v1/defeitos/meus/` | JWT | List user's own defects |
| GET | `/api/v1/defeitos/clusters/` | — | GeoJSON clustered for map |
| GET | `/api/v1/defeitos/:id/` | — | Full detail with attachments |
| POST | `/api/v1/defeitos/` | JWT | Create (photo + desc + GPS → IA classify) |
| POST | `/api/v1/defeitos/:id/support/` | JWT | Toggle upvote |
| PATCH | `/api/v1/defeitos/:id/` | Admin | Update status/priority/secretaria |
| PATCH | `/api/v1/defeitos/:id/attach/` | JWT | Attach image/text update |
| POST | `/api/v1/defeitos/batch-close/` | Admin | Batch close by IDs |
| GET | `/api/v1/defeitos/vinculados/` | Admin | List defects with assigned attendant |

### Municipios & Categorias

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/municipios/` | varied | Django municipios lookup |
| GET | `/api/v1/categorias/` | — | Django categories |

### Admin `/api/v1/admin/*`

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/admin/vinculate/` | Super | Vincular municípios |
| GET | `/api/v1/admin/super/users/` | Super | Django user management |

### IA Service (port 8000 — ONNX Runtime)

| Method | Route | Description |
|---|---|---|
| POST | `/classify` | Text → category + confidence |
| POST | `/classify-full` | Category + priority + spam + routing |
| POST | `/classify-image` | Image base64 → category |
| POST | `/text-similarity` | Cosine similarity score |
| POST | `/summarize` | Weekly summary |
| GET | `/health` | Model loading status |

### Support / Lookups

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/categorias/` | — | List categories with metadata |
| GET | `/api/v1/municipios/` | — | List municipalities (name, uf, polygon) |
| GET | `/api/v1/csrf-token/` | — | CSRF token |
| GET | `/api/health` | — | Health check (db, ia, uptime) |

## Security

- **Passwords:** bcrypt hashing via Django `BCryptPasswordHasher` (compatible with existing hashes)
- **JWT:** 24h expiration, payload `{ userId, email, admin, municipio_id }`, 256-bit secret, using `simplejwt`
- **CPF:** AES-256-GCM encrypted at rest + SHA-256 HMAC for unique lookups
- **CSRF:** Django `CsrfViewMiddleware` with `SameSite=Strict`
- **DRF Default:** `IsAuthenticated` — all endpoints locked by default; public ones explicitly use `AllowAny`
- **Rate Limiting:** `django-ratelimit` + Redis (multiple levels for auth, API, and per-user); circuit breaker on failures
- **HSTS/SSL:** Enforced in production settings (`SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`)
- **Non-root user:** Django Docker container runs as `django` (uid 1001)
- **Upload validation:** compress to WebP 1200px max, whitelist (JPEG/PNG/WebP/AVIF), 5MB limit
- **IA Circuit Breaker:** 3 failures → 60s cooldown, never blocks defect creation
- **Validation:** DRF serializers on all inputs
- **2FA:** Optional TOTP-based two-factor authentication
- **Encryption key:** AES-256-GCM (32 bytes / 64 hex chars), generated via `openssl rand -hex 32`

## PostGIS & Geospatial

PostgreSQL 16 with the PostGIS 3.4 extension for all spatial operations:

- **`municipios.polygon_geom`** — MultiPolygon(4326) from IBGE GeoJSON (~5570 municipalities, ~120MB)
- **`defeitos.geom`** — Generated always as `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)` (managed by Django/PostGIS migrations)
- **Perimeter validation:** `ST_Within(point, polygon_geom)` — defect must be inside the user's municipality
- **Duplicate detection:** `ST_DWithin(geom, 0.01)` (~1km radius) + embedding similarity > 0.3

## AI Classification Pipeline

```
User input → Tokenize (BERT tokenizer) → all-MiniLM-L6-v2 (ONNX)
  → Mean pooling → L2 normalize → Cosine similarity × 7 centroids
  → Softmax(t=3.0) → Category + confidence
```

- **Model:** `sentence-transformers/all-MiniLM-L6-v2` (384-dim embeddings, ~90MB)
- **Fallback:** Keyword classifier activates if ONNX fails to load or the IA container is down
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

## Technical Appendix

### Docker Architecture detail

Nginx (`nginx:80/443`) terminates SSL and serves the SPA build, reverse-proxying `/api/*` to `backend-python:8000` (Django/Gunicorn). Django persists to `postgres:5432` (PostgreSQL 16 + PostGIS) and calls `ia:8000` (FastAPI + ONNX) for classification. All services run on the `app-network` bridge. Compose files: `docker-compose.yml` (production), `docker-compose.dev.yml` (Django dev stack with Redis), `nginx.Dockerfile` (Nginx with pre-built frontend), `nginx.prod.conf` / `nginx.host.conf`.

### CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy.yml`):

```
Push to master
  → Lint backend (ruff) + frontend (eslint)
  → Build frontend (Vite)
  → Build Docker images
  → Deploy to VPS via SSH
  → docker compose pull && up -d
  → Health check verification
```

### Backup System

Automated PostgreSQL backup via `scripts/backup-postgres.sh`:

- **Schedule:** Daily via cron (Docker service `backup`, profile `backup`)
- **Output:** Compressed SQL dump (gzip)
- **Retention:** 30 days (configurable via `RETENTION_DAYS`)
- **Remote:** Optional S3-compatible upload via rclone
- **Notifications:** Optional Telegram alerts on failure

### Design System

Dark-first theme with CSS custom properties (`tokens.css`):

- **Font:** Inter (sans-serif) + JetBrains Mono (mono)
- **Typography:** 12px to 36px scale
- **Spacing:** 4px to 64px scale (8-step)
- **Dark:** `--bg-primary: #0d0d0f`, `--text-primary: #fafafa`, `--accent-green: #22c55e`
- **Light:** `--bg-primary: #f5f5f0`, `--text-primary: #1a1a1c`, contrast ~16.4:1 (AAA)

### Accessibility (WCAG AA)

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

### Keyboard Navigation

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

## Contributors

There are no external contributors yet beyond the author. Contributions are welcome under the project's MIT license.

## Authors

| Avatar | Name | Link |
|---|---|---|
| <img src="https://github.com/josemurilors.png" width=115> | José Murilo Rodrigues Sabalo | [josemurilors](https://github.com/josemurilors) |

Additional TCC group members will be added here later.

## License

This project is licensed under the **MIT License**. The full text is available in the `LICENSE` file.
