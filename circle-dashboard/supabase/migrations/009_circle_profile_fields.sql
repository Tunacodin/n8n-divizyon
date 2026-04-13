-- Circle profile alanları applications tablosuna taşınır (senkronize edilmiş Circle üyeleri için)
-- Avatar, bio, location, sosyal linkler — Nihai Ağ Üyeleri sayfasında zengin görünüm için

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS bio          TEXT,
  ADD COLUMN IF NOT EXISTS location     TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url  TEXT,
  ADD COLUMN IF NOT EXISTS circle_headline TEXT;

-- Zaten var olan alanlar (başvuru formundan geliyor — çakışmasın):
--   full_name, email, phone, birth_date, gender, university, department, bio(yok), ...
--   birth_date: zaten VAR (başvuru formu). Circle'dan 'dogumtarihi' gelirse boş ise doldurabilir.
