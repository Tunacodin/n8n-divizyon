-- mail_logs tablosuna sent_by kolonu: hangi kullanici gonderdi?
-- /api/mail/send route'u bu kolonu doldurur.

ALTER TABLE mail_logs
  ADD COLUMN IF NOT EXISTS sent_by TEXT;

CREATE INDEX IF NOT EXISTS idx_mail_logs_sent_by ON mail_logs(sent_by);
