# Central de Inteligência Urbana

Sistema completo de abertura e gestão de chamados para serviços públicos, como Progressive Web App (PWA).

## Arquitetura

| Componente | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + Phosphor Icons |
| Backend | Node.js + Express (serve SPA + API no mesmo processo) |
| Banco de Dados | PostgreSQL 16 (pg, pool de 10 conexões) |
| Mapas | Leaflet + react-leaflet + leaflet.heat |
| Gráficos | Recharts (dashboard de métricas) |
| Autenticação | JWT + bcrypt + CSRF Double Submit Cookie |
| IA | Adaptador plugável (HuggingFace, OpenAI ou API própria) |
| Segurança | Helmet, Rate Limiting, Criptografia AES-256-GCM (CPF) |
| Notificações | Web Push API (PWA) |
| Logger | Pino estruturado com rotação |

## Como Iniciar com Docker (recomendado)

```bash
docker compose up -d --build
```

- Aplicação completa: http://localhost:5000
- Serviço de IA: http://localhost:8000 (opcional, ativar com `--profile ia`)

### Importar municípios do IBGE (primeira execução)

```bash
docker compose exec -T backend node seed-municipios-ibge.js
```

## Como Iniciar Localmente (sem Docker)

### Pré-requisitos
- Node.js 18+
- PostgreSQL 16 rodando localmente
- Python 3.9+ (para o serviço de IA, opcional)

### Passo a passo

1. **Configure o banco PostgreSQL**
   ```bash
   createdb manutencao_urbana
   ```

2. **Instale as dependências do Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # edite as credenciais
   ```

3. **Inicie o Backend**
   ```bash
   cd backend
   node --max-old-space-size=2048 index.js
   ```
   API em http://localhost:5000

4. **Inicie o Frontend** (em outro terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend em http://localhost:5173

5. **(Opcional) Importe os municípios**
   ```bash
   node backend/seed-municipios-ibge.js
   ```

## Serviço de IA (Pluggable)

| Variável | Descrição | Padrão |
|---|---|---|
| `CLASSIFICATION_API_URL` | URL da API de classificação | HuggingFace bart-large-mnli |
| `CLASSIFICATION_API_KEY` | Token de autenticação | vazio |
| `CLASSIFICATION_FORMAT` | Formato: `huggingface` ou `generic` | huggingface |
| `CLASSIFICATION_CATEGORIES` | Categorias separadas por vírgula | Buraco,Iluminação,... |

## Endpoints da API

### Autenticação
- `POST /api/auth/registro` — Cadastro com CPF e município
- `POST /api/auth/login` — Login
- `PATCH /api/auth/senha` — Alterar senha
- `POST /api/auth/verificar-email` — Verificar email

### Defeitos
- `GET /api/defeitos` — Listar todos (com contagem de apoios)
- `GET /api/defeitos/clusters` — Clusterizado para mapa
- `POST /api/defeitos` — Criar novo defeito com foto
- `PATCH /api/defeitos/:id` — Atualizar status/prioridade (admin)
- `POST /api/defeitos/:id/apoiar` — Alternar apoio (upvote)

### Administração
- `GET /api/auth/admin/users` — Listar usuários (admin)
- `GET /api/auth/admin/estatisticas` — Métricas do dashboard (admin)
- `PATCH /api/auth/admin/users/:id` — Atribuir município (admin)

### Categorias e Municípios
- `GET /api/categorias` — Listar categorias
- `GET /api/municipios` — Listar municípios (do IBGE)

### Segurança
- `GET /api/csrf-token` — Obter token CSRF
- Rate limit: 200 req/15min global, 20 auth, 50 API

## Rotas do Frontend

| Rota | Página | Descrição |
|---|---|---|
| `/` | MapPage | Mapa interativo com clusters |
| `/lista` | DefectList | Lista de chamados em cards |
| `/login` | Login | Autenticação |
| `/registro` | Register | Cadastro |
| `/conta` | AccountSettings | Alterar senha, verificar email |
| `/config` | Settings | Selecionar município |
| `/admin` | AdminDashboard | Painel admin com mapa + regiões |
| `/admin/dashboard` | AdminDashboardMetrics | Métricas com gráficos |
| `/admin/usuarios` | SuperAdmin | Gerenciar usuários e permissões |

## Design System

Tema escuro com design tokens CSS:

- **Fonte:** Inter (sans-serif) + JetBrains Mono (mono)
- **Tipografia:** Escala de 11px a 36px com tracking controlado
- **Espaçamento:** Escala de 4px a 64px
- **Cores:** bg-primary `#0d0d0f`, accent-green `#22c55e`
- **Componentes:** shadcn/ui-inspired, sem dependência externa
