# Routing + SLA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the dormant `routing()` IA function to defect creation (persisting responsible secretariat + SLA deadline) and surface a computed `sla_vencido` flag in the API plus a "SLA vencidos" KPI/badge in the admin dashboard.

**Architecture:** The `services/ia_client.py` already exposes `routing(categoria) -> {'secretaria', 'prazo_sla_dias'}` but it is never called (only used in `scripts/verify.py`). The `Defeito` model/schema has no columns to store the routing result. We add two columns to the `defeitos` table (`secretaria_responsavel`, `prazo_sla_dias`), populate them at creation via `routing()`, compute `sla_vencido` in the serializers (based on `criado_em` + `prazo_sla_dias` vs now, only for non-resolved defects), and add `sla_vencidos_total` to the admin statistics endpoint with a KPI card + badge in the frontend.

**Tech Stack:** Django 5.2 (DRF), PostgreSQL/PostGIS (managed=False schema), React/Vite frontend, `ia_client.routing()`.

## Global Constraints

- Table `defeitos` is `managed=False`: schema changes MUST go into `backend-python/core/management/commands/bootstrap_schema.py` (run by entrypoint on boot) AND the model definition.
- Conventions: Portuguese UI text; commit messages in English, imperative mood; body lines ≤100 chars (commitlint).
- SLA resolved statuses: `atendido`, `encerrado`, `concluido`. Active statuses are everything else.
- Do NOT run `makemigrations`/`migrate` for the `defeitos` app (managed=False).
- Follow the design system (AMOLED black, gold `#D4AF37`, sharp corners).

---

### Task 1: Add routing columns to schema and model

**Files:**
- Modify: `backend-python/core/management/commands/bootstrap_schema.py` (add 2 columns to the `defeitos` CREATE TABLE)
- Modify: `backend-python/defeitos/models.py` (add 2 fields)
- Test: manual via `docker exec` schema apply + ORM query

**Interfaces:**
- Consumes: existing `defeitos` table DDL in `bootstrap_schema.py` (column block ending with `atendido_em TEXT NOT NULL DEFAULT ''`).
- Produces: two new columns `secretaria_responsavel TEXT NOT NULL DEFAULT ''` and `prazo_sla_dias INTEGER NOT NULL DEFAULT 0` on `defeitos`, mirrored as model fields `secretaria_responsavel` and `prazo_sla_dias`.

- [ ] **Step 1: Add columns to bootstrap_schema SCHEMA**

In `backend-python/core/management/commands/bootstrap_schema.py`, inside the `defeitos` CREATE TABLE, add after `atendido_em TEXT NOT NULL DEFAULT '',`:

```sql
        atendido_em TEXT NOT NULL DEFAULT '',
        secretaria_responsavel TEXT NOT NULL DEFAULT '',
        prazo_sla_dias INTEGER NOT NULL DEFAULT 0,
        usuario_email TEXT NOT NULL DEFAULT '',
```

(Place the two new lines before the existing `usuario_email` line.)

- [ ] **Step 2: Add fields to the Defeito model**

In `backend-python/defeitos/models.py`, after `atendido_em = models.TextField(blank=True, default='')`, add:

```python
    secretaria_responsavel = models.CharField(max_length=255, blank=True, default='', db_column='secretaria_responsavel')
    prazo_sla_dias = models.IntegerField(default=0, db_column='prazo_sla_dias')
```

- [ ] **Step 3: Apply schema and verify**

Run inside the backend container:

```bash
docker exec chamados-manutencao-urbana bash -c "cd /app && python manage.py bootstrap_schema"
docker exec chamados-manutencao-urbana bash -c "cd /app && python -c \"import django,os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','core.settings.production'); django.setup(); from defeitos.models import Defeito; print([f.name for f in Defeito._meta.fields])\""
```

Expected: `secretaria_responsavel` and `prazo_sla_dias` present in the field list.

- [ ] **Step 4: Commit**

