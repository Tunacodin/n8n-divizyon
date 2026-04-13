-- Aynı email ile birden fazla başvuruya izin ver.
-- İş kuralı: her yeni TypeForm submit ayrı kayıt olmalı; dashboard duplikasyonu gösterir.

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_email_key;

-- Email üzerinde performans için normal (non-unique) index
-- (idx_applications_email zaten 001'de vardı ama constraint UNIQUE index'i yarattı)
CREATE INDEX IF NOT EXISTS idx_applications_email_nonunique ON applications(email);
