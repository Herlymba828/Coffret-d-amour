# Architecture système — Coffret d'Amour

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        Clients                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Web (React) │  │ Mobile (Expo)│  │ Page Surprise (SSR)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼─────────────────────┼──────────────┘
          │ HTTPS           │ HTTPS               │ HTTPS
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Vercel (Frontend)                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST + WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend API (Node.js + Express)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │   Auth   │ │  Media   │ │  Chat    │ │ Jobs (FFmpeg,    │   │
│  │  (JWT)   │ │ Service  │ │ Socket.IO│ │  PDF, rappels)   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└──────┬──────────────┬──────────────┬──────────────┬─────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────────┐  ┌─────────┐  ┌──────────────┐
│PostgreSQL│  │Cloudflare R2 │  │  Redis  │  │   Sentry     │
│(métadonnées)│ (médias)    │  │cache/jobs│  │  Logtail     │
└──────────┘  └──────────────┘  └─────────┘  └──────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Firebase Cloud Messaging / Web Push│
└──────────────────────────────────────┘
```

## 2. Principes architecturaux

| Principe | Application |
|----------|-------------|
| **Privé par design** | Exactement 2 comptes ; pas de registration publique |
| **Simplicité d'abord** | Socket.IO seul (sans cluster Redis) suffit pour 2 utilisateurs |
| **Médias hors DB** | Fichiers sur R2, métadonnées en PostgreSQL, accès via URL signées |
| **Jobs asynchrones** | Montage vidéo (FFmpeg) et génération PDF (Puppeteer) en arrière-plan |
| **Monorepo** | Apps web/mobile + packages partagés (types, UI, API client) |

## 3. Composants détaillés

### 3.1 Frontend Web (React + Vite)

- **Routing :** React Router — 5 onglets principaux (Galerie, Timeline, Poèmes, Outils, Chat)
- **État global :** Zustand ou React Context pour l'auth et le chat
- **Temps réel :** Client Socket.IO avec reconnexion automatique
- **PWA :** Service Worker pour Web Push et mode offline partiel (cache statique)

### 3.2 Frontend Mobile (React Native + Expo)

- Même logique métier que le web via le package `shared`
- Notifications push via Expo + Firebase Cloud Messaging
- Accès caméra/galerie natif pour upload média

### 3.3 Backend API (Node.js + Express)

| Module | Responsabilité |
|--------|----------------|
| `auth` | JWT, validation code partagé, phrase d'accueil |
| `users` | Profils des 2 utilisateurs, préférences |
| `media` | Upload vers R2, albums, légendes, photo épinglée |
| `memories` | Timeline, événements, fonction « Ce jour-là » |
| `poems` | Templates, génération aléatoire, partage |
| `videos` | Orchestration montage FFmpeg (job queue) |
| `reminders` | Notifications programmées (cron + Redis) |
| `exports` | Génération PDF/carte via Puppeteer |
| `chat` | Messages REST + temps réel Socket.IO |
| `games` | Quiz, mots croisés, chasse au trésor (Phase 2) |
| `surprise` | Page anniversaire, message minuit automatique |

### 3.4 Base de données

- **PostgreSQL :** source de vérité pour toutes les métadonnées
- **Redis :**
  - Cache sessions actives et statut « en train d'écrire »
  - File de jobs (Bull/BullMQ) pour FFmpeg, PDF, notifications différées
  - Pub/Sub optionnel si montée en charge (non prévue MVP)

### 3.5 Stockage médias (Cloudflare R2)

```
r2://coffret-amour/
├── photos/{user_id}/{uuid}.{ext}
├── videos/{user_id}/{uuid}.{ext}
├── voice/{user_id}/{uuid}.webm
├── exports/{uuid}.pdf
└── montages/{job_id}.mp4
```

Accès : URL signées avec expiration (15 min pour lecture, 1 h pour upload).

## 4. Flux de données clés

### 4.1 Authentification

```
Client → POST /auth/login { code, password }
       ← { accessToken, refreshToken, user, welcomePhrase }
Client stocke JWT (httpOnly cookie web / SecureStore mobile)
Requêtes suivantes : Authorization: Bearer <token>
```

### 4.2 Upload média

```
Client → POST /media/presign { filename, mimeType, albumId }
       ← { uploadUrl, mediaId }
Client → PUT uploadUrl (direct vers R2)
Client → POST /media/{mediaId}/confirm
Backend → crée entrée DB, génère thumbnail, notifie partenaire
```

### 4.3 Message chat temps réel

```
Client A → socket.emit('message:send', { content, type })
Backend  → INSERT messages, socket.to(partner).emit('message:new')
Backend  → envoie push notification si partenaire offline
Client B ← reçoit message < 1s (objectif)
```

### 4.4 Montage vidéo

```
Client → POST /videos/montage { mediaIds[], music, text }
Backend → crée job Redis, retourne jobId
Worker  → télécharge médias R2, FFmpeg montage 30-60s
Worker  → upload résultat R2, UPDATE job status
Client  ← socket.emit('video:ready', { url }) ou polling GET /videos/jobs/{id}
```

### 4.5 Message minuit (page surprise)

```
Cron (23:59:59) → vérifie date anniversaire configurée
               → INSERT message programmé dans chat
               → envoie push « Quelque chose t'attend… »
Partenaire ouvre page surprise → animations → bouton entrée coffret
```

## 5. Sécurité

| Mesure | Implémentation |
|--------|----------------|
| Authentification | JWT (access 15 min, refresh 7 j) + code partagé |
| Autorisation | Middleware vérifiant que l'utilisateur est l'un des 2 comptes autorisés |
| Médias | URL signées R2, jamais d'accès public direct |
| HTTPS/WSS | Obligatoire en production |
| Rate limiting | Express-rate-limit sur endpoints sensibles |
| Données sensibles | Pas de logs de contenu messages/médias |
| E2EE (Phase 3) | Signal Protocol pour messages sensibles — hors scope MVP |

## 6. Monitoring et observabilité

- **Sentry :** erreurs frontend + backend, breadcrumbs sur actions critiques
- **Logtail :** logs structurés (JSON), corrélation par `requestId`
- **Health checks :** `GET /health` (DB, Redis, R2 connectivity)

## 7. Évolutions prévues

| Phase | Évolution architecturale |
|-------|--------------------------|
| Phase 2 | Module games, messages vocaux, mode Bulle d'amour (WebGL/CSS) |
| Phase 3 | Signal Protocol E2EE, liens temporaires sans auth, intégration CEWE |
| Scale (hypothétique) | socket.io-redis adapter, read replicas PostgreSQL |

## 8. Décisions techniques (ADR résumées)

| Décision | Choix | Justification |
|----------|-------|---------------|
| Temps réel | Socket.IO | Fallback long-polling, écosystème mature, 2 users = pas besoin de cluster |
| Stockage | Cloudflare R2 | Compatible S3, pas de frais egress vers Cloudflare |
| Monorepo | npm workspaces | Partage types/UI entre web et mobile |
| PDF | Puppeteer | Rendu fidèle au design web pour exports |
| Vidéo | FFmpeg server-side | Contrôle transitions/musique, pas de dépendance client |
