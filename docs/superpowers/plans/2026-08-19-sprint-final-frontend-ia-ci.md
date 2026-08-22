# Sprint Final — Frontend SLA, Timeline no Mapa, Sync Offline, Foto de Resolução, Dataset IA e Testes no CI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining Sprint Final items from `CHECKLIST-ESTADO-PROJETO.md`: SLA badge/KPI no frontend (2.3 frontend), Timeline no mapa (3.1), indicador de sync offline (3.2), foto de resolução obrigatória (2.4), dataset IA 100→525 com acurácia ≥70% (1.2/1.3/1.4) e testes pytest no CI (3.3).

**Architecture:** Backend já expõe `sla_vencido` (serializers), `sla_vencidos_total`/`sla_vencidos` (estatísticas admin), `routing()` e `prazo_sla_dias`. O frontend precisa consumir esses dados: KPI + badge no dashboard, badge SLA em listas/mapa, Timeline no modal do mapa (extraindo `getTimelineItems` para um util compartilhado), badge de pendências offline lendo o IndexedDB `ciu-offline`. A foto de resolução exige nova coluna `foto_resolucao` no schema `bootstrap_schema.py` (managed=False) + validação backend no endpoint de status + input no frontend. O dataset IA ganha um gerador determinístico por categoria (75+/categoria) mantendo os 100 relatos curados. O CI ganha um step `pytest` usando o conftest existente (que cria o banco de teste via `bootstrap_schema`).

**Tech Stack:** Django 5.2 (DRF), PostgreSQL/PostGIS (managed=False), React 19 + Vite + Phosphor + Framer Motion, Vitest, GitHub Actions, Python 3 (IA), ONNX Runtime.

## Global Constraints

- Table `defeitos` é `managed=False`: mudanças de schema OBRIGATORIAMENTE em `backend-python/core/management/commands/bootstrap_schema.py` + model. NUNCA `makemigrations`/`migrate` para `defeitos`.
- Convenções: texto de UI em PT-BR; mensagens de commit em inglês, modo imperativo; linhas ≤100 chars (commitlint).
- Status resolvidos (SLA): `atendido`, `encerrado`, `concluido`. Ativos: todo o resto.
- Design system: AMOLED preto `#000000`, gold `#D4AF37`, sangria `#6B121A` para badges de alerta, cantos retos.
- Acessibilidade WCAG 2.1 AA nos novos componentes.
- Não usar em-dash (`—`) em textos de UI.
- `npm test` no frontend roda `vitest run` (setup em `frontend/vitest.config.js`).
- CI (`.github/workflows/deploy.yml`): job `test` já sobe postgres com env dummy. O step pytest usa `docker compose run --rm backend python -m pytest`.

---

### Task 1: KPI "SLA Vencidos" + lista no AdminDashboardMetrics

**Files:**
- Modify: `frontend/src/pages/AdminDashboardMetrics.jsx`
- Modify: `frontend/src/pages/DefectList.jsx`

**Interfaces:**
- Consumes: `stats.sla_vencidos_total` (int) e `stats.sla_vencidos` (array de `{id, titulo, categoria, status, criado_em, prazo_sla_dias}`) já retornados por `api.adminEstatisticas()` (`users/views.py:448-472`). `defeito.sla_vencido` (bool) no list serializer.
- Produces: card KPI "SLA Vencidos" com `WarningOctagon` e seção alerta listando os vencidos; badge "SLA" vermelho/sangria ao lado do StatusBadge quando `d.sla_vencido` é verdadeiro.

- [ ] **Step 1: Adicionar KPI card e seção de vencidos em AdminDashboardMetrics**

