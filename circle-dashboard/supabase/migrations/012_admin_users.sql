-- Admin kullanıcıları: panel giriş için email + hash şifre.
-- Circle admin kontrolü runtime'da yapılır; bu tablo sadece şifre doğrulama içindir.

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (lower(email));
