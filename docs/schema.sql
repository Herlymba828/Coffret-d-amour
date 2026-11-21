-- Coffret d'Amour — Schéma PostgreSQL initial
-- Version: 1.0
-- Date: 2026-07-13

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Utilisateurs et configuration du couple
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'partner')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS couple_settings (
  id SERIAL PRIMARY KEY,
  shared_code_hash VARCHAR(255) NOT NULL,
  welcome_phrase TEXT DEFAULT 'Bienvenue dans notre coffret…',
  relationship_start_date DATE,
  anniversary_date DATE,
  surprise_page_config JSONB DEFAULT '{}',
  midnight_message_template TEXT,
  theme_preference VARCHAR(20) DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'candle')),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Galerie média
-- ============================================================

CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  year INTEGER,
  theme VARCHAR(100),
  cover_media_id UUID,
  pinned_media_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id),
  storage_key TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  filename VARCHAR(255),
  caption TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  thumbnail_key TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  -- NULL tant que /media/:id/confirm n'a pas vérifié la présence du fichier
  -- dans le bucket : exclut les uploads avortés de la galerie et des compteurs.
  uploaded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE media ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP;

-- Postgres ne connaît pas ADD CONSTRAINT IF NOT EXISTS : on garde le script rejouable.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_albums_cover_media') THEN
    ALTER TABLE albums
      ADD CONSTRAINT fk_albums_cover_media FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_albums_pinned_media') THEN
    ALTER TABLE albums
      ADD CONSTRAINT fk_albums_pinned_media FOREIGN KEY (pinned_media_id) REFERENCES media(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- Timeline souvenirs
-- ============================================================

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  media_id UUID REFERENCES media(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Poèmes
-- ============================================================

CREATE TABLE IF NOT EXISTS poem_templates (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  template_body TEXT NOT NULL,
  placeholders JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS poems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200),
  content TEXT NOT NULL,
  template_id VARCHAR(50) REFERENCES poem_templates(id) ON DELETE SET NULL,
  keywords TEXT[],
  created_by UUID REFERENCES users(id),
  shared_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Messagerie
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  content TEXT,
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'voice', 'image', 'video', 'game_invite', 'ephemeral')),
  media_url TEXT,
  is_ephemeral BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  reaction_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP,
  game_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS love_phrases (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Rappels affectueux
-- ============================================================

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  trigger_type VARCHAR(30) NOT NULL CHECK (trigger_type IN ('fixed_date', 'daily_random', 'anniversary')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  target_user_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Montage vidéo
-- ============================================================

CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID REFERENCES users(id),
  media_ids UUID[] NOT NULL,
  music_ambiance VARCHAR(30) DEFAULT 'romantic' CHECK (music_ambiance IN ('romantic', 'upbeat', 'nostalgic')),
  overlay_text TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  output_key TEXT,
  duration_seconds INTEGER CHECK (duration_seconds BETWEEN 30 AND 60),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- ============================================================
-- Exports
-- ============================================================

CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('card_a5', 'photo_book')),
  config JSONB NOT NULL DEFAULT '{}',
  requested_by UUID REFERENCES users(id),
  output_key TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Mini-jeux (Phase 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type VARCHAR(30) NOT NULL CHECK (game_type IN ('quiz', 'crossword', 'treasure_hunt', 'truth_dare', 'love_wheel')),
  config JSONB NOT NULL DEFAULT '{}',
  state JSONB DEFAULT '{}',
  started_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  reward_content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- ============================================================
-- Notifications push
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  token TEXT NOT NULL,
  keys JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, platform, token)
);

-- ============================================================
-- Outils & Couple du XXIe siècle
-- ============================================================

CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) DEFAULT 'Gift',
  category VARCHAR(30) DEFAULT 'romantic' CHECK (category IN ('romantic', 'service', 'fun', 'naughty', 'peace')),
  issued_to UUID REFERENCES users(id),
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL CHECK (category IN ('drink', 'sizes', 'favorites', 'allergies', 'comfort', 'wishlist', 'custom')),
  key_name VARCHAR(100) NOT NULL,
  value_text TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category, key_name)
);