```bash
git add backend-python/core/management/commands/bootstrap_schema.py backend-python/defeitos/models.py
git commit -m "feat: add routing columns to defeitos schema and model"
```

---

### Task 2: Call routing() on defect creation

**Files:**
- Modify: `backend-python/defeitos/views.py` (`perform_create`)
- Test: `backend-python/defeitos/tests.py` (add test)

**Interfaces:**
- Consumes: `services.ia_client.routing(categoria: str) -> dict` returning `{'secretaria': str, 'prazo_sla_dias': int}` (already exists, `ia_client.py:121-125`). Column/model fields from Task 1.
- Produces: defects created with `secretaria_responsavel` and `prazo_sla_dias` populated from `routing()`.

- [ ] **Step 1: Write the failing test**

In `backend-python/defeitos/tests.py`, add a test asserting a created defect gets the routed secretariat and SLA deadline:

```python
def test_create_defeito_persists_routing(self):
    # build a valid authenticated POST with categoria 'Buraco'
    response = self.client.post(
        '/api/v1/defeitos/',
        {'titulo': 'Buraco na rua', 'descricao': 'Buraco grande na via',
         'latitude': -21.17, 'longitude': -47.82, 'categoria': 'Buraco',
         'status': 'pendente'},
        format='json',
    )
    self.assertEqual(response.status_code, 201)
    defeito_id = response.data['id']
    defeito = Defeito.objects.get(id=defeito_id)
    self.assertEqual(defeito.secretaria_responsavel, 'Secretaria de Obras e Infraestrutura')
    self.assertEqual(defeito.prazo_sla_dias, 7)
```

