# Roadmap — Coffret d'Amour

Planification détaillée sur 6 semaines, alignée sur le cahier des charges (section 6).

---

## Vue d'ensemble par phase

```
Semaine 1-3  ████████████  Phase 1 — MVP
Semaine 4-5  ████████      Phase 2 — Enrichissement
Semaine 6    ████          Finitions + remise
             ──────────────────────────────►
             Post-lancement : Phase 3
```

| Phase | Périmètre | Priorité |
|-------|-----------|----------|
| **Phase 1 — MVP** | Sections 3.1 du cahier des charges | P1 — Indispensable |
| **Phase 2 — Enrichissement** | Section 3.2 (jeux + messagerie V2) | P2 — Souhaitable avant remise |
| **Phase 3 — Avancé** | Section 3.3 | P3 — Post-lancement |

---

## Semaine 1 — Fondations

**Objectif :** Setup projet, authentification, galerie, socle chat.

| Jour | Tâches | Livrables |
|------|--------|-----------|
| J1 | Init monorepo (web, api, shared), Docker Compose, CI basique | Repo structuré, `npm run dev` fonctionnel |
| J2 | Schéma DB, migrations, seeds | PostgreSQL opérationnel avec données test |
| J3 | Auth (JWT, code partagé, phrase d'accueil) | Login/logout, middleware auth |
| J4 | Upload média (presign R2/MinIO), albums CRUD | Galerie basique avec upload |
| J5 | UI galerie (mosaïque, légendes, épingler) + setup Socket.IO + table messages | Galerie utilisable, socket connecté |

**Critères fin S1 :**
- [ ] Connexion en < 10s
- [ ] Upload et affichage photo
- [ ] Socket.IO connecté avec auth

---

## Semaine 2 — Mémoire et création

**Objectif :** Timeline, poèmes, exports PDF, UI chat de base.

| Jour | Tâches | Livrables |
|------|--------|-----------|
| J1 | Timeline CRUD, ordre chronologique inversé, épingler | Page Timeline fonctionnelle |
| J2 | Fonction « Ce jour-là », fiches souvenir | Banner souvenirs du jour |
| J3 | Générateur poèmes (templates, champs, Surprendre) | Page Poèmes complète |
| J4 | Export PDF carte A5 + livre photo (Puppeteer) | Export en 2 clics |
| J5 | UI chat (bulles, envoi/réception, horodatage, phrases douces) | Chat texte fonctionnel |

**Critères fin S2 :**
- [ ] Timeline avec souvenirs
- [ ] Génération et partage poème
- [ ] Export PDF testé
- [ ] Messages chat envoyés/reçus

---

## Semaine 3 — Magie et notifications

**Objectif :** Montage vidéo, rappels, page surprise, push, statut lu.

| Jour | Tâches | Livrables |
|------|--------|-----------|
| J1 | Job queue montage vidéo (FFmpeg), 3 ambiances musicales | Montage 30-60s en arrière-plan |
| J2 | Rappels affectueux (cron, types fixed/daily/anniversary) | Notifications programmées |
| J3 | Page surprise anniversaire (animations, poème, vidéo) | Landing personnalisée |
| J4 | Message minuit automatique (cron anniversaire) | Intégration chat + surprise |
| J5 | Push notifications (FCM + Web Push), statut lu/non lu (cœur) | Push foreground + background |

**Critères fin S3 — MVP complet :**
- [ ] Tous les critères de succès MVP (1-8, 11) validés
- [ ] Page surprise prête
- [ ] Message minuit testé

---

## Semaine 4 — Jeux et chat enrichi

**Objectif :** Mini-jeux Phase 2, vocaux, pièces jointes galerie.

| Jour | Tâches | Livrables |
|------|--------|-----------|
| J1 | Quiz « Qui suis-je ? » (QCM, score, message) | Jeu quiz jouable |
| J2 | Mots croisés personnalisés + chasse au trésor 3 étapes | 2 jeux supplémentaires |
| J3 | Vérités/Défis + Roue de l'amour | 4 mini-jeux au total |
| J4 | Messages vocaux 30s, partage photo galerie → chat | Critère succès #8 |
| J5 | Envoi mini-jeu dans le chat (Défi du jour) | Jeux intégrés au chat |

**Critères fin S4 :**
- [ ] Mini-jeu avec réaction positive (critère #5)
- [ ] Photo galerie → chat
- [ ] Message vocal fonctionnel

---

## Semaine 5 — Messagerie V2 et tests

**Objectif :** Mode Bulle, éphémères, réactions, tests utilisateur.

| Jour | Tâches | Livrables |
|------|--------|-----------|
| J1 | Mode « Bulle d'amour » (animation bulles flottantes) | Critère succès #9 |
| J2 | Messages éphémères (voir une fois, auto-delete 5s) | Critère succès #10 |
| J3 | Réactions cœur (double-clic, compteur journalier) | Réactions animées |
| J4 | Tests utilisateur (partenaire), collecte feedback | Liste ajustements |
| J5 | Corrections UI/UX issues des tests | UI polie |

**Critères fin S5 :**
- [ ] Bulle d'amour et éphémères OK
- [ ] Feedback partenaire intégré

---

## Semaine 6 — Finitions et remise

**Objectif :** Performance, déploiement, documentation, cadeau.

| Jour | Tâches | Livrables |
|------|--------|-----------|
| J1 | Optimisation perf (lazy loading, cache, WebSocket) | Message chat < 1s garanti |
| J2 | Déploiement production (Vercel + Railway), HTTPS/WSS | App en ligne |
| J3 | Pré-remplissage contenu (photos, souvenirs, poèmes) | Coffret personnalisé |
| J4 | Tests finaux sur prod, checklist remise | 11/11 critères validés |
| J5 | Remise du cadeau 🎁 | — |

---

## Phase 3 — Post-lancement (backlog)

À planifier après la remise, par ordre de valeur :

| # | Feature | Complexité | Dépendances |
|---|---------|------------|-------------|
| 1 | Widgets quotidiens (citation, fond d'écran) | Moyenne | — |
| 2 | Playlists collaboratives | Moyenne | Lecteur audio |
| 3 | Messages vocaux libres (hors chat) | Faible | Vocaux chat existants |
| 4 | Liens temporaires 24h | Moyenne | Auth bypass |
| 5 | Outils quotidien (courses, recettes, calendrier) | Élevée | — |
| 6 | Messages programmés | Moyenne | Cron existant |
| 7 | Stickers personnalisés (photos) | Élevée | ML/API externe |
| 8 | Indicateur présence poétique | Faible | Typing indicator |
| 9 | Export PDF des échanges | Moyenne | Puppeteer existant |
| 10 | Impression CEWE/Photobox | Élevée | API tierce |
| 11 | Chiffrement E2EE (Signal Protocol) | Très élevée | Socle stable |

---

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Planning 6 semaines trop ambitieux | Retard remise | MVP (S1-S3) = périmètre garanti ; Phase 2 en extension |
| FFmpeg complexe en serverless | Montage vidéo bloqué | Worker Docker dédié, test early S3 |
| Push notifications mal configurées | Critère #11 non validé | Tester dès S3 sur device réel |
| WebSocket instable en prod | Chat lent | Fallback long-polling, monitoring latence |
| Puppeteer lourd en CI/CD | Builds lents | Cache Chromium, worker séparé |

---

## Critères de succès — matrice de suivi

| # | Critère | Phase | Semaine cible | Statut |
|---|---------|-------|---------------|--------|
| 1 | Connexion < 10s | MVP | S1 | ⬜ |
| 2 | Ajout photo sans aide | MVP | S1 | ⬜ |
| 3 | Notification affectueuse | MVP | S3 | ⬜ |
| 4 | Poème généré et partagé | MVP | S2 | ⬜ |
| 5 | Mini-jeu réaction positive | Phase 2 | S4 | ⬜ |
| 6 | Export PDF 2 clics | MVP | S2 | ⬜ |
| 7 | Message chat < 1s | MVP | S3 | ⬜ |
| 8 | Photo galerie → chat | MVP/Phase 2 | S4 | ⬜ |
| 9 | Mode Bulle d'amour | Phase 2 | S5 | ⬜ |
| 10 | Message éphémère | Phase 2 | S5 | ⬜ |
| 11 | Push en arrière-plan | MVP | S3 | ⬜ |

---

## Jalons (milestones)

| Jalon | Date cible | Contenu |
|-------|------------|---------|
| **M1 — Fondations** | Fin S1 | Auth + galerie + socket |
| **M2 — MVP feature-complete** | Fin S3 | Toutes features MVP + push |
| **M3 — Enrichissement** | Fin S5 | Jeux + chat V2 |
| **M4 — Remise** | Fin S6 | Production + cadeau livré |
