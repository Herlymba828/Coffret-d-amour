# Schéma de base de données — Coffret d'Amour

> Schéma PostgreSQL complet dérivé du cahier des charges. Fichier SQL exécutable : [`schema.sql`](./schema.sql).

## Diagramme entité-relation

```
users ─────────────┬──────────────── albums
  │                │                    │
  │                ├──── media ─────────┘
  │                │
  │                ├──── memories
  │                │
  │                ├──── poems
  │                │
  │                ├──── messages ──── love_phrases
  │                │
  │                ├──── reminders
  │                │
  │                ├──── video_jobs
  │                │
  │                ├──── game_sessions (Phase 2)
  │                │
  │                └──── exports
  │
  └── couple_settings (config globale du binôme)
```

## Tables

### `users`

Comptes des 2 utilisateurs du couple.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | Identifiant unique |
| `display_name` | VARCHAR(100) | Prénom affiché |
| `avatar_url` | TEXT | Photo de profil (URL R2 signée persistée) |
| `role` | VARCHAR(20) | `owner` ou `partner` |
| `created_at` | TIMESTAMP | Date de création du compte |

### `couple_settings`

Configuration partagée du binôme (1 seule ligne).

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL PK | |
| `shared_code_hash` | VARCHAR(255) | Hash bcrypt du code partagé |
| `welcome_phrase` | TEXT | Phrase d'accueil après connexion |
| `relationship_start_date` | DATE | Date de rencontre |
| `anniversary_date` | DATE | Date anniversaire (page surprise) |
| `surprise_page_config` | JSONB | Texte, vidéo, animations page surprise |
| `midnight_message_template` | TEXT | Message auto envoyé à minuit |
| `theme_preference` | VARCHAR(20) | `light`, `dark`, `candle` |

### `albums`

Albums de la galerie média.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `title` | VARCHAR(200) | Nom de l'album |
| `year` | INTEGER | Année (optionnel) |
| `theme` | VARCHAR(100) | Thème (optionnel) |
| `cover_media_id` | UUID FK → media | Photo de couverture |
| `pinned_media_id` | UUID FK → media | Photo épinglée |
| `created_by` | UUID FK → users | |
| `created_at` | TIMESTAMP | |

### `media`

Photos, vidéos et fichiers audio.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `album_id` | UUID FK → albums | |
| `uploaded_by` | UUID FK → users | |
| `storage_key` | TEXT | Clé objet R2 |
| `mime_type` | VARCHAR(100) | |
| `filename` | VARCHAR(255) | Nom original |
| `caption` | TEXT | Légende modifiable |
| `width` | INTEGER | Pixels |
| `height` | INTEGER | Pixels |
| `duration_seconds` | INTEGER | Pour vidéos/audio |
| `thumbnail_key` | TEXT | Clé miniature R2 |
| `is_pinned` | BOOLEAN | Épinglé dans l'album |
| `created_at` | TIMESTAMP | |

### `memories`

Événements de la timeline « Nos souvenirs ».

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `title` | VARCHAR(200) | |
| `description` | TEXT | |
| `event_date` | DATE | Date du souvenir |
| `media_id` | UUID FK → media | Média associé (optionnel) |
| `is_pinned` | BOOLEAN | Épinglé en tête de timeline |
| `created_by` | UUID FK → users | |
| `created_at` | TIMESTAMP | |

### `poems`

Poèmes et messages générés.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `title` | VARCHAR(200) | |
| `content` | TEXT | Corps du poème |
| `template_id` | VARCHAR(50) | Template source (optionnel) |
| `keywords` | TEXT[] | Mots-clés utilisés pour « Surprendre » |
| `created_by` | UUID FK → users | |
| `shared_at` | TIMESTAMP | Date de partage au partenaire |
| `created_at` | TIMESTAMP | |

### `poem_templates`

Templates pré-remplis pour le générateur.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | VARCHAR(50) PK | ex. `anniversary`, `daily_love` |
| `title` | VARCHAR(200) | |
| `template_body` | TEXT | Avec placeholders `{{name}}`, `{{date}}` |
| `placeholders` | JSONB | Liste des champs personnalisables |

### `messages`

