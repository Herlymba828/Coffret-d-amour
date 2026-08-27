# Coffret d'Amour

Application web/mobile privée à deux utilisateurs — un écrin numérique pour conserver les souvenirs, organiser le quotidien à deux et créer du lien via des mini-jeux et une messagerie dédiée.

> **Statut :** en conception — documentation générée à partir du [cahier des charges](./Cahier_des_charges_Coffret_Amour%20(1).md) (v1.0, 13 juillet 2026).

---

## Vision

Un coffret numérique privé, sécurisé et vivant, qui grandit avec l'histoire du couple.

## Fonctionnalités principales

| Domaine | Description |
|---------|-------------|
| **Mémoire affective** | Galerie média, timeline « Nos souvenirs », montage vidéo automatique |
| **Création** | Générateur de poèmes, exports PDF/carte A5 |
| **Quotidien** | Rappels affectueux, outils partagés (Phase 3) |
| **Lien** | Messagerie temps réel, mini-jeux romantiques, page surprise d'anniversaire |

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend Web | React + Vite + Tailwind CSS |
| Frontend Mobile | React Native (Expo) |
| Backend | Node.js + Express |
| Base de données | PostgreSQL + Redis |
| Stockage médias | Cloudflare R2 |
| Temps réel | Socket.IO |
| Notifications | Firebase Cloud Messaging + Web Push |
| CI/CD | GitHub Actions |
| Hébergement | Vercel (front) / Railway ou Fly.io (back) |

## Structure du projet (cible)

```
coffret-amour/
├── apps/
│   ├── web/                 # React + Vite
│   └── mobile/              # React Native (Expo)
├── packages/
│   ├── api/                 # Backend Express
│   ├── shared/              # Types, constantes partagés
│   └── ui/                  # Composants UI partagés
├── docs/                    # Documentation technique
├── scripts/                 # Migrations, seeds, utilitaires
└── .github/workflows/       # CI/CD
```

## Documentation

| Document | Contenu |
|----------|---------|
| [Architecture](./docs/architecture.md) | Vue d'ensemble système, flux de données, sécurité |
| [Schéma de base de données](./docs/database-schema.md) | Modèle de données complet |
| [Référence API](./docs/api-reference.md) | Endpoints REST et événements WebSocket |
| [Design system](./docs/design-system.md) | Charte graphique, composants, navigation |
| [Guide de développement](./docs/development-guide.md) | Setup local, conventions, workflow |
| [Guide de déploiement](./docs/deployment.md) | Environnements, CI/CD, monitoring |
| [Roadmap](./docs/roadmap.md) | Planification par phase et semaine |
| [Cahier des charges](./Cahier_des_charges_Coffret_Amour%20(1).md) | Spécifications fonctionnelles originales |

## Démarrage rapide (une fois le code initialisé)

```bash
# Cloner et installer
git clone <repo-url> coffret-amour
cd coffret-amour
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Lancer les services locaux (PostgreSQL + Redis via Docker)
docker compose up -d

# Appliquer le schéma
npm run db:migrate

# Démarrer en développement
npm run dev
```

## Critères de succès (MVP)

Avant remise du cadeau, les 11 critères suivants doivent être validés :

1. Connexion en moins de 10 secondes
2. Ajout d'une photo à la galerie sans aide
3. Réception d'une notification affectueuse programmée
4. Génération et partage d'un poème
5. Mini-jeu avec réaction émotionnelle positive
6. Export carte/PDF en 2 clics
7. Message chat reçu en moins d'1 seconde
8. Envoi d'une photo depuis la galerie via le chat
9. Mode « Bulle d'amour » fonctionnel (Phase 2)
10. Message éphémère autodétruit après lecture (Phase 2)
11. Notification push en arrière-plan

## Périmètre par priorité

- **Priorité 1 — MVP :** authentification, galerie, timeline, poèmes, montage vidéo, rappels, page surprise, exports, socle chat
- **Priorité 2 — Enrichissement :** mini-jeux, messagerie V2 (vocaux, bulles, éphémères, réactions)
- **Priorité 3 — Avancé :** widgets, playlists, chiffrement E2EE, impression à la demande

## Licence

Projet privé — usage strictement personnel (2 comptes).