Em `frontend/src/pages/AdminDashboardMetrics.jsx`:
- Na linha 4, adicionar `WarningOctagon` aos imports de `@phosphor-icons/react`.
- Adicionar na grade de KPI (após o card "Este Mês", linha 74):
```jsx
<KpiCard title="SLA Vencidos" value={stats.sla_vencidos_total || 0} icon={WarningOctagon} className="!before:bg-[var(--color-error)]" />
```
- Adicionar nova seção logo após o bloco `{slaCatData.length > 0 && (...)}` (após linha 186):
```jsx
{stats.sla_vencidos && stats.sla_vencidos.length > 0 && (
  <div className="mb-6">
    <h2 className="text-sm font-bold mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
      <WarningOctagon size={18} style={{ color: 'var(--color-error)' }} /> Chamados com SLA Vencido
    </h2>
    <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
      Prazo de atendimento ultrapassado. Priorizar resolução.
    </p>
    <div className="space-y-2">
      {stats.sla_vencidos.map(v => (
        <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--color-bg-surface)', borderColor: 'rgba(107,18,26,0.5)', borderLeftColor: 'var(--color-error)' }}>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold block truncate" style={{ color: 'var(--color-text-primary)' }}>{v.titulo}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {v.categoria} · {new Date(v.criado_em).toLocaleDateString()} · prazo {v.prazo_sla_dias}d
            </span>
          </div>
          <StatusBadge status={v.status} />
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Adicionar badge SLA em DefectList**

Em `frontend/src/pages/DefectList.jsx`, no `StatusBadge` da linha do status da tabela (linha 230), adicionar ao lado:
```jsx
{d.sla_vencido && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold"
    style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)', background: 'rgba(207,68,68,0.1)' }}>
    SLA VENCIDO
  </span>
)}
```
Também no modal de detalhe (`selectedDefect`), após o `<StatusBadge>` da linha 305:
```jsx
{selectedDefect.sla_vencido && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold"
    style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)', background: 'rgba(207,68,68,0.1)' }}>
    SLA VENCIDO
  </span>
)}
```

- [ ] **Step 3: Build e lint**

Run: `cd frontend && npx eslint src/pages/AdminDashboardMetrics.jsx src/pages/DefectList.jsx && npm run build`
Expected: sem erros eslint, build OK.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AdminDashboardMetrics.jsx frontend/src/pages/DefectList.jsx
git commit -m "feat: show SLA overdue KPI and badges in admin dashboard and list"
```

---

### Task 2: Timeline pública no mapa (MapPage)

**Files:**
- Create: `frontend/src/utils/timeline.js`
- Modify: `frontend/src/pages/MapPage.jsx`
- Modify: `frontend/src/pages/DefectList.jsx` (usar util compartilhado)

**Interfaces:**
- Consumes: `Defeito` objeto com `status`, `criado_em`, `atualizado_em`, `atendido_em`, `descricao`, `usuario.nome`.
- Produces: `getTimelineItems(defeito) -> [{id, active, title, description?, date?, meta?}]` exportado de `frontend/src/utils/timeline.js`; `<Timeline>` renderizado no bottom-sheet de detalhe do `MapPage`.

- [ ] **Step 1: Extrair getTimelineItems para util compartilhado**

Criar `frontend/src/utils/timeline.js`:
```js
export function getTimelineItems(d) {
  const items = [{ id: 'criado', active: true, title: 'Chamado Criado', description: d.descricao?.slice(0, 120), date: new Date(d.criado_em).toLocaleString(), meta: `Por ${d.usuario?.nome || 'Anônimo'}` }];
  if (['vinculado_sem_resposta','vinculado_com_resposta','atendido','encerrado','concluido'].includes(d.status))
    items.push({ id: 'vinculado', active: true, title: 'Profissional Vinculado', date: d.atualizado_em ? new Date(d.atualizado_em).toLocaleString() : undefined });
  if (d.status === 'vinculado_com_resposta')
    items.push({ id: 'resposta', active: true, title: 'Resposta Enviada', date: d.atualizado_em ? new Date(d.atualizado_em).toLocaleString() : undefined });
  if (['atendido','encerrado','concluido'].includes(d.status))
    items.push({ id: 'concluido', active: true, title: 'Chamado Concluído', date: d.atendido_em ? new Date(d.atendido_em).toLocaleString() : undefined });
  return items;
}
```

