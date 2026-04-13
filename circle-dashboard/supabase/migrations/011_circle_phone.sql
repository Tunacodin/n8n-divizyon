-- Circle profile_fields.telefon_numarasi → applications.circle_phone
-- Başvurudaki phone ile çakışmasın diye ayrı kolon.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS circle_phone TEXT;
