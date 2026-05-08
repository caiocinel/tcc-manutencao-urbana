# Manutenção Urbana PWA

Sistema completo de Gestão de Manutenção Urbana como Progressive Web App (PWA).

## Arquitetura

| Componente | Tecnologia |
|---|---|
| Frontend | React + Vite (PWA) |
| Backend | Node.js + Express |
| Banco de Dados | MongoDB |
| Autenticação | JWT + Argon2id |
| IA | Adaptador plugável (HuggingFace, OpenAI ou API própria) |
| Segurança | CSRF Token, Rate Limiting |

## Como Iniciar Localmente (sem Docker)

### Pré-requisitos
- Node.js 18+
- Python 3.9+ (para o serviço de IA, opcional)
- MongoDB local ou remoto (ou usa `mongodb-memory-server` como fallback)

### Passo a passo

1. **Instale as dependências do Backend**
   ```bash
   cd backend
   npm install
   ```

2. **Configure as variáveis de ambiente**
   ```bash
   # backend/.env já configurado para desenvolvimento
   # MONGODB_URI vazio = usa MongoDB em memória (não recomendado para produção)
   ```

3. **Inicie o Backend**
   ```bash
   cd backend
   npm run dev
   ```
   A API estará disponível em http://localhost:5000

4. **Inicie o Frontend** (em outro terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   O frontend estará disponível em http://localhost:5173

5. **Inicie o serviço de IA** (opcional, outro terminal)
   ```bash
   cd ia
   pip install -r requirements.txt
   python main.py
   ```

## Como Iniciar com Docker

```bash
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend (API): http://localhost:5000
- Serviço de IA: http://localhost:8000

## Serviço de IA (Pluggable)

O microserviço de IA é um adaptador genérico. Configure via variáveis de ambiente:

| Variável | Descrição | Padrão |
|---|---|---|
| `CLASSIFICATION_API_URL` | URL da API de classificação | HuggingFace bart-large-mnli |
| `CLASSIFICATION_API_KEY` | Token de autenticação | vazio |
| `CLASSIFICATION_FORMAT` | Formato: `huggingface` ou `generic` | huggingface |
| `CLASSIFICATION_CATEGORIES` | Categorias separadas por vírgula | Buraco,Iluminação,... |

Para usar sua própria API no futuro, basta mudar `CLASSIFICATION_API_URL` e `CLASSIFICATION_FORMAT=generic`.

## Endpoints da API

### Autenticação
- `POST /api/auth/registro` — Cadastro de usuário
- `POST /api/auth/login` — Login de usuário

### Defeitos
- `GET /api/defeitos` — Listar todos os defeitos
- `GET /api/defeitos/:id` — Obter defeito por ID
- `POST /api/defeitos` — Criar novo defeito (autenticado)
- `PATCH /api/defeitos/:id` — Atualizar status (admin)

### Segurança
- `GET /api/csrf-token` — Obter token CSRF
- Headers necessários em mutações: `X-XSRF-TOKEN`
- Rate limit: 100 req/15min global, 10 req/15min auth, 10 req/hora por usuário

## Otimizações para Baixa Memória (<300MB)

- MongoDB com `wiredTigerCacheSizeGB=0.1` (128MB limit)
- Backend Node.js com `maxPoolSize: 5` (100MB limit)
- Frontend estático via nginx Alpine (50MB limit)
- IA服务 Python Alpine (50MB limit)
- `mongodb-memory-server` movido para dependência opcional
- Dependências pesadas (transformers, torch) removidas
