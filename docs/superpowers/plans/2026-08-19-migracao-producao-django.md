# Migração da Produção Node.js → Django no VPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o backend Node.js legado da produção (VPS 178.105.83.187) pela versão Django/Python atual do repositório, preservando os dados Postgres existentes, o tunnel Cloudflare e os demais sites do mesmo nginx (portfolio, hardware-lab, pocketbase).

**Architecture:** O VPS roda um nginx multi-site (4 domínios) acessado por um tunnel Cloudflare. O bloco TCC atualmente proxy para `backend:5000` (Node.js). A migração troca apenas o serviço `backend` do compose por Django (Gunicorn :8000) e aponta o upstream nginx de `backend:5000` → `backend:8000`, mantendo todo o resto. O `bootstrap_schema.py` (CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + INSERT ON CONFLICT) roda sobre o banco existente preservando os 8 defeitos e 6 usuários.

**Tech Stack:** Django 5.2 + Gunicorn + PostgreSQL/PostGIS (existente), Redis (novo, para rate limit), ONNX IA (existente, Python), nginx, Docker Compose.

## Global Constraints

- Preservar o volume `postgres-data` (não dropar/recriar) — dados de produção.
- Preservar o tunnel Cloudflare (`tcc_tunnel`) e o serviço `nginx` (multi-site: portfolio, hardware-lab, pocketbase).
- Manter o nginx.prod.conf do VPS; alterar APENAS `upstream backend { server backend:5000 }` → `server backend:8000`.
- Sempre tirar backup Postgres ANTES de qualquer mudança.
- Rollback: manter imagem Node.js antiga e a versão anterior do compose/nginx até validação completa.
- O deploy usa rsync direto (pasta ativa `/opt/tcc-manutencao-urbana`), NÃO git pull.
- Usar o `DB_PASSWORD` existente no `.env.production` do VPS.

---

### Task 1: Backup de segurança do banco de produção

**Files:**
- Nenhum (operação no VPS)

**Interfaces:**
- Produces: arquivo de backup `backups/tcc-prod-<timestamp>.dump` no VPS

- [ ] **Step 1: Criar dump com pg_dump custom format**

```bash
SSH_ASKPASS=/tmp/ssh-askpass.sh SSH_ASKPASS_REQUIRE=force \
  ssh -i ~/ssh-hetzner.key -o StrictHostKeyChecking=no root@178.105.83.187 \
  "mkdir -p /root/backups && PG=\$(docker ps -q -f name=postgres) && docker exec \$PG pg_dump -U urbana -d manutencao_urbana --format=custom --file=/tmp/tcc-prod-backup.dump && docker cp \$PG:/tmp/tcc-prod-backup.dump /root/backups/tcc-prod-backup.dump && ls -lh /root/backups/"
```

- [ ] **Step 2: Verificar backup existe e tamanho**

Run: listar `/root/backups/tcc-prod-backup.dump` (deve existir, alguns KB/MB)
Expected: arquivo presente, sem erro

- [ ] **Step 3: Confirmar contagem de dados antes da migração (baseline)**

```bash
docker exec <PG> psql -U urbana -d manutencao_urbana -tAc "SELECT (SELECT count(*) FROM users) as users, (SELECT count(*) FROM defeitos) as defeitos, (SELECT count(*) FROM categorias) as categorias, (SELECT count(*) FROM apoios) as apoios"
```
Expected: users=6, defeitos=8, categorias>=7, apoios>=0 (anotar valores)

---

### Task 2: Sincronizar repositório Django para a pasta ativa do VPS

**Files:**
- Todos os arquivos do repositório local Django (rsync para `/opt/tcc-manutencao-urbana`)

**Interfaces:**
- Consumes: repositório local (backend-python/, frontend/, ia/, docker-compose.yml, nginx.Dockerfile)
- Produces: código Django na pasta `/opt/tcc-manutencao-urbana`

- [ ] **Step 1: Sincronizar arquivos Django via rsync (SEM --delete para não apagar os outros serviços)**

```bash
rsync -avz --progress \
  -e "ssh -i ~/ssh-hetzner.key -o StrictHostKeyChecking=no" \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'ia/__pycache__' \
  --exclude '.env' \
  --exclude '.env.production' \
  /home/josemurilors/tcc-manutencao-urbana/ \
  root@178.105.83.187:/opt/tcc-manutencao-urbana/
```
> NOTA: NÃO usar `--delete` nem sobrescrever `.env`/`.env.production` do VPS (segredos reais). Também NÃO sobrescrever `nginx.prod.conf` do VPS (multi-site) — ele será editado manualmente na Task 4.

