-- protected_source enum'a 'circle_pre_panel' ekle.
-- Kullanım:
--   circle_pre_panel         : Panel açılmadan önce manuel olarak Circle'a alınmış nihai üye
--   circle_existing_match    : Panel döneminde Circle sync sırasında applications email match
--   circle_event             : Panel döneminde Circle'da var ama başvurusu yok (etkinlikten gelen, QR ile geçici)
--   manual                   : Admin manuel koruma flag'ine aldı

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_protected_source_check;
ALTER TABLE applications
  ADD CONSTRAINT applications_protected_source_check
  CHECK (protected_source IS NULL OR protected_source IN (
    'circle_pre_panel',
    'circle_existing_match',
    'circle_event',
    'manual'
  ));
