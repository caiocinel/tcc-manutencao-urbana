# Documentacao do Projeto: Central de Inteligencia Urbana

## Visao Geral

Sistema completo para reporte e gestao de chamados de infraestrutura urbana. Cidadaos podem fotografar buracos, iluminacao quebrada, calcadas danificadas e outros defeitos, marcar a localizacao no mapa, e acompanhar o status da resolucao.

## Infraestrutura

**Hospedagem:** Hetzner (Nuremberga, Alemanha) — VPS ARM64 CX11
**Especificacoes:** Ampere Altra, 4GB RAM, 2 nucleos, 40GB NVMe

## Migracao para VPS ARM (2026)

O sistema foi migrado de uma VPS x86 com 300MB RAM e 1 nucleo para a VPS ARM atual. A justificativa:

| Aspecto | VPS Anterior | VPS Atual | Ganho |
|---|---|---|---|
| Arquitetura | x86 (Intel/AMD) | ARM64 (Ampere Altra) | — |
| RAM | 300 MB | 4 GB | 13x |
| CPU | 1 nucleo | 2 nucleos | 2x |
| Custo/mes | ~$12 | ~$8 | **~33% menor** |
| Consumo | ~45W | ~15W | 3x mais eficiente |

**Decisao arquitetural:** A arquitetura ARM (Ampere Altra) oferece melhor desempenho por watt e custo inferior em relacao a x86 equivalente. Os 4GB de RAM permitem alocar heap de 2GB para o Node.js (vs 80MB anterior), essencial para o dashboard de BI com recharts. O segundo nucleo e integralmente aproveitado pelo Sharp (multi-thread) no processamento de imagens e pelo PostgreSQL em queries paralelas. O banco migrou de SQLite (sem concorrencia) para PostgreSQL com pool de 10 conexoes, eliminando lock de escrita em cenarios de multiplos usuarios simultaneos.

**Alteracoes principais:**
- SQLite (better-sqlite3) → PostgreSQL 16 (pg, pool 10 conexoes)
- Heap Node: 80MB → 2GB (`--max-old-space-size=2048`)
- Redimensionamento de imagens: 800px → 1200px (aproveitando 2 cores ARM)
- Logs: console.log → Pino estruturado com rotacao
- PM2 com restart automatico (max_restarts: 10)
- Nginx com cache de 30 dias para uploads
- Docker Compose com healthchecks em todos os servicos

---

## Arquitetura do Sistema

```
+----------------------------------------------------------+
|                   NGINX (Proxy Reverso + SSL)             |
|  Porta 80 (HTTP -> redireciona HTTPS)                    |
|  Porta 443 (HTTPS com Let's Encrypt)                     |
|  Proxy reverso para backend:5000                         |
|  Cache de assets estaticos (30d)                         |
+---------------------------+------------------------------+
|                   FRONTEND (React + Vite)                 |
|  Build estatico servido pelo Nginx                       |
|  PWA com service worker + notificacoes push              |
+---------------------------+------------------------------+
|                   BACKEND (Node.js + Express)             |
|  Porta 5000 (interno, atras do Nginx)                    |
|  --max-old-space-size=2048 (heap de 2GB)                 |
|  PM2 (gerenciamento de processo)                         |
|  Pino Logger (logs em arquivo + stdout)                  |
|  Helmet + CSRF Double Submit Cookie                      |
+---------------------------+------------------------------+
|                   BANCO POSTGRESQL (pg)                   |
|  postgres:16-alpine (ARM nativo)                         |
|  Pool de conexoes (max 10)                               |
|  Volume persistente separado                             |
+---------------------------+------------------------------+
|                   SERVICOS ADICIONAIS                     |
|  email.js - Envio de codigos de verificacao (Resend)    |
|  encryption.js - Criptografia de CPF (AES-256-GCM)       |
|  cpfValidator.js - Validacao de CPF via BrasilAPI        |
+---------------------------+------------------------------+
|                   IA OPCIONAL (Python/FastAPI)            |
|  Porta 8000 (profile: ia)                                |
|  Classificacao de texto (ONNX embeddings + fallback)     |
|  Extracao de prioridade automatica                       |
|  Similaridade semantica (embeddings ONNX)                |
|  Moderacao de spam (keywords + taxa de repeticao)        |
|  Resumo semanal + clusters criticos (via backend)        |
+----------------------------------------------------------+
```

---

## 1. BACKEND

### 1.1 Entry Point - `backend/index.js`

**Arquivo:** `backend/index.js`

**Funcao:** Ponto de entrada do servidor Express. Configura middlewares globais, rotas e inicializa o banco.

**Fluxo:**
1. Valida segredos obrigatorios (`JWT_SECRET` >= 10 chars, `ENCRYPTION_KEY` >= 16 chars)
2. Carrega variaveis de ambiente do `.env` via `dotenv`
3. Cria instancia do Express, trust proxy habilitado
4. Configura CORS para o frontend (com credentials)
5. Helmet: headers de seguranca (CSP desabilitado para Leaflet)
6. Limite de 5MB para JSON bodies
7. Parse de cookies via `cookie-parser`
8. Aplica rate limit global (200 req/15min)
9. Serve arquivos de upload estaticamente em `/uploads`
10. `GET /api/csrf-token` -> gera tokens CSRF (Double Submit Cookie)
11. Monta rotas: `/api/auth`, `/api/defeitos` (com CSRF), `/api/municipios`, `/api/categorias`, `/api/ia`
12. `GET /api/health` -> health check da API
13. Serve frontend buildado (SPA catch-all em producao)
14. Conecta ao PostgreSQL e inicia o servidor

### 1.2 Configuracao do Banco - `backend/src/config/database.js`

**Arquivo:** `backend/src/config/database.js`

**Funcao:** Inicializa o PostgreSQL, cria as tabelas e exporta o pool de conexoes.

**Tecnologia:** `pg` (node-postgres) — driver nativo PostgreSQL com pool de conexoes.

**Configuracoes:**
- Pool max: 10 conexoes simultaneas
- Connection timeout: 5s
- Idle timeout: 30s
- Healthcheck automatico no container
- Query logger: queries lentas (>500ms) sao registradas no Pino

**Schema principal:**

```sql
users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  senha           TEXT NOT NULL,         -- Hash bcrypt
  admin           INTEGER DEFAULT 0,    -- 0=comum, 1=admin
  municipio_id    TEXT,                  -- FK -> municipios(codigo)
  cpf             TEXT,                  -- Criptografado (AES-256-GCM)
  cpf_hash        TEXT UNIQUE,           -- Hash SHA-256 para busca unica
  email_verificado INTEGER DEFAULT 0,    -- 0=nao, 1=sim
  codigo_2fa      TEXT,                  -- Codigo de verificacao 2FA
  codigo_2fa_expira TEXT,               -- ISO timestamp de expiracao
  requestsResetAt TEXT,                  -- Timestamp do ultimo reset de rate limit
  requestsCount   INTEGER DEFAULT 0,    -- Contador de requisicoes do usuario
  criado_em       TEXT NOT NULL,
  atualizado_em   TEXT NOT NULL
)

 municipios (
   codigo          TEXT PRIMARY KEY,      -- Codigo IBGE (7 digitos)
   nome            TEXT NOT NULL,
   uf              TEXT NOT NULL,
   uf_sigla        TEXT NOT NULL,
   min_lat         DOUBLE PRECISION NOT NULL, -- Bounding box
   max_lat         DOUBLE PRECISION NOT NULL,
   min_lng         DOUBLE PRECISION NOT NULL,
   max_lng         DOUBLE PRECISION NOT NULL,
   poligono_json   TEXT                   -- GeoJSON opcional
 )

 categorias (
   id              SERIAL PRIMARY KEY,
   nome            TEXT UNIQUE NOT NULL,  -- Nome da categoria (ex: "Buraco", "Arvore Caida")
   icone           TEXT,                  -- Emoji para UI
   prioridade_base TEXT DEFAULT 'media',  -- baixa | media | alta
   prazo_sla_dias  INTEGER DEFAULT 7      -- Prazo de atendimento em dias
 )

 defeitos (
   id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   usuario         TEXT NOT NULL REFERENCES users(id),
   titulo          TEXT NOT NULL,
   descricao       TEXT,
   latitude        DOUBLE PRECISION,
   longitude       DOUBLE PRECISION,
   rua             TEXT,                  -- Logradouro (geocodificacao reversa)
   bairro          TEXT,                  -- Bairro (geocodificacao reversa)
   imagem_url      TEXT,                  -- Caminho da foto comprimida (WebP)
   categoria       TEXT,                  -- FK logica -> categorias(nome)
   status          TEXT DEFAULT 'pendente', -- pendente | em_andamento | atendido | encerrado
   prioridade      TEXT DEFAULT 'media',  -- baixa | media | alta
   previsao_conclusao TEXT,               -- Data ISO do SLA (baseado na categoria)
   atendido_em     TEXT,                  -- ISO timestamp de atendimento
   usuario_email   TEXT,                  -- Email do usuario (cache para buscas)
   imagem_thumbnail BYTEA,                -- Thumbnail WebP 200px (~5-15KB)
   imagens_extra   TEXT DEFAULT '[]',     -- JSON array de URLs de imagens adicionais (anexos)
   atualizacoes    TEXT DEFAULT '[]',     -- JSON array de objetos {texto, usuario, criado_em} (complementos)
   criado_em       TEXT NOT NULL,
   atualizado_em   TEXT NOT NULL
 )

-- Tabela de apoio (upvotes)
apoios (
  id              SERIAL PRIMARY KEY,
  usuario_id      TEXT NOT NULL REFERENCES users(id),
  defeito_id      TEXT NOT NULL REFERENCES defeitos(id),
  criado_em       TEXT NOT NULL DEFAULT (TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  UNIQUE(usuario_id, defeito_id)
)

-- Tabela de inscricoes push (notificacoes PWA)
push_subscriptions (
  id              SERIAL PRIMARY KEY,
  usuario_id      TEXT NOT NULL REFERENCES users(id),
  endpoint        TEXT NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  criado_em       TEXT NOT NULL DEFAULT (TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  UNIQUE(usuario_id, endpoint)
)
```

**Indices**: idx_defeitos_categoria, idx_defeitos_status, idx_defeitos_usuario, idx_users_cpf_hash

### 1.3 Modelo de Usuario - `backend/src/models/User.js`

**Arquivo:** `backend/src/models/User.js`

**Funcao:** Abstrai operacoes CRUD na tabela `users`.

**Criptografia de CPF:**
- CPF armazenado criptografado (AES-256-GCM via `encryption.js`)
- Hash SHA-256 para buscas por CPF sem expor o dado original

**Queries parametrizadas ($1, $2, ... via pool.query):**

| Statement | SQL | Uso |
|---|---|---|
| `findOne` | `SELECT * FROM users WHERE LOWER(email) = LOWER(?)` | Login |
| `findById` | `SELECT * FROM users WHERE id = ?` | Autenticacao/autorizacao |
| `findByCpf` | `SELECT * FROM users WHERE cpf_hash = ?` | Verificar CPF duplicado |
| `insert` | `INSERT INTO users (...) VALUES (...)` | Cadastro |
| `update` | `UPDATE users SET admin, requestsResetAt, requestsCount, atualizado_em` | Persistir alteracoes |
| `updatePassword` | `UPDATE users SET senha, atualizado_em` | Alterar senha |
| `verifyEmail` | `UPDATE users SET email_verificado = 1, atualizado_em` | Confirmar email |
| `set2faCode` | `UPDATE users SET codigo_2fa, codigo_2fa_expira, atualizado_em` | Salvar codigo de verificacao |
| `clear2faCode` | `UPDATE users SET codigo_2fa = NULL, codigo_2fa_expira = NULL, atualizado_em` | Limpar codigo apos uso |

