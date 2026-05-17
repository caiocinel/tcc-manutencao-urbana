# Correções, Melhorias e Design System — Plano de Implementação

> **For agentic workers:** Execução sequencial (Fase 1→5). Cada tarefa produz commits atômicos.

**Goal:** Aplicar 8 tarefas de correções/melhorias + deploy no VPS Hetzner, seguindo design system do novo-chamado.html

**Architecture:** Frontend React 19 + Vite 8 (CSS puro + Tailwind CSS + shadcn/ui), Backend Express 5 + PostgreSQL/PostGIS, Deploy Docker Compose no VPS Hetzner

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, shadcn/ui, Express 5, PostgreSQL 16 + PostGIS, Docker, Nginx

---

### FASE 1 — Fundação

#### Task 4: Design System + SKILL.md

**Files:**
- Create: `.claude-mem.md`
- Copy: `~/Downloads/novo-chamado.html → /mnt/sda1/TCC/app-de-gestao-publica/tcc-manutencao-urbana/novo-chamado.html`
- Modify: `frontend/src/styles/tokens.css`

- [ ] **Step 1: Copy novo-chamado.html to project root**
  ```bash
  cp ~/Downloads/novo-chamado.html /mnt/sda1/TCC/app-de-gestao-publica/tcc-manutencao-urbana/novo-chamado.html
  ```

- [ ] **Step 2: Create .claude-mem.md with design system block**
  Content: Design tokens reference extracted from novo-chamado.html (colors, typography, components, behaviors)

