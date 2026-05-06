-- Status deadlines: kontrol asamasinda 14 gun, kesin_kabul→nihai_uye 30 gun gibi
-- otomatik son tarih takibi. Cron job /api/cron/check-deadlines bu kolonlari okur.
--
-- status_changed_at: status'un en son degistigi an (trigger ile otomatik)
-- deadline_at: bu status icin son tarih (status_changed_at + status_duration_days)
-- last_deadline_notice_at: son eskalasyon mailinin atildigi an (idempotency)

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_deadline_notice_at TIMESTAMPTZ;

-- Backfill: son status_history kaydindan veya updated_at'ten al
UPDATE applications a
SET status_changed_at = COALESCE(sub.last_change, a.updated_at, a.created_at)
FROM (
  SELECT application_id, MAX(created_at) AS last_change
  FROM status_history
  GROUP BY application_id
) sub
WHERE a.id = sub.application_id AND a.status_changed_at IS NULL;

UPDATE applications SET status_changed_at = COALESCE(updated_at, created_at) WHERE status_changed_at IS NULL;

-- Status -> sure (gun) eslemesi. Yeni status eklenirse buraya eklenecek.
CREATE OR REPLACE FUNCTION status_duration_days(s TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE s
    WHEN 'kontrol'       THEN 14
    WHEN 'kesin_kabul'   THEN 30
    WHEN 'nihai_olmayan' THEN 30
    WHEN 'oryantasyon'   THEN 14
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: status degistiginde status_changed_at + deadline_at + last_deadline_notice_at sifirla
CREATE OR REPLACE FUNCTION set_status_changed_at()
RETURNS TRIGGER AS $$
DECLARE
  dur INTEGER;
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.status_changed_at = NOW();
    dur = status_duration_days(NEW.status);
    NEW.deadline_at = CASE WHEN dur IS NULL THEN NULL ELSE NOW() + (dur || ' days')::INTERVAL END;
    NEW.last_deadline_notice_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_status_changed_at ON applications;
CREATE TRIGGER trg_applications_status_changed_at
  BEFORE UPDATE OF status ON applications
  FOR EACH ROW EXECUTE FUNCTION set_status_changed_at();

-- Backfill deadline_at mevcut basvurular icin
UPDATE applications
SET deadline_at = status_changed_at + (status_duration_days(status) || ' days')::INTERVAL
WHERE deadline_at IS NULL AND status_duration_days(status) IS NOT NULL;

-- Indeks: cron query'leri icin
CREATE INDEX IF NOT EXISTS idx_applications_deadline ON applications(status, deadline_at)
  WHERE deadline_at IS NOT NULL AND is_protected = FALSE;

-- View: deadline'i gecmis veya yaklasmis basvurular (cron icin)
CREATE OR REPLACE VIEW deadline_alerts AS
SELECT
  id,
  email,
  full_name,
  status,
  status_changed_at,
  deadline_at,
  last_deadline_notice_at,
  EXTRACT(EPOCH FROM (deadline_at - NOW())) / 86400 AS days_until_deadline,
  CASE
    WHEN deadline_at < NOW() THEN 'overdue'
    WHEN deadline_at < NOW() + INTERVAL '3 days' THEN 'soon'
    ELSE 'ok'
  END AS urgency
FROM applications
WHERE deadline_at IS NOT NULL
  AND is_protected = FALSE
  AND status NOT IN ('nihai_uye', 'kesin_ret', 'yas_kucuk', 'deaktive');
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
-- Resend webhook gelen olaylar icin mail_logs status enum'u genislet ve
-- delivery/bounce/complaint timestamp'lerini ekle.

ALTER TABLE mail_logs DROP CONSTRAINT IF EXISTS mail_logs_status_check;
ALTER TABLE mail_logs
  ADD CONSTRAINT mail_logs_status_check
  CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','complained','failed','delivery_delayed'));

ALTER TABLE mail_logs
  ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

-- Resend event log: gelen webhook'lari ham JSON olarak sakla. Replay/audit icin.
CREATE TABLE IF NOT EXISTS mail_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resend_id    TEXT,
  event_type   TEXT NOT NULL,                -- email.delivered, email.bounced, ...
  email_to     TEXT,
  payload      JSONB,
  received_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mail_events_resend_id ON mail_events(resend_id);
CREATE INDEX IF NOT EXISTS idx_mail_events_email_to  ON mail_events(email_to);
CREATE INDEX IF NOT EXISTS idx_mail_events_type      ON mail_events(event_type);

-- mail_logs.metadata->>'resend_id' uzerinden hizli sorgu icin GIN index
CREATE INDEX IF NOT EXISTS idx_mail_logs_metadata_resend_id
  ON mail_logs ((metadata->>'resend_id'));
-- admin_users tablosuna role kolonu ekle. Default 'admin' geri uyumluluk icin.
-- Roller:
--   admin     — tum mutation, status degisikligi, mail gonderimi, kullanici yonetimi
--   evaluator — degerlendirme/not ekleme, status degisikligi (kontrol -> kesin_kabul/ret),
--               kontrol uyari ekleme. Mail gonderimi ve kullanici yonetimi yok.
--   viewer    — sadece okuma. Hicbir mutation yok.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'evaluator', 'viewer'));

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
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
