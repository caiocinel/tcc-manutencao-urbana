# Central de Inteligência Urbana — App Mobile (Expo)

App universal (iOS, Android e web) do TCC, escrito em **Expo SDK 57 +
React Native 0.86 + Expo Router**. Consome a **mesma API Django** do frontend
web.

O frontend web (`../frontend`, React 19 + Vite) continua sendo a versão de
produção em [tcc.josemurilors.com.br](https://tcc.josemurilors.com.br). Este
app é um cliente adicional, não um substituto.

## Índice

- [Requisitos](#requisitos)
- [Rodando](#rodando)
- [Configuração](#configuração)
- [Suporte a web](#suporte-a-web)
- [Estrutura](#estrutura)
- [Equivalência com o frontend web](#equivalência-com-o-frontend-web)
- [Decisões de porte](#decisões-de-porte)
- [Limitações conhecidas](#limitações-conhecidas)
- [Build de produção](#build-de-produção)

## Requisitos

- Node.js ≥ 20
- App **Expo Go** no celular, ou emulador Android / simulador iOS
- Backend rodando (ver `../README.md`) ou apontar para a API de produção

## Rodando

```bash
cd mobile
npm install
npm start                 # abre o Metro; leia o QR code com o Expo Go
```

Atalhos:

```bash
npm run android    # abre no emulador/dispositivo Android
npm run ios        # abre no simulador iOS (requer macOS)
npm run web        # abre no navegador (http://localhost:8081)
npm run lint       # ESLint (eslint-config-expo)
npm run typecheck  # tsc --noEmit
```

O app roda nas três plataformas: iOS, Android e web.

## Configuração

**Em desenvolvimento você não precisa configurar nada.** O app deriva a base da
API do host que serve o Metro e usa a porta 8000:

| Onde você abre        | `hostUri` / origem   | API resolvida                |
| --------------------- | -------------------- | ---------------------------- |
| Navegador (`--web`)   | `localhost:8081`     | `http://localhost:8000`      |
| Expo Go no celular    | `192.168.x.x:8081`   | `http://192.168.x.x:8000`    |
| Build de produção     | —                    | `https://tcc.josemurilors.com.br` |

Isso evita ter que reeditar o `.env` toda vez que o IP do DHCP muda. Veja
`resolverApiUrl()` em `src/services/api.ts`.

Variáveis opcionais (ver `.env.example`):

| Variável                      | Efeito                                          |
| ----------------------------- | ----------------------------------------------- |
| `EXPO_PUBLIC_API_URL`         | Força um destino fixo (vence sobre tudo)        |
| `EXPO_PUBLIC_API_PORT`        | Porta do backend local (padrão `8000`)          |
| `GOOGLE_MAPS_API_KEY_ANDROID` | Só em build nativo Android                      |
| `GOOGLE_MAPS_API_KEY_IOS`     | Não necessária (iOS usa Apple Maps)             |

`app.config.js` só adiciona o plugin do `react-native-maps` quando alguma
chave está definida — por isso o app roda no Expo Go sem nenhuma chave.

### Backend: CORS e ALLOWED_HOSTS

Duas variáveis no `.env` da raiz controlam quem consegue falar com o Django.
Ambas precisam do endereço que você usa para abrir o app:

| Variável        | O que libera                          |
| --------------- | ------------------------------------- |
| `FRONTEND_URL`  | A **origem** do navegador (CORS)       |
| `ALLOWED_HOSTS` | O **host** do backend (`Host:` header) |

Abrindo em `http://localhost:8081`, o padrão já basta. Abrindo de outro
aparelho na rede (ou pelo IP da máquina), adicione esse IP nas duas:

```
FRONTEND_URL=http://localhost:5173,http://localhost:8081,http://192.168.1.3:8081
ALLOWED_HOSTS=localhost,backend,192.168.1.3
```

Faltando a primeira, o navegador acusa `Failed to fetch` (a resposta vem sem
`Access-Control-Allow-Origin`). Faltando a segunda, o Django devolve
`400 Bad Request` antes mesmo de olhar a rota.

Depois de alterar o `.env`, **recrie o container** — variáveis de ambiente são
fixadas na criação, então `restart` não resolve:

```bash
docker compose -f docker-compose.dev.yml up -d backend
```

Para conferir sem abrir o navegador:

```bash
curl -i -H "Origin: http://192.168.1.3:8081" http://192.168.1.3:8000/api/v1/defeitos/
```

> O IP da LAN é do DHCP e pode mudar. Se o app parar de conectar de um dia para
> o outro, confira o IP atual (`ipconfig` / `ip addr`) e atualize as duas
> variáveis — ou reserve um IP fixo no roteador.

Nada disso afeta o app **nativo**: Expo Go não passa por CORS, mas continua
precisando do IP em `ALLOWED_HOSTS`.

## Estrutura

```
mobile/
├── app.config.js          # configuração do Expo (plugins, permissões, ícones)
├── src/
│   ├── app/               # rotas (Expo Router, file-based)
│   │   ├── _layout.tsx    # providers + Stack raiz
│   │   ├── index.tsx      # redireciona para o mapa
│   │   ├── login.tsx
│   │   ├── registro.tsx
│   │   ├── novo.tsx       # novo chamado (modal)
│   │   ├── admin/usuarios.tsx
│   │   └── (tabs)/        # mapa · chamados · painel · conta
│   ├── components/        # UI compartilhada (charts, sheet, header, ui/*)
│   │   ├── map-surface.tsx      # mapa nativo (react-native-maps)
│   │   ├── map-surface.web.tsx  # mapa web (Leaflet)
│   │   └── map-surface.types.ts # contrato comum às duas
│   ├── constants/         # tokens de tema, status, estilo do mapa
│   ├── context/           # auth, tema, toasts
│   ├── hooks/             # sincronização offline
│   ├── services/          # api, storage, fila offline
│   └── utils/             # geo, heatmap, formatação, jwt, imagens
└── assets/images/         # ícone, splash, favicon
```

## Equivalência com o frontend web

| Web (`frontend/src`)         | Mobile (`mobile/src`)                | Observação                                            |
| ---------------------------- | ------------------------------------ | ----------------------------------------------------- |
| `pages/MapPage.jsx`          | `app/(tabs)/mapa.tsx` + `app/novo.tsx` | Formulário de criação virou tela modal                |
| `pages/DefectList.jsx`       | `app/(tabs)/chamados.tsx`            | Tabela → cartões; seleção em lote por toque longo     |
| `pages/AdminDashboardMetrics.jsx` | `app/(tabs)/painel.tsx`         | Recharts → `components/charts.tsx` (react-native-svg) |
| `pages/SuperAdmin.jsx`       | `app/admin/usuarios.tsx`             | —                                                     |
| `pages/ProfileSettings.jsx`  | `app/(tabs)/conta.tsx`               | Somada ao menu do `UserDropdown`                      |
| `pages/Login/Register.jsx`   | `app/login.tsx` / `app/registro.tsx` | Inclui o modo demonstração                            |
| `context/AuthContext.jsx`    | `context/auth-context.tsx`           | SecureStore no lugar do localStorage                  |
| `context/ThemeContext.jsx`   | `context/theme-context.tsx`          | —                                                     |
| `components/Toast.jsx`       | `context/toast-context.tsx`          | —                                                     |
| `services/api.js`            | `services/api.ts`                    | Mesmos endpoints, tipado                              |
| `hooks/useOfflineSync.js`    | `hooks/use-offline-sync.ts`          | AsyncStorage no lugar do IndexedDB                    |
| `styles/tokens.css`          | `constants/theme.ts`                 | Mesmos valores de cor/espaçamento                     |
| `pages/Landing.jsx`          | —                                    | Página de marketing; não faz sentido no app           |
| `pages/Settings/GeneralSettings.jsx` | —                            | Eram stubs "em desenvolvimento" no web                |

Funcionalidades portadas: mapa com perímetro municipal e máscara, mapa de
calor, filtros (todos/pendentes/atendidos/meus), "Perto de Mim" com raio
ajustável, criação de chamado com foto e GPS, detalhe com histórico e imagens,
apoio (upvote), anexos, atender/responder/finalizar, alteração de status em
lote, geração de Ordem de Serviço em PDF, painel de métricas completo, gestão
de usuários, verificação de e-mail, troca de senha e município, tema
claro/escuro, modo demonstração e fila offline.

## Suporte a web

`npm run web` roda o app no navegador. A única peça que não é universal é o
mapa: `react-native-maps` chama `codegenNativeComponent`, que não existe no
react-native-web e derruba o bundle inteiro.

A solução é uma superfície de mapa com duas implementações, escolhidas pelo
Metro através da extensão do arquivo:

| Arquivo                 | Plataforma | Biblioteca         |
| ----------------------- | ---------- | ------------------ |
| `map-surface.tsx`       | iOS/Android| react-native-maps  |
| `map-surface.web.tsx`   | web        | Leaflet + react-leaflet (mesmos tiles CartoDB do frontend Vite) |
| `map-surface.types.ts`  | —          | contrato comum     |

A tela (`app/(tabs)/mapa.tsx`) importa só `@/components/map-surface` e não
sabe qual das duas está em uso — toda a lógica de filtros, heatmap e perímetro
é compartilhada.

O `web.output` é `single` (SPA), não `static`: a pré-renderização no servidor
executaria o Leaflet no Node, onde não há `window`.

## Decisões de porte

- **Mapa:** `react-native-maps` no nativo (Apple Maps no iOS, Google Maps no
  Android; funciona no Expo Go sem chave de API) e Leaflet no web — ver
  [Suporte a web](#suporte-a-web).
- **Mapa de calor:** o `Heatmap` do `react-native-maps` só existe no provider
  Google. Para funcionar nas duas plataformas, `utils/heatmap.ts` agrupa os
  chamados numa grade e desenha um círculo translúcido por célula, com raio e
  cor proporcionais à densidade — a mesma leitura visual do `leaflet.heat`.
- **Máscara fora do município:** o `holes` do `Polygon` substitui o truque de
  `fill-rule: evenodd` que o web usa no Leaflet.
- **Gráficos:** Recharts depende do DOM. Pizza, barras (verticais e
  horizontais) e linha foram redesenhados com `react-native-svg`.
- **Armazenamento:** tokens no **SecureStore** (keychain/keystore) — mais
  seguro que o `localStorage` do web; perfil, tema e fila offline no
  AsyncStorage.
- **Offline:** sem service worker, a fila é drenada quando o app volta ao
  primeiro plano ou quando a conexão retorna (`expo-network`).
- **JWT:** o React Native não expõe `atob`, então `utils/jwt.ts` decodifica o
  payload base64url por conta própria.
- **Ordem de Serviço:** o PDF é baixado para o cache e aberto na folha de
  compartilhamento do sistema, no lugar do download do navegador.
- **Municípios:** o web precisava do `@tanstack/react-virtual` para os ~5.500
  municípios; a `FlatList` já é virtualizada.

## Limitações conhecidas

- **Notificações push não estão implementadas.** O backend usa Web Push
  (VAPID), que é uma API de navegador e não funciona em app nativo. Habilitar
  push aqui exigiria adicionar FCM/APNs ao backend e usar
  `expo-notifications` — está fora do escopo desta entrega.
- **Foto de perfil** segue apenas como inicial do nome, como no web (o backend
  ainda não expõe upload de avatar).
- **2FA e exclusão de conta** continuam como "em desenvolvimento", igual ao web.
- O **web** aqui é para desenvolvimento e demonstração. Quem está em produção
  em `tcc.josemurilors.com.br` continua sendo o frontend Vite (`../frontend`),
  que tem PWA, service worker e Web Push — coisas que este app não replica.

## Build de produção

```bash
npm install -g eas-cli
eas login
eas build:configure

# Android (defina GOOGLE_MAPS_API_KEY_ANDROID antes)
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```
