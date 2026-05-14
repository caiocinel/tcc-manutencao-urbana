# Central de Inteligência Urbana — Documentação TCC

**Autor:** José Murilo Rodrigues Sabalo
**Orientador:** [Nome do Orientador]
**Instituição:** [Nome da Instituição]
**Data:** Maio de 2026

---

## Sumário

1. [Introdução](#1-introdução)
2. [Justificativa](#2-justificativa)
3. [Objetivos](#3-objetivos)
4. [Arquitetura do Sistema](#4-arquitetura-do-sistema)
5. [Stack Tecnológica](#5-stack-tecnológica)
6. [Funcionalidades](#6-funcionalidades)
7. [Casos de Uso](#7-casos-de-uso)
8. [Segurança](#8-segurança)
9. [Banco de Dados](#9-banco-de-dados)
10. [Inteligência Artificial](#10-inteligência-artificial)
11. [Infraestrutura e Deploy](#11-infraestrutura-e-deploy)
12. [Testes e Qualidade](#12-testes-e-qualidade)
13. [Bugs Corrigidos e Lições Aprendidas](#13-bugs-corrigidos-e-lições-aprendidas)
14. [Trabalhos Futuros](#14-trabalhos-futuros)
15. [Referências](#15-referências)

---

## 1. Introdução

### 1.1 Contexto

A gestão eficiente de chamados de infraestrutura urbana (buracos, iluminação pública quebrada, calçadas danificadas, árvores caídas, entulho) é um desafio enfrentado por municípios brasileiros. O processo tradicional — ligação telefônica ou protocolo presencial — é lento, sem rastreabilidade e desestimula a participação cidadã.

A **Central de Inteligência Urbana** surge como uma Plataforma Progressiva Web (PWA) full-stack que permite ao cidadão fotografar um defeito urbano, marcá-lo no mapa e acompanhar sua resolução, enquanto a prefeitura obtém inteligência de dados para priorizar e alocar recursos.

### 1.2 Problema

Municípios brasileiros carecem de ferramentas acessíveis para:
- **Registro descentralizado:** Nenhum canal simples para o cidadão reportar problemas com evidência (foto + localização)
- **Priorização baseada em dados:** Decisões tomadas por ordem de chegada, não por criticidade
- **Transparência:** Cidadão não consegue acompanhar o andamento de sua solicitação
- **Visão agregada:** Gestores não têm dashboards para enxergar padrões geográficos

### 1.3 Solução Proposta

Um sistema PWA com:
- Registro de defeitos com foto (compressão via Sharp WebP) + geolocalização
- Classificação automática por IA (embeddings ONNX local)
- Mapa interativo com clusters e heatmap
- Dashboard administrativo com métricas BI
- Notificações push (Web Push API)
- Acessibilidade WCAG AA
- Dark/light theme
- Responsivo (mobile-first com bottom sheets)

---

## 2. Justificativa

### 2.1 Por que PWA e não App Nativo?

| Aspecto | PWA | App Nativo |
|---------|-----|------------|
| Instalação | Nenhuma (navegador) | Loja/APK |
| Atualização | Automática (service worker) | Manual via loja |
| Notificações | Web Push API | Push nativo |
| Custo | Zero de loja | $25 Google Play (uma vez) |
| Acesso | Qualquer navegador moderno | Android/iOS específico |
| Offline | Service worker com cache | Suporte nativo |

O PWA foi escolhido por atingir **100% dos smartphones** sem barreira de instalação, essencial para adoção cidadã.

### 2.2 Por que migrar de SQLite para PostgreSQL?

| Aspecto | SQLite | PostgreSQL |
|---------|--------|------------|
| Concorrência | Lock de escrita (serial) | Pool de 10 conexões |
| Queries espaciais | ❌ | PostGIS (ST_Within, ST_DWithin) |
| JSON queries | Limitado | Operadores JSONB completos |
| Replicação | ❌ | Streaming replication |
| Backup point-in-time | ❌ | WAL archiving |

A migração foi motivada pela necessidade de **consultas espaciais** (validação de perímetro municipal, detecção de duplicatas por proximidade) e **concorrência real** para múltiplos usuários simultâneos.

### 2.3 Por que ARM64 (Ampere Altra)?

| Aspecto | VPS Anterior (x86) | VPS Atual (ARM) | Ganho |
|---------|-------------------|------------------|-------|
| RAM | 300 MB | 4 GB | 13× |
| CPU | 1 núcleo | 2 núcleos | 2× |
| Custo/mês | ~$12 | ~$8 | 33% menor |
| Eficiência | ~45W | ~15W | 3× |

A arquitetura ARM oferece melhor desempenho por watt e custo inferior. Os 4GB de RAM permitem alocar 2GB de heap para o Node.js (vs 80MB anterior), essencial para o dashboard de BI com Recharts.

### 2.4 Por que ONNX Runtime local?

A classificação de texto é feita localmente via ONNX Runtime por duas razões principais:

1. **Privacidade:** Dados de chamados públicos não trafegam por APIs externas
2. **Custo:** API da HuggingFace tem custo por inferência; ONNX local é gratuito após o build
3. **Latência:** Inferência local <500ms vs 1-3s via API
4. **Disponibilidade:** Sem dependência externa — funciona mesmo sem internet

O trade-off é o tamanho da imagem Docker (~200MB vs ~30MB sem IA) e maior uso de RAM em runtime.

---

## 3. Objetivos

### 3.1 Objetivo Geral

Desenvolver uma plataforma web progressiva para reporte, gestão e análise de chamados de infraestrutura urbana, utilizando inteligência artificial local para classificação automatizada e visualização geoespacial.

### 3.2 Objetivos Específicos

1. **OE1:** Implementar registro de defeitos com foto georreferenciada e compressão automática
2. **OE2:** Desenvolver classificador por embeddings ONNX (all-MiniLM-L6-v2) para 7 categorias urbanas com fallback por keywords
3. **OE3:** Construir mapa interativo com clusterização, heatmap e integração Leaflet
4. **OE4:** Criar dashboard administrativo com KPIs, gráficos Recharts e exportação CSV
5. **OE5:** Implementar autenticação JWT com 2FA, CPF criptografado (AES-256-GCM) e CSRF Double Submit Cookie
6. **OE6:** Garantir acessibilidade WCAG AA (aria-labels, skip-link, combobox, contraste, navegação por teclado)
7. **OE7:** Implantar em VPS ARM64 com Docker Compose, SSL Let's Encrypt e CI/CD via GitHub Actions
8. **OE8:** Validar perímetro municipal via PostGIS (ST_Within + ST_Buffer com margem de tolerância de ~1km) e detectar duplicatas espaciais + semânticas
9. **OE9:** Proteger privacidade dos cidadãos com desfoque gaussiano automático em todas as fotos enviadas

---

## 4. Arquitetura do Sistema

### 4.1 Visão Geral

```
+----------------------------------------------------------+
|                   NGINX (Proxy Reverso + SSL)             |
|  Porta 80 (HTTP -> redireciona HTTPS)                    |
|  Porta 443 (HTTPS com Let's Encrypt)                     |
|  Proxy reverso para backend:5000                         |
|  Cache de assets estáticos (30d)                         |
+---------------------------+------------------------------+
|                   FRONTEND (React 19 + Vite 8)            |
|  Build estático servido pelo Nginx                       |
|  PWA com service worker + notificações push              |
|  Mapas: Leaflet + react-leaflet + leaflet.heat           |
|  Gráficos: Recharts (dashboard)                          |
|  Ícones: Phosphor Icons                                  |
|  Animações: Framer Motion                                |
+---------------------------+------------------------------+
|                   BACKEND (Node.js + Express 5)           |
|  Porta 5000 (interno, atrás do Nginx)                    |
|  --max-old-space-size=2048 (heap de 2GB)                 |
|  Pino Logger estruturado com rotação diária              |
|  Validação: Zod (schemas em backend/src/validation/)     |
|  Helmet + CSRF Double Submit Cookie + Rate Limiting      |
|  Upload: Multer + Sharp (WebP 1200px + thumbnail 200px) |
+---------------------------+------------------------------+
|                   BANCO POSTGRESQL 16 + PostGIS 3.4       |
|  Pool de conexões (max 10)                               |
|  PostGIS: ST_Within, ST_DWithin, índices GIST            |
|  CPF criptografado em repouso (AES-256-GCM)              |
+---------------------------+------------------------------+
|                   IA (Python 3.12/FastAPI/ONNX)           |
|  Porta 8000 (profile: ia, opcional)                      |
|  Modelo: all-MiniLM-L6-v2 (384-d embeddings)             |
|  Imagem: MobileNetV3-small (576-d features)              |
|  Runtime: ~200MB, sem PyTorch (multi-stage build)        |
|  Circuit breaker: 3 falhas → 60s cooldown                |
+----------------------------------------------------------+
```

### 4.2 Arquitetura de Containers

```
docker-compose.yml (production)
├── nginx:alpine-slim (build local com frontend embutido)
│   ├── Portas: 80 → 443
│   ├── Volumes: certbot-data, certbot-www, uploads
│   └── Rede: app-network
├── certbot/certbot
│   ├── Profile: certbot
│   └── Renovação automática a cada 12h
├── postgis/postgis:16-3.4
│   ├── Porta: 5432
│   ├── Healthcheck: pg_isready (10s, 5 retries)
│   ├── Limites: 1 CPU / 1024MB RAM
│   └── Volume: postgres-data (persistente)
├── backend (build: backend/Dockerfile)
│   ├── Node 20-alpine + tini (init)
│   ├── Porta: 5000
│   ├── Healthcheck: /api/health (30s, 3 retries)
│   ├── Limites: 1 CPU / 1024MB RAM
│   ├── Depende: postgres (condition: service_healthy)
│   └── Volumes: uploads, backend-logs
└── ia (profile: ia, opcional)
    ├── Profile: ia
    ├── Python 3.12-slim + ONNX Runtime
    ├── Porta: 8000
    └── Healthcheck: /health (30s)
```

### 4.3 Fluxo de Dados (Requisição Completa)

```
Cidadão → [Navegador]
  → POST /api/defeitos (multipart: imagem + JSON descrição + GPS)
    → Nginx (proxy reverso)
      → CSRF validation (Double Submit Cookie)
        → Rate limit check (global 200/15min + user 10/h)
          → Multer (upload imagem, valida tipo/tamanho)
            → Sharp (compress WebP 1200px + thumbnail 200px)
              → Zod schema validation
                → PostGIS: ST_Within (defeito dentro do município?)
                  → ST_DWithin ~1km (duplicata espacial?)
                    → IA: POST /classify-full (categoria + prioridade)
                      → IA: POST /text-similarity (duplicata semântica?)
                        → INSERT into defeitos
                          → Resposta JSON para o frontend
                            → Mapa atualiza com novo cluster
```

---

## 5. Stack Tecnológica

### 5.1 Backend

| Tecnologia | Versão | Finalidade | Justificativa |
|------------|--------|------------|---------------|
| Node.js | 20 LTS (Alpine) | Runtime | Ecossistema maduro, performance, Alpine reduz imagem |
| Express | 5.x | Framework HTTP | Leve, middleware flexível, amplamente adotado |
| pg | 8.x | Driver PostgreSQL | Pool nativo, queries parametrizadas, baixo overhead |
| bcrypt | 5.x | Hash de senhas | Salt rounds = 10, padrão da indústria |
| jsonwebtoken | 9.x | JWT | Stateless, 24h expiração, payload customizado |
| Sharp | 0.33 | Compressão de imagens | Multi-thread (2 cores ARM), WebP nativo, ~70-80% economia |
| Multer | 1.x | Upload de arquivos | Middleware Express, integração com Sharp |
| Zod | 3.23 | Validação de schemas | TypeScript-first, schemas compostos, mensagens em pt-BR |
| Helmet | 7.x | Headers de segurança | CSP, X-Frame-Options, etc |
| express-rate-limit | 7.x | Rate limiting | 3 níveis (global, auth, API) |
| Pino | 8.x | Logger estruturado | Performance (low overhead), rotação diária |
| web-push | 3.x | Notificações PWA | Protocolo Web Push com VAPID |
| dotenv | 16.x | Variáveis de ambiente | 12-factor app |

### 5.2 Frontend

| Tecnologia | Versão | Finalidade | Justificativa |
|------------|--------|------------|---------------|
| React | 19 | UI Library | Concurrent features, server components futuros |
| Vite | 8 | Bundler | Build sub-2s, HMR instantâneo |
| React Router | 7.x | Roteamento SPA | Loaders, actions, data APIs |
| Leaflet | 1.9 | Mapas interativos | Open source, sem API key, leve |
| react-leaflet | 4.x | Componentes React | Integração declarativa com Leaflet |
| leaflet.heat | — | Heatmap | Plugin de mapa de calor |
| Recharts | 2.x | Gráficos | React-first, responsivo, acessível |
| Phosphor Icons | 2.x | Ícones vetoriais | 900+ ícones, tree-shakeable, Regular/Fill/Duotone |
| Framer Motion | 11.x | Animações | Layout animations, gesture, spring physics |
| vite-plugin-pwa | — | Service worker | Workbox precaching, manifest, splash screen |

### 5.3 IA

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| Python | 3.12-slim | Runtime (imagem final ~200MB) |
| FastAPI | 0.x | Framework HTTP (inferência) |
| ONNX Runtime | 1.x | Inferência de modelos (sem PyTorch) |
| all-MiniLM-L6-v2 | — | Embeddings de texto (384-d) |
| MobileNetV3-small | — | Extrator de features de imagem (576-d) |
| PyTorch | 2.12 (build only) | Exportação dos modelos para ONNX |

### 5.4 Infraestrutura

| Tecnologia | Finalidade |
|------------|------------|
| Hetzner CX11 ARM64 | VPS (Ampere Altra, 4GB, 2 cores, 40GB NVMe) |
| Docker Compose v5 | Orquestração de containers |
| Nginx Alpine | Proxy reverso + SSL + cache |
| Let's Encrypt | Certificados SSL gratuitos |
| GitHub Actions | CI/CD (lint → build → test → deploy) |
| PostgreSQL 16 + PostGIS 3.4 | Banco de dados geoespacial |
| PM2 (fallback) | Gerenciamento de processo Node.js |

---

## 6. Funcionalidades

### 6.1 Cidadão (Usuário Não Autenticado)

| Funcionalidade | Descrição | Requisito |
|----------------|-----------|-----------|
| Visualizar mapa | Mapa interativo com clusters de defeitos, heatmap toggle | Navegador moderno |
| Listar chamados | Grid de cards com status, foto thumbnail, localização | Navegador moderno |
| Ver detalhes | Modal com descrição completa, fotos, upvotes, atualizações | Navegador moderno |
| Filtrar por status | Filtros no mapa e na lista | Navegador moderno |
| Login/Cadastro | Formulários com validação inline | Navegador moderno |

### 6.2 Cidadão Autenticado

| Funcionalidade | Descrição | Tecnologia |
|----------------|-----------|------------|
| Reportar defeito | Formulário com foto, descrição, GPS (arrastável no mapa) | Leaflet + Sharp |
| Classificação IA automática | Categoria + prioridade sugeridas pelo modelo ONNX | FastAPI ONNX |
| Detecção de duplicatas | Alerta se defeito similar já existe próximo | PostGIS ST_DWithin + similaridade ONNX |
| Moderar spam | Descrições genéricas são sinalizadas | Keyword + embedding |
| Anexar complementos | Texto e/ou imagens adicionais (max 3) | Multer + Sharp |
| Upvote | Apoiar chamados de outros cidadãos | Toggle (insere/remove) |
| Acompanhar status | Ver evolução do chamado (aberto → resolvido) | Tempo real via API |
| Notificações push | Alertas quando o chamado é atualizado | Web Push API |
| Verificar email | Código de 6 dígitos enviado via Resend | Resend API |
| 2FA opcional | Código de verificação no login | Resend API |
| Alterar senha | Validação de senha atual + nova | bcrypt |
| Tema dark/light | Alternância manual, respeita prefers-color-scheme | CSS variables |
| Atalhos de teclado | g + m (mapa), g + a (admin), g + t (tema), ? (ajuda) | useKeyboardNav hook |

### 6.3 Administrador

| Funcionalidade | Descrição |
|----------------|-----------|
| Dashboard KPIs | Total de chamados, por status, por categoria, taxa de resolução |
| Mapa admin | Defeitos coloridos por status, clusters por região |
| Gráficos | Barras (categoria), pizza (prioridade), sparklines (série temporal) |
| Gerenciar chamados | Alterar status, prioridade, secretaria responsável |
| Encerramento em lote | Selecionar múltiplos chamados e encerrar |
| Listar usuários | Tabela com nome, email, município, status de verificação |
| Atribuir município | Vincular usuário a um município |
| Exportar CSV | Download de dados para análise externa |

### 6.4 Super Admin

| Funcionalidade | Descrição |
|----------------|-----------|
| Promover/remover admin | Gerenciar permissões de administradores |
| (Mesmas do admin) | Todas as funcionalidades de admin |

### 6.5 Mapa Interativo

| Funcionalidade | Tecnologia |
|----------------|------------|
| Clusters automáticos | Leaflet.markercluster (~500m raio) |
| Heatmap | leaflet.heat (intensidade por concentração) |
| Popup com thumbnail | Thumbnail base64 inline, sem requisição extra |
| Arrastar pin | Usuário ajusta localização exata |
| Filtro por status | Dropdown no mapa |
| CartoDB tiles | tiles às ruas (gratuito, sem API key) |

### 6.6 Inteligência Artificial

| Funcionalidade | Modelo | Como funciona |
|----------------|--------|---------------|
| Classificar texto | all-MiniLM-L6-v2 | Embedding 384-d → cosseno com 7 centroides → Softmax(t=3.0) |
| Extrair prioridade | Regras + embedding | Keywords (urgente/alta/media/baixa) + confiança semântica |
| Detectar spam | Regras + embeddings | Texto curto, genérico, repetitivo (unique_ratio < 0.3) |
| Similaridade semântica | all-MiniLM-L6-v2 | Cosseno entre embeddings (dedup textual) |
| Classificar imagem | MobileNetV3-small | Feature extractor 576-d (❌ sem fine-tuning → retorna "Outro", 0.5 constante) |
| Rotear para secretaria | Mapa estático | Categoria → Secretaria → SLA |
| Resumo semanal | Agregação SQL + IA | Totais, taxa resolução, top categoria/bairro |
| Clusters críticos | Agregação SQL | 5+ chamados mesma categoria em 7 dias |

### 6.7 Acessibilidade (WCAG AA)

| Critério | Implementação |
|----------|---------------|
| 1.4.3 Contraste (AA) | 7.58:1 (dark), 16.4:1 (light) — AAA |
| 2.1.1 Teclado | Todos os elementos focáveis, atalhos g+key |
| 2.4.1 Skip link | Link "Ir para conteúdo" no topo |
| 2.4.3 Foco | :focus-visible 2px outline verde |
| 2.4.7 Foco visível | Inputs, botões, links têm foco visível |
| 4.1.2 ARIA roles | role="dialog", "alert", "combobox", "status" |
| 4.1.3 Live regions | aria-live="polite" em toasts |
| Redução de movimento | prefers-reduced-motion respeitado |

---

## 7. Casos de Uso

### 7.1 UC01 — Reportar Defeito Urbano

```
Ator principal: Cidadão autenticado
Pré-condição: Usuário logado com email verificado
Pós-condição: Defeito registrado no sistema com classificação IA

Fluxo principal:
1. Usuário acessa / (Mapa)
2. Clica no FAB (+) ou toca no mapa
3. Preenche: título, descrição, tira/seleciona foto
4. Ajusta localização no mapa (pin arrastável)
5. Confirma envio
6. Sistema valida (Zod) → comprime imagem (Sharp) → 
   verifica perímetro (PostGIS ST_Within) → 
   detecta duplicatas (ST_DWithin + similaridade ONNX) →
   classifica IA (categoria + prioridade) → salva
7. Usuário vê toast de sucesso
8. Mapa atualiza com novo cluster

Fluxo alternativo (duplicata):
  6a. IA detecta duplicata próxima
  6b. Sistema retorna aviso: "Já existe um chamado similar próximo"
  6c. Usuário decide se quer criar mesmo assim
```

### 7.2 UC02 — Gerenciar Chamados (Admin)

```
Ator principal: Administrador
Pré-condição: Usuário autenticado com role admin ou super
Pós-condição: Chamado(s) atualizado(s)

Fluxo principal:
1. Admin acessa /admin (AdminDashboard)
2. Visualiza KPIs: total, pendentes, resolvidos hoje
3. Navega no mapa admin (clusters coloridos por status)
4. Clica em cluster → lista de chamados
5. Clica em chamado → modal de detalhes
6. Altera status (ex: pendente → em_andamento)
7. Sistema dispara notificação push ao cidadão
8. Admin confirma → modal fecha
```

### 7.3 UC03 — Dashboard de Métricas

```
Ator principal: Administrador
Pré-condição: Usuário autenticado com role admin
Pós-condição: Visualização de métricas

Fluxo principal:
1. Admin acessa /admin/dashboard
2. Visualiza cards: total, resolvidos, abertos, taxa resolução
3. Gráfico de barras: chamados por categoria
4. Gráfico de pizza: distribuição por prioridade
5. Sparkline: série temporal dos últimos 30 dias
6. Exporta CSV dos dados atuais
```

### 7.4 UC04 — Cadastro com Validação de CPF

```
Ator principal: Novo cidadão
Pré-condição: Navegador moderno
Pós-condição: Conta criada com CPF e email verificados

Fluxo principal:
1. Usuário acessa /registro
2. Preenche nome, email, senha, confirma senha
3. Digita CPF → validação inline (dígitos verificadores)
4. Seleciona município (SearchableSelect com 5570 opções)
5. Confirma → BrasilAPI valida CPF (nome + situação)
6. Sistema cria conta com CPF criptografado (AES-256-GCM)
7. Envia código de verificação por email (Resend)
8. Usuário digita código de 6 dígitos
9. Conta ativada → redireciona para / (Mapa)
```

### 7.5 UC05 — Classificação por IA

```
Ator principal: Sistema (automático)
Pré-condição: Container IA rodando (profile: ia)
Pós-condição: Defeito classificado ou fallback aplicado

Fluxo principal:
1. Backend recebe POST /api/defeitos
2. Extrai texto da descrição
3. Se IA_url configurada e circuit breaker aberto:
   a. POST /classify-full → {category, priority}
   b. POST /text-similarity → dedup semântico
   c. POST /check-spam → moderação
4. Se IA falha ou timeout >3s:
   a. Circuit breaker incrementa falha
   b. Após 3 falhas consecutivas → cooldown de 60s
   c. Fallback: keyword classifier
5. Retorna sugestões para o frontend
```

---

## 8. Segurança

### 8.1 Autenticação e Autorização

| Mecanismo | Implementação |
|-----------|---------------|
| Hash de senhas | bcrypt (salt rounds = 10) |
| JWT | 24h expiração, payload: {userId, email, admin, municipio_id} |
| Hierarquia | user → admin → super admin |
| 2FA (TOTP-like) | Código de 6 dígitos enviado por email, 5min expiração |

### 8.2 Proteção de Dados Sensíveis

| Dado | Técnica | Detalhe |
|------|---------|---------|
| CPF | AES-256-GCM | IV aleatório, ciphertext armazenado como base64 |
| CPF (busca) | SHA-256 HMAC | Permite busca por CPF sem expor o original |
| Senha | bcrypt | Salt rounds = 10, nunca armazenada em texto plano |

### 8.3 Proteção Contra Ataques

| Ameaça | Mitigação |
|--------|-----------|
| CSRF | Double Submit Cookie (XSRF-SESSION httpOnly + XSRF-TOKEN via JS) |
| Rate limiting | 4 níveis: global (200/15min), auth (20/15min), API (200/h), user (10/h) |
| XSS | Helmet headers + React escapa HTML |
| Upload malicioso | Valida tipo MIME + extensão (whitelist), Sharp converte para WebP |
| Privacidade LGPD | Desfoque gaussiano (blur sigma 0.6) em todas as fotos para proteger rostos e placas |
| Dados pessoais | Aviso de privacidade no formulário de upload; `censurarNome()` exibe nome parcial no popup |
| Força bruta | authLimiter: 20 tentativas/15min |
| Injection | Queries parametrizadas ($1, $2, ... via pool.query) |
| DoS | globalLimiter + deploy.resources.limits (CPU/memory) |

### 8.4 Headers de Segurança (Helmet)

| Header | Configuração |
|--------|-------------|
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| X-XSS-Protection | 1; mode=block |
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| Content-Security-Policy | Desabilitado (necessário para tiles Leaflet) |

---

## 9. Banco de Dados

### 9.1 Schema Principal

```sql
-- Tabela de usuários
users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  senha             TEXT NOT NULL,            -- Hash bcrypt
  admin             INTEGER DEFAULT 0,        -- 0=user, 1=admin
  municipio_id      TEXT REFERENCES municipios(codigo),
  cpf               TEXT,                     -- AES-256-GCM, base64
  cpf_hash          TEXT UNIQUE,              -- SHA-256 HMAC
  email_verificado  INTEGER DEFAULT 0,
  codigo_2fa        TEXT,                     -- Código 2FA (6 dígitos)
  codigo_2fa_expira TEXT,                     -- ISO timestamp
  requestsResetAt   TEXT,                     -- Rate limit per-user
  requestsCount     INTEGER DEFAULT 0,
  criado_em         TEXT NOT NULL,
  atualizado_em     TEXT NOT NULL
);

-- Tabela de municípios (IBGE, 5570 linhas)
municipios (
  codigo        TEXT PRIMARY KEY,             -- Código IBGE 7 dígitos
  nome          TEXT NOT NULL,
  uf            TEXT NOT NULL,
  uf_sigla      TEXT NOT NULL,
  min_lat       DOUBLE PRECISION,            -- Bounding box
  max_lat       DOUBLE PRECISION,
  min_lng       DOUBLE PRECISION,
  max_lng       DOUBLE PRECISION,
  poligono_json TEXT,                        -- GeoJSON MultiPolygon
  polygon_geom  geometry(MultiPolygon,4326)  -- PostGIS (GIST indexado)
);

-- Tabela de categorias (seed automático)
categorias (
  id              SERIAL PRIMARY KEY,
  nome            TEXT UNIQUE NOT NULL,
  icone           TEXT,                      -- Emoji
  prioridade_base TEXT DEFAULT 'media',
  prazo_sla_dias  INTEGER DEFAULT 7
);

-- Tabela de defeitos
defeitos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        TEXT NOT NULL REFERENCES users(id),
  titulo            TEXT NOT NULL,
  descricao         TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  geom              geometry(Point,4326)     -- GENERATED ALWAYS AS ...
                                             -- ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  rua               TEXT,
  bairro            TEXT,
  imagem_url        TEXT,
  categoria         TEXT REFERENCES categorias(nome),
  status            TEXT DEFAULT 'pendente',
  prioridade        TEXT DEFAULT 'media',
  previsao_conclusao TEXT,
  atendido_em       TEXT,
  usuario_email     TEXT,
  imagem_thumbnail  BYTEA,                    -- WebP 200px (~5-15KB)
  imagens_extra     TEXT DEFAULT '[]',         -- JSON array de URLs
  atualizacoes      TEXT DEFAULT '[]',         -- JSON array de {texto, usuario, criado_em}
  criado_em         TEXT NOT NULL,
  atualizado_em     TEXT NOT NULL
);

-- Tabela de apoios (upvotes)
apoios (
  id          SERIAL PRIMARY KEY,
  usuario_id  TEXT NOT NULL REFERENCES users(id),
  defeito_id  TEXT NOT NULL REFERENCES defeitos(id),
  criado_em   TEXT NOT NULL,
  UNIQUE(usuario_id, defeito_id)
);

-- Tabela de inscrições push
push_subscriptions (
  id          SERIAL PRIMARY KEY,
  usuario_id  TEXT NOT NULL REFERENCES users(id),
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  criado_em   TEXT NOT NULL,
  UNIQUE(usuario_id, endpoint)
);
```

### 9.2 Índices Geoespaciais (PostGIS)

```sql
-- Índices GIST para consultas espaciais
CREATE INDEX idx_municipios_polygon_geom ON municipios USING GIST (polygon_geom);
CREATE INDEX idx_defeitos_geom ON defeitos USING GIST (geom);

-- Queries principais:
-- Validação de perímetro com margem de tolerância:
--   SELECT 1 FROM municipios WHERE codigo = $1 AND polygon_geom IS NOT NULL
--     AND (ST_Within(point, polygon_geom)
--       OR ST_Within(point, ST_Buffer(polygon_geom, 0.01)))  -- ~1km de margem
-- A margem (PERIMETER_BUFFER_DEG=0.01 ≈ 1km) evita rejeição por erro de GPS em divisas municipais.
-- Detecção de duplicatas (~1km):
--   SELECT ST_DWithin(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326), 0.01)
```

### 9.3 Categorias e SLA

| Categoria | Ícone | Prioridade Base | SLA (dias) |
|-----------|-------|-----------------|------------|
| Segurança Crítica | ⚠️ | alta | 1 |
| Saneamento/Saúde | 💧 | alta | 3 |
| Mobilidade | 🛣️ | media | 7 |
| Zeladoria | 🧹 | baixa | 15 |
| Iluminação | 💡 | media | 5 |
| Árvore Caída | 🌳 | alta | 2 |
| Semáforo | 🚦 | alta | 2 |
| Buraco | 🕳️ | media | 7 |
| Outro | 📋 | baixa | 15 |

---

## 10. Inteligência Artificial

### 10.1 Arquitetura do Container IA

```
┌──────────────────────────────────────────────────────┐
│  ia:8000 (Python 3.12-slim, 800M RAM max)           │
│                                                      │
│  FastAPI ← POST /classify, /classify-full, etc.      │
│     ↓                                                 │
│  inference.py (ONNX Runtime session)                   │
│     ├── text_session → all-MiniLM-L6-v2.onnx          │
│     ├── image_session → mobilenetv3.onnx               │
│     └── centroides.json (7 vetores pré-computados)    │
│                                                      │
│  Healthcheck: GET /health (30s)                       │
│  Restart: unless-stopped                               │
│  Profile: ia (opcional no docker-compose)             │
└──────────────────────────────────────────────────────┘
```

### 10.2 Pipeline de Classificação de Texto

```
Texto do usuário (descrição do defeito)
  │
  ▼
Tokenizer (max_length=128, pad/truncate)
  │
  ▼
all-MiniLM-L6-v2 ONNX → last_hidden_state (1×128×384)
  │
  ▼
Mean pooling (média dos token embeddings não-padding)
  │
  ▼
L2 normalize (vetor unitário 384-d)
  │
  ▼
Produto escalar com 7 centroides de categoria
  │
  ▼
Softmax(temperatura=3.0)
  │
  ▼
Categoria + confiança
  │ confiança < 0.3 ? "Outro" : categoria
  │
  ▼
Fallback: keyword classifier se ONNX falha
```

### 10.3 Modelos

| Modelo | Arquitetura | Parâmetros | Dim. Saída | Tamanho ONNX |
|--------|-------------|------------|------------|---------------|
| Texto | all-MiniLM-L6-v2 | 22.7M | 384 | ~90MB |
| Imagem | MobileNetV3-small (⚠️ experimental) | 2.5M | 576 (avg pool) | ~9MB |

### 10.4 Categorias para Classificação

As 7 categorias são representadas por centroides (média dos embeddings de exemplos textuais):

1. **Buraco** — "buraco na rua", "depressão no asfalto", " cratera na via"
2. **Iluminação** — "poste apagado", "lâmpada queimada", "falta de luz"
3. **Semáforo** — "semáforo quebrado", "sinaleira apagada", "farol desligado"
4. **Árvore Caída** — "árvore caída na pista", "galho sobre a calçada"
5. **Entulho** — "lixo acumulado", "entulho na calçada", "resíduos"
6. **Calçada Danificada** — "calçada quebrada", "piso irregular"
7. **Outro** — categoria residual

### 10.5 Circuit Breaker

```javascript
// Configuração do circuit breaker da IA
const IA_CIRCUIT = {
  maxFailures: 3,      // 3 falhas consecutivas
  cooldownMs: 60000,   // 60s de cooldown
  timeoutMs: 3000,     // 3s timeout por requisição
  failures: 0,         // contador atual
  lastFailure: null,   // timestamp da última falha
  isOpen: false        // estado do circuito
};
```

### 10.6 IA Container Build (Multi-stage)

```
Stage 1: builder (python:3.12 + PyTorch 2.12 + Transformers)
  ├── Baixa all-MiniLM-L6-v2 do HuggingFace
  ├── Exporta para ONNX (input_ids, attention_mask → last_hidden_state)
  ├── Computa 7 centroides a partir de exemplos textuais
  ├── Baixa MobileNetV3-small e exporta para ONNX
  └── Saída: .onnx + tokenizer.json + centroides.json

Stage 2: runtime (python:3.12-slim)
  ├── onnxruntime (1 CPU thread)
  ├── tokenizers (Rust bindings, rápido)
  └── Copia .onnx + centroides + tokenizer do builder
```

### 10.7 Status Real da Classificação de Imagem

**⚠️ O ImageClassifier (MobileNetV3-small) NÃO está treinado para classificar defeitos urbanos.** O modelo carrega o extrator de features sem a cabeça de classificação (sem fine-tuning). A chamada `classify()` sempre retorna `("Outro", 0.5)` — confiança fixa arbitrária.

**O que ele faz de fato:**
- Extrai um vetor de 576 features da imagem
- Esse vetor poderia alimentar um classificador treinado (SVM, MLP) com dados rotulados
- Atualmente serve como placeholder para futura implementação

**Limitação documentada:**
- Sem dataset rotulado de defeitos urbanos (buraco vs sombra, árvore vs entulho), não há como garantir diferenciação visual
- O sistema depende da categoria selecionada manualmente pelo cidadão no formulário
- A rota `/classify-image` existe mas retorna `Outro, 0.5` — documentada como experimental

**Trabalho futuro:** Fine-tuning com dataset de ~1000 imagens rotuladas por categoria urbana. Alternativa: usar API de visão computacional (Google Vision, AWS Rekognition) como fallback.

---

## 11. Infraestrutura e Deploy

### 11.1 Especificações da VPS

| Recurso | Valor |
|---------|-------|
| Provedor | Hetzner |
| Plano | CX11 ARM |
| CPU | Ampere Altra (ARM64), 2 cores |
| RAM | 4 GB |
| Armazenamento | 40 GB NVMe |
| Sistema | Ubuntu (x86_64 userspace via QEMU) |
| Custo | ~$8/mês |

### 11.2 Alocação de Recursos (Docker)

| Container | CPU | RAM | Porta |
|-----------|-----|-----|-------|
| nginx | — | — | 80/443 |
| postgres | 1 | 1024M | 5432 |
| backend | 1 | 1024M | 5000 |
| ia (opcional) | 1 | 800M | 8000 |
| **Total** | 3 | ~2.8G | — |

### 11.3 Pipeline CI/CD (GitHub Actions)

```yaml
Push to master
  → test:
    → build Docker images
    → start PostgreSQL
    → run backend lint (ESLint)
    → build frontend (Vite)
    → build nginx (Dockerfile multi-stage)
    → stop services
  → deploy (master only):
    → SSH into VPS
    → git pull origin master
    → docker compose build
    → docker compose up -d (postgres, backend, nginx)
    → Run PostGIS migration SQL
    → docker image prune -f
```

### 11.4 Backup

```bash
# Script: scripts/backup-postgres.sh
# Agendamento: diário 03:00 (cron)
# Formato: pg_dump custom comprimido (gzip)
# Retenção: 30 dias (configurável)
# Destino: Volume Docker (opcional: S3 via rclone)
# Notificação: Telegram opcional em falha
```

### 11.5 URLs

| Serviço | URL |
|---------|-----|
| Frontend | https://tcc.josemurilors.com.br |
| API | https://tcc.josemurilors.com.br/api |
| Health check | https://tcc.josemurilors.com.br/api/health |
| IA (interno) | http://ia:8000 |

---

## 12. Testes e Qualidade

### 12.1 Validação (Zod Schemas)

| Schema | Arquivo | Validações |
|--------|---------|------------|
| Auth | `validation/auth.schema.js` | register, login, verify2fa, changePassword, updateProfile |
| Defeitos | `validation/defeitos.schema.js` | create, update, batchEncerrar, anexar |
| Admin | `validation/admin.schema.js` | updateUser, updateDefeitoAdmin |

### 12.2 Lint

| Alvo | Ferramenta | Status |
|------|-----------|--------|
| Backend | ESLint | 0 erros |
| Frontend | ESLint (Vite) | 0 erros |

### 12.3 Invariantes do Sistema (SPEC.md §V)

```
V1: Chamada IA nunca bloqueia criação de defeito (timeout 3s + catch)
V2: Modelos .onnx devem existir antes do container iniciar
V3: Serviços com profile têm fallback explícito
V4: POST defeito < 1s sem IA, < 4s com IA
V5: Texto > 500 chars truncado antes da inferência
V6: Imagem redimensionada + comprimida antes de base64 (max 1MB)
V7: IA container tem healthcheck + restart unless-stopped
V8: ONNX gerado no build (multi-stage), sem PyTorch em runtime
V9: Perímetro: ST_Within OR ST_Within(point, ST_Buffer(polygon, 0.01)). Dedup: ST_DWithin(0.01). Polygon: MultiPolygon.
V10: Todo botão de ícone tem aria-label. Modal: role=dialog+aria-modal. Erro: role=alert.
V11: Toda foto enviada passa por desfoque gaussiano (blur sigma >= 0.6) antes de salvar.
V12: O classificador de imagem (MobileNetV3) retorna "Outro, 0.5" — sem fine-tuning. Documentado como experimental.
```

---

## 13. Bugs Corrigidos e Lições Aprendidas

### 13.1 Bug: NaN no Rate Limit (2026-05-13)

**Causa:** PostgreSQL retorna colunas em lowercase (`requestscount`), mas o código usava camelCase (`requestsCount`). `undefined + 1 = NaN` no `checkUserRateLimit`.

**Correção:** `User.js:17` — mapear `row.requestscount` em vez de `row.requestsCount`.

**Lição:** PostgreSQL `SELECT *` sempre retorna lowercase. Verificar case em todo mapeamento ORM manual.

### 13.2 Bug: JSON.parse([]) (2026-05-13)

**Causa:** `Defeito.create()` passava array `[]` para campos JSON, mas `toDefeito()` fazia `JSON.parse(row.imagens_extra)`. `JSON.parse([])` → `JSON.parse("")` → SyntaxError.

**Correção:** Passar strings `'[]'` em vez de arrays. Adicionada função `parseJsonField` para robustez.

**Lição:** `JSON.parse([])` é bug silencioso ([] → "" → parse vazio). Sempre passar strings JSON.

### 13.3 Bug: IA Keyword Classifier (2026-05-13)

**Causa:** IA usava contagem de palavras-chave (keyword classifier) em vez do modelo ONNX real — decisão não baseada em dados.

**Correção:** Build multi-stage com PyTorch → export ONNX → centroides computados de exemplos reais.

**Lição:** Implementar modelo real desde o início; fallback só para contingência.

### 13.4 Bug: Secrets Hardcoded (2026-05-13)

**Causa:** Senha padrão do banco e Resend API key estavam hardcoded nos arquivos.

**Correção:** Removidas para `.env.example` com placeholders. Adicionado `.env.production` ao `.gitignore`.

**Lição:** Usar `git secrets` ou `gitleaks` como pre-commit hook.

### 13.5 Bug: PostGIS Polygon Type (2026-05-13)

### 13.6 Fix: Tolerância de Perímetro (2026-05-14)

**Causa:** `ST_Within` rejeitava chamados na divisa municipal se o GPS tivesse erro de 10-50m.

**Correção:** `ST_Buffer(polygon_geom, 0.01)` (~1km margem) como fallback. Mensagem de erro melhorada com dica UX.

**Lição:** Validação geográfica deve sempre considerar imprecisão de GPS (5-15m em celular).

### 13.7 Fix: Privacidade de Imagens (2026-05-14)

**Causa:** Fotos enviadas podiam conter rostos e placas de veículos — risco LGPD.

**Correção:** Desfoque gaussiano (sigma 0.6) em todas as fotos + aviso de privacidade no formulário.

**Lição:** Privacidade por design desde o início. Desfoque global é solução pragmática; detecção seletiva (YOLO) é trabalho futuro.

### 13.8 Fix: Documentação Honesta da Classificação de Imagem (2026-05-14)

**Causa:** Documentação anterior sugeria que MobileNetV3 classificava imagens em 7 categorias, mas o modelo nunca passou por fine-tuning.

**Correção:** Código e documentação atualizados para refletir a realidade: retorna `("Outro", 0.5)` constante.

**Lição:** Não prometer funcionalidade não implementada. Documentar limitações é mais ético que superestimá-las.

**Causa:** Migration SQL usava `Polygon` mas GeoJSON real do IBGE contém `MultiPolygon`.

**Correção:** `geometry(Polygon,4326)` → `geometry(MultiPolygon,4326)`.

**Lição:** Validar tipo geometria com dados reais antes da migration.

---

## 14. Trabalhos Futuros

### 14.1 Pendentes (SPEC.md §T)

| ID | Tarefa | Prioridade |
|----|--------|------------|
| T15 | PWA offline: background sync, manifest, splash screen | Média |
| T16 | Light/dark theme: finalizar toggle + prefers-color-scheme | Média |

### 14.2 Melhorias Planejadas

| Item | Descrição |
|------|-----------|
| Fine-tuning MobileNetV3 | Rotular dataset de imagens urbanas para classificação visual real |
| Observabilidade | Prometheus + Grafana ou Uptime Kuma |
| Backup automático | Ativar serviço `backup` no docker-compose |
| Cache Redis | Cache de queries frequentes (municípios, categorias) |
| Testes automatizados | Jest + Playwright (E2E) |
| i18n | Internacionalização (Inglês) |
| WebSocket | Tempo real para atualizações do mapa |
| App Android | WebView nativo (wrapper) |
| Rate limit por IP | Adicionar `keyGenerator` por IP no express-rate-limit |

---

## 15. Referências

1. **React 19** — https://react.dev
2. **Vite 8** — https://vite.dev
3. **Express 5** — https://expressjs.com
4. **PostgreSQL 16** — https://www.postgresql.org
5. **PostGIS 3.4** — https://postgis.net
6. **ONNX Runtime** — https://onnxruntime.ai
7. **all-MiniLM-L6-v2** — https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
8. **Leaflet** — https://leafletjs.com
9. **Recharts** — https://recharts.org
10. **Phosphor Icons** — https://phosphoricons.com
11. **Framer Motion** — https://www.framer.com/motion
12. **Zod** — https://zod.dev
13. **Sharp** — https://sharp.pixelplumbing.com
14. **Let's Encrypt** — https://letsencrypt.org
15. **Hetzner Cloud** — https://www.hetzner.com
16. **Docker Compose** — https://docs.docker.com/compose
17. **WCAG 2.2** — https://www.w3.org/TR/WCAG22
18. **OWASP CSRF** — https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
19. **BrasilAPI** — https://brasilapi.com.br
20. **IBGE API** — https://servicodados.ibge.gov.br/api/docs/localidades