- [ ] **Step 2: Verificar arquivos-chave presentes no VPS**

```bash
ls /opt/tcc-manutencao-urbana/backend-python/manage.py /opt/tcc-manutencao-urbana/docker-compose.yml /opt/tcc-manutencao-urbana/backend-python/Dockerfile
```
Expected: todos existem

- [ ] **Step 3: Confirmar que .env.production do VPS está intacto**

```bash
grep -c 'DB_PASSWORD' /opt/tcc-manutencao-urbana/.env.production
```
Expected: >=1 (não foi sobrescrito)

---

### Task 3: Preparar o compose Django de produção no VPS

**Files:**
- Create: `/opt/tcc-manutencao-urbana/docker-compose.prod.yml` (novo, baseado no docker-compose.yml do repo + preserva tunnel/nginx/postgres/ia)

**Interfaces:**
- Produces: compose com backend Django + tunnel + nginx + postgres + ia, sem quebrar multi-site

- [ ] **Step 1: Copiar o docker-compose.yml do repo para um nome novo no VPS (não sobrescrever o atual ainda)**

```bash
cp /opt/tcc-manutencao-urbana/docker-compose.yml /opt/tcc-manutencao-urbana/docker-compose.prod.yml
```
> O docker-compose.yml do repo JÁ é o de produção Django. Ele será usado como referência. NOTA: ele NÃO tem o serviço `tunnel` nem os binds multi-site do nginx — estes ficam no compose atual do VPS.

- [ ] **Step 2: Verificar que o compose.prod.yml tem os serviços backend/nginx/postgres/ia/redis**

```bash
docker compose -f /opt/tcc-manutencao-urbana/docker-compose.prod.yml config --services
```
Expected: nginx, postgres, redis, backend, ia, backup, demo-reset, certbot

- [ ] **Step 3: Backup do compose atual antes de qualquer substituição**

```bash
cp /opt/tcc-manutencao-urbana/docker-compose.yml /root/backups/docker-compose.yml.nodejs.bak
cp /opt/tcc-manutencao-urbana/nginx.prod.conf /root/backups/nginx.prod.conf.nodejs.bak
```

---

### Task 4: Mesclar o serviço tunnel + multi-site no compose Django

**Files:**
- Modify: `/opt/tcc-manutencao-urbana/docker-compose.yml` (substituir backend Node.js → Django, mantendo tunnel/nginx/postgres/ia)

**Interfaces:**
- Consumes: compose atual do VPS (Node.js) + compose Django do repo
- Produces: compose único com backend Django + tunnel + multi-site nginx

- [ ] **Step 1: Aplicar a migração no compose do VPS**

O compose atual do VPS tem: `backend` (Node.js), `nginx`, `postgres`, `ia`, `tunnel`, `backup`, `certbot`. Substituir o serviço `backend` pelo bloco Django (do `docker-compose.prod.yml`), ADICIONAR o serviço `redis`, e MANTEER `tunnel`, `nginx`, `postgres`, `ia`, `backup`, `certbot` como estão no VPS.

Comando de referência (substituir o bloco backend):
```yaml
  backend:
    container_name: chamados-manutencao-urbana
    build:
      context: ./backend-python
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DJANGO_SETTINGS_MODULE=core.settings.production
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - SUPER_ADMIN_EMAIL=${SUPER_ADMIN_EMAIL}
      - SUPER_ADMIN_PASSWORD=${SUPER_ADMIN_PASSWORD}
      - FRONTEND_URL=https://tcc.josemurilors.com.br
      - IA_URL=http://ia:8000
      - REDIS_URL=redis://redis:6379/0
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=manutencao_urbana
      - DB_USER=urbana
      - DB_PASSWORD=${DB_PASSWORD}
      - PRIVACY_BLUR_SIGMA=${PRIVACY_BLUR_SIGMA:-0.6}
      - PERIMETER_BUFFER_DEG=${PERIMETER_BUFFER_DEG:-0.01}
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - FROM_EMAIL=${FROM_EMAIL:-Central Urbana <onboarding@resend.dev>}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - ALLOWED_HOSTS=tcc.josemurilors.com.br,backend,localhost
      - SECURE_SSL_REDIRECT=false
    volumes:
      - uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    restart: unless-stopped
```

