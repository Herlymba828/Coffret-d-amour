# Cahier des charges — Projet "Coffret d'Amour"

**Version du document :** 1.0
**Date :** 13 juillet 2026
**Type de projet :** Application web/mobile privée à usage personnel (cadeau de couple)

---

## 1. Présentation du projet

### 1.1 Contexte
Le "Coffret d'Amour" est une application privée à deux utilisateurs, conçue comme un cadeau numérique. Elle combine trois usages :
- **Mémoire affective** : conserver et mettre en valeur les souvenirs du couple (photos, textes, vidéos).
- **Outil du quotidien** : faciliter l'organisation à deux (listes, calendrier, routines).
- **Terrain de jeu romantique** : créer de l'interaction et du lien via des mini-jeux, énigmes et une messagerie dédiée.

### 1.2 Vision
Un écrin numérique privé, sécurisé et vivant, qui grandit avec l'histoire du couple.

### 1.3 Utilisateurs
- 2 comptes uniquement (le porteur du projet + sa partenaire).
- Aucune fonctionnalité multi-utilisateur au-delà de ce binôme n'est prévue au MVP.

---

## 2. Objectifs et critères de succès

Le projet sera considéré comme réussi si, avant remise du cadeau :

1. Elle peut se connecter seule en moins de 10 secondes.
2. Elle ajoute une photo à la galerie sans aide.
3. Elle reçoit une notification affectueuse programmée.
4. Elle génère un poème et le partage.
5. Elle joue à un mini-jeu et a une réaction émotionnelle positive.
6. Elle exporte une carte ou un PDF en 2 clics.
7. Un message envoyé dans le chat est reçu en moins d'1 seconde.
8. Elle peut envoyer une photo depuis la galerie directement via le chat.
9. Le mode "Bulle d'amour" du chat fonctionne visuellement comme prévu.
10. Un message éphémère s'autodétruit bien après lecture.
11. Une notification push s'affiche même quand l'app est en arrière-plan.

---

## 3. Périmètre fonctionnel

Le projet est découpé en 3 phases : **MVP**, **Phase 2 (enrichissement / jeux / messagerie)**, **Phase 3 (fonctionnalités avancées)**.

### 3.1 PHASE 1 — MVP

| # | Fonctionnalité | Détail |
|---|---|---|
| 1 | Authentification privée | Compte unique à deux, mot de passe ou code partagé (ex. date de rencontre + prénom), phrase d'accueil personnalisée après connexion. |
| 2 | Galerie média intelligente | Albums par année/thème, légendes modifiables, photo épinglée par album, affichage mosaïque + diaporama. |
| 3 | Timeline "Nos souvenirs" | Ordre chronologique inversé, événement épinglé en tête, fiche souvenir (date, titre, description, média), fonction "Ce jour-là". |
| 4 | Générateur de poèmes / messages | Templates pré-remplis, champs personnalisables, bouton "Surprendre" (génération aléatoire à partir de mots-clés). |
| 5 | Montage vidéo automatique | Sélection de 5 à 15 médias, montage 30-60s, musique (3 ambiances), transitions, texte incrusté, génération en arrière-plan (FFmpeg). |
| 6 | Rappels affectueux | Notifications programmées (anniversaires, messages quotidiens aléatoires, dates clés). |
| 7 | Page "Surprise d'anniversaire" | Landing personnalisée (texte/vidéo), poème mis en avant, animations au chargement, bouton d'entrée vers le coffret. |
| 8 | Export imprimable | Carte A5 personnalisable, PDF "livre photo" à partir des albums, export en un clic. |
| 9 | Messagerie secrète — socle MVP | Chat temps réel, phrases douces pré-enregistrées, partage rapide depuis la galerie, notifications push, horodatage discret, statut lu/non lu (cœur qui se remplit). |

### 3.2 PHASE 2 — Mini-jeux, énigmes et messagerie avancée

**Mini-jeux romantiques :**

| # | Fonctionnalité | Détail |
|---|---|---|
| 1 | Quiz "Qui suis-je ?" | QCM sur ses goûts, vos souvenirs communs, ses manies ; score final avec message personnalisé. |
| 2 | Mots croisés personnalisés | Grille générée à partir de mots-clés (prénoms, lieux, dates), indices romantiques. |
| 3 | Chasse au trésor digitale | Énigme en 3 étapes, chaque réponse débloque un indice, accès final à une vidéo secrète ou un poème inédit. |
| 4 | Jeu "Vérités / Défis" | Pioche aléatoire de questions intimes et défis, réponses stockées dans le coffret. |
| 5 | Roue de l'amour | Animation interactive : câlin virtuel, poème à lire, surprise cachée. |