- [ ] **Step 2: Usar util em DefectList**

Em `frontend/src/pages/DefectList.jsx`, remover a função local `getTimelineItems` (linhas 156-165) e importar:
```js
import { getTimelineItems } from '../utils/timeline';
```
Ajustar a chamada na linha 336 (continua `items={getTimelineItems(selectedDefect)}`).

- [ ] **Step 3: Adicionar Timeline no modal do MapPage**

Em `frontend/src/pages/MapPage.jsx`:
- Importar `Timeline` e `getTimelineItems`:
```js
import { Timeline } from '../components/ui/timeline';
import { getTimelineItems } from '../utils/timeline';
```
- No bottom-sheet `selected` (após o bloco de `imagens_extra`, antes da linha 507 de metadados), adicionar:
```jsx
<div className="mb-4 mt-4">
  <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Histórico</h4>
  <Timeline items={getTimelineItems(selected)} />
</div>
```

- [ ] **Step 4: Build e lint**

Run: `cd frontend && npx eslint src/pages/MapPage.jsx src/pages/DefectList.jsx src/utils/timeline.js && npm run build`
Expected: sem erros, build OK.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/timeline.js frontend/src/pages/MapPage.jsx frontend/src/pages/DefectList.jsx
git commit -m "feat: show public timeline in map detail sheet"
```

---

### Task 3: Indicador de sync offline (badge de pendências + status online/offline)

**Files:**
- Create: `frontend/src/hooks/useOfflineSync.js`
- Create: `frontend/src/components/ui/sync-indicator.jsx`
- Modify: `frontend/src/App.jsx` (AppHeader)
- Modify: `frontend/src/pages/MapPage.jsx` (header do mapa)

**Interfaces:**
- Consumes: IndexedDB `ciu-offline` / object store `defeitos` (criado em `frontend/src/services/api.js:openOfflineDB` e `sw.js`), eventos `online`/`offline` do `window`.
- Produces: hook `useOfflineSync() -> { pending, online, syncing }`; componente `<SyncIndicator />` que renderiza badge com `WifiSlash`/`UploadSimple` e contagem de pendentes.

- [ ] **Step 1: Criar hook useOfflineSync**

Criar `frontend/src/hooks/useOfflineSync.js`:
```js
import { useEffect, useState, useCallback } from 'react';

function countPending() {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) return resolve(0);
    const req = indexedDB.open('ciu-offline', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('defeitos', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('defeitos', 'readonly');
        const count = tx.objectStore('defeitos').count();
        count.onsuccess = () => { db.close(); resolve(count.result); };
        count.onerror = () => { db.close(); resolve(0); };
      } catch { db.close(); resolve(0); }
    };
    req.onerror = () => resolve(0);
  });
}

