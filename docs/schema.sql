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
-- Index
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (receiver_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_memories_date ON memories (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_media_album ON media (album_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders (is_active, trigger_type);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_exports_status ON exports (status, created_at);

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
