# Dead Code Cleanup — Refactoring Plan

**Date:** 2026-05-16
**Scope:** `frontend/src/` — Remove dead code, unused imports, unused exports, unused state, unused API methods.

---

## Analysis Summary

### 1. Components Created But Never Rendered

| Component | File | Reason |
|-----------|------|--------|
| `DataTable` | `components/ui/data-table.jsx` | Never imported in any file. Full 122-line component with sorting, pagination, search — zero usage. |

### 2. API Methods Never Called

| Method | File | Reason |
|--------|------|--------|
| `api.checkEmail` | `services/api.js:112` | Email check endpoint exists but never called from UI |
| `api.getDefeito` | `services/api.js:130` | Single defect fetch — never called |
| `api.listClusters` | `services/api.js:153` | Cluster API — never called |
| `api.encerrarLote` | `services/api.js:158` | Batch close — never called |
| `api.regioesDefeitos` | `services/api.js:161` | Region defects — never called |
| `api.adminUpdateUserMunicipio` | `services/api.js:174` | Admin update municipio — never called |
| `api.apoiarDefeito` | `services/api.js:189` | "Apoiar" button exists in UI but no handler wired |
| `api.anexarDefeito` | `services/api.js:198` | "Anexar" button exists in UI but no handler wired |
| `api.enviar2fa` | `services/api.js:217` | 2FA send — never called |
| `api.verificar2fa` | `services/api.js:220` | 2FA verify — never called |
| `api.validarCpf` | `services/api.js:183` | CPF validation done client-side in Register.jsx |

### 3. Unused Exports

| Export | File | Reason |
|--------|------|--------|
| `STATUS_COLORS` | `components/ui/status-badge.jsx:60` | Exported but never imported elsewhere |
| `getStatusConfig` | `constants.js:11` | Exported but never imported elsewhere |
| `buttonVariants` | `components/ui/button.jsx:47` | Exported but never imported elsewhere |

### 4. State Variables Never Read

| Variable | File | Reason |
|----------|------|--------|
| `defeitos` (state) | `pages/AdminDashboard.jsx:47` | Set on line 69 and 83, but value is never read. Data is re-fetched into `regioes` instead. |
| `mapViewRef` | `pages/MapPage.jsx:52` | Set in `handleMapReady` (line 105) but never read anywhere |

### 5. Unused Internal Functions

| Function | File | Reason |
|----------|------|--------|
| `formDataToObject` | `services/api.js:49` | Only called by `salvarOffline`, which is only called by `uploadDefeito` when offline. Keep for PWA offline support. |

### 6. Placeholder Pages (Low Priority)

| Page | File | Reason |
|------|------|--------|
| `Settings` | `pages/Settings.jsx` | Auth guard + empty page. Route exists at `/config`. |
| `GeneralSettings` | `pages/GeneralSettings.jsx` | Auth guard + "Em desenvolvimento" message. Route exists at `/configuracoes`. |

---

## Tasks

### Task 1: Remove unused component — DataTable
- Delete `frontend/src/components/ui/data-table.jsx`

### Task 2: Remove unused API methods from api.js
- Remove `checkEmail`
- Remove `getDefeito`
- Remove `listClusters`
- Remove `encerrarLote`
- Remove `regioesDefeitos`
- Remove `adminUpdateUserMunicipio`
- Remove `apoiarDefeito`
- Remove `anexarDefeito`
- Remove `enviar2fa`
- Remove `verificar2fa`
- Remove `validarCpf`

### Task 3: Remove unused exports
- Remove `STATUS_COLORS` export from `status-badge.jsx`
- Remove `getStatusConfig` export from `constants.js`
- Remove `buttonVariants` export from `button.jsx`

### Task 4: Remove unused state variables
- Remove `defeitos` state and `setDefeitos` from `AdminDashboard.jsx` (replace with direct `regioes` population)
- Remove `mapViewRef` from `MapPage.jsx` (remove declaration and assignment in `handleMapReady`)

### Task 5: Verify build
- Run `npm run build` in `frontend/` directory
- Ensure no import errors or missing references

---

## Verification Commands

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors.