export function useOfflineSync() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const n = await countPending();
    setPending(n);
    if (n > 0 && navigator.onLine && 'serviceWorker' in navigator && 'SyncManager' in window) {
      setSyncing(true);
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-defeitos');
      } catch { /* ignore */ } finally {
        setSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    const onOnline = () => { setOnline(true); refresh(); };
    const onOffline = () => { setOnline(false); setSyncing(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    refresh();
    const t = setInterval(refresh, 15000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(t);
    };
  }, [refresh]);

  return { pending, online, syncing };
}
```

- [ ] **Step 2: Criar componente SyncIndicator**

Criar `frontend/src/components/ui/sync-indicator.jsx`:
```jsx
import { WifiSlash, UploadSimple } from '@phosphor-icons/react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export default function SyncIndicator() {
  const { pending, online, syncing } = useOfflineSync();

  if (online && pending === 0) return null;

  const offline = !online;
  const text = offline ? 'Offline' : `${pending} pendente${pending === 1 ? '' : 's'}`;
  const Icon = offline ? WifiSlash : UploadSimple;
  const bg = offline ? 'rgba(107,18,26,0.5)' : 'rgba(212,160,23,0.15)';
  const fg = offline ? 'var(--color-error)' : 'var(--color-gold-500)';

  return (
    <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-semibold transition-colors"
      style={{ background: bg, borderColor: fg, color: fg }}
      title={offline ? 'Sem conexão. Chamados salvos localmente.' : 'Chamados aguardando sincronização'}>
      {syncing ? <span className="w-2.5 h-2.5 border-2 border-current rounded-full border-t-transparent animate-spin" /> : <Icon size={12} />}
      {text}
    </span>
  );
}
```

- [ ] **Step 3: Renderizar no AppHeader (App.jsx)**

Em `frontend/src/App.jsx`:
- Import: `import SyncIndicator from './components/ui/sync-indicator';`
- No `AppHeader`, dentro do `<div className="flex items-center gap-2">` (antes do botão de busca, linha 83), adicionar:
```jsx
<SyncIndicator />
```

- [ ] **Step 4: Renderizar no header do MapPage**

Em `frontend/src/pages/MapPage.jsx`:
- Import: `import SyncIndicator from '../components/ui/sync-indicator';`
- No header (no `<div className="flex items-center gap-2">` da linha 285), antes do botão de busca, adicionar:
```jsx
<SyncIndicator />
```

- [ ] **Step 5: Testes do hook**

Criar `frontend/src/hooks/useOfflineSync.test.js`:
```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineSync } from './useOfflineSync';
```
(Se `@testing-library/react` não estiver instalado, instalar: `npm i -D @testing-library/react`.)

Testes:
```js
beforeEach(() => {
  vi.stubGlobal('indexedDB', undefined);
  window.removeEventListener = vi.fn();
});
```
Cobrir: (a) retorna online=true e pending=0 sem IndexedDB; (b) conta pendentes quando o store tem 2 registros (mock de `indexedDB.open` com `onsuccess` resolvendo count=2); (c) responde ao evento `offline` (dispatch `window.dispatchEvent(new Event('offline'))`).

- [ ] **Step 6: Build, lint e testes**

Run: `cd frontend && npx eslint src/hooks/useOfflineSync.js src/components/ui/sync-indicator.jsx src/App.jsx src/pages/MapPage.jsx && npm test && npm run build`
Expected: vitest passa (incluindo os novos), build OK.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/hooks/useOfflineSync.js frontend/src/components/ui/sync-indicator.jsx frontend/src/App.jsx frontend/src/pages/MapPage.jsx frontend/src/hooks/useOfflineSync.test.js frontend/package.json frontend/package-lock.json
git commit -m "feat: show offline sync pending badge in header"
```

---

### Task 4: Foto de resolução obrigatória para concluir chamado

**Files:**
- Modify: `backend-python/core/management/commands/bootstrap_schema.py`
- Modify: `backend-python/defeitos/models.py`
- Modify: `backend-python/defeitos/views.py`
- Modify: `backend-python/defeitos/tests.py`
- Modify: `frontend/src/pages/DefectList.jsx`
- Modify: `frontend/src/pages/MapPage.jsx`

**Interfaces:**
- Consumes: coluna nova `foto_resolucao BYTEA NULL` em `defeitos`; `services.image_processor.process_image(bytes) -> {'webp_bytes','thumbnail_bytes'}`; status resolvidos `{'atendido','encerrado','concluido'}`.
- Produces: campo model `foto_resolucao = models.BinaryField(null=True, blank=True, db_column='foto_resolucao')`; validação em `DefeitoViewSet.status` exigindo arquivo `foto_resolucao` quando o novo status é resolvido; `DefeitoDetailSerializer` expondo `foto_resolucao_url` (data URL); frontend exigindo seleção da foto antes de "Finalizar".

