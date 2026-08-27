# Guide de déploiement — Coffret d'Amour

## 1. Environnements

| Environnement | Frontend | Backend | Usage |
|---------------|----------|---------|-------|
| **Development** | `localhost:5173` | `localhost:3001` | Développement local |
| **Staging** | `staging.coffret-amour.vercel.app` | `api-staging.railway.app` | Tests pré-lancement |
| **Production** | `coffret-amour.vercel.app` (ou domaine perso) | `api.coffret-amour.railway.app` | Remise du cadeau |

---

## 2. Prérequis services tiers

### Cloudflare R2

1. Créer un bucket `coffret-amour`
2. Générer des clés API (R2 → Manage R2 API Tokens)
3. Configurer CORS pour les domaines frontend :

```json
[
  {
    "AllowedOrigins": ["https://coffret-amour.vercel.app", "http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### PostgreSQL

- **Railway** : provisionner PostgreSQL, récupérer `DATABASE_URL`
- Appliquer le schéma : `psql $DATABASE_URL -f docs/schema.sql`

### Redis

- **Railway** ou **Upstash** (serverless Redis)
- URL format : `redis://default:password@host:port`

### Firebase (notifications push)

1. Créer projet Firebase
2. Activer Cloud Messaging
3. Télécharger `google-services.json` (Android) et config iOS
4. Générer clé serveur FCM pour le backend
5. Générer clés VAPID pour Web Push

### Sentry

1. Créer projet Node.js + React
2. Récupérer DSN pour chaque environnement

---

## 3. Déploiement Frontend (Vercel)

### Configuration

```json
// vercel.json (apps/web)
{
  "buildCommand": "npm run build --workspace=apps/web",
  "outputDirectory": "apps/web/dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Variables d'environnement Vercel

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL backend production |
| `VITE_WS_URL` | URL WebSocket (wss://) |
| `VITE_SENTRY_DSN` | DSN Sentry frontend |
| `VITE_VAPID_PUBLIC_KEY` | Clé publique Web Push |

### Domaine personnalisé (optionnel)

Configurer un domaine type `notre-coffret.example.com` dans Vercel → Domains.

---

## 4. Déploiement Backend (Railway / Fly.io)

### Railway

1. Connecter le repo GitHub
2. Service `api` : root directory `packages/api`
3. Build : `npm install && npm run build`
4. Start : `npm run start`
5. Ajouter plugins PostgreSQL + Redis

### Dockerfile (alternative Fly.io)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared
RUN npm ci --workspace=packages/api
RUN npm run build --workspace=packages/api
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace=packages/api"]
```

### Variables d'environnement backend

Voir [`.env.example`](../.env.example) pour la liste complète.

Points critiques :
- `JWT_SECRET` : chaîne aléatoire ≥ 32 caractères
- `CORS_ORIGIN` : URL frontend exacte
- `NODE_ENV=production`

---

## 5. CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Deploy to staging via Railway/Vercel CLI

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Deploy to production
```

---

## 6. HTTPS et WebSocket

- Vercel et Railway fournissent HTTPS automatiquement
- Socket.IO doit utiliser `wss://` en production
- Vérifier que le proxy Railway/Fly.io supporte les WebSocket upgrades

Test de connectivité :
```bash
curl -I https://api.coffret-amour.example.com/health
wscat -c wss://api.coffret-amour.example.com/chat
```

---

## 7. Workers (FFmpeg, PDF)

Les jobs lourds tournent dans le même process backend au MVP, ou dans un worker séparé :

### Option A — Même process (MVP)

Bull/BullMQ queue dans Redis, worker intégré au serveur Express.

### Option B — Worker dédié (recommandé prod)

Service Railway séparé `worker` avec FFmpeg installé :

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache ffmpeg chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# ...
```

---

## 8. Cron jobs

| Job | Fréquence | Action |
|-----|-----------|--------|
| Rappels quotidiens | Toutes les minutes | Vérifier reminders actifs |
| Message minuit anniversaire | 23:59:59 le jour J | Insérer message surprise |
| Nettoyage éphémères | Toutes les 5 min | Supprimer messages expirés |
| Nettoyage URL signées | — | Géré par expiration R2 |

Implémentation : `node-cron` dans le backend ou Railway Cron.

---

## 9. Monitoring post-déploiement

### Sentry

- Activer performance monitoring (traces)
- Alertes email sur erreurs critiques
- Source maps uploadées via CI

### Logtail

- Logs JSON structurés : `{ level, message, requestId, userId, duration }`
- Dashboard : erreurs 5xx, latence API, jobs FFmpeg

### Health check externe

Configurer un ping (UptimeRobot, Better Stack) sur `GET /health` toutes les 5 min.

---

## 10. Checklist remise du cadeau

- [ ] HTTPS actif sur frontend et backend
- [ ] WSS fonctionnel (chat temps réel)
- [ ] 2 comptes créés et testés
- [ ] Code partagé + mot de passe configurés
- [ ] Phrase d'accueil personnalisée
- [ ] Page surprise configurée avec date anniversaire
- [ ] Message minuit programmé
- [ ] Notifications push testées (foreground + background)
- [ ] Au moins 1 album avec photos pré-remplies
- [ ] Au moins 1 poème et 1 souvenir dans la timeline
- [ ] Export PDF testé
- [ ] Performance : connexion < 10s, message chat < 1s
- [ ] Sauvegarde DB planifiée (Railway backup ou pg_dump cron)

---

## 11. Sauvegarde et restauration

### Backup PostgreSQL

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

Automatiser via Railway backups ou cron hebdomadaire.

### Backup R2

Activer versioning sur le bucket ou réplication vers un second bucket.

### Restauration

```bash
psql $DATABASE_URL < backup_20260713.sql
```

Les clés R2 restent valides si le bucket n'a pas été vidé.
