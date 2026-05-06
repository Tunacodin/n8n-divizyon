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
