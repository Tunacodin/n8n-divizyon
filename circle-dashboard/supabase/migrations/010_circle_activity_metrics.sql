-- Circle üyelerinden çekilen aktivite ve profil alanları
-- Drawer'da gösterim için: activity_score, last_seen_at, posts/comments/topics count, company/birth_date vs.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS activity_score         INTEGER,
  ADD COLUMN IF NOT EXISTS last_seen_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_confirmed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_invitation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS circle_active          BOOLEAN,
  ADD COLUMN IF NOT EXISTS circle_posts_count     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS circle_comments_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS circle_topics_count    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS circle_company         TEXT,
  ADD COLUMN IF NOT EXISTS circle_disciplines     TEXT[],
  -- Circle profile_fields: ayrı kolon (başvurudan gelenleri override etmemek için)
  ADD COLUMN IF NOT EXISTS circle_birth_date      TEXT,
  ADD COLUMN IF NOT EXISTS circle_university      TEXT,
  ADD COLUMN IF NOT EXISTS circle_department      TEXT;

-- Sıralama için activity_score üzerinde index
CREATE INDEX IF NOT EXISTS idx_applications_activity ON applications(activity_score DESC NULLS LAST)
  WHERE is_protected = TRUE;