- [ ] **Step 2: Adicionar serviço `redis` ao compose**

```yaml
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 64mb --maxmemory-policy allkeys-lru
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.2'
          memory: 64M
    restart: unless-stopped
```

- [ ] **Step 3: Validar o compose mesclado**

```bash
cd /opt/tcc-manutencao-urbana && docker compose config --services
cd /opt/tcc-manutencao-urbana && docker compose config > /dev/null
```
Expected: config válido (sem erro), services inclui backend/nginx/postgres/redis/ia/tunnel

---

### Task 5: Atualizar o nginx para apontar backend:5000 → backend:8000

**Files:**
- Modify: `/opt/tcc-manutencao-urbana/nginx.prod.conf` (linha 2: `server backend:5000` → `server backend:8000`)

**Interfaces:**
- Consumes: nginx.prod.conf do VPS (multi-site)
- Produces: upstream apontando para o backend Django

- [ ] **Step 1: Alterar a linha do upstream (apenas essa linha)**

```bash
sed -i 's|server backend:5000;|server backend:8000;|' /opt/tcc-manutencao-urbana/nginx.prod.conf
```

- [ ] **Step 2: Confirmar a mudança**

```bash
head -3 /opt/tcc-manutencao-urbana/nginx.prod.conf
```
Expected: `server backend:8000;`

---

### Task 6: Build e deploy do stack Django (mantendo tunnel)

**Files:**
- Nenhum (operação no VPS)

**Interfaces:**
- Consumes: compose mesclado + código Django + nginx atualizado
- Produces: containers Django/redis/ia/nginx rodando, tunnel intacto

- [ ] **Step 1: Rebuild e up do stack (NÃO remover o tunnel)**

```bash
cd /opt/tcc-manutencao-urbana && docker compose up -d --build
```
> O entrypoint do backend Django roda `bootstrap_schema` (adiciona colunas novas, preserva dados), migrações fake, cria super admin, coleta estáticos e inicia Gunicorn.

- [ ] **Step 2: Aguardar e verificar health do backend**

```bash
sleep 30
docker ps --filter name=chamados --format '{{.Names}} {{.Status}}'
curl -s --max-time 10 http://localhost:8000/api/v1/health/
```
Expected: container healthy; health retorna JSON com status ok

- [ ] **Step 3: Verificar que o tunnel continua Up**

```bash
docker ps --filter name=tcc_tunnel --format '{{.Names}} {{.Status}}'
```
Expected: `tcc_tunnel Up`

---

### Task 7: Validação de produção e dados preservados

**Files:**
- Nenhum (operação no VPS)

**Interfaces:**
- Consumes: backend Django rodando
- Produces: confirmação de dados preservados + site acessível

- [ ] **Step 1: Validar dados preservados (8 defeitos, 6 usuários)**

```bash
PG=$(docker ps -q -f name=postgres)
docker exec $PG psql -U urbana -d manutencao_urbana -tAc "SELECT (SELECT count(*) FROM users), (SELECT count(*) FROM defeitos), (SELECT count(*) FROM categorias)"
```
Expected: users=6, defeitos=8, categorias=7 (iguais ao baseline da Task 1)

- [ ] **Step 2: Validar colunas novas adicionadas pelo bootstrap**

```bash
docker exec $PG psql -U urbana -d manutencao_urbana -tAc "SELECT column_name FROM information_schema.columns WHERE table_name='defeitos' AND column_name IN ('secretaria_responsavel','prazo_sla_dias','foto_resolucao')"
```
Expected: 3 linhas (as colunas foram adicionadas)

- [ ] **Step 3: Validar site público (login via tunnel)**

```bash
curl -s -o /dev/null -w '%{http_code}' https://tcc.josemurilors.com.br/
curl -s -X POST https://tcc.josemurilors.com.br/api/v1/auth/login/ -H "Content-Type: application/json" -d '{"email":"admin@exemplo.com","password":"<senha>"}' -o /dev/null -w ' login:%{http_code}\n'
```
Expected: site 200; login 200 ou 400 (dependendo das credenciais reais — validar com email/senha real do .env.production)

- [ ] **Step 4: Validar que portfolio/lab/pocketbase continuam OK**