CREATE TABLE IF NOT EXISTS bucket_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(30) DEFAULT 'voyage' CHECK (category IN ('voyage', 'aventure', 'romantique', 'quotidien', 'gourmand')),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS date_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  category VARCHAR(30) DEFAULT 'resto' CHECK (category IN ('resto', 'activite', 'cocooning', 'insolite', 'culture')),
  description TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 120,
  budget_level INTEGER DEFAULT 2 CHECK (budget_level IN (1, 2, 3))
);

CREATE TABLE IF NOT EXISTS date_sparks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category VARCHAR(30) DEFAULT 'memoire' CHECK (category IN ('memoire', 'intime', 'futur', 'drole', 'philosophie'))
);

CREATE TABLE IF NOT EXISTS heart_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  energy_level INTEGER NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
  affection_need INTEGER NOT NULL CHECK (affection_need BETWEEN 1 AND 5),
  week_happiness INTEGER NOT NULL CHECK (week_happiness BETWEEN 1 AND 5),
  favorite_moment TEXT NOT NULL,
  week_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Index
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (receiver_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_memories_date ON memories (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_media_album ON media (album_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders (is_active, trigger_type);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_exports_status ON exports (status, created_at);
CREATE INDEX IF NOT EXISTS idx_vouchers_user ON vouchers (issued_to, is_used);
CREATE INDEX IF NOT EXISTS idx_bucket_list_status ON bucket_list (is_completed, category);
CREATE INDEX IF NOT EXISTS idx_preferences_user ON partner_preferences (user_id, category);
CREATE INDEX IF NOT EXISTS idx_heart_checkins_date ON heart_checkins (week_date DESC);

-- ============================================================
-- Données initiales (seeds)
-- ============================================================

INSERT INTO poem_templates (id, title, template_body, placeholders) VALUES
  ('daily_love', 'Amour du jour', 'Mon {{name}}, chaque jour à tes côtés est un cadeau. {{custom}}', '["name", "custom"]'),
  ('anniversary', 'Anniversaire', 'Il y a {{years}} ans, nos regards se sont croisés… {{memory}}', '["years", "memory"]'),
  ('surprise', 'Surprise', '{{keywords}} — ces mots ne disent qu''une chose : je t''aime.', '["keywords"]')
ON CONFLICT (id) DO NOTHING;

-- love_phrases n'a pas de clé naturelle : on ne réinsère que si la table est vierge.
INSERT INTO love_phrases (content, is_default)
SELECT * FROM (VALUES
  ('Tu es mon soleil, même les jours de pluie ☀️', TRUE),
  ('Chaque message de toi fait battre mon cœur un peu plus fort 💕', TRUE),
  ('Ici, tout reste entre nous 🔒', TRUE),
  ('Tu me manques déjà…', TRUE),
  ('Pense à moi comme je pense à toi', TRUE)
) AS v(content, is_default)
WHERE NOT EXISTS (SELECT 1 FROM love_phrases);

-- Vouchers par défaut
INSERT INTO vouchers (title, description, icon, category)
SELECT * FROM (VALUES
  ('Massage relaxant de 20 minutes', 'Valable pour un massage du dos ou des épaules aux huiles douces.', 'Sparkles', 'romantic'),
  ('Petit-déjeuner au lit', 'Un café ou thé chaud, des croissants et tout ton temps pour te réveiller.', 'Coffee', 'service'),
  ('Joker : Choix du film / de la série', 'Pouvoir absolu sur la télécommande pour la soirée sans négociation !', 'Tv', 'fun'),
  ('Parenthèse câlin express', 'Un câlin serré de 5 minutes chrono pour recharger les batteries.', 'Heart', 'peace'),
  ('Ce soir, c''est moi qui cuisine', 'Mets les pieds sous la table, ton chef personnel s''occupe de tout.', 'Utensils', 'service'),
  ('Soirée carte blanche', 'Tu choisis l''activité, la musique et le menu du début à la fin.', 'Compass', 'fun')
) AS v(title, description, icon, category)
WHERE NOT EXISTS (SELECT 1 FROM vouchers);

-- Idées de sorties (Date Ideas)
INSERT INTO date_ideas (title, category, description, duration_minutes, budget_level)
SELECT * FROM (VALUES
  ('Dîner aux chandelles à la maison', 'cocooning', 'Éteindre les lumières, allumer les bougies et préparer un plat signature à deux.', 90, 1),
  ('Pique-nique au coucher du soleil', 'romantique', 'Emporter une couverture, des fraises et une bonne bouteille dans un parc ou un point haut.', 120, 1),
  ('Escape Game ou jeu immersif', 'activite', 'Tester notre esprit d''équipe et résoudre des énigmes ensemble sous pression.', 60, 2),
  ('Tester un nouveau restaurant insolite', 'resto', 'Découvrir une gastronomie que l''on n''a jamais goûtée ensemble (éthiopien, coréen, etc.).', 120, 2),
  ('Soirée Spa & Bains thermaux', 'insolite', 'Après-midi détente dans un sauna/hammam avec massage en duo.', 180, 3),
  ('Nuit d''observation des étoiles', 'romantique', 'S''éloigner des lumières de la ville avec un thermos chaud et une carte du ciel.', 120, 1),
  ('Atelier cuisine ou poterie en duo', 'activite', 'Créer quelque chose de nos mains et rigoler de nos chefs-d''œuvre.', 120, 2),
  ('Marathon films rétro avec pop-corn maison', 'cocooning', 'Se caler sous le plaid et revoir nos classiques préférés d''enfance.', 180, 1)
) AS v(title, category, description, duration_minutes, budget_level)
WHERE NOT EXISTS (SELECT 1 FROM date_ideas);

-- Bucket List par défaut
INSERT INTO bucket_list (title, category, note)
SELECT * FROM (VALUES
  ('Voir des aurores boréales ensemble', 'voyage', 'En Islande ou en Laponie'),
  ('Apprendre à cuisiner des sushis maison', 'gourmand', 'Atelier dégustation avec saké'),
  ('Dormir dans une cabane perchée dans les arbres', 'aventure', 'Week-end insolite en forêt'),
  ('Faire un road trip sans destination précise', 'aventure', 'Prendre la route et s''arrêter au hasard'),
  ('Prendre un bain de minuit en été', 'romantique', 'À la mer ou dans un lac'),
  ('Faire un shooting photo argentique à deux', 'romantique', 'Développer la pellicule ensemble'),
  ('Planter un arbre ou créer un mini-jardin commun', 'quotidien', 'Un souvenir vivant qui grandit avec nous')
) AS v(title, category, note)
WHERE NOT EXISTS (SELECT 1 FROM bucket_list);

-- Cartes de questions profondes pour le Mode Date (Sparks)
INSERT INTO date_sparks (question, category)
SELECT * FROM (VALUES
  ('Quel est ton tout premier souvenir précis de nous deux ?', 'memoire'),
  ('Si on pouvait se téléporter n''importe où ce soir pour 1 heure, où irions-nous ?', 'futur'),
  ('Quelle petite habitude chez moi te fait toujours sourire discrètement ?', 'intime'),
  ('Quelle a été la période où tu t''es senti(e) le plus fier(e) de notre couple ?', 'philosophie'),
  ('Raconte-moi un rêve ou un projet un peu fou que tu n''as encore jamais osé me dire.', 'futur'),
  ('Quelle chanson te fait instantanément penser à moi quand tu l''entends seul(e) ?', 'memoire'),
  ('Qu''est-ce qui te fait te sentir le plus aimé(e) et rassuré(e) au quotidien ?', 'intime'),
  ('Quel fou rire ensemble n''oublieras-tu jamais ?', 'drole'),
  ('Quel compliment de ma part t''a le plus touché(e) ?', 'intime'),
  ('Si notre histoire d''amour était un titre de film ou de livre, ce serait quoi ?', 'drole')
) AS v(question, category)
WHERE NOT EXISTS (SELECT 1 FROM date_sparks);