**Metodos exportados:**

| Metodo | Descricao |
|---|---|
| `findOne({ email })` | Busca usuario por email (case-insensitive) |
| `findById(id)` | Busca usuario por UUID |
| `findByCpf(cpf)` | Busca por hash do CPF |
| `create(data)` | Cria novo usuario com UUID, timestamps, CPF criptografado |
| `updatePassword(id, hashedPassword)` | Altera hash da senha |
| `verifyEmail(id)` | Marca email como verificado |
| `set2faCode(id, code, expiraEm)` | Armazena codigo de verificacao com expiracao |
| `clear2faCode(id)` | Remove codigo apos uso |

**Funcao `toUser(row)`:** Converte linha do PostgreSQL em objeto com metodo `save()` para persistir alteracoes (admin, requestsResetAt, requestsCount).

### 1.4 Modelo de Defeito - `backend/src/models/Defeito.js`

**Arquivo:** `backend/src/models/Defeito.js`

**Funcao:** Abstrai operacoes CRUD na tabela `defeitos` com query builder fluente.

**Novos campos desde a versao original:**
- `prioridade` — baixa | media | alta (default: media)
- `atendido_em` — timestamp do atendimento
- `usuario_email` — cache do email para buscas
- `previsao_conclusao` — data ISO do SLA
- `imagens_extra` — JSON array de URLs de imagens adicionais (anexos)
- `atualizacoes` — JSON array de objetos `{texto, usuario, criado_em}` (complementos/atualizações)

**Sistema de Anexos e Complementos:
- Usuários autenticados podem adicionar **complementos** (texto) e **anexos** (imagens) a chamados
- Limite: máximo 3 imagens por chamado (imagem principal + até 2 extras)
- Apenas chamados com status `pendente` podem receber anexos
- Campos:
  - `imagens_extra`: array de URLs `/uploads/arquivo.webp
  - `atualizacoes`: array de objetos com texto, autor e data

**Query Builder (DefeitoQuery):**
```javascript
Defeito.find({ status: 'pendente' })
  .populate('usuario', 'nome email')
  .sort({ criado_em: -1 })
```
- Suporte a filtro por array (`{ status: ['pendente', 'em_andamento'] }`)
- Cache de queries geradas por SQL (`Map<string, QueryConfig>`)
- Whitelist de colunas permitidas para WHERE

**Classes internas:**

| Classe | Funcao |
|---|---|
| `DefeitoQuery` | Constroi consulta SELECT dinamica com WHERE, ORDER BY e populate |
| `SingleDefeitoQuery` | Busca por ID com populate opcional |

**Metodos exportados:**

| Metodo | Descricao |
|---|---|
| `find(query)` | Inicia query builder com filtro opcional |
| `findById(id)` | Inicia query builder para busca por ID |
| `create(data)` | Cria novo defeito com UUID, timestamps, status "pendente", prioridade "media" |
| `findByIdAndUpdate(id, update)` | Merge parcial: se status='atendido' e nao havia atendido_em, define automaticamente |

### 1.4.1 Modelo de Apoio (Upvote) - `backend/src/models/Apoio.js`

**Arquivo:** `backend/src/models/Apoio.js`

**Funcao:** Abstrai operacoes na tabela `apoios` — sistema de apoio a chamados.

**Metodos exportados:**

| Metodo | Descricao |
|---|---|
| `toggle(usuarioId, defeitoId)` | Alterna apoio (cria se nao existir, remove se existir). Retorna `{ apoiou: boolean }` |
| `countByDefeito(defeitoId)` | Retorna total de apoios de um defeito |
| `countsByDefeitos(defeitoIds[])` | Retorna mapa `{ [defeito_id]: total }` para multiplos defeitos |
| `hasApoiado(usuarioId, defeitoId)` | Verifica se usuario ja apoiou um defeito |
| `hasApoiadoMany(usuarioId, defeitoIds[])` | Retorna mapa `{ [defeito_id]: true }` para multiplos defeitos |

### 1.4.2 Servico de Notificacoes Push - `backend/src/services/push.js`

**Arquivo:** `backend/src/services/push.js`

**Funcao:** Gerenciamento de inscricoes push e disparo de notificacoes PWA via Web Push API.

**Tecnologia:** `web-push` — implementacao do protocolo Web Push para Node.js.

**Chaves VAPID:**
- Geradas automaticamente se `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` nao estiverem no `.env`
- As chaves geradas sao exibidas no console do servidor para persistencia
- Se a geracao falhar, notificacoes push sao desabilitadas graciosamente

**Metodos exportados:**

| Metodo | Descricao |
|---|---|
| `getPublicKey()` | Retorna chave publica VAPID (para frontend subscrever) |
| `saveSubscription(usuarioId, subscription)` | Salva subscription do navegador no banco |
| `notifyUser(usuarioId, title, body, url)` | Dispara notificacao para todas as subscriptions do usuario |

### 1.5 Rotas de Autenticacao - `backend/src/routes/auth.js`

**Arquivo:** `backend/src/routes/auth.js`

**Funcao:** Endpoints para registro, login, gerenciamento de conta e administracao.

**POST `/api/auth/registro`**

| Aspecto | Detalhe |
|---|---|
| Rate limit | `authLimiter` (10 tentativas/15min) |
| Campos | `{ nome, email, senha, municipio_id?, cpf? }` |
| Validacao | Email unico, regex, CPF (digitos + BrasilAPI), senha >= 6 |
| Criptografia | CPF armazenado criptografado (AES-256-GCM) + hash SHA-256 |
| Pos-cadastro | Envia codigo de verificacao de email (6 digitos, 10min expiracao) |
| Token | JWT com `{ userId, email, admin, municipio_id }`, expira em 24h |
| Resposta | `{ token, user: { id, nome, email, admin, municipio, cpf, email_verificado } }` |

**POST `/api/auth/login`**

| Aspecto | Detalhe |
|---|---|
| Rate limit | `authLimiter` (10 tentativas/15min) |
| Validacao | Email existe? Senha confere (bcrypt)? |
| Token | JWT com `{ userId, email, admin, municipio_id }` |
| Resposta | `{ token, user: { id, nome, email, admin, municipio } }` |

**POST `/api/auth/validar-cpf`**

| Aspecto | Detalhe |
|---|---|
| Autenticacao | Nao |
| Rate limit | `authLimiter` |
| Funcao | Valida CPF (digitos verificadores + BrasilAPI) |
| Resposta | `{ valido, nome?, situacao? }` |

**POST `/api/auth/enviar-2fa`**

| Aspecto | Detalhe |
|---|---|
| Autenticacao | Nao |
| Funcao | Envia codigo 2FA para email do usuario (5min expiracao) |

**POST `/api/auth/verificar-2fa`**

| Aspecto | Detalhe |
|---|---|
| Autenticacao | Nao |
| Funcao | Verifica codigo 2FA e retorna JWT |
| Resposta | `{ token, user }` |

**Endpoints protegidos (JWT obrigatorio):**

| Metodo | Rota | Funcao |
|---|---|---|
| PATCH | `/api/auth/municipio` | Atualiza municipio do usuario logado |
| POST | `/api/auth/verificar-email` | Verifica email com codigo (6 digitos) |
| POST | `/api/auth/reenviar-codigo` | Reenvia codigo de verificacao |
| PATCH | `/api/auth/senha` | Altera a senha (requer senha atual) |

**Endpoints de notificacoes push:**

| Metodo | Rota | Auth | Funcao |
|---|---|---|---|
| GET | `/api/auth/push/key` | — | Chave publica VAPID para inscricao push |
| POST | `/api/auth/push/subscribe` | JWT | Salva subscription do navegador |

**Endpoints de administracao:**

| Metodo | Rota | Auth | Funcao |
|---|---|---|---|
| GET | `/api/auth/admin/users` | JWT + admin | Lista todos os usuarios com municipios |
| GET | `/api/auth/admin/estatisticas` | JWT + admin | Metricas do dashboard (total, por categoria, por status, SLA, taxa de resolucao) |
| PATCH | `/api/auth/admin/users/:id` | JWT + admin | Atribui municipio a usuario |
| PATCH | `/api/auth/admin/users/:id/admin` | JWT + super admin | Promove/remove admin |

**Hierarquia de admin:**
- **Admin comum** (`user.admin === true`): gerencia defeitos (status, prioridade), lista usuarios, atribui municipios
- **Super admin** (email = `josemurilorodriguessabalo@gmail.com`): unico que pode promover/remover admins

### 1.6 Rotas de Defeitos - `backend/src/routes/defeitos.js`

**Arquivo:** `backend/src/routes/defeitos.js`

**Funcao:** CRUD de defeitos com upload de imagem, clusterizacao, lote e classificacao IA.

**Middleware:**
- `authenticateToken` - Extrai JWT do header `Authorization`
- `requireEmailVerified` - Bloqueia usuarios nao-admin com email nao verificado (codigo 403)
- `checkUserRateLimit` - Max 10 requisicoes/hora por usuario (reset automatico)
- `upload.single('imagem')` - Multer com filtro de tipo (JPEG, PNG, WebP, GIF, AVIF) e limite 5MB
- `handleMulterError` - Tratamento amigavel de erros do Multer
- `compressImage` - Redimensiona para 1200px WebP q80 (Sharp)

**Endpoint publico de clusterizacao:**

`GET /api/defeitos/clusters?status=&usuario=`
- Agrupa defeitos por proximidade geografica (raio ~500m = 0.005 graus)
- Parametros: `status` (virgulado: `pendente,em_andamento`), `usuario` (ID)
- Retorna: `[ { id, centro: { latitude, longitude }, total, com_imagem, status: {}, defeitos[] } ]`

**Endpoints:**

| Metodo | Rota | Auth | Rate Limit | Descricao |
|---|---|---|---|---|
| POST | `/` | JWT + email verificado | Usuario (10/h) + API (50/h) | Criar defeito com foto (exceto admin) |
| GET | `/` | Publica | — | Listar todos (inclui contagem de apoios) |
| GET | `/meus` | JWT | — | Listar do usuario logado |
| GET | `/regioes` | JWT (admin) | — | Agrupar por regiao (admin dashboard) |
| GET | `/clusters` | Publica | — | Clusterizado para mapa |
| POST | `/encerrar-lote` | JWT | — | Encerrar multiplos por IDs |
| POST | `/:id/apoiar` | JWT | — | Alternar apoio (upvote toggle) |
| GET | `/:id` | Publica | — | Detalhe (inclui contagem de apoios) |
| PATCH | `/:id` | JWT (admin) | API (50/h) | Atualizar status/prioridade (dispara notificacao push) |
| **PATCH** | **`/:id/anexar`** | **JWT** | **API (50/h)** | **Anexar imagem e/ou texto (apenas chamados pendentes, max 3 imagens)** |

**Funcao `clusterizarDefeitos`:**
- Algoritmo guloso: para cada defeito nao visitado, agrupa vizinhos dentro do raio
- Ordena clusters por total (decrescente)
- Limita a 20 defeitos por cluster (evita payloads grandes)
- Usada tanto por `/clusters` (publico) quanto `/regioes` (admin)

**Rota de Anexo (`PATCH /:id/anexar`):**
- **Formato:** `multipart/form-data` (para upload de arquivo)
- **Campos:**
  - `imagem` (opcional): arquivo de imagem (JPEG, PNG, WebP, GIF, AVIF, max 5MB)
  - `atualizacao` (opcional): texto com complemento/atualizacao sobre o chamado
- **Regras:**
  - Apenas chamados com status `pendente` podem receber anexos
  - Limite máximo de **3 imagens** por chamado (imagem principal + até 2 extras)
  - Requer autenticação JWT
- **Retorno:** defeito atualizado com `imagens_extra` e `atualizacoes`

**Classificacao IA (opcional):**
- Apos criar o defeito, chama `POST /classify-full` que retorna `{ category, confidence, priority, priority_confidence }`
- Extracao de **prioridade** via keywords (urgente > alta > media > baixa)
- **Deteccao de duplicatas**: busca chamados num raio de ~1km nos ultimos 7 dias + similaridade textual (bag-of-words cosseno > 0.3)
- **Moderacao de spam**: descricoes curtas (<3 palavras), conteudo generico (teste, asdf), texto repetitivo (unique_ratio < 0.3)
- **Encaminhamento inteligente**: mapeamento estatico categoria → secretaria responsavel + prazo SLA
- Circuit breaker: 3 falhas consecutivas → pula IA por 60s. Timeout: 3s por chamada.
- Falha silenciosa se indisponivel — nunca bloqueia criacao do defeito

### 1.7 Rotas de Municipios - `backend/src/routes/municipios.js`

**Arquivo:** `backend/src/routes/municipios.js`

**Funcao:** Lista municipios para dropdowns (cadastro, settings, admin).

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/municipios` | Lista todos (codigo, nome, uf_sigla) ordenado por UF/nome |
| GET | `/api/municipios/:codigo` | Detalhe com bounding box e poligono |