```bash
for d in josemurilors.com.br lab.josemurilors.com.br tcc.josemurilors.com.br; do
  curl -s -o /dev/null -w "$d: %{http_code}\n" https://$d/
done
```
Expected: todos 200

---

### Task 8: Validação do Modo Demo em produção

**Files:**
- Nenhum (operação no VPS)

**Interfaces:**
- Consumes: backend Django + banco demo
- Produces: banco demo populado, login demo@ciu.app funcionando

- [ ] **Step 1: Criar e popular o banco demo**

```bash
cd /opt/tcc-manutencao-urbana
docker compose exec -T backend python scripts/seed_demo.py
```
> O seed_demo.py cria o banco `manutencao_urbana_demo`, popula ~50 defeitos e 5 usuários demo (demo@ciu.app / Demo@2024). Requer permissão de DROP/CREATE no Postgres (usuário `urbana` — verificar se tem; se não, criar com SUPERUSER ou conceder).

- [ ] **Step 2: Validar login demo**

```bash
curl -s -X POST https://tcc.josemurilors.com.br/api/v1/auth/login/ -H "Content-Type: application/json" -H "X-Demo-Mode: true" -d '{"email":"demo@ciu.app","password":"Demo@2024"}' -w '\nstatus:%{http_code}\n'
```
Expected: 200 com access token (login demo funcional em produção)

- [ ] **Step 3: Validar que produção NÃO foi afetada pelo modo demo**

```bash
PG=$(docker ps -q -f name=postgres)
docker exec $PG psql -U urbana -d manutencao_urbana -tAc "SELECT count(*) FROM defeitos"
docker exec $PG psql -U urbana -d manutencao_urbana_demo -tAc "SELECT count(*) FROM defeitos"
```
Expected: produção=8 (intacto), demo=~50 (populado)

---

### Task 9: (Opcional) Ativar reset diário do banco demo

**Files:**
- Modify: `/opt/tcc-manutencao-urbana/docker-compose.yml` (adicionar serviço `demo-reset` com profile demo)

**Interfaces:**
- Consumes: compose mesclado
- Produces: serviço de reset diário do banco demo

- [ ] **Step 1: Adicionar o serviço `demo-reset` ao compose** (do docker-compose.prod.yml do repo)

```bash
cd /opt/tcc-manutencao-urbana && docker compose --profile demo up -d --no-deps demo-reset
```

- [ ] **Step 2: Verificar que o demo-reset está rodando e faz seed**

```bash
docker ps --filter name=demo-reset --format '{{.Names}} {{.Status}}'
docker logs demo-reset --tail 10
```
Expected: container Up (loop de 86400s = 1 dia), logs mostram seed executado

---

### Task 10: Rollback (só se necessário)

**Files:**
- Restore: `/root/backups/docker-compose.yml.nodejs.bak`, `/root/backups/nginx.prod.conf.nodejs.bak`

**Interfaces:**
- Consumes: backups da Task 3
- Produces: estado Node.js restaurado

- [ ] **Step 1: Restaurar compose e nginx Node.js (se deploy falhar)**

```bash
cd /opt/tcc-manutencao-urbana
cp /root/backups/docker-compose.yml.nodejs.bak docker-compose.yml
cp /root/backups/nginx.prod.conf.nodejs.bak nginx.prod.conf
docker compose up -d --build
```
> O banco NÃO é revertido (bootstrap apenas adicionou colunas com IF NOT EXISTS; dados preservados). Se necessário, restaurar dump: `pg_restore`.

---

## Self-Review

**1. Spec coverage:**
- Task 1 (backup) ✔
- Task 2 (sync código) ✔
- Task 3 (compose Django) ✔
- Task 4 (merge tunnel/multi-site) ✔
- Task 5 (nginx upstream) ✔
- Task 6 (build/deploy) ✔
- Task 7 (validação dados + sites) ✔
- Task 8 (modo demo) ✔
- Task 9 (reset demo opcional) ✔
- Task 10 (rollback) ✔

**2. Placeholder scan:** Sem placeholders; todos os comandos têm conteúdo real. A senha do admin na Task 7 é um placeholder por design (deve ser lida do .env.production real do VPS, não versionada).

**3. Type consistency:** `backend:8000` consistente no nginx e compose. Nome `chamados-manutencao-urbana` preservado. `DB_NAME=manutencao_urbana` consistente.