- [ ] **Step 1: Adicionar coluna ao schema**

Em `backend-python/core/management/commands/bootstrap_schema.py`, na CREATE TABLE `defeitos` (após `imagem_thumbnail BYTEA,`), adicionar:
```sql
        foto_resolucao BYTEA,
```
E após os `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` existentes (perto da linha 86), adicionar:
```sql
    ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS foto_resolucao BYTEA
```

- [ ] **Step 2: Adicionar campo ao model**

Em `backend-python/defeitos/models.py`, após `imagem_thumbnail` (linha 53), adicionar:
```python
    foto_resolucao = models.BinaryField(null=True, blank=True, db_column='foto_resolucao')
```

- [ ] **Step 3: Escrever o teste que falha**

Em `backend-python/defeitos/tests.py`, adicionar à classe `TestStatusAction`:
```python
    def test_resolvido_exige_foto_resolucao(self, auth_client):
        created = _create_defeito(auth_client)
        resp = auth_client.patch(
            reverse(self.STATUS_URL, args=[created['id']]),
            {'status': 'atendido'}, format='json',
        )
        assert resp.status_code == 400

    def test_resolvido_com_foto_resolucao(self, auth_client):
        import io
        from PIL import Image
        created = _create_defeito(auth_client)
        buf = io.BytesIO()
        Image.new('RGB', (64, 64), color='red').save(buf, format='JPEG')
        buf.seek(0)
        resp = auth_client.patch(
            reverse(self.STATUS_URL, args=[created['id']]),
            {'status': 'atendido', 'foto_resolucao': buf},
            format='multipart',
        )
        assert resp.status_code == 200
        assert resp.data['status'] == 'atendido'
```
(Verificar se `PIL` está em `backend-python/requirements.txt` — sim, é usada pelo `image_processor`. Se o teste de imagem precisar de upload real, usar `SimpleUploadedFile` de `django.core.files.uploadedfile`.)

- [ ] **Step 4: Rodar o teste para ver falhar**

Run: `cd backend-python && python -m pytest defeitos/tests.py::TestStatusAction::test_resolvido_exige_foto_resolucao -q`
Expected: FAIL (retorna 200 hoje).

- [ ] **Step 5: Implementar validação no backend**

Em `backend-python/defeitos/views.py`, substituir o action `status` (linhas 90-101):
```python
    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        defeito = self.get_object()
        novo_status = request.data.get('status')
        if novo_status not in dict(Defeito.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        resolvidos = {'atendido', 'encerrado', 'concluido'}
        if novo_status in resolvidos and defeito.status not in resolvidos:
            arquivo = request.FILES.get('foto_resolucao')
            if arquivo is None:
                return Response(
                    {'error': 'Foto de resolucao obrigatoria para concluir o chamado'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            from services.image_processor import process_image
            try:
                result = process_image(arquivo.read())
                defeito.foto_resolucao = result['webp_bytes']
            except Exception:
                return Response(
                    {'error': 'Imagem de resolucao invalida'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        defeito.status = novo_status
        if novo_status in resolvidos:
            defeito.atendido_em = timezone.now().isoformat()
        defeito.save()
        return Response(DefeitoDetailSerializer(defeito).data)
```

- [ ] **Step 6: Expor foto_resolucao_url no serializer**

Em `backend-python/defeitos/serializers.py`, adicionar ao `DefeitoDetailSerializer`:
```python
    foto_resolucao_url = ThumbnailField(source='foto_resolucao', read_only=True)
```
(`ThumbnailField.to_representation` já faz `base64` para bytes. `fields = '__all__'` cobre `foto_resolucao`; o campo extra precisa ser declarado e incluído via `fields = '__all__'` que já o inclui automaticamente quando declarado no serializer.)

- [ ] **Step 7: Rodar testes para ver passar**

Run: `cd backend-python && python -m pytest defeitos/tests.py -q`
Expected: PASS (novos 2 testes + regressão).