### 1.7.1 Rotas de Categorias - `backend/src/routes/categorias.js`

**Arquivo:** `backend/src/routes/categorias.js`

**Funcao:** Lista categorias predefinidas com icone, prioridade base e prazo SLA.

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/categorias` | Lista todas (id, nome, icone, prioridade_base, prazo_sla_dias) |

**Categorias Padrao (seed automatico):**

| Categoria | Icone | Prioridade Base | SLA (dias) |
|---|---|---|---|
| Segurança Crítica | ⚠️ | alta | 1 |
| Saneamento/Saúde | 💧 | alta | 3 |
| Mobilidade | 🛣️ | media | 7 |
| Zeladoria | 🧹 | baixa | 15 |
| Iluminação | 💡 | media | 5 |
| Árvore Caída | 🌳 | alta | 2 |
| Semáforo | 🚦 | alta | 2 |
| Buraco | 🕳️ | media | 7 |
| Outro | 📋 | baixa | 15 |

**SLA (Service Level Agreement):**
- Ao criar um chamado, a `previsao_conclusao` é calculada automaticamente com base no `prazo_sla_dias` da categoria
- Prioridade do chamado herda da `prioridade_base` da categoria

### 1.8 Middleware CSRF - `backend/src/middleware/csrf.js`

**Arquivo:** `backend/src/middleware/csrf.js`

**Funcao:** Protecao contra Cross-Site Request Forgery usando Double Submit Cookie.

**Cookies:**

| Cookie | httpOnly | Acessivel via JS | Finalidade |
|---|---|---|---|
| `XSRF-SESSION` | Sim | Nao | Identificar sessao do cliente |
| `XSRF-TOKEN` | Nao | Sim | Token de seguranca enviado no header |

**Fluxo:**
1. `GET /api/csrf-token` -> `generateCsrfToken` define ambos os cookies
2. Mutation (POST/PATCH/DELETE) -> frontend envia `XSRF-TOKEN` no header `X-XSRF-TOKEN`
3. `validateCsrfToken` compara header com cookie -> 403 se diferente
4. Rotas `/api/auth` nao usam CSRF (protegidas por JWT)
5. Rotas `/api/defeitos` usam CSRF em mutations

### 1.9 Rate Limiting - `backend/src/middleware/rateLimit.js`

**Arquivo:** `backend/src/middleware/rateLimit.js`

**Funcao:** Tres niveis de limitadores usando `express-rate-limit`.

| Limitador | Janela | Maximo | Escopo |
|---|---|---|---|---|
| `globalLimiter` | 15 min | 200 | Todas as rotas (dobrado vs VPS anterior) |
| `authLimiter` | 15 min | 20 | Login/registro/validar-cpf (dobrado) |
| `apiLimiter` | 1 hora | 200 | Rotas de defeitos (POST/PATCH, quadruplicado) |

**Rate limit por usuario:** 10 requisicoes/hora controlado pelo modelo User (colunas `requestsCount` e `requestsResetAt`).

### 1.10 Compressao de Imagens - `backend/src/middleware/imageProcessor.js`

**Arquivo:** `backend/src/middleware/imageProcessor.js`

**Funcao:** Middleware que comprime imagens apos o upload usando Sharp.

**Pipeline de processamento:**
1. Redimensiona para max 1200px na maior dimensao (mantem proporcao) — aproveita 2 cores ARM do Ampere
2. `withoutEnlargement: true` -> nao amplia imagens menores
3. Converte para WebP com qualidade 80
4. Remove o arquivo original (nao comprimido)
5. Atualiza `req.file.filename` e `req.file.path`
6. Gera thumbnail de 200px WebP q55 como Buffer -> `req.file.thumbnailBlob`

**Thumbnail no banco (coluna `imagem_thumbnail BLOB`):**
- Apos a compressao principal, um segundo thumbnail (200px, q55, ~5-15KB) e gerado
- O Buffer e armazenado na coluna `imagem_thumbnail` da tabela `defeitos`
- Na serializacao JSON da API, o BLOB e convertido para base64 (`data:image/webp;base64,...`)
- O frontend exibe o thumbnail (menor, sem requisicao extra) em popups e listas
- A imagem cheia continua sendo servida do disco via `imagem_url`

**Beneficios:**
- Economia de ~70-80% de espaco em disco vs JPEG/PNG originais
- Carregamento mais rapido no frontend
- Menos consumo de banda
- Popups e listas carregam thumbnails instantaneamente (base64 inline, sem HTTP extra)

### 1.11 Servicos

**Email - `backend/src/services/email.js`**
- `sendVerificationCode(email, code)` — Envia codigo de verificacao de email (6 digitos)
- `send2faCode(email, code)` — Envia codigo de autenticacao 2FA (6 digitos)
- Servico via Resend API (`RESEND_API_KEY`, `FROM_EMAIL`)
- Fallback: loga o codigo no console se Resend indisponivel

**Criptografia - `backend/src/services/encryption.js`**
- `encrypt(text)` — AES-256-GCM com IV aleatorio, retorna base64
- `decrypt(encrypted)` — Decriptografa base64 para texto
- `hash(text)` — SHA-256 para busca de CPF
- Chave: `ENCRYPTION_KEY` (min 16 chars)

**CPF Validator - `backend/src/services/cpfValidator.js`**
- `validarDigitos(cpf)` — Valida os 2 digitos verificadores
- `consultarBrasilAPI(cpf)` — Consulta dados publicos via BrasilAPI

---

## 2. FRONTEND

### 2.1 Configuracao Vite - `frontend/vite.config.js`

**Arquivo:** `frontend/vite.config.js`

**Plugins:**
- `@vitejs/plugin-react` — Fast Refresh e JSX transform
- `vite-plugin-pwa` — Service worker com workbox precaching

**Proxy de desenvolvimento:**
- `/api` -> `http://localhost:5000` (evita CORS)
- `/uploads` -> `http://localhost:5000` (fotos)

### 2.2 Design Tokens - `frontend/src/styles/tokens.css`

**Arquivo:** `frontend/src/styles/tokens.css`

**Funcao:** Define todas as variaveis CSS do design system com tema dourado (gold).

**Migracao (15/05/2026):** Design system migrado de CSS custom (`App.css`, 1092 linhas) para Tailwind v4 + tokens CSS com prefixo `--color-*`. Tema alterado para paleta dourada com fonte Geist Variable.

```css
:root {
  /* Fontes */
  --font-sans: 'Geist Variable', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Cores - Tema Dourado */
  --color-gold-50: #FDF8E8;
  --color-gold-100: #F5F0E8;
  --color-gold-200: #E8D9A8;
  --color-gold-300: #D4B872;
  --color-gold-400: #D4A017;
  --color-gold-500: #D4A017;
  --color-gold-600: #B8860B;
  --color-gold-700: #996515;
  --color-gold-800: #7A4B0A;
  --color-gold-900: #5C3A00;

  --color-bg-primary: #0A0A0A;
  --color-bg-surface: #141414;
  --color-bg-elevated: #1A1A1A;
  --color-bg-hover: #252525;
  --color-bg-input: #0A0A0A;

  --color-border-default: #2A2A2A;
  --color-border-hover: #3A3A3A;

  --color-text-primary: #FAFAFA;
  --color-text-secondary: #A1A1AA;
  --color-text-tertiary: #71717A;
  --color-text-muted: #52525B;
  --color-text-inverse: #0A0A0A;

  --color-success: #4CAF7D;
  --color-warning: #D4A017;
  --color-error: #CF4444;
  --color-info: #4A90D9;

  --color-overlay: rgba(0, 0, 0, 0.7);
  --color-backdrop: rgba(0, 0, 0, 0.6);

  /* Status colors */
  --status-pendente: #4A90D9;
  --status-em_andamento: #D4A017;
  --status-atendido: #4CAF7D;
  --status-encerrado: #6B5B3E;
  --status-concluido: #4CAF7D;
  --status-critico: #CF4444;

  /* Tipografia */
  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-md: 16px;
  --text-lg: 17px;
  --text-xl: 19px;
  --text-2xl: 21px;
  --text-3xl: 25px;
  --text-4xl: 30px;
  --text-5xl: 36px;

  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Espacamento */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 28px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 999px;

  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
  --shadow-diffusion: 0 20px 40px -15px rgba(0,0,0,0.5);

  /* Transicoes */
  --transition-fast: 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  --transition-base: 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  --transition-spring: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**`globals.css` (novo):** Importa Tailwind v4 via `@import "tailwindcss"`, usa `@theme inline` para mapear tokens Tailwind às variaveis CSS, e importa `tw-animate-css` para animacoes.

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --color-gold-50: var(--color-gold-50);
  --color-gold-500: var(--color-gold-500);
  --color-gold-600: var(--color-gold-600);
  --color-bg-primary: var(--color-bg-primary);
  --color-bg-surface: var(--color-bg-surface);
  --color-bg-elevated: var(--color-bg-elevated);
  --color-bg-hover: var(--color-bg-hover);
  --color-text-primary: var(--color-text-primary);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-muted: var(--color-text-muted);
  --color-border-default: var(--color-border-default);
  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --color-error: var(--color-error);
  --color-info: var(--color-info);
}
```

### 2.3 Componente Raiz - `frontend/src/App.jsx`

**Arquivo:** `frontend/src/App.jsx`

**Migracao (15/05/2026):** Reescrito com nova arquitetura: `ProtectedRoute`, `AppHeader`, `AppLayout`, `CommandMenu`, `UserDropdown`. Removido `SkipLink` (integrado ao layout), `MapPageGuard` (substituido por ProtectedRoute). Importacao trocada de `App.css` para `globals.css`.

**Provedores e rotas:**