Messagerie secrète (socle MVP + extensions Phase 2/3).

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `sender_id` | UUID FK → users | |
| `receiver_id` | UUID FK → users | |
| `content` | TEXT | Corps du message |
| `type` | VARCHAR(20) | `text`, `voice`, `image`, `video`, `game_invite`, `ephemeral` |
| `media_url` | TEXT | URL signée pièce jointe |
| `is_ephemeral` | BOOLEAN | Message « voir une fois » |
| `expires_at` | TIMESTAMP | Expiration (éphémères, liens) |
| `is_read` | BOOLEAN | Statut lu (cœur qui se remplit) |
| `read_at` | TIMESTAMP | |
| `reaction_count` | INTEGER | Compteur cœurs (Phase 2) |
| `scheduled_at` | TIMESTAMP | Envoi différé (Phase 3) |
| `game_payload` | JSONB | Données énigme inline (Phase 2) |
| `created_at` | TIMESTAMP | |

### `love_phrases`

Phrases douces pré-enregistrées et personnalisables.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | SERIAL PK | |
| `content` | TEXT NOT NULL | |
| `created_by` | UUID FK → users | |
| `is_default` | BOOLEAN | Phrase système vs personnalisée |
| `created_at` | TIMESTAMP | |

### `reminders`

Rappels affectueux programmés.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `title` | VARCHAR(200) | |
| `message` | TEXT | Contenu de la notification |
| `trigger_type` | VARCHAR(30) | `fixed_date`, `daily_random`, `anniversary` |
| `trigger_config` | JSONB | Date, heure, cron, etc. |
| `target_user_id` | UUID FK → users | Destinataire |
| `is_active` | BOOLEAN | |
| `last_sent_at` | TIMESTAMP | |
| `created_by` | UUID FK → users | |

### `video_jobs`

Jobs de montage vidéo automatique (FFmpeg).

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `requested_by` | UUID FK → users | |
| `media_ids` | UUID[] | 5 à 15 médias source |
| `music_ambiance` | VARCHAR(30) | `romantic`, `upbeat`, `nostalgic` |
| `overlay_text` | TEXT | Texte incrusté |
| `status` | VARCHAR(20) | `pending`, `processing`, `completed`, `failed` |
| `output_key` | TEXT | Clé R2 du montage final |
| `duration_seconds` | INTEGER | 30-60 |
| `error_message` | TEXT | |
| `created_at` | TIMESTAMP | |
| `completed_at` | TIMESTAMP | |

### `exports`

Exports PDF et cartes A5.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `type` | VARCHAR(20) | `card_a5`, `photo_book` |
| `config` | JSONB | Album source, texte, mise en page |
| `requested_by` | UUID FK → users | |
| `output_key` | TEXT | Clé R2 du PDF généré |
| `status` | VARCHAR(20) | `pending`, `completed`, `failed` |
| `created_at` | TIMESTAMP | |

### `game_sessions` (Phase 2)

Sessions de mini-jeux.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `game_type` | VARCHAR(30) | `quiz`, `crossword`, `treasure_hunt`, `truth_dare`, `love_wheel` |
| `config` | JSONB | Mots-clés, questions, étapes |
| `state` | JSONB | Progression, score, réponses |
| `started_by` | UUID FK → users | |
| `status` | VARCHAR(20) | `in_progress`, `completed` |
| `reward_content` | TEXT | Poème/vidéo débloquée |
| `created_at` | TIMESTAMP | |
| `completed_at` | TIMESTAMP | |

### `push_subscriptions`

Tokens pour notifications push.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `platform` | VARCHAR(10) | `web`, `ios`, `android` |
| `token` | TEXT | FCM token ou Web Push endpoint |
| `keys` | JSONB | Clés Web Push (p256dh, auth) |
| `created_at` | TIMESTAMP | |

## Index recommandés

```sql
CREATE INDEX idx_messages_conversation ON messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages (receiver_id) WHERE is_read = FALSE;
CREATE INDEX idx_memories_date ON memories (event_date DESC);
CREATE INDEX idx_media_album ON media (album_id, created_at DESC);
CREATE INDEX idx_reminders_active ON reminders (is_active, trigger_type);
```

## Migrations

Les migrations seront gérées via un outil type **node-pg-migrate** ou **Prisma Migrate**, avec numérotation séquentielle :

```
migrations/
├── 001_initial_schema.sql
├── 002_add_game_sessions.sql      -- Phase 2
└── 003_add_scheduled_messages.sql -- Phase 3
```
