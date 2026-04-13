-- Circle member tag'leri: persona (Öncü/Gözcü...), meslek (Front-End Developer...), etkinlik (Global Game Jam), yönetici tag'leri.
-- applications.tags: hızlı filtreleme + array contain sorgusu icin denormalize cache.
-- member_tags: Circle'dan çekilen tag tanımları (isim + renk + kategori).

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];

CREATE INDEX IF NOT EXISTS idx_applications_tags ON applications USING GIN (tags);

CREATE TABLE IF NOT EXISTS member_tags (
  id          INTEGER PRIMARY KEY,          -- Circle tag id
  name        TEXT NOT NULL,
  color       TEXT,
  category    TEXT,                         -- persona | meslek | etkinlik | yonetici | diger
  display_format TEXT,                      -- label, emoji, vb.
  is_public   BOOLEAN DEFAULT TRUE,
  tagged_members_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  synced_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_tags_name ON member_tags(name);
CREATE INDEX IF NOT EXISTS idx_member_tags_category ON member_tags(category);