```jsx
<ErrorBoundary>                           ← Captura erros de renderizacao
  <IconContext.Provider value={...}>       ← Tema dos icones Phosphor
    <ThemeProvider>                        ← Tema claro/escuro
      <AuthProvider>                       ← Gerencia estado de login global
        <ToastProvider>                    ← Notificacoes toast (auto-dismiss 3.5s)
          <BrowserRouter>                  ← Navegacao SPA
            <KeyboardNav />                ← Atalhos de teclado
            <AppLayout />                  ← Layout com header condicional + routes
              <AppHeader />                ← Header com logo, busca, tema, user
              <CommandMenu />              ← Busca global (Cmd+K)
              <UserDropdown />             ← Menu do usuario com avatar
              <ProtectedRoute />           ← Wrapper para rotas autenticadas
              <Routes>
                /              → MapPage       (mapa interativo com clusters)
                /login         → Login         (autenticacao com framer-motion)
                /registro      → Register      (cadastro com CPF e municipio)
                /lista         → DefectList    (lista de chamados em cards)
                /config        → Settings      (selecao de municipio)
                /conta         → ProfileSettings (configuracoes da conta)
                /configuracoes → GeneralSettings (configuracoes gerais)
                /admin         → AdminDashboard   (painel admin com mapa + regioes)
                /admin/dashboard → AdminDashboardMetrics (metricas com graficos)
                /admin/usuarios  → SuperAdmin      (gerenciar usuarios e permissoes)
                *                → redirect para /
              </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </IconContext.Provider>
</ErrorBoundary>
```

**Novos componentes internos:**

| Componente | Funcao |
|---|---|
| `ProtectedRoute` | Wrapper que verifica `isAuthenticated` e redireciona para `/login` se nao autenticado. Mostra loading skeleton durante verificacao. |
| `AppHeader` | Header com logo SVG, titulo "Central de Inteligencia Urbana", botao de busca (Cmd+K), toggle de tema (Sun/Moon), e `UserDropdown` ou botao "Entrar". |
| `AppLayout` | Layout principal com `flex` column, header condicional (nao renderiza em paginas de auth ou mapa), e `main` com `Routes`. |
| `PageFallback` | Skeleton de loading com animacao pulse (substitui skeleton classes antigas). |
| `AnimatedRoute` | Wrapper com `framer-motion` para transicoes de pagina (duration 0.2s, y: 6). |

### 2.4 Servico de API - `frontend/src/services/api.js`

**Arquivo:** `frontend/src/services/api.js`

**Funcao:** Cliente HTTP que encapsula comunicacao com o backend.

**Funcionalidades:**
- **JWT:** Le token do `localStorage` e insere no header `Authorization`
- **CSRF:** Obtem token via `GET /api/csrf-token` antes de mutations
- **FormData:** Funcao `uploadDefeito` para enviar formulario com arquivo (sem Content-Type para o browser definir boundary)
- **Tratamento de erros:** Extrai mensagem do JSON de erro ou usa fallback

**Metodos exportados:**

| Metodo | Endpoint | Uso |
|---|---|---|
| `login(email, senha)` | POST `/api/auth/login` | Autenticacao |
| `register(nome, email, senha, municipio_id?, cpf?)` | POST `/api/auth/registro` | Cadastro |
| `validarCpf(cpf)` | POST `/api/auth/validar-cpf` | Validar CPF no cadastro |
| `listDefeitos()` | GET `/api/defeitos` | Listar todos |
| `getDefeito(id)` | GET `/api/defeitos/:id` | Detalhe |
| `createDefeito(formData)` | POST `/api/defeitos` | Criar com foto |
| `updateDefeito(id, data)` | PATCH `/api/defeitos/:id` | Atualizar status/prioridade |
| `listCategorias()` | GET `/api/categorias` | Lista categorias com icone, prioridade e SLA |
| `meusDefeitos()` | GET `/api/defeitos/meus` | Listar do usuario logado |
| `listClusters(params)` | GET `/api/defeitos/clusters` | Clusterizado para mapa |
| `encerrarLote(ids)` | POST `/api/defeitos/encerrar-lote` | Encerrar multiplos |
| `regioesDefeitos(params)` | GET `/api/defeitos/regioes` | Regioes para admin (suporta filtro ?status=) |
| `listMunicipios()` | GET `/api/municipios` | Lista de municipios |
| `anexarDefeito(id, formData)` | PATCH `/api/defeitos/:id/anexar` | Anexar imagem e/ou complemento |
| `updateMunicipio(municipio_id)` | PATCH `/api/auth/municipio` | Atualizar municipio |
| `adminListUsers()` | GET `/api/auth/admin/users` | Listar usuarios |
| `adminUpdateUserMunicipio(userId, municipio_id)` | PATCH `/api/auth/admin/users/:id` | Atribuir municipio |
| `adminToggleAdmin(userId, admin)` | PATCH `/api/auth/admin/users/:id/admin` | Promover/remover admin |
| `updatePassword(senha_atual, nova_senha)` | PATCH `/api/auth/senha` | Alterar senha |
| `verificarEmail(codigo)` | POST `/api/auth/verificar-email` | Verificar email |
| `reenviarCodigo()` | POST `/api/auth/reenviar-codigo` | Reenviar codigo |
| `enviar2fa(email)` | POST `/api/auth/enviar-2fa` | Enviar 2FA |
| `verificar2fa(email, codigo)` | POST `/api/auth/verificar-2fa` | Verificar 2FA |
| `apoiarDefeito(id)` | POST `/api/defeitos/:id/apoiar` | Alternar apoio (upvote) |
| `adminEstatisticas()` | GET `/api/auth/admin/estatisticas` | Metricas do dashboard |
| `pushKey()` | GET `/api/auth/push/key` | Chave publica VAPID |
| `pushSubscribe(subscription)` | POST `/api/auth/push/subscribe` | Salvar subscription push |

### 2.5 Componentes de UI - `frontend/src/components/ui/`

**Migracao (15/05/2026):** Componentes de UI reescritos seguindo padrao shadcn/ui com Tailwind v4. Substituem `Header.jsx`, `UserMenu.jsx`, `SearchableSelect.jsx` e classes CSS customizadas.

**`lib/utils.js`:** Utilidade `cn()` com `clsx` + `tailwind-merge` para composicao de classes.

#### 2.5.1 Button - `frontend/src/components/ui/button.jsx`

Componente de botao com `class-variance-authority` (CVA) para variantes e tamanhos.

**Base:** `@base-ui/react/button` (ButtonPrimitive)

**Variantes:**
| Variante | Estilo |
|---|---|
| `primary` | bg gold-500, text inverse, font-semibold, shadow-sm |
| `secondary` | border gold-500, text gold-500, hover bg transparente |
| `ghost` | bg transparente, hover bg-elevated |
| `danger` | bg error, text white |

**Tamanhos:** `xs` (h-6), `sm` (h-7), `default` (h-9), `lg` (h-10), `icon` (size-9), `icon-sm` (size-7), `icon-xs` (size-6), `icon-lg` (size-10)

#### 2.5.2 CommandMenu - `frontend/src/components/ui/command-menu.jsx`

Menu de busca global acionado por `Cmd+K` ou botao de lupa.

**Funcionalidades:**
- Overlay com backdrop blur (`bg-black/70 backdrop-blur-sm`)
- Input de busca com filtro por label, keywords e path
- Navegacao por teclado (ArrowUp/Down, Enter, Escape)
- Icones Phosphor com peso bold no item selecionado
- Paginas: Mapa, Lista de Chamados, Configuracoes, Painel Admin, Metricas, Usuarios
- Paginas admin filtradas por prop `isAdmin`
- Animacao framer-motion (scale 0.96 → 1, duration 0.2s)

#### 2.5.3 StatusBadge - `frontend/src/components/ui/status-badge.jsx`

Badge de status para chamados com cores semanticas.

| Status | Cor | Label |
|---|---|---|
| `pendente` | `#4A90D9` (azul) | Aberto |
| `em_andamento` | `#D4A017` (dourado) | Em Andamento |
| `vinculado_sem_resposta` | `#D4A017` (dourado) | Vinculado |
| `vinculado_com_resposta` | `#4A90D9` (azul) | Com Resposta |
| `atendido` | `#4CAF7D` (verde) | Resolvido |
| `encerrado` | `#6B5B3E` (marrom) | Encerrado |
| `concluido` | `#4CAF7D` (verde) | Concluído |
| `critico` | `#CF4444` (vermelho) | Crítico (animate-pulse) |
| `aberto` | `#4A90D9` (azul) | Aberto |
| `resolvido` | `#4CAF7D` (verde) | Resolvido |

**Props:** `status` (obrigatorio), `className` (opcional), `pulse` (boolean, adiciona animate-pulse)

#### 2.5.4 UserDropdown - `frontend/src/components/ui/user-dropdown.jsx`

Menu dropdown do usuario com avatar (inicial do nome), info do perfil, e navegacao.

**Funcionalidades:**
- Avatar circular com inicial do nome (`user.nome.charAt(0)`)
- Click-outside para fechar (event listener `mousedown`)
- Animacao framer-motion (opacity, scale, y)
- Info: nome, email, municipio + UF
- Links: Mapa, Lista de Chamados, Configuracoes
- Secao Admin (condicional): Painel, Metricas, Usuarios
- Botao Sair com cor error e hover vermelho transparente
- Icones Phosphor: MapPin, List, User, Layout, ChartBar, Users, SignOut

#### 2.5.5 Data Table - `frontend/src/components/ui/data-table.jsx`

Tabela de dados generica com ordenacao, paginacao e selecao.

#### 2.5.6 KPI Card - `frontend/src/components/ui/kpi-card.jsx`

Card de metrica KPI com titulo, valor, e indicador de tendencia.

#### 2.5.7 Searchable Select - `frontend/src/components/ui/searchable-select.jsx`

Dropdown searchable com busca e selecao. Substitui `SearchableSelect.jsx` antigo.

#### 2.5.8 Timeline - `frontend/src/components/ui/timeline.jsx`

Componente de timeline para historico de atualizacoes de chamados.

### 2.6 Componentes Removidos

**Migracao (15/05/2026):** Os seguintes arquivos foram removidos:

| Arquivo | Motivo | Substituto |
|---|---|---|
| `App.css` (1092 linhas) | CSS custom monolitico | Tailwind v4 + tokens CSS |
| `Header.jsx` | Header monolitico | `AppHeader` em `App.jsx` |
| `UserMenu.jsx` | Menu de usuario basico | `UserDropdown` em `components/ui/` |
| `LazyImage.jsx` | Componente de lazy loading | Native `loading="lazy"` |
| `SearchableSelect.jsx` | Dropdown searchable | `searchable-select.jsx` em `components/ui/` |
| `settings/AccountBlock.jsx` | Bloco de conta | Integrado ao `ProfileSettings` |
| `settings/ActivityLogBlock.jsx` | Bloco de atividade | Removido |
| `settings/NotificationsBlock.jsx` | Bloco de notificacoes | Removido |
| `settings/PreferencesBlock.jsx` | Bloco de preferencias | Removido |
| `settings/PrivacyBlock.jsx` | Bloco de privacidade | Removido |
| `settings/SecurityBlock.jsx` | Bloco de seguranca | Removido |
| `index.css` (33 linhas) | CSS global antigo | `globals.css` com Tailwind v4 |

### 2.7 Componente Toast - `frontend/src/components/Toast.jsx`

**Arquivo:** `frontend/src/components/Toast.jsx`

**Funcao:** Notificacoes toast nao-intrusivas com auto-dismiss.

**API:**
```jsx
import { useToast } from '../components/Toast';

function MyComponent() {
  const addToast = useToast();
  addToast('Sucesso!');           // timeout 3.5s
  addToast('Erro!', 'error');     // estilizacao vermelha
}
```

**Funcionamento:**
- `ToastProvider` envolve a arvore de componentes em `App.jsx`
- `useToast()` hook retorna funcao `addToast(message, type?)`
- Toasts sao renderizados em container fixed (bottom center)
- Animacao slide-in + auto-dismiss apos 3.5s
- Tipos: `success` (verde, padrao), `error` (vermelho)