(Adjust to match the existing test class setup/auth helper used by `defeitos/tests.py`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec chamados-manutencao-urbana bash -c "cd /app && python -m pytest defeitos/tests.py::<TestClass>::test_create_defeito_persists_routing -q"`
Expected: FAIL (columns exist but are empty / default).

- [ ] **Step 3: Implement routing() in perform_create**

In `backend-python/defeitos/views.py`, modify `perform_create`:

```python
    def perform_create(self, serializer):
        webp = None
        if 'imagem' in self.request.FILES:
            from services.image_processor import process_image
            result = process_image(self.request.FILES['imagem'].read())
            webp = result['webp_bytes']

        from services.ia_client import routing
        categoria = self.request.data.get('categoria', '')
        rota = routing(categoria) if categoria else {}

        serializer.save(
            usuario=self.request.user,
            criado_em=timezone.now(),
            atualizado_em=timezone.now(),
            imagem_thumbnail=webp,
            secretaria_responsavel=rota.get('secretaria', ''),
            prazo_sla_dias=rota.get('prazo_sla_dias', 0),
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: the same pytest command from Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-python/defeitos/views.py backend-python/defeitos/tests.py
git commit -m "feat: route defect to secretariat and SLA deadline on creation"
```

---

### Task 3: Add sla_vencido flag to serializers

**Files:**
- Modify: `backend-python/defeitos/serializers.py`
- Test: `backend-python/defeitos/tests.py`

**Interfaces:**
- Consumes: `Defeito.criado_em`, `Defeito.prazo_sla_dias`, `Defeito.status`. Resolved status set: `{'atendido', 'encerrado', 'concluido'}`.
- Produces: read-only `sla_vencido` boolean on `DefeitoListSerializer` and `DefeitoDetailSerializer`.

- [ ] **Step 1: Write the failing test**

Add a test to `defeitos/tests.py` that creates a defect with `criado_em` older than its SLA deadline and status `pendente`, then asserts the serializer returns `sla_vencido: True`; and another with a fresh defect returning `sla_vencido: False`.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec chamados-manutencao-urbana bash -c "cd /app && python -m pytest defeitos/tests.py::<TestClass>::test_sla_vencido -q"`
Expected: FAIL (`sla_vencido` key absent).

- [ ] **Step 3: Implement sla_vencido**

In `backend-python/defeitos/serializers.py`:

```python
RESOLVIDOS = {'atendido', 'encerrado', 'concluido'}


def _is_sla_vencido(obj):
    if obj.status in RESOLVIDOS or not obj.prazo_sla_dias:
        return False
    if not obj.criado_em:
        return False
    from django.utils import timezone
    prazo = obj.criado_em + timedelta(days=obj.prazo_sla_dias)
    return timezone.now() > prazo
```

Add `from datetime import timedelta` at the top. Add `sla_vencido = serializers.SerializerMethodField()` and `get_sla_vencido(self, obj): return _is_sla_vencido(obj)` to both `DefeitoListSerializer` and `DefeitoDetailSerializer`; add `'sla_vencido'` to the `Meta.fields` of `DefeitoListSerializer`. (`DefeitoDetailSerializer` uses `fields = '__all__'`, so adding the field to the class is enough.)

- [ ] **Step 4: Run test to verify it passes**

Run: the pytest command from Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-python/defeitos/serializers.py backend-python/defeitos/tests.py
git commit -m "feat: expose sla_vencido flag in defect serializers"
```

---

### Task 4: Add SLA-vendidos KPI to statistics endpoint

**Files:**
- Modify: `backend-python/users/views.py` (statistics view)
- Test: `backend-python/users/tests.py`

**Interfaces:**
- Consumes: existing admin statistics view (around `users/views.py:338-346`) that already queries `defeitos` and computes `sla_medio`. `Defeito.criado_em`, `Defeito.prazo_sla_dias`, `Defeito.status`.
- Produces: `sla_vencidos_total` (int) and `sla_vencidos` (list of defect dicts) added to the statistics response.

- [ ] **Step 1: Write the failing test**

Add a test to `users/tests.py` that seeds defects (one past SLA deadline, one not) and asserts `sla_vencidos_total` equals 1.

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec chamados-manutencao-urbana bash -c "cd /app && python -m pytest users/tests.py::<TestClass>::test_sla_vencidos_total -q"`
Expected: FAIL (`sla_vencidos_total` absent).

- [ ] **Step 3: Implement sla_vencidos_total**

In the statistics view, after the existing SLA block, add a raw-SQL query (consistent with the file's style) counting non-resolved defects whose deadline passed:

```python
            resolvidos_status_sql = "('atendido','encerrado','concluido')"
            now_iso = timezone.now().isoformat()
            sla_vencidos_total = 0
            sla_vencidos = []
            cursor.execute(f'''
                SELECT d.id, d.titulo, d.categoria, d.status,
                       d.criado_em::timestamp, d.prazo_sla_dias
                FROM defeitos d{mun_join}
                {mun_where_and} d.status NOT IN {resolvidos_status_sql}
                  AND d.prazo_sla_dias > 0
                  AND d.criado_em::timestamp + (d.prazo_sla_dias || ' days')::interval < %s
                ORDER BY d.criado_em::timestamp ASC
                LIMIT 50
            ''', mun_params + [now_iso])
            sla_vencidos = [{
                'id': str(r[0]), 'titulo': r[1], 'categoria': r[2],
                'status': r[3], 'criado_em': r[4].isoformat(),
                'prazo_sla_dias': r[5],
            } for r in cursor.fetchall()]
            sla_vencidos_total = len(sla_vencidos)
```

Then include `'sla_vencidos_total': sla_vencidos_total` and `'sla_vencidos': sla_vencidos` in the returned statistics dict. (Verify the exact variable names `mun_join`, `mun_where_and`, `mun_params` used in the surrounding view so the f-strings compose correctly.)

- [ ] **Step 4: Run test to verify it passes**

Run: the pytest command from Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend-python/users/views.py backend-python/users/tests.py
git commit -m "feat: report sla_vencidos_total in admin statistics"
```

---

### Task 5: SLA-vendidos KPI card and badge in dashboard

**Files:**
- Modify: `frontend/src/pages/AdminDashboardMetrics.jsx`
- Modify: `frontend/src/pages/DefectList.jsx` (badge, optional)

**Interfaces:**
- Consumes: `stats.sla_vencidos_total` and `stats.sla_vencidos` from the admin statistics API (Task 4); `defeito.sla_vencido` from defect serializers (Task 3).
- Produces: a KPI card "SLA Vencidos" and an alert list rendering the overdue defects.

- [ ] **Step 1: Add KPI card**

In `frontend/src/pages/AdminDashboardMetrics.jsx`, near the existing KPI cards (around line 73), add a card:

```jsx
<KpiCard title="SLA Vencidos" value={stats.sla_vencidos_total || 0} icon={WarningOctagon} />
```

Import `WarningOctagon` from `@phosphor-icons/react` (or use an existing imported icon to avoid a new import if preferred).

- [ ] **Step 2: Add overdue defects section**

Below the existing SLA chart block, add a section that renders `stats.sla_vencidos` as a list (title, category, status, days overdue). Use `WarningOctagon`/gold accent and empty-state text "Nenhum chamado com SLA vencido".

- [ ] **Step 3: Add badge in DefectList**

In `frontend/src/pages/DefectList.jsx`, where each defect's status badge is rendered, add an "SLA" badge when `defeito.sla_vencido` is truthy, styled with the sangria/burgundy accent (`#6B121A`) per the design system.

- [ ] **Step 4: Build and verify**

Run: `cd frontend && npm run build`
Expected: success, no eslint errors (`npx eslint src/pages/AdminDashboardMetrics.jsx src/pages/DefectList.jsx`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AdminDashboardMetrics.jsx frontend/src/pages/DefectList.jsx
git commit -m "feat: show SLA overdue KPI and badges in admin dashboard"
```

---

### Task 6: Apply schema to demo database and regression check

**Files:**
- Modify: `backend-python/scripts/seed_demo.py` (optional, if it should seed routing values)

**Interfaces:**
- Consumes: schema from Task 1 (columns now in `bootstrap_schema.py`).

- [ ] **Step 1: Recreate demo DB so it has the new columns**

Run: `docker exec chamados-manutencao-urbana bash -c "cd /app && python scripts/seed_demo.py"`
Expected: succeeds, demo DB rebuilt with `secretaria_responsavel`/`prazo_sla_dias`.

- [ ] **Step 2: Full backend test run**

Run: `docker exec chamados-manutencao-urbana bash -c "cd /app && python -m pytest -q"`
Expected: all tests pass (existing 79 + new ones).

- [ ] **Step 3: Full frontend build + tests**

Run: `cd frontend && npm run build && npm test`
Expected: build success, vitest 10/10 pass.

- [ ] **Step 4: Commit (if seed_demo.py changed)**

```bash
git add backend-python/scripts/seed_demo.py
git commit -m "chore: include routing fields in demo seed"
```

---

## Self-Review

**Spec coverage (from CHECKLIST-ESTADO-PROJETO.md):**
- 2.1 "Conectar `routing()` na criação" → Task 2. ✅
- 2.2 "Flag `sla_vencido` no serializer" → Task 3. ✅
- 2.3 "Dashboard SLA vencidos" → Tasks 4 + 5. ✅
- Schema change required to persist routing → Task 1 (prerequisite). ✅
- Demo DB kept consistent with new schema → Task 6. ✅

**Placeholder scan:** All code blocks are concrete. The only intentional "adapt to existing helpers" notes are for matching the existing test-class auth helpers and view variable names (`mun_join`, `mun_where_and`, `mun_params`) that must be verified against the actual file before writing — these are flagged explicitly as "verify the exact variable names" rather than left as TODOs.

**Type consistency:** `routing()` returns `{'secretaria': str, 'prazo_sla_dias': int}` and is consumed identically in Task 2. `sla_vencido` is a boolean on serializers (Task 3) and read as a boolean in Task 5. `sla_vencidos_total` is an int (Task 4) and rendered as a number in Task 5.
