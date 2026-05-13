# Frontend Design Improvement — TODO

## Fase 1: Consistência Visual (Urgente)
- [x] Adicionar `.btn-secondary` — estilo outline escuro (transparente + `--text-secondary` + `--border-default`)
- [x] Adicionar `.header-actions button` — estilo ghost escuro para botões de navegação no header
- [x] Adicionar `.header-actions` — container flex com gap
- [x] Adicionar `.map-subtitle` — texto secundário no subtítulo do mapa
- [x] Adicionar `.btn-apoiar` — botão pequeno para apoiar chamados
- [x] Adicionar `.status-badge` — badges de status (pendente/andamento/atendido/encerrado)
- [x] Remover emoji icons das páginas (substituir por Phosphor icons) — MapPage, AdminDashboard, AdminDashboardMetrics, DefectList, AccountSettings
- [x] Remover emoji icons dos marcadores do mapa (substituir por Phosphor: Heart, Fire, Sun, Gear, MapPin, Paperclip, Plus, NotePencil)
- [x] ErrorBoundary wrapper + lazy loading de rotas admin
- [x] FAB button estilizado (verde, 52px, sombra, bottom-right fixo)

## Fase 2: Header e Navegação
- [x] Unificar layout de header entre todas as páginas (MapPage, AdminDashboard, AdminDashboardMetrics, SuperAdmin)
- [x] Adicionar logo/ícone da marca no header
- [x] Menu hamburger em mobile (<768px) para os botões de navegação
- [x] Indicador visual de página ativa no header
- [x] Substituir `<span>{user?.email}</span>` por um componente de avatar/user-menu

## Fase 3: Tipografia e Espaçamento
- [x] Revisar `tokens.css`: ajustar font-size base para 15px (já feito), tracking letter-spacing
- [x] Padronizar line-height (1.5 para corpo, 1.2 para títulos)
- [x] Adicionar escala tipográfica consistente (xs, sm, base, md, lg, xl, 2xl, 3xl)
- [x] Revisar padding/margins dos cards e containers (gap consistente)
- [x] Aplicar `--font-mono` em dados de coordinate e metadados

## Fase 4: Formulários e Inputs
- [x] Padronizar altura de inputs (min-height: 44px para touch targets)
- [x] Adicionar estado de focus mais visível (ring com `--accent-green`)
- [x] Adicionar `select` estilizado globalmente (não só no `.filter-select`)
- [x] Adicionar feedback visual de loading em botões de formulário (spinner)
- [x] Validação inline com mensagens de erro estilizadas

## Fase 5: MapPage
- [x] Debounce de 300ms no geocoding (já feito)
- [x] React.memo em IndividualMarker e ClusterMarker (já feito)
- [x] Loading overlay dentro do wrapper relativo do mapa (já feito)
- [x] FAB animado com framer-motion (entrada/saída)
- [x] Transição suave entre filtros (framer-motion AnimatePresence)
- [x] Sheet/bottom-sheet para o formulário de criação em mobile (em vez de modal central)
- [x] Melhorar popup do cluster: paginação ou scroll infinito
- [x] Heatmap toggle com transição

## Fase 6: Admin Dashboard
- [x] Responsivo: tabelas horizontais viram cards em mobile
- [x] KPIs com mini sparkline charts (recharts já instalado)
- [x] Filtro por período com date picker
- [x] Exportar relatório em CSV/PDF
- [ ] Atalho de teclado para navegação (g + m = mapa, g + a = admin, etc)

## Fase 7: Animações e Micro-interações
- [x] Transição de página com framer-motion (AnimatePresence + layout animations)
- [x] Hover suave em cards (scale/translateY já feito em alguns)
- [x] Toast animado com entrada/saída (já feito com keyframes)
- [x] Skeleton loading em todas as páginas (já feito no mapa)
- [x] Feedback tátil em botões (:active scale 0.97 já aplicado)

## Fase 8: Performance
- [ ] Code splitting de rotas admin (já feito: AdminDashboard 14KB, AdminDashboardMetrics 412KB, SuperAdmin 2.5KB)
- [ ] Lazy load de componentes pesados (Leaflet, Recharts)
- [ ] Memoizar listas grandes (React.memo já feito nos markers)
- [ ] Otimizar bundle: tree-shake Phosphor icons (import named)
- [ ] Service worker com estratégia cache-first para assets estáticos
- [ ] Image lazy loading com placeholder blur

## Fase 9: Acessibilidade
- [ ] Adicionar `aria-label` em todos os botões de ícone
- [ ] Contraste de cor: verificar `--text-secondary` (#a1a1aa) em `--bg-primary` (#0d0d0f)
- [ ] Focus visible ring em todos os elementos interativos
- [ ] Skip-to-content link
- [ ] Roles semânticas nos modais (role="dialog", aria-modal)
- [ ] Mensagens de erro associadas a inputs via aria-describedby

## Fase 10: PWA e Offline
- [ ] Tela de fallback offline personalizada
- [ ] Cache de API responses para leitura offline
- [ ] Background sync para criar chamados offline
- [ ] Manifest com ícones em todos os tamanhos
- [ ] Splash screen personalizada

## Fase 11: Temas
- [ ] Estrutura de tokens para suportar tema claro (CSS custom properties + data-theme)
- [ ] Toggle light/dark no header
- [ ] Persistir preferência em localStorage
- [ ] Respeitar prefers-color-scheme do sistema

## Correções Imediatas (bugs)
- [x] Lint: instalar `globals` devDependency (ERR_MODULE_NOT_FOUND)
- [ ] Lint: 19 erros pré-existentes (postergado — set-state-in-effect, no-unused-vars, exhaustive-deps, purity)
- [x] `DB_HOST=127.0.0.1` setado no container backend (host networking)
- [x] nginx configurado com upstream `127.0.0.1:5000` + frontend montado de `./frontend/dist`
- [x] Usuário admin criado: `josemurilorodriguessabalo@gmail.com` / `admin123`

---
*Última atualização: 12/05/2026*
