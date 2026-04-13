-- applications.approved_at: kabul/nihai_uye statusune gecis zamani
-- warnings.form_type: uyarının hangi form icin atıldığı (karakteristik/disipliner/null=genel)
-- inventory_tests.disciplines: eski kullanılmayan array kolonu kaldır

-- 1) applications.approved_at kolonu
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Backfill: daha once kesin_kabul veya nihai_uye'ye gecmis basvurular icin
-- status_history'deki ilk gecis tarihini approved_at'e yaz
UPDATE applications a
SET approved_at = sub.first_approval
FROM (
  SELECT application_id, MIN(created_at) AS first_approval
  FROM status_history
  WHERE to_status IN ('kesin_kabul', 'nihai_uye')
  GROUP BY application_id
) sub
WHERE a.id = sub.application_id AND a.approved_at IS NULL;

-- Trigger: status kesin_kabul veya nihai_uye'ye gecince approved_at'i set et
CREATE OR REPLACE FUNCTION set_approved_at_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('kesin_kabul', 'nihai_uye')
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.approved_at IS NULL THEN
    NEW.approved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_approved_at ON applications;
CREATE TRIGGER trg_applications_approved_at
  BEFORE UPDATE OF status ON applications
  FOR EACH ROW EXECUTE FUNCTION set_approved_at_on_status_change();

-- 2) warnings.form_type — hangi form icin uyarildi
ALTER TABLE warnings
  ADD COLUMN IF NOT EXISTS form_type TEXT
    CHECK (form_type IS NULL OR form_type IN ('karakteristik_envanter', 'disipliner_envanter'));

CREATE INDEX IF NOT EXISTS idx_warnings_form_type ON warnings(application_id, form_type, warned_at DESC);

-- Not: inventory_tests.disciplines (TEXT[]) kolonu korunuyor — karakteristik form
-- kullanici ilgi alanlarini burada listeleyebiliyor (n8n payload'undan geliyor).
-- Disipliner envanterin "hangi form dolduruldu" bilgisi discipline TEXT kolonunda.

-- 3) discipline kod degerlerini dogru isimlere tasi
-- Eski: yazilim, dijital_sanatlar_ux, dijital_sanatlar_grafik
-- Yeni: dijital_urun, dijital_deneyim, kreatif_yapim
UPDATE inventory_tests SET discipline = 'dijital_urun' WHERE discipline = 'yazilim';
UPDATE inventory_tests SET discipline = 'dijital_deneyim' WHERE discipline = 'dijital_sanatlar_ux';
UPDATE inventory_tests SET discipline = 'kreatif_yapim' WHERE discipline = 'dijital_sanatlar_grafik';

ALTER TABLE inventory_tests DROP CONSTRAINT IF EXISTS inventory_tests_discipline_check;
ALTER TABLE inventory_tests
  ADD CONSTRAINT inventory_tests_discipline_check
  CHECK (discipline IS NULL OR discipline IN ('kreatif_yapim', 'dijital_deneyim', 'dijital_urun'));