### 2.8 Contexto de Autenticacao - `frontend/src/context/AuthContext.jsx`

**Arquivo:** `frontend/src/context/AuthContext.jsx`

**Funcao:** Gerencia estado de autenticacao global via React Context.

**Estado:**
- `user` — Objeto com `{ id, nome, email, admin, municipio, cpf, email_verificado }`
- `token` — String JWT
- `isAuthenticated` — Booleano derivado

**Fluxo:**
1. Ao montar, le token do `localStorage`
2. Decodifica payload JWT (base64) para extrair dados do usuario
3. Se token invalido/expirado -> faz logout automatico
4. Se autenticado, tenta inscrever o navegador em notificacoes push (`subscribeToPush`)

**Metodos:**
- `login(token, user)` — Salva token e dados do usuario + inicia inscricao push
- `logout()` — Remove token e limpa estado
- `updateUser(partial)` — Atualiza campos do usuario no estado

### 2.7 Componente Toast - `frontend/src/components/Toast.jsx`

**Arquivo:** `frontend/src/components/Toast.jsx`

**Funcao:** Notificacoes toast nao-intrusivas com auto-dismiss.

**API:**
```jsx
import { useToast } from '../components/Toast';

function MyComponent() {
  const addToast = useToast();
  addToast('Sucesso!');           // timeout 3.5s
  addToast('Erro!', 'error');     // estilizacao vermelha
}
```

**Funcionamento:**
- `ToastProvider` envolve a arvore de componentes em `App.jsx`
- `useToast()` hook retorna funcao `addToast(message, type?)`
- Toasts sao renderizados em container fixed (bottom center)
- Animacao slide-in + auto-dismiss apos 3.5s
- Tipos: `success` (verde, padrao), `error` (vermelho)

### 2.8 Componente SearchableSelect - `frontend/src/components/SearchableSelect.jsx`

### 2.9 SearchableSelect - `frontend/src/components/ui/searchable-select.jsx`

**Migracao (15/05/2026):** Substitui `SearchableSelect.jsx` antigo (77 linhas). Nova versao em `components/ui/` seguindo padrao shadcn/ui.

### 2.10 Pagina do Mapa - `frontend/src/pages/MapPage.jsx`

### 2.10 Pagina de Listagem - `frontend/src/pages/DefectList.jsx`

### 2.11 Pagina Admin - `frontend/src/pages/AdminDashboard.jsx`

### 2.12 Pagina Super Admin - `frontend/src/pages/SuperAdmin.jsx`

### 2.13 Componente HeatmapLayer - `frontend/src/components/HeatmapLayer.jsx`

### 2.14 Pagina de Dashboard Metricas - `frontend/src/pages/AdminDashboardMetrics.jsx`

### 2.15 Pagina de Configuracoes - `frontend/src/pages/Settings.jsx`

### 2.16 Pagina de Conta - `frontend/src/pages/AccountSettings.jsx`

**Arquivo:** `frontend/src/pages/AccountSettings.jsx`

**Funcao:** Gerenciamento de conta do usuario.

**Seccoes:**
- **Verificacao de Email:**
  - Status visual (verificado/nao verificado)
  - Input de codigo de 6 digitos
  - Botao "Reenviar codigo"
- **Alterar Senha:**
  - Senha atual + nova senha + confirmacao
  - Validacao de coincidencia e tamanho minimo (6 chars)

**Notificacoes:** Usa `useToast()` para feedback de acoes.

---

## 3. SEGURANCA

### 3.1 Autenticacao
- Senhas hasheadas com **bcrypt** (salt rounds = 10)
- Tokens **JWT** com expiracao de 24h, payload: `{ userId, email, admin, municipio_id }`
- Header `Authorization` obrigatorio em rotas protegidas

### 3.2 Protecao de Dados
- **CPF** armazenado criptografado (AES-256-GCM via `crypto.createCipheriv`)
- **Hash SHA-256** do CPF para buscas sem expor o dado original
- Chave de criptografia via `ENCRYPTION_KEY` (min 16 chars)

### 3.3 CSRF
- Double Submit Cookie Pattern
- Cookie `XSRF-TOKEN` (acessivel via JS) + Header `X-XSRF-TOKEN`
- Cookie `XSRF-SESSION` (httpOnly, invisivel para JS)
- SameSite: XSRF-SESSION=Strict, XSRF-TOKEN=None (produção) / Strict (dev)
- Rotas `/api/auth` nao usam CSRF (protegidas por JWT)

### 3.4 Rate Limiting
- 3 niveis: global (200/15min), auth (20/15min), API (200/h) — **dobrados/quadruplicados** em relacao a VPS anterior gracas ao aumento de RAM e CPU
- Rate limit por usuario: 10 requisicoes/hora (reset automatico)
- Headers padrao RateLimit-* incluidos

### 3.5 Validacao de Admin

| Nivel | Quem | Pode |
|---|---|---|
| Admin | `user.admin === true` | Gerenciar defeitos (status, prioridade), listar usuarios, atribuir municipios |
| Super admin | `user.email === 'josemurilorodriguessabalo@gmail.com'` | Tudo que admin pode + promover/remover admins |

### 3.6 Notificacoes Push
- **VAPID keys:** Autenticacao do servidor para Web Push API
- As chaves sao geradas automaticamente se nao configuradas no `.env`
- Service worker registra `push` e `notificationclick` listeners
- Inscricao push e feita automaticamente no login e no carregamento da pagina
- Falha silenciosa se Push API nao disponivel no navegador

### 3.7 Helmet
- Content-Security-Policy desabilitado (necessario para tiles Leaflet)
- crossOriginEmbedderPolicy desabilitado
- Demais headers de seguranca ativos (X-Content-Type-Options, X-Frame-Options, etc.)

---

## 4. OTIMIZACOES PARA VPS ARM (4GB, 2 nucleos)

| Estrategia | Detalhe |
|---|---|---|
| Heap Node.js | `--max-old-space-size=2048` (2GB de 4GB disponiveis) — essencial para dashboard BI com recharts |
| Pool PostgreSQL | 10 conexoes simultaneas, healthcheck a cada 10s, query logger >500ms |
| Compressao de imagens | Sharp redimensiona para 1200px WebP q80 + thumbnail 200px — aproveita **2 cores ARM** em paralelo |
| Logs estruturados | Pino com rotacao diaria (7 dias retencao) via logrotate + Docker json-file (10MB, 3 arquivos) |
| PM2 | Restart automatico em falha (max 10 tentativas, delay 5s) |
| Nginx cache | Uploads cacheados por 30 dias (Cache-Control: public, immutable) |
| CPU limits | backend 1 CPU, postgres 1 CPU, IA 1 CPU via `deploy.resources.limits` (Docker Compose) |
| SWAP | Evitado: 4GB RAM suficientes para Node (2GB) + Postgres (1GB) + sistema (1GB) |

---

## 5. DOCKER

**docker-compose.yml** — 5 servicos:

```yaml
nginx:
  - nginx:alpine-slim (proxy reverso + SSL)
  - Porta 80 (redirect HTTPS) + 443 (HTTPS)
  - Cache de uploads (30d)
  - Volume: certbot-data (SSL)

certbot:
  - certbot/certbot (renovacao automatica SSL)
  - Profile: certbot
  - Renova a cada 12h

postgres:
  - postgis/postgis:16-3.4 (PostgreSQL 16 + PostGIS 3.4, ARM nativo)
  - Pool de conexoes (max 10)
  - Healthcheck: pg_isready
  - Limite: 1 CPU / 1024MB RAM
  - Volume persistente

backend:
  - node:20-alpine + tini (init system)
  - --max-old-space-size=2048
  - PM2 (ecosystem.config.js)
  - Porta 5000 (interno, atras do Nginx)
  - Pino Logger (logs em arquivo)
  - Limite: 1 CPU / 1024MB RAM
  - Depende do postgres (healthcheck)

ia (opcional):
  - python:alpine
  - Porta 8000
  - Profile: ia
```

### Scripts de apoio

| Script | Localizacao | Funcao |
|---|---|---|
| Migracao SQLite → PostgreSQL | `backend/scripts/migrate-sqlite-to-postgres.js` | Le o banco SQLite legado, criptografa CPFs, insere no PostgreSQL com upsert. Uso: `node backend/scripts/migrate-sqlite-to-postgres.js` |
| Seed IBGE (recomendado) | `backend/seed-municipios-ibge.js` | Baixa 5571 municipios da API oficial do IBGE e insere no banco. Uso: `node backend/seed-municipios-ibge.js` |
| Seed poligonos (legado) | `backend/seed-municipios.js` | Importa municipios com poligonos GeoJSON de arquivo local `/tmp/municipios-poligonos.json` |
| Backup PostgreSQL | `scripts/backup-postgres.sh` | pg_dump custom com compressao 9, retencao de 30 dias, notificacao Telegram, upload S3 opcional. Uso: `DB_PASSWORD=... ./scripts/backup-postgres.sh` |
| Restore PostgreSQL | `scripts/restore-postgres.sh` | pg_restore com confirmacao manual. Uso: `./scripts/restore-postgres.sh ./backups/arquivo.sql.gz` |
| Migration PostGIS | `backend/scripts/run-migration.js` | Executa migration SQL (PostGIS). Uso: `node backend/scripts/run-migration.js backend/scripts/migration-postgis.sql` |
| Rotacao de logs | `scripts/logrotate.conf` | Configuracao logrotate (diario, 7 dias, compressao). Instalado automaticamente no Dockerfile |

---

## 6. API COMPLETA

### Autenticacao
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| POST | `/api/auth/registro` | — | Cadastro com CPF e municipio |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/validar-cpf` | — | Validar CPF (BrasilAPI) |
| POST | `/api/auth/enviar-2fa` | — | Enviar codigo 2FA |
| POST | `/api/auth/verificar-2fa` | — | Verificar 2FA e obter JWT |
| PATCH | `/api/auth/municipio` | JWT | Atualizar municipio |
| POST | `/api/auth/verificar-email` | JWT | Verificar email com codigo |
| POST | `/api/auth/reenviar-codigo` | JWT | Reenviar codigo de verificacao |
| PATCH | `/api/auth/senha` | JWT | Alterar senha |
| GET | `/api/auth/push/key` | — | Chave publica VAPID |
| POST | `/api/auth/push/subscribe` | JWT | Salvar subscription push |
| GET | `/api/auth/admin/users` | JWT+admin | Listar usuarios |
| GET | `/api/auth/admin/estatisticas` | JWT+admin | Metricas do dashboard |
| PATCH | `/api/auth/admin/users/:id` | JWT+admin | Atribuir municipio |
| PATCH | `/api/auth/admin/users/:id/admin` | JWT+super | Promover/remover admin |

### Defeitos
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| GET | `/api/defeitos` | — | Listar todos (com contagem de apoios) |
| GET | `/api/defeitos/meus` | JWT | Listar do usuario |
| GET | `/api/defeitos/clusters` | — | Clusterizado para mapa |
| GET | `/api/defeitos/regioes` | JWT+admin | Agrupado por regiao (suporta ?status=) |
| GET | `/api/defeitos/:id` | — | Detalhe (com contagem de apoios) |
| POST | `/api/defeitos` | JWT + email verificado | Criar com foto (exceto admin) |
| POST | `/api/defeitos/encerrar-lote` | JWT | Encerrar multiplos |
| POST | `/api/defeitos/:id/apoiar` | JWT | Alternar apoio (upvote toggle) |
| PATCH | `/api/defeitos/:id` | JWT+admin | Atualizar status/prioridade (dispara push) |
| **PATCH** | **`/api/defeitos/:id/anexar`** | **JWT** | **Anexar imagem e/ou texto (apenas pendentes, max 3 imagens)** |

### Categorias
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| GET | `/api/categorias` | — | Lista categorias com icone, prioridade e SLA |

### Municipios
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| GET | `/api/municipios` | — | Listar municipios |
| GET | `/api/municipios/:codigo` | — | Detalhe do municipio |

### IA — Servicos Inteligentes
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| POST | `/api/ia/classify` | — | Classifica texto + extrai prioridade (proxy para IA service) |
| GET | `/api/ia/routing/:categoria` | — | Secretaria responsavel + prazo SLA pela categoria |
| GET | `/api/ia/dedup` | — | Busca duplicatas: lat, lng, texto, raio? (50m), dias? (7) |
| GET | `/api/ia/critical-clusters` | JWT+admin | Agrupa por categoria com >=5 chamados no periodo |
| GET | `/api/ia/weekly-summary` | JWT+admin | Resumo semanal: totais, taxa resolucao, top categoria/bairro |

### Seguranca
| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/csrf-token` | Gera tokens CSRF (cookies) |
| GET | `/api/health` | Health check da API |

