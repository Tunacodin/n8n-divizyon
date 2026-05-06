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
