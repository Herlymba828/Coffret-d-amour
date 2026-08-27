# Guide de développement — Coffret d'Amour

## 1. Prérequis

| Outil | Version minimale |
|-------|-------------------|
| Node.js | 20 LTS |
| npm | 10+ |
| Docker | 24+ (PostgreSQL + Redis locaux) |
| Git | 2.40+ |
| FFmpeg | 6+ (pour tests montage vidéo) |

Optionnel :
- Expo CLI (développement mobile)
- Chrome/Chromium (Puppeteer pour exports PDF)

---

## 2. Setup initial

```bash
# Cloner le dépôt
git clone <repo-url> coffret-amour
cd coffret-amour

# Installer les dépendances (monorepo)
npm install

# Copier et configurer l'environnement
cp .env.example .env

# Démarrer PostgreSQL et Redis
docker compose up -d

# Appliquer le schéma et les seeds
npm run db:migrate
npm run db:seed

# Lancer le développement (front + back)
npm run dev
```

Services locaux :
- Frontend : http://localhost:5173
- Backend API : http://localhost:3001
- WebSocket : ws://localhost:3001/chat

---

## 3. Structure monorepo

```
coffret-amour/
├── apps/
│   ├── web/                    # React + Vite + Tailwind
│   │   ├── src/
│   │   │   ├── components/     # Composants UI
│   │   │   ├── pages/          # Pages par onglet
│   │   │   ├── hooks/          # useChat, useAuth, etc.
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── lib/            # API client, socket
│   │   │   └── styles/         # Tailwind + globals
│   │   └── package.json
│   └── mobile/                 # React Native Expo
│       └── ...
├── packages/
│   ├── api/                    # Backend Express
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers
│   │   │   ├── services/       # Logique métier
│   │   │   ├── middleware/     # Auth, error handler
│   │   │   ├── socket/         # Socket.IO handlers
│   │   │   ├── jobs/           # FFmpeg, PDF workers
│   │   │   └── db/             # Queries, migrations
│   │   └── package.json
│   ├── shared/                 # Types TypeScript partagés
│   │   ├── src/types/
│   │   └── src/constants/
│   └── ui/                     # Composants partagés web/mobile
├── docs/                       # Documentation
├── scripts/                    # Utilitaires CLI
├── docker-compose.yml
├── .env.example
└── package.json                # Workspaces root
```

---

## 4. Scripts npm (root)

| Script | Description |
|--------|-------------|
| `npm run dev` | Lance web + api en parallèle |
| `npm run dev:web` | Frontend seul |
| `npm run dev:api` | Backend seul |
| `npm run build` | Build production tous packages |
| `npm run test` | Tests unitaires + intégration |
| `npm run lint` | ESLint + Prettier |
| `npm run db:migrate` | Applique migrations |
| `npm run db:seed` | Insère données initiales |
| `npm run db:reset` | Drop + migrate + seed |

---

## 5. Conventions de code

### TypeScript

- Strict mode activé
- Types partagés dans `packages/shared`
- Pas de `any` sauf cas documenté

### Nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Fichiers composants | PascalCase | `MessageBubble.tsx` |
| Fichiers utils/hooks | camelCase | `useChat.ts` |
| Routes API | kebab-case | `/chat/messages` |
| Tables DB | snake_case | `love_phrases` |
| Variables env | SCREAMING_SNAKE | `JWT_SECRET` |

### Commits

Format [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat(chat): add ephemeral message auto-delete
fix(gallery): correct mosaic layout on mobile
docs: update API reference for games endpoints
```

### Branches

- `main` — production
- `develop` — intégration
- `feat/xxx`, `fix/xxx` — features et corrections

---

## 6. Docker Compose (dev)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: coffret_amour
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  miniodata:
```

MinIO simule Cloudflare R2 en local (API compatible S3).

---

## 7. Tests

### Structure

```
packages/api/src/__tests__/
├── auth.test.ts
├── media.test.ts
├── chat.test.ts
└── integration/
    └── message-flow.test.ts

apps/web/src/__tests__/
├── components/
└── hooks/
```

### Lancer les tests

```bash
# Tous les tests
npm run test

# Backend seul
npm run test --workspace=packages/api

# Avec couverture
npm run test:coverage

# E2E (Playwright, optionnel)
npm run test:e2e
```

### Objectifs couverture (MVP)

| Module | Cible |
|--------|-------|
| Auth | 90% |
| Chat (REST + socket) | 85% |
| Media upload | 80% |
| Frontend hooks critiques | 70% |

---

## 8. Développement par feature

### Workflow recommandé

1. Créer branche `feat/nom-feature`
2. Ajouter types dans `packages/shared`
3. Implémenter service backend + routes
4. Ajouter tests API
5. Implémenter UI web
6. Tester manuellement + ajuster
7. PR vers `develop`

### Ordre de développement (MVP)

1. Auth + couple_settings
2. Galerie (albums, upload R2/MinIO)
3. Timeline souvenirs
4. Chat socle (REST puis Socket.IO)
5. Poèmes + templates
6. Exports PDF
7. Rappels + push notifications
8. Montage vidéo
9. Page surprise

---

## 9. Debugging

### Backend

```bash
# Logs détaillés
DEBUG=coffret:* npm run dev:api

# Inspecter Redis
docker exec -it coffret-amour-redis-1 redis-cli
> KEYS *
> LRANGE bull:video-montage:wait 0 -1
```

### WebSocket

Utiliser l'extension Chrome « Socket.IO DevTools » ou :

```javascript
// Dans la console browser
socket.onAny((event, ...args) => console.log(event, args));
```

### FFmpeg local

```bash
ffmpeg -version
# Test montage manuel
ffmpeg -i photo1.jpg -i photo2.jpg -filter_complex ... output.mp4
```

---

## 10. Données de test (seed)

Le seed crée :
- 2 utilisateurs : « Toi » (owner) et « Marie » (partner)
- Code partagé : `14-02-2020-Marie` / mot de passe : `notre-coffret`
- 3 albums avec photos placeholder
- 5 souvenirs timeline
- 5 phrases douces
- 3 templates poèmes

```bash
npm run db:seed
```

---

## 11. Ressources

| Ressource | Lien |
|-----------|------|
| Cahier des charges | [`Cahier_des_charges_Coffret_Amour (1).md`](../Cahier_des_charges_Coffret_Amour%20(1).md) |
| Architecture | [`docs/architecture.md`](./architecture.md) |
| API | [`docs/api-reference.md`](./api-reference.md) |
| Design system | [`docs/design-system.md`](./design-system.md) |
| Schéma DB | [`docs/schema.sql`](./schema.sql) |
