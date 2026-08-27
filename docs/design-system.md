# Design system — Coffret d'Amour

Charte graphique et guidelines UI dérivées du cahier des charges (section 5).

---

## 1. Identité visuelle

### Palette de couleurs

| Token | Hex | Usage |
|-------|-----|-------|
| `cream` | `#FFF8F0` | Fond principal, messages envoyés |
| `powder-rose` | `#FADADD` | Accents, messages reçus |
| `copper-gold` | `#C9A87C` | Bordures, titres, icônes actives |
| `deep-rose` | `#E8A0BF` | Hover, accents secondaires |
| `warm-brown` | `#8B6914` | Texte sur fond clair (accessibilité) |
| `soft-shadow` | `rgba(201, 168, 124, 0.15)` | Ombres douces |

### Thème « Bougie » (mode nuit / intimité)

| Token | Hex | Usage |
|-------|-----|-------|
| `candle-bg` | `#1A1410` | Fond sombre |
| `candle-text` | `#C9A87C` | Texte cuivré |
| `candle-glow` | `#D4A574` | Lueur bougie, accents |
| `candle-rose` | `#6B3A4A` | Bulles messages reçus |

### Typographie

| Rôle | Police | Poids | Taille |
|------|--------|-------|--------|
| Titres H1 | Playfair Display | 700 | 2rem / 32px |
| Titres H2 | Playfair Display | 600 | 1.5rem / 24px |
| Titres H3 | Playfair Display | 500 | 1.25rem / 20px |
| Corps | Inter | 400 | 1rem / 16px |
| Petit texte | Inter | 400 | 0.875rem / 14px |
| Légendes | Inter | 300 italic | 0.8125rem / 13px |

**Import Google Fonts :**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@500;600;700&display=swap');
```

---

## 2. Navigation

### Structure — 5 onglets principaux

| Onglet | Icône | Route |
|--------|-------|-------|
| Galerie | 🖼️ / `Images` | `/gallery` |
| Timeline | 📅 / `Clock` | `/timeline` |
| Poèmes | ✍️ / `Feather` | `/poems` |
| Outils | 🛠️ / `Wrench` | `/tools` |
| Chat | 💬 / `MessageCircle` | `/chat` |

### Web — barre flottante en bas

```
┌─────────────────────────────────────────┐
│                                         │
│              Contenu page               │
│                                         │
├─────────────────────────────────────────┤
│  🖼️    📅    ✍️    🛠️    💬 (3)        │
│ Galerie Timeline Poèmes Outils  Chat    │
└─────────────────────────────────────────┘
```

- Barre flottante avec `border-radius: 24px`, ombre douce
- Onglet actif : icône + label en `copper-gold`
- Badge non-lus sur Chat : pastille rose avec compteur

### Mobile — barre latérale ou bottom tabs

- Bottom tabs natifs Expo (même 5 onglets)
- Swipe horizontal entre sections principales (optionnel)

---

## 3. Composants

### Boutons

| Variante | Style |
|----------|-------|
| Primary | Fond `copper-gold`, texte blanc, `border-radius: 12px` |
| Secondary | Bordure `copper-gold`, fond transparent |
| Ghost | Texte `copper-gold`, pas de bordure |
| Surprendre | Dégradé rose → or, animation shimmer au hover |

### Cartes (souvenirs, albums, poèmes)

```css
.card {
  background: cream;
  border: 1px solid copper-gold;
  border-radius: 16px;
  box-shadow: 0 4px 20px soft-shadow;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  transform: translateY(-2px);
}
```

### Galerie — mosaïque

- Layout CSS Grid masonry ou react-photo-album
- Photo épinglée : badge 📌 en coin supérieur droit
- Overlay légende au hover/tap

### Messages chat

| Type | Fond | Bordure |
|------|------|---------|
| Envoyé | `#FFF8F0` (cream) | 1px `#C9A87C` (or) |
| Reçu | `#FADADD` (rose) | 1px `#FFF8F0` (crème) |

