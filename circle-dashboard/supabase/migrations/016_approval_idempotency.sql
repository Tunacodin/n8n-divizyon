-- approve endpoint'i icin idempotency kayitlari.
-- Ayni email+action 5 dakika icinde tekrar gelirse, ikinci istek son cevabin
-- kopyasini doner — webhook iki kez tetiklenmez.

CREATE TABLE IF NOT EXISTS approval_idempotency (
  key          TEXT PRIMARY KEY,            -- sha256(email|action|day) gibi
  email        TEXT NOT NULL,
  action       TEXT NOT NULL,
  response     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_idempotency_created_at
  ON approval_idempotency(created_at DESC);

-- 7 gunden eski kayitlari otomatik temizle (cron'la cagirilabilir)
CREATE OR REPLACE FUNCTION cleanup_approval_idempotency()
RETURNS INTEGER AS $$
DECLARE
  removed INTEGER;
BEGIN
  DELETE FROM approval_idempotency WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$ LANGUAGE plpgsql;
