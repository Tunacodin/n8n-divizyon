-- Bildirim geçmişi: header'daki anlık alertlerin zaman serisi kaydı.
-- Aktif bir alert (type) için en fazla bir açık satır (resolved_at IS NULL) tutulur.
-- Alert kapandığında (count=0) resolved_at doldurulur; tekrar görünürse yeni satır açılır.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  title TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  link_href TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_type_open
  ON notifications (type) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_last_seen
  ON notifications (last_seen_at DESC);
