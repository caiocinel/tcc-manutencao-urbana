# Fix: Identificação de Cidade do Usuário e Geolocalização Deslogada

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir dois bugs: (1) usuário logado não tem sua cidade identificada corretamente no mapa, e (2) usuário deslogado não tem sua localização geográfica detectada para centralizar o mapa.

**Architecture:** O `MapPage` usa `user?.municipio` para definir o centro do mapa quando logado, e um fallback fixo `[-28.67, -49.38]` quando deslogado. O `AuthContext` carrega `municipio` do `localStorage` ou busca da API, mas o token JWT não inclui `municipio_id` corretamente no payload (usa `_id` do MongoDB mas o banco é PostgreSQL com `id` UUID). Além disso, não há chamada a `navigator.geolocation` para usuários deslogados.

**Tech Stack:** React, Leaflet, JWT, PostgreSQL, Node.js/Express

---

## Root Cause Analysis

### Bug 1: Cidade do usuário logado não identificada

**Caminho do dado:**
1. Backend `auth.js` login → `attachMunicipio(user)` busca município e retorna no response.
2. Frontend `api.js` `login()` → retorna `{ token, user }` com `user.municipio`.
3. Login page chama `login(token, user)` do `AuthContext`.
4. `AuthContext` salva `userData` no `localStorage`.
5. Em reload, `AuthContext` lê token, decodifica payload JWT.
6. **PROBLEMA:** O payload JWT usa `userId: user._id` (linha 79, 127 auth.js), mas `_id` no `User.js` é `row.id` (UUID string). Isso está correto.
7. **PROBLEMA REAL:** O `decodeToken` em `AuthContext.jsx` lê `payload.municipio_id`, mas o token JWT inclui `municipio_id: user.municipio_id`. Se o usuário foi criado sem `municipio_id`, o token terá `municipio_id: null`.
8. O `AuthContext` monta `userBase` com `municipio_id: payload.municipio_id || userData.municipio_id || null`. Se `userData` do localStorage tem `municipio` mas não `municipio_id`, o `precisaMunicipio` check falha (`!userBase.municipio_id` é true), então ele NÃO busca o município da API.
9. **MAIS IMPORTANTE:** O `MapPage` usa `hasMunicipio = !!user?.municipio?.min_lat && user.municipio.min_lat !== 0`. Se `user.municipio` é `null`, cai no fallback `[-28.67, -49.38]`.
10. **CAUSA RAIZ:** O `AuthContext` no refresh não garante que `municipio` seja carregado. O check `precisaMunicipio` usa `!userBase.municipio || !userBase.municipio.poligono_json`, mas se `userBase.municipio_id` existe e `userBase.municipio` existe mas é um objeto incompleto (sem `min_lat`), o `MapPage` ainda falha.

**Fix:** No `AuthContext`, ao montar `userBase` no refresh, garantir que se `municipio_id` exista, o `municipio` completo seja buscado da API e salvo. Também garantir que o `municipio` do `localStorage` tenha os campos necessários (`min_lat`, `max_lat`, `min_lng`, `max_lng`).

### Bug 2: Localização deslogada não detectada

**Caminho do dado:**
1. `MapPage` define `mapCenter` baseado em `hasMunicipio`.
2. Se `!hasMunicipio` (usuário deslogado ou sem município), usa fallback fixo `[-28.67, -49.38]`.
3. **PROBLEMA:** Não há chamada a `navigator.geolocation.getCurrentPosition()` para tentar detectar a localização do usuário deslogado.

**Fix:** Adicionar um `useEffect` no `MapPage` que, quando o usuário está deslogado, tenta obter a geolocalização do navegador e centraliza o mapa nela. Se falhar ou for negada, mantém o fallback.

---

## Task 1: Corrigir carregamento de município no AuthContext

**Files:**
- Modify: `frontend/src/context/AuthContext.jsx`

- [ ] **Step 1: Melhorar o check de município completo no refresh**

No `useEffect` do token, alterar a lógica de `precisaMunicipio` para verificar se o município tem os campos de bounding box necessários:

```jsx
      const precisaMunicipio = userBase.municipio_id && (
        !userBase.municipio ||
        !userBase.municipio.poligono_json ||
        typeof userBase.municipio.min_lat !== 'number' ||
        typeof userBase.municipio.max_lat !== 'number' ||
        typeof userBase.municipio.min_lng !== 'number' ||
        typeof userBase.municipio.max_lng !== 'number'
      );
```

- [ ] **Step 2: Garantir que municipio_id venha do token ou localStorage**

O código já faz `municipio_id: payload.municipio_id || userData.municipio_id || null`. Verificar se `payload.municipio_id` está presente. Se não estiver, mas `userData.municipio_id` estiver, usar de lá.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/AuthContext.jsx
git commit -m "fix: Ensure municipio is fully loaded with bounding box on auth refresh"
```

---

## Task 2: Adicionar geolocalização para usuários deslogados

**Files:**
- Modify: `frontend/src/pages/MapPage.jsx`

- [ ] **Step 1: Adicionar estado para geolocalização deslogada**

Adicionar no topo do componente `MapPage`:

```jsx
  const [userLocation, setUserLocation] = useState(null);
```

- [ ] **Step 2: Adicionar useEffect para geolocalização**

Adicionar após os outros `useEffect`:

```jsx
  useEffect(() => {
    if (isAuthenticated) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
      },
      () => {
        // falha silenciosa — mantém fallback
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }, [isAuthenticated]);
```

- [ ] **Step 3: Usar userLocation no mapCenter quando deslogado**

Alterar a lógica de `mapCenter`:

```jsx
  const hasMunicipio = !!user?.municipio?.min_lat && user.municipio.min_lat !== 0;
  const mapCenter = hasMunicipio
    ? [(user.municipio.min_lat + user.municipio.max_lat) / 2, (user.municipio.min_lng + user.municipio.max_lng) / 2]
    : (userLocation || [-28.67, -49.38]);
```

- [ ] **Step 4: Adicionar efeito para flyTo quando userLocation muda**

Adicionar `useEffect` para mover o mapa quando a localização for obtida:

```jsx
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !userLocation) return;
    m.setView(userLocation, 12, { animate: true });
  }, [userLocation]);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/MapPage.jsx
git commit -m "feat: Use browser geolocation for unauthenticated users on map"
```

---

## Task 3: Verificação manual

- [ ] **Step 1: Testar usuário logado**
  1. Fazer login com um usuário que tenha `municipio_id`.
  2. Verificar no DevTools → Application → Local Storage que `userData` tem `municipio` com `min_lat`, `max_lat`, etc.
  3. Recarregar a página.
  4. Verificar se o mapa centraliza na cidade correta.

- [ ] **Step 2: Testar usuário deslogado**
  1. Abrir o app em aba anônima.
  2. Permitir geolocalização no navegador.
  3. Verificar se o mapa centraliza na localização atual (ou próximo dela).
  4. Negar geolocalização.
  5. Verificar se o mapa cai no fallback `[-28.67, -49.38]`.

---

## Spec Coverage Check

| Requisito | Task |
|-----------|------|
| Usuário logado deve ver mapa centralizado na cidade do registro | Task 1 |
| Usuário deslogado deve ter localização detectada via navegador | Task 2 |
| Fallback para localização padrão se geolocalização falhar | Task 2 |

## Placeholder Scan

- Nenhum TBD/TODO encontrado.
- Código completo fornecido para cada step.
- Comandos de teste e commit inclusos.
