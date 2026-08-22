# Reverse Geocoding & Weather Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich each defect report at creation time with a human-readable address (via OpenStreetMap Nominatim reverse geocoding) and a weather snapshot (via Open-Meteo), cached and with silent fallback so they never impact reliability or block the map/list/dashboard endpoints.

**Architecture:** Two new thin services under `backend-python/services/` follow the existing `cpf_validator.py` pattern (httpx + timeout + catch-and-return-empty). They are invoked only inside `DefeitoViewSet.perform_create`, which already makes an optional external IA call, so enrichment adds latency only on the single `POST /defeitos/` action and never on reads. Results are cached in Redis via Django's `cache` framework keyed by rounded coordinates (+ day for weather). New columns are added to the `managed=False` `defeitos` table via `bootstrap_schema.py` raw SQL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) plus matching model fields.

**Tech Stack:** Python 3.13, Django 5.2 + DRF, httpx (already a dependency), Django Redis cache (already configured), PostgreSQL 16.

## Global Constraints

- Backend uses `httpx` (already in `requirements.txt`); do not add new dependencies.
- All external calls must have a short timeout (`<= 2.0s`) and must catch `httpx.HTTPError` + `ValueError`, returning empty results (`{}` / `None`) on failure — never raise into the request.
- The `defeitos` table is `managed=False`; ALL schema changes go through `backend-python/core/management/commands/bootstrap_schema.py` as `ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS ...` statements AND the matching field added to `defeitos/models.py`. No Django migration file is created for these (managed=False).
- Do not override client-supplied `rua`/`bairro`; enrichment only fills them when empty.
- Commit messages in ENGLISH, imperative mood (repo convention).
- Follow existing service style: module-level `logger = logging.getLogger(__name__)`, no comments unless necessary.

---

### Task 1: Add schema columns to bootstrap_schema

**Files:**
- Modify: `backend-python/core/management/commands/bootstrap_schema.py` (add two `ALTER TABLE` statements to the `SCHEMA` list)

**Interfaces:**
- Consumes: nothing.
- Produces: two new columns on table `defeitos`:
  - `endereco_completo TEXT NOT NULL DEFAULT ''`
  - `clima JSONB NOT NULL DEFAULT '{}'::jsonb`

- [ ] **Step 1: Add the ALTER statements**

Append these two strings to the `SCHEMA` list in `bootstrap_schema.py` (after the existing `foto_resolucao` entry):

```python
    """
    ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS endereco_completo TEXT NOT NULL DEFAULT ''
    """,
    """
    ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS clima JSONB NOT NULL DEFAULT '{}'::jsonb
    """,
```

- [ ] **Step 2: Run bootstrap_schema to verify**

Run (from `backend-python/`):
```bash
python manage.py bootstrap_schema
```
Expected: prints "Schema pronto!" with no error.

- [ ] **Step 3: Commit**

```bash
git add backend-python/core/management/commands/bootstrap_schema.py
git commit -m "feat: add endereco_completo and clima columns to defeitos schema"
```

---

### Task 2: Add matching model fields to Defeito

**Files:**
- Modify: `backend-python/defeitos/models.py`

**Interfaces:**
- Consumes: columns created in Task 1.
- Produces: `Defeito.endereco_completo` (str) and `Defeito.clima` (dict) usable by serializer/views.

- [ ] **Step 1: Add fields**

In `Defeito`, after the `bairro` field (line ~43), add:

```python
    endereco_completo = models.TextField(blank=True, default='')
    clima = models.JSONField(blank=True, default=dict)
```

- [ ] **Step 2: Sanity-check imports**

Verify `models.py` imports `models` from `django.contrib.gis.db` (it does at line 2) so `models.JSONField` resolves. No further code change needed.

- [ ] **Step 3: Commit**

```bash
git add backend-python/defeitos/models.py
git commit -m "feat: add endereco_completo and clima fields to Defeito model"
```

---

### Task 3: Create geocode service

**Files:**
- Create: `backend-python/services/geocode.py`
- Test: `backend-python/defeitos/tests.py` (new test class)

**Interfaces:**
- Consumes: nothing.
- Produces: `reverse_geocode(lat: float, lng: float) -> dict` returning `{'rua': str, 'bairro': str, 'endereco_completo': str}` (all possibly empty), cached in Redis.

- [ ] **Step 1: Write the failing test**

Add to `backend-python/defeitos/tests.py`:

```python
from unittest import mock


class TestReverseGeocode:

    def test_returns_empty_on_no_coords(self):
        from services.geocode import reverse_geocode
        assert reverse_geocode(None, None) == {}

    @mock.patch('services.geocode.httpx.get')
    def test_parses_nominatim_response(self, mock_get):
        from services.geocode import reverse_geocode
        mock_get.return_value.raise_for_status.return_value = None
        mock_get.return_value.json.return_value = {
            'display_name': 'Av Paulista, 100, Bela Vista, SP',
            'address': {'road': 'Av Paulista', 'suburb': 'Bela Vista'},
        }
        result = reverse_geocode(-23.55, -46.63)
        assert result['rua'] == 'Av Paulista'
        assert result['bairro'] == 'Bela Vista'
        assert result['endereco_completo'] == 'Av Paulista, 100, Bela Vista, SP'

    @mock.patch('services.geocode.httpx.get')
    def test_returns_empty_on_http_error(self, mock_get):
        from services.geocode import reverse_geocode
        from httpx import HTTPError
        mock_get.side_effect = HTTPError('boom')
        assert reverse_geocode(-23.55, -46.63) == {}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest defeitos/tests.py::TestReverseGeocode -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'services.geocode'`

- [ ] **Step 3: Write minimal implementation**

```python
import logging
import httpx
from django.core.cache import cache

logger = logging.getLogger(__name__)

NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'
TIMEOUT = 2.0
CACHE_TTL = 60 * 60 * 24 * 30


def reverse_geocode(lat, lng):
    if lat is None or lng is None:
        return {}
    cache_key = f'geo:{round(float(lat), 5)}:{round(float(lng), 5)}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    try:
        resp = httpx.get(
            NOMINATIM_URL,
            params={
                'lat': lat, 'lon': lng, 'format': 'jsonv2',
                'addressdetails': 1, 'accept-language': 'pt-BR',
            },
            timeout=TIMEOUT,
            headers={'User-Agent': 'tcc-manutencao-urbana/1.0'},
        )
        resp.raise_for_status()
        data = resp.json()
        addr = data.get('address', {}) or {}
        result = {
            'rua': addr.get('road', '') or '',
            'bairro': (
                addr.get('suburb', '') or addr.get('neighbourhood', '')
                or addr.get('city_district', '') or ''
            ),
            'endereco_completo': data.get('display_name', '') or '',
        }
        cache.set(cache_key, result, CACHE_TTL)
        return result
    except (httpx.HTTPError, ValueError, TypeError):
        logger.warning('Reverse geocode failed for %s,%s', lat, lng)
        return {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest defeitos/tests.py::TestReverseGeocode -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add backend-python/services/geocode.py backend-python/defeitos/tests.py
git commit -m "feat: add reverse geocoding service with cache and fallback"
```

---

### Task 4: Create weather service

**Files:**
- Create: `backend-python/services/weather.py`
- Test: `backend-python/defeitos/tests.py` (new test class)

**Interfaces:**
- Consumes: nothing.
- Produces: `get_weather_snapshot(lat: float, lng: float) -> dict` returning `{'temperatura_c', 'precipitacao_mm', 'vento_kmh', 'weather_code'}` (values may be `None`), cached in Redis per (day, rounded coords).

- [ ] **Step 1: Write the failing test**

Add to `backend-python/defeitos/tests.py`:

```python
class TestWeather:

    def test_returns_empty_on_no_coords(self):
        from services.weather import get_weather_snapshot
        assert get_weather_snapshot(None, None) == {}

    @mock.patch('services.weather.httpx.get')
    def test_parses_open_meteo_response(self, mock_get):
        from services.weather import get_weather_snapshot
        mock_get.return_value.raise_for_status.return_value = None
        mock_get.return_value.json.return_value = {
            'current': {
                'temperature_2m': 27.5,
                'precipitation': 0.0,
                'wind_speed_10m': 12.3,
                'weather_code': 1,
            }
        }
        result = get_weather_snapshot(-23.55, -46.63)
        assert result['temperatura_c'] == 27.5
        assert result['weather_code'] == 1

    @mock.patch('services.weather.httpx.get')
    def test_returns_empty_on_http_error(self, mock_get):
        from services.weather import get_weather_snapshot
        from httpx import HTTPError
        mock_get.side_effect = HTTPError('boom')
        assert get_weather_snapshot(-23.55, -46.63) == {}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest defeitos/tests.py::TestWeather -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'services.weather'`

- [ ] **Step 3: Write minimal implementation**