- [ ] **Step 8: Frontend — exigir foto antes de Finalizar**

Em `frontend/src/pages/DefectList.jsx`:
- Adicionar estado: `const [fotoResolucao, setFotoResolucao] = useState(null);` e `const fotoResolucaoRef = useRef(null);`
- Em `handleFinalizar`, antes do `api.updateDefeito`, exigir a foto:
```js
const handleFinalizar = useCallback(async (id, e) => {
  e?.stopPropagation();
  const file = fotoResolucao;
  if (!file) {
    addToast('Selecione a foto de resolução antes de finalizar.', 'error');
    return;
  }
  setFinalizando(id);
  try {
    const fd = new FormData();
    fd.append('status', 'atendido');
    fd.append('foto_resolucao', file);
    await api.updateDefeitoComArquivo(id, fd);
    ...
  }
}, [addToast, fotoResolucao]);
```
- O botão "Finalizar" passa a abrir o seletor de arquivo quando não há foto: substituir o handler `handleFinalizar` no botão por `onClick={e => fotoResolucao ? handleFinalizar(id, e) : fotoResolucaoRef.current?.click()}` e adicionar input hidden:
```jsx
<input ref={fotoResolucaoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
  onChange={e => setFotoResolucao(e.target.files?.[0] || null)} />
```
Exibir nome da foto selecionada no modal (ex.: `<span className="text-xs">{fotoResolucao?.name}</span>`).
- Ao finalizar com sucesso, limpar: `setFotoResolucao(null);`

- [ ] **Step 9: Frontend — adicionar método api.updateDefeitoComArquivo**

Em `frontend/src/services/api.js`, adicionar ao objeto `api`:
```js
  updateDefeitoComArquivo: async (id, formData) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/v1/defeitos/${id}/status/`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro na requisição' }));
      throw new Error(err.error || 'Erro na requisição');
    }
    return res.json();
  },
```

- [ ] **Step 10: Frontend — mesmo fluxo no MapPage**

Em `frontend/src/pages/MapPage.jsx`, no bottom-sheet `selected`, quando o usuário é admin e o chamado está vinculado, o botão de finalizar deve exigir foto. Reutilizar o mesmo padrão: adicionar `fotoResolucao`/`fotoResolucaoRef`, input hidden e `api.updateDefeitoComArquivo`. (Se o MapPage não tem ação "Finalizar" hoje — verificar —, adicionar o botão "Finalizar" apenas quando `user?.admin && selected.atendente_id && ['vinculado_sem_resposta','vinculado_com_resposta'].includes(selected.status)`, espelhando o DefectList.)

- [ ] **Step 11: Build frontend + lint**

Run: `cd frontend && npx eslint src/pages/DefectList.jsx src/pages/MapPage.jsx src/services/api.js && npm run build`
Expected: sem erros.

- [ ] **Step 12: Commit**

```bash
git add backend-python/core/management/commands/bootstrap_schema.py backend-python/defeitos/models.py backend-python/defeitos/views.py backend-python/defeitos/serializers.py backend-python/defeitos/tests.py frontend/src/pages/DefectList.jsx frontend/src/pages/MapPage.jsx frontend/src/services/api.js
git commit -m "feat: require resolution photo to close a defect"
```

---

### Task 5: Dataset IA expandido 100→525+ e reavaliação

**Files:**
- Modify: `ia/experimentos/dataset_sintetico.py`
- Modify: `ia/experimentos/RELATORIO_ACADEMICO.md`

**Interfaces:**
- Consumes: `get_dataset()`, `get_dataset_by_category()`, `get_categories()` usados por `avaliar_classificador.py` e `gerar_relatorio.py`.
- Produces: `DATASET` com ≥525 relatos (≥75 por categoria, incl. "Outro" com ≥75) preservando os 100 curados; relatório atualizado com nova acurácia.

- [ ] **Step 1: Adicionar gerador determinístico ao dataset**

Em `ia/experimentos/dataset_sintetico.py`, ao final do arquivo, adicionar um gerador por categoria (templates + sufixos variados, com seed fixo) que gera até completar 75 por categoria. O `get_dataset()` passa a retornar `DATASET + _generate_more()`. Estrutura (exemplo mínimo — o executor deve expandir com ~15+ templates por categoria e ~8 sufixos cada):

```python
import random