### IA Service — `ia/` (Python FastAPI, profile: ia)

**Endpoints:**

| Metodo | Rota | Descricao |
|---|---|---|
| POST | `/classify` | `{ text }` → `{ category, confidence }` |
| POST | `/classify-full` | `{ text }` → `{ category, confidence, priority, priority_confidence }` |
| POST | `/classify-image` | `{ image (base64) }` → `{ category, confidence }` (requer modelo ONNX) |
| POST | `/priority` | `{ text }` → `{ priority, confidence }` |
| POST | `/text-similarity` | `{ text1, text2 }` → `{ score }` (similaridade semantica ONNX) |
| POST | `/check-spam` | `{ text }` → `{ is_spam, confidence, reason }` |
| GET | `/health` | Status dos modelos |

**Campos adicionados na resposta do `POST /api/defeitos`:**
- `categoria_sugerida_ia` — `{ categoria, confianca }` se IA sugeriu categoria diferente
- `prioridade_sugerida_ia` — `{ prioridade, confianca }` prioridade extraida do texto
- `duplicatas_ia` — `{ duplicatas: [{ id, titulo, similaridade }], total }` chamados similares proximos
- `spam_ia` — `{ is_spam, confianca, motivo }` se texto parece spam
- `encaminhamento_ia` — `{ secretaria, prazo_sla_dias }` baseado na categoria

**Circuit breaker:** 3 falhas consecutivas → IA desligada por 60s. Timeout: 3s por requisicao.

**Modelos ONNX embarcados:**

| Modelo | Arquitetura | Tamanho | Uso |
|---|---|---|---|
| Texto | `all-MiniLM-L6-v2` (sentence-transformers) | ~90MB | Gera embedding 384-d do texto; compara por similaridade de cosseno com centroides de categoria. Queda: keyword classifier |
| Imagem | `MobileNetV3-small` (sem classifier head) | ~9MB | Extrator de features 576-d. Aguarda fine-tuning com dataset rotulado. Queda: `Outro, 0.5` |

**Pipeline de classificacao:**
1. Texto → tokenizer (`tokenizers`, max 128 tokens) → ONNX session → `last_hidden_state`
2. Mean pooling + normalizacao L2 → embedding 384-d
3. Produto escalar com 7 centroides de categoria (pre-computados no build)
4. Softmax(temperatura=3.0) → categoria + confianca
5. Se ONNX falha → fallback keyword classifier

**Build multi-stage:**
- Stage 1 (`builder`): python:3.12 + PyTorch + Transformers → baixa modelos → exporta ONNX → computa centroides
- Stage 2 (`runtime`): python:3.12-slim + onnxruntime apenas → copia .onnx + tokenizer + centroides
- Imagem final: ~200MB runtime (vs ~2GB com PyTorch)

### Headers necessarios
| Header | Onde | Quando |
|---|---|---|
| `Authorization: <token>` | Rotas protegidas | Sempre em JWT |
| `X-XSRF-TOKEN: <token>` | Mutations em `/api/defeitos` | Apos GET /api/csrf-token |
| `Content-Type: application/json` | JSON requests | Exceto FormData |

---

## 7. EXECUCAO

### Desenvolvimento
```bash
# Terminal 1 - PostgreSQL (via Docker)
docker compose up -d postgres

# Terminal 2 - Backend
cd backend
cp .env.example .env   # edite com suas credenciais
npm install
node --max-old-space-size=2048 index.js
# -> http://localhost:5000

# Terminal 3 - Frontend
cd frontend
npm install
npm run dev
# -> http://localhost:5173

# Terminal 4 - IA (opcional)
cd ia
pip install -r requirements.txt
python main.py
# -> http://localhost:8000
```

### Producao (VPS ARM - 4GB RAM, 2 nucleos)
```bash
# 1. Clone e configure
git clone <repo>
cd tcc-manutencao-urbana
cp backend/.env.example .env   # preencha com credenciais reais

# 2. Suba PostgreSQL + Backend + Frontend
docker compose up -d --build

# 3. Importe municipios (se necessario)
docker compose exec -T backend node seed-municipios.js

# 4. Migre dados do SQLite legado para PostgreSQL (se houver)
docker compose exec -T backend node scripts/migrate-sqlite-to-postgres.js

# 5. SSL (primeira execucao)
docker compose run --rm certbot certonly --webroot \
  -w /var/www/certbot -d centralurbana.app

# 6. Com SSL ativo, suba o Nginx
docker compose up -d nginx

# 7. Backup agendado (serviço Docker)
docker compose --profile backup up -d
# Ou via cron tradicional:
# 0 3 * * * cd /opt/central-urbana && DB_PASSWORD=<senha> ./scripts/backup-postgres.sh

# URLs finais:
# Frontend: https://centralurbana.app
# Backend:  https://centralurbana.app/api
# IA:       http://localhost:8000
```

---

## 8. DEPENDENCIAS

### Backend (`backend/package.json`)

| Pacote | Funcao |
|---|---|---|
| express | Framework web |
| helmet | Headers de seguranca |
| pg | Driver PostgreSQL com pool de conexoes |
| bcrypt | Hash de senhas |
| jsonwebtoken | Tokens JWT |
| multer | Upload de arquivos |
| sharp | Compressao de imagens (WebP 1200px + thumbnail 200px) |
| pino | Logger estruturado (arquivo + stdout) |
| pino-pretty | Pretty-print dos logs em desenvolvimento |
| cors | CORS |
| cookie-parser | Parse de cookies |
| dotenv | Variaveis de ambiente |
| express-rate-limit | Rate limiting (200 req/15min, 20 auth, 200 API) |
| axios | HTTP client (IA + BrasilAPI) |
| web-push | Notificacoes PWA (Web Push) |

### Frontend (`frontend/package.json`)

| Pacote | Funcao |
|---|---|
| react | UI library (v19) |
| react-dom | Renderizacao DOM |
| react-router-dom | Roteamento SPA (v7+) |
| @phosphor-icons/react | Icones vetoriais (substitui emojis e Tabler Icons) |
| leaflet | Mapas interativos |
| react-leaflet | Componentes React para Leaflet |
| vite | Bundler (v8) |
| @vitejs/plugin-react | React Fast Refresh |
| vite-plugin-pwa | PWA + service worker |
| workbox-precaching | Precaching no SW |
| recharts | Graficos (dashboard de metricas) |
| leaflet.heat | Plugin de mapa de calor para Leaflet |
| **tailwindcss** | **Utility-first CSS framework (v4)** |
| **@tailwindcss/vite** | **Plugin Tailwind para Vite** |
| **framer-motion** | **Animacoes e transicoes de pagina** |
| **class-variance-authority** | **Variantes de componentes (CVA)** |
| **clsx** | **Composicao condicional de classes** |
| **tailwind-merge** | **Merge de classes Tailwind sem conflitos** |
| **tw-animate-css** | **Animacoes utilitarias para Tailwind** |
| **@base-ui/react** | **Componentes base acessiveis (ButtonPrimitive)** |

---

## 9. BUGS CORRIGIDOS

### 9.1 `backend/src/models/User.js` — Chave errada no mapeamento `toUser`

**Problema:** PostgreSQL retorna nomes de coluna em lowercase (`requestscount`, `requestsresetat`), mas o código usava camelCase (`row.requestsCount`, `row.requestsResetAt`). Isso fazia `user.requestsCount` ser `undefined`, que virava `NaN` ao fazer `user.requestsCount += 1`, gerando o erro `invalid input syntax for type integer: "NaN"` no `checkUserRateLimit`.

**Sintoma:** `POST /api/defeitos` retorna 500 com `Erro interno do servidor`. Log: `invalid input syntax for type integer: "NaN"` em `User.save()` chamado por `checkUserRateLimit`.

**Correção:** `backend/src/models/User.js:17` — `requestsCount: row.requestsCount` → `requestsCount: row.requestscount`; `requestsResetAt: row.requestsResetAt` → `requestsResetAt: row.requestsresetat`.

### 9.2 `backend/src/models/Defeito.js` — `JSON.parse([])` no `toDefeito`

**Problema:** `Defeito.create()` passava arrays JavaScript (`[]`) para os campos `imagens_extra` e `atualizacoes`, mas `toDefeito()` fazia `JSON.parse(row.imagens_extra)`. `JSON.parse([])` converte `[]` → `""` → `JSON.parse("")` → `SyntaxError: Unexpected end of JSON input`.

**Sintoma:** Apos corrigir o bug 9.1, `POST /api/defeitos` ainda retornava 500 com `Erro interno do servidor`. Log: `SyntaxError: Unexpected end of JSON input` em `toDefeito()`.

**Correção:** `backend/src/models/Defeito.js:179` — `create()` passa `'[]'` (string JSON) em vez de `[]` (array). Também foi adicionada função auxiliar `parseJsonField` que lida com string ou array, tornando `toDefeito` robusta contra ambos os tipos.

### 9.3 `backend/src/routes/defeitos.js` — Middleware order: validate() before Multer

**Data:** 14/05/2026

**Problema:** `validate(createDefeitoSchema)` executava antes de `upload.single('imagem')`. Como o formulário de criação de chamado é enviado como `multipart/form-data` (FormData), o Multer é quem faz o parse dos campos textuais para `req.body`. Sem o Multer ter executado, `req.body` estava vazio, e o Zod retornava erro de campo "required" para todos os campos obrigatórios (título, descrição, latitude, longitude, categoria).

**Sintoma:** `POST /api/defeitos` retorna `400` com `Título é obrigatório` (ou outro campo required) mesmo quando todos os campos estão preenchidos no formulário.

**Correção:** `backend/src/routes/defeitos.js:170` e `backend/src/routes/defeitos.js:555` — Movidos `upload.single('imagem')` e `handleMulterError` para **antes** de `validate(...)` em ambas as rotas:
- `POST /` (criar chamado)
- `PATCH /:id/anexar` (anexar imagem/texto)

Também foi adicionado o `anexarSchema` faltante na desestruturação do `require` da linha 15, que impedia o servidor de iniciar após a reordenação (referência a `anexarSchema` não definida).

### 9.4 Lições Aprendidas

- Sempre verificar o case das colunas retornadas pelo PostgreSQL (`SELECT *` retorna lowercase).
- `JSON.parse([])` é um bug silencioso: `[]` é convertido para `""` antes do parse.
- Testes de integração via curl identificam bugs que testes unitarios nao pegam.
- O logger Pino em producao (arquivo `/app/logs/app.log`) é essencial para diagnosticar erros de API.