- [ ] **Step 3: Merge design tokens into tokens.css**
  Add new tokens from novo-chamado.html (accent #7c6fff, success #2ec4a0, danger #ff6b6b) while preserving existing ones. Add the new border-focus, accent-dim, success-dim variables

- [ ] **Step 4: Commit**
  ```bash
  git add novo-chamado.html .claude-mem.md frontend/src/styles/tokens.css
  git commit -m "feat: Add design system tokens and SKILL.md from novo-chamado.html"
  ```

#### Task 6: Tailwind + shadcn/ui + Telas Full-Screen + Navbar

**Files:**
- Create: `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/components.json`
- Create: `frontend/src/lib/utils.js`
- Modify: `frontend/package.json`, `frontend/vite.config.js`
- Modify: `frontend/src/pages/Login.jsx`
- Modify: `frontend/src/pages/Register.jsx`
- Modify: `frontend/src/components/Header.jsx`

- [ ] **Step 1: Install Tailwind CSS v4 + PostCSS**
  ```bash
  cd frontend && npm install -D tailwindcss @tailwindcss/vite postcss autoprefixer
  ```

- [ ] **Step 2: Configure Tailwind**
  Update `vite.config.js` to add `@tailwindcss/vite` plugin
  Create `frontend/postcss.config.js` with tailwindcss + autoprefixer
  Update `frontend/src/index.css` to import Tailwind

- [ ] **Step 3: Install shadcn/ui**
  ```bash
  cd frontend && npx shadcn@latest init
  ```
  Configure to use CSS variables, dark mode class strategy

- [ ] **Step 4: Install 21st.dev MCP**
  Follow https://21st.dev/mcp instructions

- [ ] **Step 5: Refactor Login.jsx to full-screen layout**
  Implement full-screen sign-in with centered card, background, brand logo, email/password fields, social login placeholders. Use same design tokens.

- [ ] **Step 6: Refactor Register.jsx to full-screen layout**
  Same full-screen pattern as login, with all existing fields (nome, email, senha, CPF, municipio). Keep CPF validation and SearchableSelect.

- [ ] **Step 7: Replace Header.jsx with shadcnblocks Navbar1**
  Implement responsive navbar: brand left, nav links center (Mapa, Lista, Admin if admin), UserMenu / login right, theme toggle. Style with CSS modules or Tailwind classes.

- [ ] **Step 8: Commit**
  ```bash
  git add frontend/package.json frontend/vite.config.js frontend/postcss.config.js frontend/tailwind.config.js frontend/components.json frontend/src/index.css frontend/src/pages/Login.jsx frontend/src/pages/Register.jsx frontend/src/components/Header.jsx
  git commit -m "feat: Add Tailwind, shadcn/ui, full-screen auth pages, new navbar"
  ```

---

### FASE 2 — Settings

#### Task 7: Profile Settings (HextaUI)

**Files:**
- Create: `frontend/src/pages/ProfileSettings.jsx`
- Modify: `frontend/src/App.jsx` (add route)
- Modify: `frontend/src/services/api.js` (add updateProfile)
- Modify: `backend/src/routes/auth.js` (add PATCH /api/auth/profile)
- Modify: `backend/src/validation/auth.schema.js` (updateProfileSchema exists)

- [ ] **Step 1: Add backend endpoint PATCH /api/auth/profile**
  Update `auth.schema.js` — updateProfileSchema already exists with nome, email
  Add route handler in `auth.js`:
  ```js
  router.patch('/profile', authenticateToken, validate(updateProfileSchema), async (req, res) => {
    const { nome } = req.body;
    if (nome) await query('UPDATE users SET nome = $1, atualizado_em = $2 WHERE id = $3', [nome, new Date().toISOString(), req.user.userId]);
    const user = await User.findById(req.user.userId);
    res.json({ nome: user.nome, email: user.email });
  });
  ```

- [ ] **Step 2: Add updateProfile to api.js**
  ```js
  updateProfile: (data) => request('/api/auth/profile', { method: 'PATCH', body: data }),
  ```

- [ ] **Step 3: Create ProfileSettings.jsx page**
  Full page with:
  - Header: "Profile Settings" + "Save Changes" button
  - Profile Picture section: circular avatar, upload button, drag-and-drop zone
  - Personal Info: Name (required), Email (readonly + "Change Email"), Bio (textarea 500 char max), Location, Website
  - Social Links: Twitter/X, GitHub, LinkedIn, Website
  - Save with validation + toast feedback
  - Uses design tokens from Task 4

- [ ] **Step 4: Add route in App.jsx**
  ```jsx
  const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
  <Route path="/conta" element={<AnimatedRoute><ProfileSettings /></AnimatedRoute>} />
  ```
  (Replace existing AccountSettings route)

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/routes/auth.js backend/src/validation/auth.schema.js frontend/src/services/api.js frontend/src/pages/ProfileSettings.jsx frontend/src/App.jsx
  git commit -m "feat: Add profile settings page with avatar upload and social links"
  ```

#### Task 8: General Settings Panel (HextaUI)

**Files:**
- Create: `frontend/src/pages/GeneralSettings.jsx`
- Create: `frontend/src/components/settings/AccountBlock.jsx`
- Create: `frontend/src/components/settings/NotificationsBlock.jsx`
- Create: `frontend/src/components/settings/SecurityBlock.jsx`
- Create: `frontend/src/components/settings/PrivacyBlock.jsx`
- Create: `frontend/src/components/settings/PreferencesBlock.jsx`
- Create: `frontend/src/components/settings/ActivityLogBlock.jsx`
- Modify: `frontend/src/App.jsx` (add route)

- [ ] **Step 1: Create settings blocks components**
  Each block is a standalone component:
  - AccountBlock: account data display
  - NotificationsBlock: email/push/in-app toggles
  - SecurityBlock: password change, 2FA, active sessions
  - PrivacyBlock: profile visibility, shared data
  - PreferencesBlock: theme, language, timezone
  - ActivityLogBlock: read-only action history table

- [ ] **Step 2: Create GeneralSettings.jsx page**
  Layout with sidebar (nav items) + main content panel. Sidebar uses accent-dim for active item.
  6 settings blocks rendered on click.

- [ ] **Step 3: Add route in App.jsx**
  ```jsx
  const GeneralSettings = lazy(() => import('./pages/GeneralSettings'));
  <Route path="/configuracoes" element={<AnimatedRoute><GeneralSettings /></AnimatedRoute>} />
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/pages/GeneralSettings.jsx frontend/src/components/settings/ frontend/src/App.jsx
  git commit -m "feat: Add general settings panel with 6 setting blocks and sidebar navigation"
  ```

---

### FASE 3 — Chamados

#### Task 2: Mapa de Status com Cores

**Files:**
- Modify: `frontend/src/pages/DefectList.jsx`
- Modify: `frontend/src/pages/AdminDashboardMetrics.jsx`

- [ ] **Step 1: Create shared STATUS_CONFIG constant**
  In `frontend/src/styles/tokens.css` or a new constants file:
  ```js
  export const STATUS_CONFIG = {
    'Aguardando Atendimento': { color: '#F97316', label: 'Aguardando Atendimento' },
    'Chamado Vinculado (Mas sem Resposta)': { color: '#EAB308', label: 'Chamado Vinculado (Mas sem Resposta)' },
    'Chamado Vinculado (Com Resposta)': { color: '#3B82F6', label: 'Chamado Vinculado (Com Resposta)' },
    'Chamado Concluído e Finalizado': { color: '#22C55E', label: 'Chamado Concluído e Finalizado' },
  };
  export function getStatusConfig(status, dataConclusao) {
    if (status === 'Chamado Concluído e Finalizado' && dataConclusao) {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (new Date(dataConclusao).getTime() < weekAgo) {
        return { color: '#6B7280', label: 'Chamado Concluído e Finalizado (após 1 semana)' };
      }
    }
    return STATUS_CONFIG[status] || { color: '#6B7280', label: status };
  }
  ```

- [ ] **Step 2: Update DefectList.jsx status badges**
  Replace hardcoded status labels/colors with STATUS_CONFIG. Add visual badge with the correct color.

- [ ] **Step 3: Update AdminDashboardMetrics.jsx pie chart colors**
  Update `statusCores` object to use the new color mapping. Add gray for "after 1 week" logic.

- [ ] **Step 4: Update all other places (MapPage popups, AdminDashboard table)**
  Search for any other status badge rendering in the codebase and apply consistent colors.

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/pages/DefectList.jsx frontend/src/pages/AdminDashboardMetrics.jsx
  git commit -m "feat: Add color-coded status mapping with auto-gray after 1 week"
  ```

#### Task 1: Botão Atender Chamado + Vínculo de Atendente

**Files:**
- Modify: `backend/src/config/database.js` (add atendente_id column)
- Modify: `backend/src/models/Defeito.js` (add atendente_id to model)
- Modify: `backend/src/routes/defeitos.js` (add PATCH /:id/atender)
- Modify: `frontend/src/services/api.js` (add atenderDefeito)
- Modify: `frontend/src/pages/DefectList.jsx` (add "Atender Chamado" button)

- [ ] **Step 1: Add atendente_id column to defeitos table**
  In `database.js` connectDB function:
  ```sql
  ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS atendente_id UUID REFERENCES users(id);
  ```

- [ ] **Step 2: Add "atender" endpoint in backend**
  In `defeitos.js`:
  ```js
  router.patch('/:id/atender', authenticateToken, async (req, res) => {
    const defeito = await Defeito.findById(req.params.id);
    if (!defeito) return res.status(404).json({ error: 'Chamado não encontrado' });
    if (defeito.atendente_id) return res.status(400).json({ error: 'Chamado já possui atendente' });

    await Defeito.findByIdAndUpdate(req.params.id, {
      atendente_id: req.user.userId,
      status: 'vinculado_sem_resposta',
      atendido_em: new Date().toISOString(),
    });

    res.json({ message: 'Chamado vinculado com sucesso' });
  });
  ```

- [ ] **Step 3: Add atenderDefeito to api.js**
  ```js
  atenderDefeito: (id) => request(`/api/defeitos/${id}/atender`, { method: 'PATCH' }),
  ```

- [ ] **Step 4: Update status values in Defeito model**
  Add new statuses: 'vinculado_sem_resposta', 'vinculado_com_resposta', 'concluido'
  Update allowedStatuses list in Defeito.findByIdAndUpdate

- [ ] **Step 5: Add "Atender Chamado" button in DefectList.jsx**
  For admin users, show a button "Atender Chamado" on pending tickets. On click, call api.atenderDefeito(id), update local state. Disable for already-attended tickets.

- [ ] **Step 6: Commit**
  ```bash
  git add backend/src/config/database.js backend/src/models/Defeito.js backend/src/routes/defeitos.js frontend/src/services/api.js frontend/src/pages/DefectList.jsx
  git commit -m "feat: Add attend ticket button with attendant binding and new status flow"
  ```

---

### FASE 4 — Correções

#### Task 3: Correção das Métricas

**Files:**
- Modify: `backend/src/routes/auth.js` (fix admin/estatisticas)

- [ ] **Step 1: Analyze the pendentes count bug**
  Current code in auth.js line 375-376:
  ```js
  const pendentes = (porStatus.find(s => s.status === 'pendente')?.total || 0) +
                    (porStatus.find(s => s.status === 'em_andamento')?.total || 0);
  ```
  After Task 1, statuses may include 'vinculado_sem_resposta', 'vinculado_com_resposta', 'concluido'. Need to update to include all non-final statuses.

- [ ] **Step 2: Fix pendentes count**
  ```js
  const statusPendentes = ['pendente', 'em_andamento', 'vinculado_sem_resposta', 'vinculado_com_resposta'];
  const pendentes = porStatus
    .filter(s => statusPendentes.includes(s.status))
    .reduce((sum, s) => sum + parseInt(s.total, 10), 0);
  ```

- [ ] **Step 3: Fix resolvidos count**
  ```js
  const statusResolvidos = ['atendido', 'encerrado', 'concluido'];
  const resolvidos = porStatus
    .filter(s => statusResolvidos.includes(s.status))
    .reduce((sum, s) => sum + parseInt(s.total, 10), 0);
  ```

- [ ] **Step 4: Add debug logging**
  ```js
  logger.info({ pendentes, resolvidos, total }, 'Métricas calculadas');
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/routes/auth.js
  git commit -m "fix: Correct metrics queries for pending count and resolution rate"
  ```

#### Task 5: Fluxo de Login — Verificação de Conta

**Files:**
- Modify: `backend/src/routes/auth.js` (add POST /api/auth/check-email)
- Modify: `frontend/src/pages/Login.jsx` (add email check before password)
- Modify: `frontend/src/services/api.js` (add checkEmail)

- [ ] **Step 1: Add backend endpoint POST /api/auth/check-email**
  In `auth.js`:
  ```js
  router.post('/check-email', authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
    const user = await User.findOne({ email: email.toLowerCase() });
    res.json({ exists: !!user });
  });
  ```

- [ ] **Step 2: Add checkEmail to api.js**
  ```js
  checkEmail: (email) => request('/api/auth/check-email', { method: 'POST', body: { email } }),
  ```

- [ ] **Step 3: Update Login.jsx with 2-step flow**
  Step 1: User enters email, click "Continuar" → check if email exists
  Step 2a: If email exists → show password field
  Step 2b: If email doesn't exist → redirect to /registro?email=xxx with message

- [ ] **Step 4: Update Register.jsx to accept email from query params**
  Add useEffect to read `?email=` from URL and prefill the email field + show friendly message.

- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/routes/auth.js frontend/src/services/api.js frontend/src/pages/Login.jsx frontend/src/pages/Register.jsx
  git commit -m "feat: Add email existence check before login with auto-redirect to register"
  ```

---

### FASE 5 — Deploy

#### Task 9: Deploy no VPS Hetzner + SKILL.md VPS Config

**Files:**
- Modify: `.claude-mem.md` (add VPS section to unlink Oracle)
- Modify: `.env.production` (update with production values)
- Modify: `frontend/.env.production` (update VITE_API_URL)

- [ ] **Step 1: Update .claude-mem.md with VPS Hetzner config, removing Oracle**
  ```
  ## VPS — Produção
  > VPS: Hetzner (root@tcc.josemurilors.com.br)
  > Oracle VPS: DESATIVADA/desvinculada
  SSH Key: ~/ssh-hetzner.key
  Domain: tcc.josemurilors.com.br
  Deploy: docker compose up -d
  ```

- [ ] **Step 2: Prepare production env files**
  Update `.env.production` with current secrets from `.env`

- [ ] **Step 3: Build frontend**
  ```bash
  cd frontend && npm run build
  ```

- [ ] **Step 4: Copy files to VPS**
  ```bash
  scp -i ~/ssh-hetzner.key -r .env.production docker-compose.yml nginx.prod.conf ecosystem.config.js root@tcc.josemurilors.com.br:/app/tcc-manutencao-urbana/
  ```

- [ ] **Step 5: SSH and restart**
  ```bash
  ssh -i ~/ssh-hetzner.key root@tcc.josemurilors.com.br
  cd /app/tcc-manutencao-urbana && docker compose up -d --build
  ```

- [ ] **Step 6: Commit**
  ```bash
  git add .claude-mem.md .env.production
  git commit -m "feat: Configure VPS Hetzner deploy, unlink Oracle VPS"
  ```