_TEMPLATES = {
    'Buraco': [
        'Buraco {tam} na {via}',
        'Cratera aberta {local}',
        'Pavimento esburacado {local}',
        'Afundamento no asfalto {local}',
        'Rua com buracos {local}',
    ],
    'Iluminacao': [
        'Poste apagado {local}',
        'Lampada queimada na {via}',
        'Iluminacao publica falha {local}',
        'Rua escura a noite {local}',
    ],
    # ... (uma lista por categoria; o executor adiciona 10+ templates por categoria
    # cobrindo Buraco, Iluminacao, Semafaro, Arvore Caida, Entulho, Calcada Danificada, Outro)
}

_SUFIXOS = [
    'perto da escola', 'em frente ao mercado', 'na praca central',
    'no bairro centro', 'proximo ao hospital', 'na avenida principal',
    'em frente a igreja', 'na rua principal', 'no cruzamento movimentado',
    'proximo ao terminal', 'na praca da matriz', 'em frente ao posto',
    'na orla do rio', 'na entrada do bairro', 'na rua do comercio',
]

def _generate_more(seed=42):
    rng = random.Random(seed)
    extra = []
    contador = {}
    for item in DATASET:
        contador[item['categoria']] = contador.get(item['categoria'], 0) + 1
    for categoria, templates in _TEMPLATES.items():
        while contador.get(categoria, 0) < 75:
            tpl = rng.choice(templates)
            sufixo = rng.choice(_SUFIXOS)
            texto = tpl.format(tam=rng.choice(['enorme', 'fundo', 'perigoso', 'grande', 'medio', 'pequeno', 'largo', 'profundo']), via=rng.choice(['avenida', 'rua', 'alameda', 'travessa', 'rodovia']), local=sufixo)
            extra.append({'text': texto, 'categoria': categoria})
            contador[categoria] = contador.get(categoria, 0) + 1
    return extra
```

E alterar `get_dataset()`:
```python
def get_dataset():
    """Retorna o dataset sintetico completo (curado + expandido determinístico)."""
    return DATASET + _generate_more()
