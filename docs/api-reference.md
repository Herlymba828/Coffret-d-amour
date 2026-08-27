# Référence API — Coffret d'Amour

Base URL : `https://api.coffret-amour.example.com/v1`

Authentification : `Authorization: Bearer <access_token>` (sauf endpoints publics).

---

## Authentification

### `POST /auth/login`

Connexion via code partagé et mot de passe.

**Body :**
```json
{
  "sharedCode": "14-02-2020-Marie",
  "password": "notre-secret"
}
```

**Réponse 200 :**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "displayName": "Marie",
    "role": "partner",
    "avatarUrl": "https://..."
  },
  "welcomePhrase": "Bienvenue dans notre coffret, mon amour…"
}
```

### `POST /auth/refresh`

Renouvellement du token d'accès.

**Body :** `{ "refreshToken": "eyJ..." }`

### `POST /auth/logout`

Invalidation du refresh token.

---

## Utilisateurs

### `GET /users/me`

Profil de l'utilisateur connecté.

### `PATCH /users/me`

Mise à jour profil (displayName, avatarUrl).

### `GET /users/partner`

Profil du partenaire (nom, avatar, statut en ligne).

---

## Galerie — Albums

### `GET /albums`

Liste des albums (tri par année/thème).

**Query :** `?year=2024&theme=vacances`

### `POST /albums`

Création d'un album.

**Body :** `{ "title": "Été 2024", "year": 2024, "theme": "vacances" }`

### `GET /albums/:id`

Détail album avec médias (pagination).

### `PATCH /albums/:id`

Modification titre, photo épinglée.

### `DELETE /albums/:id`

Suppression album (médias conservés ou supprimés selon paramètre).

---

## Galerie — Médias

### `POST /media/presign`

Obtenir une URL d'upload signée vers R2.

**Body :**
```json
{
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "albumId": "uuid"
}
```

**Réponse :**
```json
{
  "mediaId": "uuid",
  "uploadUrl": "https://r2.../presigned",
  "expiresIn": 3600
}
```

### `POST /media/:id/confirm`

Confirmer l'upload terminé (déclenche génération thumbnail).

### `GET /media/:id`

Métadonnées + URL de lecture signée.

### `PATCH /media/:id`

Modifier légende, épingler.

### `DELETE /media/:id`

Suppression média (objet R2 + entrée DB).

### `GET /media/:id/slideshow`

URLs signées pour diaporama d'un album.

---

## Timeline — Souvenirs

### `GET /memories`

Liste chronologique inversée.

**Query :** `?limit=20&offset=0&pinnedFirst=true`

### `GET /memories/on-this-day`

Fonction « Ce jour-là » — souvenirs à la date du jour (toutes années).

### `POST /memories`

Création d'un souvenir.

**Body :**
```json
{
  "title": "Notre premier voyage",
  "description": "Rome, sous la pluie…",
  "eventDate": "2022-06-15",
  "mediaId": "uuid"
}
```

### `PATCH /memories/:id`

Modification + épingler/désépingler.

### `DELETE /memories/:id`

---

## Poèmes

### `GET /poems/templates`

Liste des templates disponibles.

### `POST /poems/generate`

Génération à partir d'un template ou mode « Surprendre ».

**Body :**
```json
{
  "templateId": "anniversary",
  "fields": { "years": "3", "memory": "Notre balade à Rome" }
}
```

**Mode Surprendre :**
```json
{
  "surprise": true,
  "keywords": ["Rome", "pluie", "bisou"]
}
```

### `GET /poems`

Liste des poèmes créés.

### `POST /poems/:id/share`

Partage au partenaire (notification push).

### `DELETE /poems/:id`

---

## Montage vidéo

### `POST /videos/montage`

Lancer un montage automatique.

**Body :**
```json
{
  "mediaIds": ["uuid1", "uuid2", "..."],
  "musicAmbiance": "romantic",
  "overlayText": "Notre histoire"
}
```

**Réponse :** `{ "jobId": "uuid", "status": "pending" }`

### `GET /videos/jobs/:id`

Statut du job + URL du montage si terminé.

---

## Rappels affectueux

### `GET /reminders`

Liste des rappels actifs.

### `POST /reminders`

Création d'un rappel.

**Body :**
```json
{
  "title": "Message du matin",
  "message": "Bonne journée mon cœur 💕",
  "triggerType": "daily_random",
  "triggerConfig": { "hourRange": [7, 9] },
  "targetUserId": "uuid"
}
```

### `PATCH /reminders/:id`

### `DELETE /reminders/:id`

---

## Exports

### `POST /exports/card`

Génération carte A5 personnalisable.

**Body :**
```json
{
  "title": "Pour toi",
  "poemId": "uuid",
  "backgroundMediaId": "uuid"
}
```

### `POST /exports/photo-book`

Génération PDF livre photo à partir d'un album.

**Body :** `{ "albumId": "uuid", "layout": "grid" }`

### `GET /exports/:id`

Statut + URL de téléchargement du PDF.

---

## Page surprise

### `GET /surprise`

Configuration page anniversaire (public avec token spécial ou auth).

### `PATCH /surprise`

Mise à jour config (owner only).

**Body :**
```json
{
  "headlineText": "Joyeux anniversaire mon amour",
  "featuredPoemId": "uuid",
  "videoUrl": "...",
  "animations": ["hearts", "petals"]
}
```

---

## Messagerie — REST

### `GET /chat/messages`

Historique des messages (pagination cursor-based).

**Query :** `?before=<messageId>&limit=50`

### `POST /chat/messages`

Envoi d'un message (alternative REST au WebSocket).

**Body :**
```json
{
  "content": "Tu me manques…",
  "type": "text"
}
```

**Avec pièce jointe :**
```json
{
  "type": "image",
  "mediaId": "uuid-from-gallery"
}
```

**Message éphémère (Phase 2) :**
```json
{
  "content": "Un secret…",
  "type": "ephemeral",
  "isEphemeral": true
}
```

### `PATCH /chat/messages/:id/read`

Marquer comme lu.

### `DELETE /chat/messages/:id`

Suppression (messages éphémères après lecture).

### `GET /chat/phrases`

Phrases douces disponibles.

### `POST /chat/phrases`

Ajouter une phrase personnalisée.

### `POST /chat/messages/:id/react`

Réaction cœur (Phase 2) — double-clic.

---

## Mini-jeux (Phase 2)

### `POST /games`

Créer une session de jeu.

**Body :**
```json
{
  "gameType": "quiz",
  "config": {
    "questions": [...],
    "keywords": ["Marie", "Rome"]
  }
}
```

### `GET /games/:id`

État de la session.

### `POST /games/:id/answer`

Soumettre une réponse.

### `POST /games/:id/complete`

Terminer et débloquer la récompense.

---

## Notifications push

### `POST /push/subscribe`

Enregistrer un token push.

**Body (Web Push) :**
```json
{
  "platform": "web",
  "token": "endpoint-url",
  "keys": { "p256dh": "...", "auth": "..." }
}
```

### `DELETE /push/subscribe`

Désinscription.

---

## Santé

### `GET /health`

```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "storage": "connected"
}
```

---

## Événements WebSocket (Socket.IO)

Namespace : `/chat`

### Client → Serveur

| Événement | Payload | Description |
|-----------|---------|-------------|
| `message:send` | `{ content, type, mediaId?, isEphemeral? }` | Envoi message |
| `message:read` | `{ messageId }` | Accusé de lecture |
| `message:react` | `{ messageId }` | Réaction cœur |
| `typing:start` | `{}` | Début de frappe |
| `typing:stop` | `{}` | Fin de frappe |
| `presence:online` | `{}` | Signalement présence |

### Serveur → Client

| Événement | Payload | Description |
|-----------|---------|-------------|
| `message:new` | `{ id, senderId, content, type, createdAt }` | Nouveau message |
| `message:read` | `{ messageId, readAt }` | Message lu par partenaire |
| `message:react` | `{ messageId, reactionCount }` | Réaction reçue |
| `typing:update` | `{ userId, isTyping }` | Partenaire en train d'écrire |
| `presence:update` | `{ userId, status }` | online / offline |
| `video:ready` | `{ jobId, url }` | Montage vidéo terminé |
| `notification:affection` | `{ title, body }` | Rappel affectueux |

### Connexion

```javascript
const socket = io('wss://api.coffret-amour.example.com/chat', {
  auth: { token: accessToken },
  transports: ['websocket', 'polling']
});
```

---

## Codes d'erreur

| Code HTTP | Signification |
|-----------|---------------|
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Accès interdit (pas l'un des 2 comptes) |
| 404 | Ressource introuvable |
| 409 | Conflit (ex. job déjà en cours) |
| 413 | Fichier trop volumineux |
| 429 | Rate limit dépassé |
| 500 | Erreur serveur |

Format erreur :
```json
{
  "error": {
    "code": "INVALID_MEDIA_COUNT",
    "message": "Le montage nécessite entre 5 et 15 médias"
  }
}
```