---

## 10. CORRECOES E MELHORIAS POS-DEBATE

### 10.1 Modelo ONNX Real (IA data-driven) ✅

**Antes:** IA usava keyword classifier (contagem de palavras-chave) — decisao nao baseada em dados.

**Depois:** Classificador por embeddings ONNX (`sentence-transformers/all-MiniLM-L6-v2`):

| Componente | Modelo | Tamanho | Funcionamento |
|---|---|---|---|
| Texto | `all-MiniLM-L6-v2` | ~90MB ONNX | Gera embedding 384-d, compara por cosseno com centroides de categoria |
| Imagem | `MobileNetV3-small` (sem classifier) | ~9MB ONNX | Extrator features 576-d — aguarda fine-tuning |

**Pipeline de classificacao:**
1. Texto → tokenizer (`tokenizers`, max 128 tokens) → ONNX session → `last_hidden_state`
2. Mean pooling + L2 normalize → embedding 384-d
3. Produto escalar com 7 centroides (pre-computados no build a partir de exemplos textuais)
4. Softmax(temperatura=3.0) → categoria + confianca
5. Fallback: keyword classifier se ONNX falha
6. `text-similarity` usa cosseno entre embeddings (similaridade semantica real)

**Build multi-stage (Dockerfile):**
- Stage `builder`: python:3.12 + PyTorch 2.12 + Transformers → baixa modelos → exporta ONNX → computa centroides
- Stage `runtime`: python:3.12-slim + onnxruntime + tokenizers apenas (~200MB final)
- Stage builder descartado — zero dependencia PyTorch em runtime

### 10.2 Secrets Management (P0) ✅

**Arquivo:** `backend/.env.example` — documentação completa de todas as variáveis de ambiente:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `JWT_SECRET` | Sim | Chave JWT (32+ caracteres hex) |
| `ENCRYPTION_KEY` | Sim | AES-256-GCM key (64 hex chars = 32 bytes) |
| `DB_HOST/PORT/NAME/USER/PASSWORD` | Sim | Conexão PostgreSQL |
| `FRONTEND_URL`, `DOMAIN` | Sim | URLs do frontend |
| `IA_URL` | Não | Serviço de IA (profile `ia`) |
| `HUGGINGFACE_API_TOKEN` | Não | Token HuggingFace |
| `VAPID_PUBLIC/PRIVATE_KEY` | Não | Web Push |
| `FROM_EMAIL`, `RESEND_API_KEY` | Não | Email (Resend) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Não | Notificação de backup |
| `RCLONE_DEST` | Não | Upload S3 |
| `RETENTION_DAYS` | Não | Retenção de backups (default 30) |
| `LOG_LEVEL` | Não | Nível de log |

### 10.3 Acessibilidade WCAG (P1) ✅

**Implementado:**
- `--text-xs`: 12px (WCAG AA minimo)
- `:focus-visible` global com `outline: 2px solid var(--accent-green)`
- `aria-label` em todos os botoes de icone (Header, FAB, UserMenu, modais, filtros)
- `role="alert"` em mensagens de erro
- `role="dialog"` + `aria-modal="true"` + `aria-describedby` em todos os modais
- `aria-describedby` ligando erros a inputs (login, registro, formulario do mapa, CPF)
- `aria-live="polite"` + `aria-atomic="true"` no container de toasts
- `role="combobox"` padrao WAI-ARIA completo no SearchableSelect
- `<SkipLink />` funcional em `App.jsx` com `#main-content`
- Tema light completo via `[data-theme="light"]` com contraste ~16.4:1 (AAA)
- Escape key fecha todos os modais (MapPage: form, confirm encerrar, attach; AdminDashboard: detalhes)
- `role="status"` no CPF do registro com ID unico

### 10.4 Validação Zod (P1) ✅

**Pacote:** `zod@^3.23.0` no `backend/package.json`.

**Schemas:**

| Arquivo | Schemas |
|---|---|
| `backend/src/validation/auth.schema.js` | `registerSchema`, `loginSchema`, `verify2faSchema`, `changePasswordSchema`, `updateProfileSchema` |
| `backend/src/validation/defeitos.schema.js` | `createDefeitoSchema`, `updateDefeitoSchema`, `batchEncerrarSchema`, `anexarSchema` |
| `backend/src/validation/admin.schema.js` | `updateUserSchema`, `updateDefeitoAdminSchema` |

**Middleware `validate(schema)`** usado em: registro, login, criar defeito, atualizar defeito, encerrar lote.

### 10.5 CI/CD — GitHub Actions (P1) ✅

`.github/workflows/deploy.yml` com pipeline:
1. `test`: build Docker → start PostgreSQL → lint backend → build frontend
2. `deploy` (master only): SSH → `git pull` → `docker compose up -d --build` → migration → `docker image prune -f`

### 10.6 Backup Automatizado + Observabilidade (P3)

**Status:** Scripts existem, docker compose definido, mas servico `backup` nao esta rodando. Sem Prometheus/Uptime Kuma.

**Prioridade:** Ultimo antes do stress test / pentest.

### 10.7 PostGIS — Migration Espacial (P1) ✅ Feito

**Status:** Migration executada com sucesso via psql direto (o script `run-migration.js` tem um bug: `startsWith('--')` filtra statements que comecam com comentario). Correcoes aplicadas:

### 10.8 Tolerância de Perímetro (P0) ✅ Feito

**Problema:** O `ST_Within` rejeitava chamados na divisa municipal se o GPS tivesse erro de 10-50m para fora do polígono — UX frustrante na periferia da cidade.

**Solução:** `ST_Buffer(polygon_geom, 0.01)` (~1km de margem). Agora `ST_Within` é verificado primeiro (dentro do perímetro exato) e, se falhar, tenta com `ST_Within(point, ST_Buffer(polygon, 0.01))`. A mensagem de erro foi melhorada com dica para arrastar o marcador.

**Configuração:** `PERIMETER_BUFFER_DEG=0.01` no `.env`.

### 10.9 Privacidade de Imagens (P0) ✅ Feito

**Problema:** Fotos enviadas por cidadãos podem conter rostos, placas de veículos e outros dados pessoais, expondo terceiros — risco LGPD.

**Solução:** Desfoque gaussiano (Sharp `blur()`) aplicado a todas as imagens no upload:
- Sigma configurável via `PRIVACY_BLUR_SIGMA` (padrão 0.6)
- Protege rostos e placas sem comprometer a visibilidade do defeito
- Aviso de privacidade adicionado no formulário de criação de chamado
- Thumbnails (200px) também passam pelo desfoque

**Limitação:** Desfoque global, não seletivo (não há detecção automática de rostos/placas). Para proteção mais granular, seria necessário modelo de detecção de objetos (YOLO, SSD MobileNet) — trabalho futuro.

### 10.10 Classificação de Imagem Honesta (P0) ✅ Feito

**Problema:** Documentação anterior sugeria que o MobileNetV3-small podia classificar imagens em 7 categorias, mas o modelo nunca passou por fine-tuning — era apenas um extrator de features genérico.

**Solução:** Código e documentação corrigidos para refletir a realidade:
- `ImageClassifier.classify()` sempre retorna `("Outro", 0.5)` — confiança fixa, sem classificação real
- Documentação atualizada: "Extrator de features 576-d. Aguarda fine-tuning com dataset rotulado de defeitos urbanos."
- Rota `/classify-image` documentada como experimental
- Fallback: categoria do backend (selecionada pelo usuário no formulário)

### 10.11 Dados de Polígono Municipal (P0) ✅ Feito

**Problema:** A API de malhas do IBGE (`servicodados.ibge.gov.br/api/v3/malhas`) estava retornando erro 500, impossibilitando o download dos polígonos municipais. Além disso, o código IBGE `3546803` usado para Santo Antônio de Posse estava incorreto — o código oficial é `3548005`. Sem os polígonos, a delimitação visual do município no mapa e a validação de perímetro via PostGIS (ST_Within) não funcionavam.

