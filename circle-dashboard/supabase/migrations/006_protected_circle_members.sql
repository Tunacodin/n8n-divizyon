-- Korumalı kayıtlar: Circle topluluğundan senkronize edilen gerçek üyeler.
-- is_protected=TRUE olan kayıtlar üzerinde mail/status/update/delete YAPILMAZ.
-- Her mutation endpoint guard etmeli, UI'da butonlar disabled olmalı.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS circle_id INTEGER,
  ADD COLUMN IF NOT EXISTS protected_source TEXT
    CHECK (protected_source IS NULL OR protected_source IN (
      'circle_existing_match', -- Circle'da var, applications'da email match
      'circle_event',          -- Circle'da var, etkinlikten katılan (form doldurmadan)
      'manual'                 -- Admin manuel korumaya aldı
    ));

-- circle_id unique (aynı Circle üyesi iki kez insert edilmesin)
CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_circle_id
  ON applications(circle_id) WHERE circle_id IS NOT NULL;

-- Protected kayıtları hızlı filtreleme
CREATE INDEX IF NOT EXISTS idx_applications_protected
  ON applications(is_protected) WHERE is_protected = TRUE;

-- Circle members tablosu zaten var (001'den), reference için bırakılıyor.
-- circle_members.email <-> applications.email match için index zaten var.