- `border-radius: 16px 16px 4px 16px` (envoyé)
- `border-radius: 16px 16px 16px 4px` (reçu)
- Horodatage discret : `0.75rem`, opacité 0.6
- Statut lu : icône cœur qui se remplit progressivement

### Zone de saisie chat

```
┌──────────────────────────────────────────────┐
│  📎    │  Écrire un message…          │ 🎤 ❤️ │
└──────────────────────────────────────────────┘
```

- 📎 : pièce jointe / partage galerie
- 🎤 : message vocal (Phase 2)
- ❤️ : picker phrases douces

---

## 4. Animations et transitions

| Contexte | Animation |
|----------|-----------|
| Navigation | Fondu cross-fade 200ms |
| Nouveau message | Apparition fade-in + rebond léger (spring) |
| Réaction cœur | Explosion particules cœurs (canvas/CSS) |
| Landing / Surprise | Particules cœurs ou pétales (tsParticles ou CSS) |
| Diaporama | Transition fondu 800ms entre slides |
| Mode Bulle d'amour | Bulles flottantes CSS/Canvas, effet papier qui tombe |
| Scroll timeline | Parallaxe subtile sur images (transform translateY) |

### Courbes d'animation

```css
--ease-soft: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## 5. Écrans clés

### Landing / Connexion

- Fond dégradé crème → rose poudré
- Particules animées (cœurs/pétales)
- Champ code partagé + mot de passe
- Icône cadenas + « Ici, tout reste entre nous 🔒 »
- Phrase d'accueil personnalisée après connexion (animation typewriter optionnelle)

### Page surprise anniversaire

1. Écran plein avec animation particules au chargement
2. Texte/vidéo personnalisé centré (Playfair Display)
3. Poème mis en avant dans un cadre doré
4. Bouton « Ouvrir notre coffret » → transition vers app principale

### Galerie

- Header : filtres année/thème
- Vue mosaïque par défaut, toggle diaporama plein écran
- FAB « + » pour ajouter photo

### Timeline

- Ordre chronologique inversé (plus récent en haut)
- Événement épinglé sticky en tête
- Section « Ce jour-là » en banner si souvenirs existent à cette date

### Poèmes

- Grille de templates avec aperçu
- Éditeur avec champs personnalisables
- Bouton « Surprendre ✨ » proéminent
- Actions : partager, exporter PDF

---

## 6. Responsive

| Breakpoint | Comportement |
|------------|--------------|
| `< 640px` | Mobile first, bottom nav, 1 colonne |
| `640–1024px` | 2 colonnes galerie, sidebar collapsible |
| `> 1024px` | 3-4 colonnes mosaïque, chat split-view optionnel |

---

## 7. Accessibilité

- Contraste minimum WCAG AA sur texte
- Focus visible sur tous les éléments interactifs
- Labels ARIA sur icônes seules (📎, 🎤, ❤️)
- Animations respectant `prefers-reduced-motion`
- Tailles touch target ≥ 44px sur mobile

---

## 8. Configuration Tailwind (extrait)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F0',
        'powder-rose': '#FADADD',
        'copper-gold': '#C9A87C',
        'deep-rose': '#E8A0BF',
        'candle-bg': '#1A1410',
        'candle-text': '#C9A87C',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        bubble: '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s var(--ease-soft)',
        'heart-burst': 'heartBurst 0.6s var(--ease-bounce)',
      },
    },
  },
};
```

---

## 9. Icônes

Bibliothèque recommandée : **Lucide React** (cohérence web/mobile).

Mapping :
- Galerie → `Images`
- Timeline → `CalendarHeart`
- Poèmes → `Feather`
- Outils → `Sparkles`
- Chat → `MessageCircleHeart`
- Cadenas → `Lock`
- Cœur lu → `Heart` (fill progressif via SVG)
