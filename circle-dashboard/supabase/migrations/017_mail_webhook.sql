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