**Solução:**
- Identificado que o código IBGE correto para Santo Antônio de Posse é `3548005` (não `3546803`)
- Usuários e registros atualizados para o código correto
- Substituída a fonte de dados para o dataset [tbrugz/geodata-br](https://github.com/tbrugz/geodata-br) (GeoJSON simplificado, 889 stars, 5564 municípios)
- `seed-poligonos-ibge.js` atualizado para baixar do GitHub como fallback quando a API do IBGE estiver indisponível
- `poligono_json` populado para todos os 5564 municípios com geometria MultiPolygon
- `polygon_geom` populado no PostGIS via `ST_SetSRID(ST_GeomFromGeoJSON(poligono_json), 4326)`
- Bounding boxes (`min_lat/max_lat/min_lng/max_lng`) computados a partir das geometrias reais
- Validação de perímetro com fallback gracioso: `polygon_geom` → bounding box válido → permite (quando não há dados)

**Lições:** APIs governamentais podem ficar indisponíveis. Sempre ter fallback para fontes alternativas (GitHub, mirror). Validar códigos IBGE contra a API oficial antes de usar.
- `geom geometry(Point,4326)` gerada computacionalmente em `defeitos` de latitude/longitude — 13 linhas existentes
- GIST indexes criados: `idx_municipios_polygon_geom`, `idx_defeitos_geom`
- Query de dedup em `defeitos.js` trocada de bounding box Manhattan (`ABS(lat)`) para `ST_DWithin(geom, 0.01)`
- Migration SQL corrigida: `Polygon` → `MultiPolygon` (GeoJSON real contem MultiPolygon)

### Prioridade de Implementacao (atualizado 14/05/2026)

| Ordem | Item | Status | Esforco |
|---|---|---|---|
| 1 | IA ONNX real (embeddings) | ✅ Feito | 2h |
| 2 | Zod validation | ✅ Feito | 2h |
| 3 | CI/CD | ✅ Feito | 1h |
| 4 | Secrets management | ✅ Feito | 30min |
| 5 | Acessibilidade WCAG | ✅ Feito | 3-4h |
| 6 | PostGIS migration | ✅ Feito | 30min |
| 7 | Lint + CI/CD fix | ✅ Feito | 1h |
| 8 | Backup automatizado | ⏳ Diferido | 2h |
| 9 | Observabilidade | ⏳ Diferido | 1h |
| 10 | Fix: validate() antes de Multer (erro required) | ✅ Feito | 15min |
| 11 | Pentest: botao duplo clique | ✅ Feito | 15min |
| 12 | Pentest: vazamento de dados (PII) | ✅ Feito | 30min |
| 13 | Pentest: headers de seguranca + server_tokens | ✅ Feito | 15min |
| 14 | Pentest: email super admin hardcoded | ✅ Feito | 15min |
| 15 | Pentest: rate limit /uploads | ✅ Feito | 10min |
| 16 | Cloudflare setup | ✅ Feito | 30min |
| — | Stress test + pentest | ✅ Concluido | — |

---

### 11.0 Resposta a Pentest (14/05/2026)

**Contexto:** Amigo realizou pentest no ambiente de homologacao e identificou 6 vulnerabilidades (2 criticas, 1 alta, 2 medias, 1 baixa). Todas corrigidas.

#### 11.1 Duplo Clique no Formulario — Botao Enviar (P0)

**Problema:** Servidor com latencia alta permitia que o usuario clicasse 5-6x no botao "Enviar", criando chamados em lote.

**Solucao:**
- Estado `submitting` no componente `MapPage.jsx`
- Botao desabilitado (`disabled`) com estilo cinza (`background: #6b7280`, `opacity: 0.5`)
- Texto muda para "Enviando..." durante a requisicao
- Bloqueio inicial: `if (submitting) return` antes de qualquer validacao
- Reset no `finally` apos sucesso ou erro

**Arquivos:** `frontend/src/pages/MapPage.jsx`

#### 11.2 Vazamento de Dados Pessoais — PII (P0)

**Problema:** `GET /api/defeitos` retornava todos os chamados + dados completos dos usuarios (nome, email) sem autenticacao.

**Solucao:**
- Endpoints publicos (`GET /`, `GET /clusters`, `GET /:id`): `populate('usuario', 'nome')` — apenas nome
- Endpoints autenticados (`GET /meus`, `GET /regioes`): mantem `nome email`
- Endpoints publicos nao expoem mais email dos usuarios

**Arquivos:** `backend/src/routes/defeitos.js`

#### 11.3 Headers de Seguranca HTTP (P1)

**Problema:** Ausencia total de headers de seguranca nas respostas do servidor.

**Solucao:** Adicionados em todos os 4 arquivos de configuracao nginx:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (ja existia no prod)
- `Permissions-Policy` (prod)
- `Cross-Origin-Embedder-Policy` (prod)
- `Cross-Origin-Opener-Policy` (prod)

**Arquivos:** `nginx.prod.conf`, `nginx.conf`, `nginx.host.conf`, `frontend/nginx.conf`

#### 11.4 Exposicao da Versao do Servidor (P1)

**Problema:** Header `Server: nginx/1.31.0` visivel em todas respostas.

**Solucao:** `server_tokens off;` adicionado em todos os 4 arquivos nginx.

**Arquivos:** `nginx.prod.conf`, `nginx.conf`, `nginx.host.conf`, `frontend/nginx.conf`

#### 11.5 Acesso Direto a Uploads (P2)

**Problema:** Diretorio `/uploads/` acessivel publicamente sem restricao.

**Solucao:**
- Rate limiting no nginx: `limit_req zone=uploads burst=10 nodelay` (30 req/min)
- Imagens ja passam por desfoque de privacidade (sigma 0.6, existente)

**Arquivos:** `nginx.prod.conf`

#### 11.6 Email do Super Admin Hardcoded (P2)

**Problema:** Email `josemurilorodriguessabalo@gmail.com` hardcoded em 4 lugares no codigo-fonte (backend + bundle frontend).

**Solucao:**
- Nova env var: `SUPER_ADMIN_EMAIL` — definida em `.env`, `.env.production`, `docker-compose`
- Backend usa `process.env.SUPER_ADMIN_EMAIL` no middleware `requireSuperAdmin` e na protecao de autodemocao
- Backend retorna campo `super_admin: true/false` no endpoint `/admin/users`
- Frontend usa `u.super_admin` em vez de comparacao de email

**Arquivos:** `backend/src/routes/auth.js`, `frontend/src/pages/SuperAdmin.jsx`, `.env`, `.env.production`, `backend/.env.example`, `docker-compose.yml`, `docker-compose.host.yml`

#### 11.7 Cloudflare

**Script:** `scripts/setup-cloudflare.sh` — configura ranges de IP, UFW, real_ip recovery.
**Passos manuais necessarios:** Adicionar dominio no Cloudflare Dashboard, atualizar nameservers, configurar SSL/TLS como Full (strict), ativar Always Use HTTPS, WAF, Bot Fight Mode.

**Pendencias pos-propagacao DNS (2h):**
1. Cloudflare Dashboard: SSL/TLS → Overview → **Full (strict)**
2. Cloudflare Dashboard: SSL/TLS → Edge Certificates → **Always Use HTTPS**: ON
3. Cloudflare Dashboard: SSL/TLS → Edge Certificates → **Automatic HTTPS Rewrites**: ON
4. Cloudflare Dashboard: SSL/TLS → Edge Certificates → **Minimum TLS Version**: TLS 1.2
5. Cloudflare Dashboard: SSL/TLS → Origin Server → **Create Certificate** (15 anos, `tcc.josemurilors.com.br` e `*.josemurilors.com.br`)
6. Colar certificado + chave no VPS (`/etc/cloudflare/`) e atualizar `nginx.prod.conf`
7. Rodar `scripts/setup-cloudflare.sh` no VPS (configura ranges de IP, UFW)
8. Opcional: remover servico `certbot` do `docker-compose.yml` (Cloudflare substitui Let's Encrypt)
9. Verificar headers de seguranca: `curl -sI https://tcc.josemurilors.com.br/`

---

## 12. MIGRACAO FRONTEND (15/05/2026)

### 12.1 Resumo

Migracao completa do design system frontend de CSS custom monolitico (`App.css`, 1092 linhas) para **Tailwind v4 + shadcn/ui** com tema dourado.

| Metrica | Antes | Depois | Mudanca |
|---|---|---|---|
| CSS custom | 1092 linhas (`App.css`) | 0 | **-1092 linhas** |
| Arquivos removidos | 13 componentes/blocos | 0 | **-13 arquivos** |
| Componentes UI novos | 0 | 8 | **+8 componentes** |
| Linhas modificadas | — | 1907 insertions, 4520 deletions | **-2613 linhas liquidas** |
| Build size | — | ~120KB gzipped | Otimizado |
| Framework CSS | CSS custom + variaveis | Tailwind v4 + `@theme inline` | Modernizado |
| Fonte | Inter | Geist Variable | Atualizada |
| Tema | Dark theme generico | Tema dourado (`#D4A017`) | Rebrand |

### 12.2 Arquivos Modificados (40)

**Frontend (36 arquivos):**
- `App.css` → **removido** (1092 linhas)
- `App.jsx` → reescrito (+118/-50): ProtectedRoute, AppHeader, AppLayout, CommandMenu
- `constants.js` → cores de status atualizadas para paleta dourada (+12/-16)
- `tokens.css` → tema dourado com prefixo `--color-*` (+194/-194)
- `globals.css` → **novo**: Tailwind v4 imports, `@theme inline`, Geist font
- `index.css` → **removido** (33 linhas)
- `main.jsx` → import de `globals.css` no lugar de `index.css`
- `pages/MapPage.jsx` → refatorado (+1111/-1111): StatusBadge, createPinIcon, HeatmapLayer
- `pages/AdminDashboard.jsx` → refatorado (+479/-479): StatusBadge, KPI cards
- `pages/AdminDashboardMetrics.jsx` → refatorado (+482/-482)
- `pages/DefectList.jsx` → refatorado (+223/-223)
- `pages/Login.jsx` → reescrito (+100/-100): framer-motion, useToast
- `pages/Register.jsx` → refatorado (+212/-212)
- `pages/Settings.jsx` → refatorado (+67/-67)
- `pages/ProfileSettings.jsx` → refatorado (+550/-550)
- `pages/GeneralSettings.jsx` → refatorado (+130/-130)
- `pages/SuperAdmin.jsx` → refatorado (+113/-113)
- `components/Header.jsx` → **removido**
- `components/UserMenu.jsx` → **removido**
- `components/LazyImage.jsx` → **removido**
- `components/SearchableSelect.jsx` → **removido** (substituido por `ui/searchable-select.jsx`)
- `components/Toast.jsx` → refatorado (+81/-81)
- `components/HeatmapLayer.jsx` → ajustado (+2/-1)
- `components/settings/*` → **todos removidos** (6 arquivos)
- `context/AuthContext.jsx` → ajustado (+1/-0)
- `context/ThemeContext.jsx` → ajustado (+2/-1)
- `package.json` → adicionados: tailwindcss, @tailwindcss/vite, tw-animate-css, shadcn
- `package-lock.json` → atualizado (+238)

**Componentes UI novos (8):**
- `ui/button.jsx` → Button com CVA (4 variantes, 8 tamanhos)
- `ui/command-menu.jsx` → Busca global Cmd+K
- `ui/data-table.jsx` → Tabela generica
- `ui/kpi-card.jsx` → Card de metrica
- `ui/searchable-select.jsx` → Dropdown searchable
- `ui/status-badge.jsx` → Badge de status (10 status)
- `ui/timeline.jsx` → Timeline de atualizacoes
- `ui/user-dropdown.jsx` → Menu do usuario

**Backend/Infra (4 arquivos):**
- `backend/src/config/database.js` → SSL config (+5)
- `backend/src/routes/auth.js` → authLimiter em endpoints protegidos (+3/-3)
- `docker-compose.yml` → ajustado (+4/-4)
- `nginx.prod.conf` → ajustado (+36/-36)

### 12.3 Design Tokens - Paleta Dourada

**Cores principais:**
| Token | Valor | Uso |
|---|---|---|
| `--color-gold-500` | `#D4A017` | Cor primaria, botoes, links |
| `--color-gold-400` | `#D4A017` | Hover de botoes |
| `--color-gold-600` | `#B8860B` | Variantes escuras |
| `--color-bg-primary` | `#0A0A0A` | Fundo principal |
| `--color-bg-surface` | `#141414` | Fundo de superficies |
| `--color-bg-elevated` | `#1A1A1A` | Fundo elevado (dropdowns) |
| `--color-bg-hover` | `#252525` | Hover de elementos |
| `--color-border-default` | `#2A2A2A` | Bordas padrao |
| `--color-text-primary` | `#FAFAFA` | Texto principal |
| `--color-text-secondary` | `#A1A1AA` | Texto secundario |
| `--color-text-muted` | `#52525B` | Texto desabilitado |
| `--color-text-inverse` | `#0A0A0A` | Texto em fundo claro |

**Cores de status:**
| Status | Cor | Label |
|---|---|---|
| Pendente/Aberto | `#4A90D9` (azul) | Aberto |
| Em Andamento | `#D4A017` (dourado) | Em Andamento |
| Atendido/Resolvido | `#4CAF7D` (verde) | Resolvido |
| Encerrado | `#6B5B3E` (marrom) | Encerrado |
| Critico | `#CF4444` (vermelho) | Critico |

### 12.4 Tailwind v4 - `@theme inline`

**Configuracao (`globals.css`):**
```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --color-gold-500: var(--color-gold-500);
  --color-bg-primary: var(--color-bg-primary);
  --color-text-primary: var(--color-text-primary);
  /* ... mapeamento de tokens */
}
```

**Diferencas v3 → v4:**
- `@import "tailwindcss"` no lugar de `@tailwind base/components/utilities`
- `@theme inline` para definir tokens customizados
- Zero configuracao `tailwind.config.js` necessaria
- Plugins via `@tailwindcss/vite` no lugar de `tailwindcss` postcss plugin

### 12.5 Justificativas

| Decisao | Motivo |
|---|---|
| Tailwind v4 | Utility-first, menor bundle, `@theme inline` nativo, zero config |
| shadcn/ui pattern | Componentes acessiveis, composiveis, padrao da industria |
| Tema dourado | Identidade visual "Central de Inteligencia Urbana" |
| Geist Variable | Fonte moderna, legivel, variable font (menos requests) |
| framer-motion | Animacoes declarativas, melhor DX que CSS animations |
| CVA (class-variance-authority) | Variantes de componentes tipadas e reutilizaveis |
| Remover `App.css` | 1092 linhas de CSS custom → Tailwind utilitario (mais manutenivel) |
| Remover `settings/*` blocks | Simplificacao: configuracoes integradas nas paginas especificas |

### 12.6 Build

**Resultado (`vite v8.0.10`):**
- 5619 modules processados
- `dist/assets/index-CQ3ZjYdi.css`: 41.54KB
- `dist/assets/MapPage-BjyMH9EB.js`: 27.60KB
- Total: ~120KB gzipped
- Build: **sucesso**, sem erros
