-- Circle'dan ayrilmis veya kaldirilmis uyeleri isaretlemek icin.
-- Reverse sync: applications.is_protected=true olup, son Circle sync'inde
-- gelmeyen kayitlari bulup circle_removed_at ile damgalar.
-- Korumali davranis devam eder (mutation hala yasaktir) — sadece UI'da
-- "Circle'dan ayrildi" rozetiyle gosterilir.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS circle_removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS circle_last_seen_in_sync_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_applications_circle_removed
  ON applications(circle_removed_at)
  WHERE circle_removed_at IS NOT NULL;