**Messagerie — fonctionnalités V2 :**

| # | Fonctionnalité | Détail |
|---|---|---|
| 1 | Messages vocaux rapides | Enregistrement 30s max, intégré au lecteur audio global. |
| 2 | Mode "Bulle d'amour" | Animation : messages en bulles flottantes qui se posent, effet "papier qui tombe". |
| 3 | Messages éphémères | Option "voir une fois" : disparition 5s après ouverture. |
| 4 | Réactions intelligentes | Double-clic = explosion de cœurs, compteur "cœurs échangés aujourd'hui". |
| 5 | Envoi de mini-jeux dans le chat | Bouton "Défi du jour" envoyant une énigme directement dans le fil, réponse affichée dans la conversation. |

### 3.3 PHASE 3 — Fonctionnalités avancées (V2/V3)

**Générales :**
- Widgets quotidiens (citation du jour, fond d'écran changeant, éphéméride de la relation).
- Playlists collaboratives (ajout de morceaux à deux, lecture intégrée, mode "surprise").
- Messages vocaux (dépôt libre dans le coffret, lecteur avec vague animée, notification d'arrivée).
- Partages temporaires (lien expirant 24h, sans authentification).
- Impression à la demande (intégration service type CEWE/Photobox).
- Outils du quotidien (liste de courses partagée, recettes favorites, calendrier commun, routines matin/soir).

**Messagerie — fonctionnalités V3 :**
- Messages programmés (rédaction différée, envoi à date/heure précise).
- Stickers personnalisés générés à partir de photos.
- Indicateur de présence poétique ("Son cœur bat ici", "Une plume glisse sur l'écran…" pendant la frappe).
- Chiffrement de bout en bout (Signal Protocol) pour les messages sensibles.
- Export PDF imprimable des plus beaux échanges (sélection manuelle).

---

## 4. Exigences techniques

### 4.1 Stack technique générale

| Composant | Choix retenu |
|---|---|
| Frontend Web | React + Vite + Tailwind CSS |
| Frontend Mobile | React Native (Expo) ou Flutter |
| Backend API | Node.js + Express (ou NestJS) |
| Base de données | PostgreSQL (métadonnées) + Redis (cache, jobs, présence) |
| Stockage médias | Cloudflare R2 (compatible S3) |
| Authentification | JWT + TOTP (optionnel) |
| Transcodage vidéo | FFmpeg (serverless / Kubernetes) |
| Génération PDF | Puppeteer (Chrome headless) |
| CI/CD | GitHub Actions |
| Hébergement | Vercel (frontend) / Railway ou Fly.io (backend) |
| Monitoring | Sentry + Logtail |

### 4.2 Stack spécifique à la messagerie

| Composant | Choix retenu |
|---|---|
| Temps réel | Socket.IO au démarrage (fallback long-polling) ; évolution possible vers WebSocket natif + Redis Pub/Sub pour scaler horizontalement. |
| Présence / statut | Redis (sessions actives, statut en ligne / en train d'écrire). |
| Notifications push | Firebase Cloud Messaging (mobile) + Web Push API (desktop). |
| Stockage vocaux / pièces jointes | Même bucket S3/R2 que les médias, URL signée pour sécuriser l'accès. |

> **Note d'architecture :** démarrer avec Socket.IO seul suffit pour un usage à 2 utilisateurs. Un cluster Redis (socket.io-redis) ne devient pertinent qu'en cas de montée en charge, non prévue pour ce projet.

### 4.3 Modèle de données (extraits SQL)

```sql
-- Table des messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  content TEXT,
  type VARCHAR(20) DEFAULT 'text', -- text, voice, image, video, game_invite, ephemeral
  media_url TEXT,
  is_ephemeral BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des phrases douces personnalisables
CREATE TABLE love_phrases (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id)
);
```

Le reste des entités (utilisateurs, albums, souvenirs, poèmes, mini-jeux) devra être modélisé selon la même logique lors du développement, en cohérence avec le schéma ci-dessus.

---

## 5. Exigences UX / UI

### 5.1 Direction artistique générale
- **Palette :** crème (#FFF8F0), rose poudré (#FADADD), or cuivré (#C9A87C).
- **Typographie :** Playfair Display (titres) + Inter (texte courant).
- **Landing :** fond doux avec animation de particules (cœurs ou pétales).
- **Navigation :** onglets flottants en bas (web) / barre latérale (mobile).
- **Transitions :** fondu, parallaxe subtile, apparition progressive.
- **Mode plein écran :** pour vidéos, poèmes, moments forts.
- **Verrouillage :** icône de cadenas + phrase rassurante ("Ici, tout reste entre nous").

### 5.2 Navigation
5 onglets principaux : **Galerie / Timeline / Poèmes / Outils / 💬 Chat**, avec compteur de messages non lus sur l'onglet Chat.

### 5.3 UI spécifique messagerie
- **Bulles de messages :** messages envoyés en fond crème (#FFF8F0) avec bordure or cuivré ; messages reçus en fond rose poudré (#FADADD) avec bordure crème.
- **Zone de saisie :** champ texte + 3 boutons intégrés (📎 pièce jointe, 🎤 vocal, ❤️ phrases douces).
- **Animations :** apparition en fondu/rebond des nouveaux messages, explosion de particules pour les réactions cœur.
- **Mode nuit / intimité :** thème "Bougie" (fond sombre, texte cuivré) pour les échanges tardifs.

---

## 6. Planning de développement (indicatif, 6 semaines)

| Semaine | Objectif |
|---|---|
| S1 | Setup projet (front/back), authentification, galerie photo, setup WebSocket/Socket.IO et table `messages`. |
| S2 | Timeline, générateur de poèmes, exports PDF, UI de base du chat (envoi/réception, horodatage). |
| S3 | Montage vidéo, rappels, page surprise, notifications push + statut lu/non lu du chat. |
| S4 | Mini-jeux et énigmes (quiz, chasse au trésor), ajout vocaux/pièces jointes/phrases douces au chat. |
| S5 | Mode éphémère + réactions cœur, tests utilisateurs (elle), ajustements UI/UX. |
| S6 | Ajustements finaux (performance WebSocket, déploiement HTTPS/WSS), documentation, remise du cadeau final. |

---

## 7. Fonctionnalité spéciale — Intégration du chat dans la page surprise

Pour le jour de l'anniversaire, un message programmé doit s'envoyer automatiquement dans le chat à minuit, juste avant l'ouverture du coffret par la partenaire. Exemple de contenu :

> Message d'accueil evoquant que le coffret représente l'histoire du couple et que le chat en représente l'avenir, chaque échange étant décrit comme une promesse, suivi d'une déclaration d'amour.

Ce texte doit rester personnalisable et n'est donné ici qu'à titre d'exemple de ton attendu.

---

## 8. Points de vigilance et risques

- **Confidentialité et sécurité :** application à usage strictement privé (2 comptes) ; toute donnée sensible (photos, messages, vocaux) doit être stockée derrière authentification et, idéalement, accès via URL signées à durée limitée.
- **Complexité technique vs délai :** le planning de 6 semaines est ambitieux compte tenu du nombre de fonctionnalités (galerie, timeline, montage vidéo, mini-jeux, messagerie temps réel). Il est recommandé de traiter le MVP (section 3.1 + socle chat) comme périmètre minimum garanti, les phases 2 et 3 étant des extensions post-lancement.
- **Dépendances tierces :** FFmpeg (transcodage), Puppeteer (PDF), Firebase/Web Push (notifications) demandent une configuration et des tests spécifiques avant mise en production.
- **Chiffrement E2EE (Phase 3) :** fonctionnalité complexe à implémenter correctement (Signal Protocol) ; à ne considérer qu'une fois le socle applicatif stable.

---

## 9. Synthèse du périmètre par priorité

- **Priorité 1 (MVP indispensable) :** sections 3.1 et le socle MVP de la messagerie (point 9 du tableau MVP).
- **Priorité 2 (enrichissement) :** mini-jeux et fonctionnalités V2 de la messagerie (section 3.2).
- **Priorité 3 (nice-to-have) :** fonctionnalités avancées et V3 de la messagerie (section 3.3).