```python
import logging
import httpx
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
TIMEOUT = 2.0
CACHE_TTL = 60 * 30


def get_weather_snapshot(lat, lng):
    if lat is None or lng is None:
        return {}
    day = timezone.now().strftime('%Y-%m-%d')
    cache_key = f'clima:{day}:{round(float(lat), 2)}:{round(float(lng), 2)}'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    try:
        resp = httpx.get(
            OPEN_METEO_URL,
            params={
                'latitude': lat, 'longitude': lng,
                'current': 'temperature_2m,precipitation,wind_speed_10m,weather_code',
            },
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        current = resp.json().get('current', {}) or {}
        result = {
            'temperatura_c': current.get('temperature_2m'),
            'precipitacao_mm': current.get('precipitation'),
            'vento_kmh': current.get('wind_speed_10m'),
            'weather_code': current.get('weather_code'),
        }
        cache.set(cache_key, result, CACHE_TTL)
        return result
    except (httpx.HTTPError, ValueError, TypeError):
        logger.warning('Weather fetch failed for %s,%s', lat, lng)
        return {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest defeitos/tests.py::TestWeather -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add backend-python/services/weather.py backend-python/defeitos/tests.py
git commit -m "feat: add weather snapshot service with cache and fallback"
```

---

### Task 5: Wire enrichment into defect creation

**Files:**
- Modify: `backend-python/defeitos/views.py` (`perform_create`, lines ~60-78)

**Interfaces:**
- Consumes: `reverse_geocode(lat, lng) -> dict` and `get_weather_snapshot(lat, lng) -> dict`.
- Produces: on `POST /defeitos/`, `rua`/`bairro` filled when empty, `endereco_completo` and `clima` persisted.

- [ ] **Step 1: Write the failing test**

Add to `backend-python/defeitos/tests.py`:

```python
class TestCreateEnrichment:

    @mock.patch('services.weather.get_weather_snapshot')
    @mock.patch('services.geocode.reverse_geocode')
    def test_fills_endereco_and_clima(self, mock_geo, mock_weather, auth_client):
        from defeitos.models import Defeito
        mock_geo.return_value = {
            'rua': 'Rua das Flores', 'bairro': 'Centro',
            'endereco_completo': 'Rua das Flores, Centro, SP',
        }
        mock_weather.return_value = {'temperatura_c': 26.0}
        data = {
            'titulo': 'Buraco na rua',
            'descricao': 'Buraco grande no asfalto',
            'latitude': -23.5505, 'longitude': -46.6333,
            'categoria': 'Buraco',
        }
        resp = auth_client.post(reverse('defeitos-list'), data, format='json')
        assert resp.status_code == 201
        defeito = Defeito.objects.get(id=resp.data['id'])
        assert defeito.rua == 'Rua das Flores'
        assert defeito.bairro == 'Centro'
        assert defeito.endereco_completo == 'Rua das Flores, Centro, SP'
        assert defeito.clima.get('temperatura_c') == 26.0

    @mock.patch('services.weather.get_weather_snapshot')
    @mock.patch('services.geocode.reverse_geocode')
    def test_does_not_override_client_address(self, mock_geo, mock_weather, auth_client):
        from defeitos.models import Defeito
        mock_geo.return_value = {
            'rua': 'Rua das Flores', 'bairro': 'Centro',
            'endereco_completo': 'Rua das Flores, Centro, SP',
        }
        mock_weather.return_value = {'temperatura_c': 26.0}
        data = {
            'titulo': 'Buraco na rua',
            'descricao': 'Buraco grande no asfalto',
            'latitude': -23.5505, 'longitude': -46.6333,
            'categoria': 'Buraco',
            'rua': 'Av. Cliente', 'bairro': 'Cliente Bairro',
        }
        resp = auth_client.post(reverse('defeitos-list'), data, format='json')
        assert resp.status_code == 201
        defeito = Defeito.objects.get(id=resp.data['id'])
        assert defeito.rua == 'Av. Cliente'
        assert defeito.bairro == 'Cliente Bairro'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest defeitos/tests.py::TestCreateEnrichment -v`
Expected: FAIL (address/clima not persisted — fields empty or weather absent)

- [ ] **Step 3: Write the implementation**