```
ATENÇÃO: `get_dataset_by_category` e `get_categories` já iteram `DATASET`; trocar para usar `get_dataset()` para refletir a expansão.

- [ ] **Step 2: Verificar contagem**

Run (dentro do container IA ou local se onnxruntime não for necessário — dataset não depende do modelo):
`python -c "import sys; sys.path.insert(0,'ia/experimentos'); from dataset_sintetico import get_dataset_by_category; d=get_dataset_by_category(); print({k:len(v) for k,v in d.items()}); print('total', sum(len(v) for v in d.values()))"`
Expected: cada categoria ≥75, "Outro" ≥75, total ≥525.

- [ ] **Step 3: Rodar reavaliação com o classificador**

O container IA (`tcc-manutencao-urbana-ia-1`) está ativo e serve `/classify` na porta interna 8000 com o modelo ONNX carregado. O `/app` do container não contém `experimentos/` (não é bind-mounted). `avaliar_classificador.py` usa `IA_URL = "http://localhost:8000"` (porta interna do próprio container) e importa `dataset_sintetico` do mesmo diretório. Rodar copiando os arquivos para dentro do container:

```bash
docker cp ia/experimentos/dataset_sintetico.py tcc-manutencao-urbana-ia-1:/tmp/
docker cp ia/experimentos/avaliar_classificador.py tcc-manutencao-urbana-ia-1:/tmp/
docker exec tcc-manutencao-urbana-ia-1 bash -c "cd /tmp && python avaliar_classificador.py"
```

Capturar a saída integral (matriz de confusão + métricas + acurácia global). Se o container não conseguir rodar, registrar no relatório que a reavaliação requer o modelo ONNX (sem inventar números).

- [ ] **Step 4: Atualizar RELATORIO_ACADEMICO.md**

Em `ia/experimentos/RELATORIO_ACADEMICO.md`, substituir a seção de resultados (45.77%) pela nova matriz de confusão + acurácia global. Se o alvo ≥70% não for atingido, documentar a acurácia obtida e os próximos passos (mais templates, tuning de temperatura).

- [ ] **Step 5: Commit**

```bash
git add ia/experimentos/dataset_sintetico.py ia/experimentos/RELATORIO_ACADEMICO.md
git commit -m "feat: expand synthetic dataset to 525+ reports for classifier retraining"
```

---

### Task 6: Testes pytest no CI

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: job `test` existente (sobe `postgres`, roda checks). `backend-python/conftest.py` cria o banco de teste via `bootstrap_schema` (DROP+CREATE `test_manutencao_urbana`). Env dummy já definido no workflow (`DB_PASSWORD`, `SUPER_ADMIN_*`, `JWT_SECRET`, `ENCRYPTION_KEY`).
- Produces: step `Run backend tests (pytest)` no job `test`.

- [ ] **Step 1: Adicionar step pytest no deploy.yml**

No job `test`, após o step "Django imports check" e antes de "Build frontend", adicionar:
```yaml
      - name: Run backend tests (pytest)
        run: docker compose -f docker-compose.yml run --rm -e DJANGO_SETTINGS_MODULE=core.settings.local backend python -m pytest
```
Nota: o `conftest.py` já força `DJANGO_SETTINGS_MODULE=core.settings.local`; o `-e` é reforço. O postgres sobe com usuário `urbana` como superusuário (POSTGRES_USER), o que permite o conftest dropar/criar o banco de teste.

- [ ] **Step 2: Validar localmente o comando**

Run: `docker compose -f docker-compose.yml run --rm backend python -m pytest` (com a stack dev ou prod up, postgres healthy).
Expected: todos os testes passam (backend tests + novos de foto de resolução).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: run backend pytest suite in deploy pipeline"
```

---

## Self-Review

**Spec coverage (CHECKLIST-ESTADO-PROJETO.md):**
- 2.3 frontend (badge/KPI SLA vencidos) → Task 1. ✅
- 3.1 Timeline no mapa → Task 2. ✅
- 3.2 Indicador de sync offline → Task 3. ✅
- 2.4 Foto de resolução obrigatória → Task 4. ✅
- 1.2/1.3/1.4 Dataset 100→525 + reavaliação → Task 5. ✅
- 3.3 Testes no CI (pytest) → Task 6. ✅

**Placeholder scan:** Todos os blocos de código são concretos. A única parte que pede expansão manual explícita é a lista `_TEMPLATES` no Task 5 (10+ templates por categoria), marcada claramente; os sufixos e o mecanismo de geração são fornecidos integralmente. Task 3 depende de `@testing-library/react` (instalação indicada no passo). Task 4 Step 10 depende de verificar se o MapPage tem ação "Finalizar" (verificação indicada).

**Type consistency:** `useOfflineSync()` retorna `{pending, online, syncing}` e é consumido igual no `SyncIndicator`. `getTimelineItems(defeito)` tem a mesma assinatura e shape de itens que o `Timeline` existente espera. `api.updateDefeitoComArquivo(id, formData)` é usado igualmente em DefectList e MapPage. `foto_resolucao` (BYTEA) é consumido pelo `ThumbnailField` (mesmo padrão do `imagem_thumbnail`). `process_image` retorna `{'webp_bytes', 'thumbnail_bytes'}` consistentemente em Tasks 4.