Replace `perform_create` in `backend-python/defeitos/views.py` (lines 60-78) with:

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

        lat = self.request.data.get('latitude')
        lng = self.request.data.get('longitude')

        extras = {}
        if lat is not None and lng is not None:
            try:
                lat_f = float(lat)
                lng_f = float(lng)
            except (TypeError, ValueError):
                lat_f = lng_f = None
            if lat_f is not None and lng_f is not None:
                from services.geocode import reverse_geocode
                from services.weather import get_weather_snapshot
                geo = reverse_geocode(lat_f, lng_f)
                if geo:
                    extras['rua'] = self.request.data.get('rua') or geo.get('rua', '')
                    extras['bairro'] = self.request.data.get('bairro') or geo.get('bairro', '')
                    extras['endereco_completo'] = geo.get('endereco_completo', '')
                extras['clima'] = get_weather_snapshot(lat_f, lng_f)

        serializer.save(
            usuario=self.request.user,
            criado_em=timezone.now(),
            atualizado_em=timezone.now(),
            imagem_thumbnail=webp,
            secretaria_responsavel=rota.get('secretaria', ''),
            prazo_sla_dias=rota.get('prazo_sla_dias', 0),
            **extras,
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest defeitos/tests.py::TestCreateEnrichment -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Run the full defeitos suite (regression)**

Run: `pytest defeitos/tests.py -v`
Expected: all existing + new tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-python/defeitos/views.py backend-python/defeitos/tests.py
git commit -m "feat: enrich defect creation with address and weather snapshot"
```

---

### Task 6: Expose new fields in serializers

**Files:**
- Modify: `backend-python/defeitos/serializers.py`

**Interfaces:**
- Consumes: model fields from Task 2.
- Produces: `clima` and `endereco_completo` visible in API responses.

- [ ] **Step 1: Add fields to list serializer**

In `DefeitoListSerializer.Meta.fields`, add `'endereco_completo', 'clima'`:

```python
    class Meta:
        model = Defeito
        fields = (
            'id', 'titulo', 'status', 'categoria_nome',
            'autor_nome', 'latitude', 'longitude',
            'rua', 'bairro', 'endereco_completo', 'clima', 'prioridade',
            'total_apoios', 'criado_em', 'imagem_url',
            'sla_vencido',
        )
```

(`DefeitoDetailSerializer` uses `exclude = ('foto_resolucao',)`, so `clima` and `endereco_completo` are already included automatically — no change needed there.)

- [ ] **Step 2: Run tests**

Run: `pytest defeitos/tests.py -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend-python/defeitos/serializers.py
git commit -m "feat: expose endereco_completo and clima in defect serializer"
```

---

### Task 7: Add settings placeholders (optional env toggles)

**Files:**
- Modify: `backend-python/core/settings/base.py`

**Interfaces:**
- Consumes: nothing.
- Produces: optional env-driven timeouts with sane defaults.

- [ ] **Step 1: Add settings**

After line 148 (`FROM_EMAIL`), add:

```python
GEOCODE_TIMEOUT = float(os.environ.get('GEOCODE_TIMEOUT', '2.0'))
WEATHER_TIMEOUT = float(os.environ.get('WEATHER_TIMEOUT', '2.0'))
```

- [ ] **Step 2: Reference settings in services**

Update `services/geocode.py` `TIMEOUT = 2.0` → use `settings.GEOCODE_TIMEOUT`, and `services/weather.py` `TIMEOUT = 2.0` → use `settings.WEATHER_TIMEOUT`. Import `from django.conf import settings` in each.

- [ ] **Step 3: Run tests**

Run: `pytest defeitos/tests.py -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend-python/core/settings/base.py backend-python/services/geocode.py backend-python/services/weather.py
git commit -m "feat: make geocode and weather timeouts configurable"
```

---

## Self-Review

**Spec coverage:**
- Reverse geocoding: Tasks 1, 2, 3, 5, 6 ✅
- Weather snapshot: Tasks 1, 2, 4, 5, 6 ✅
- No performance impact on reads: enrichment only in `perform_create` (Task 5); map/list/dashboard untouched ✅
- Cache + silent fallback: Tasks 3 & 4 ✅
- Configurable timeouts: Task 7 ✅

**Placeholder scan:** All steps contain concrete code. No TBD/TODO. ✅

**Type consistency:** `reverse_geocode` returns `{'rua','bairro','endereco_completo'}` consistently (Tasks 3 & 5). `get_weather_snapshot` returns `{'temperatura_c','precipitacao_mm','vento_kmh','weather_code'}` consistently (Tasks 4 & 5). Model fields `endereco_completo` and `clima` match columns in Task 1 and serializer in Task 6. ✅
