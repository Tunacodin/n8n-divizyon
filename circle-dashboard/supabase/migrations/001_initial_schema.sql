-- =============================================
-- Divizyon Basvuru Yonetim Sistemi
-- Supabase PostgreSQL Schema
-- 12 Tablo
-- =============================================

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 1. APPLICATIONS (Ana tablo - tum basvurular)
-- =============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'basvuru'
    CHECK (status IN ('basvuru','kontrol','kesin_kabul','kesin_ret','nihai_olmayan','yas_kucuk','etkinlik','deaktive','nihai_uye')),

  -- Kisisel Bilgiler
  full_name TEXT NOT NULL,
  birth_date TEXT,
  gender TEXT,
  phone TEXT,

  -- Egitim & Kariyer
  professional_status TEXT,
  university TEXT,
  university_other TEXT,
  department TEXT,
  education_type TEXT,
  work_detail TEXT,

  -- Uretici Rolu
  main_role TEXT,
  role_creative_content TEXT,
  role_visual_designer TEXT,
  role_animation TEXT,
  role_video_content TEXT,
  role_audio_music TEXT,
  role_digital_asset TEXT,
  role_digital_product TEXT,
  role_web_app TEXT,
  role_advanced_tech TEXT,
  role_game TEXT,
  role_digital_experience TEXT,
  role_uiux TEXT,
  role_interactive TEXT,
  role_installation TEXT,
  role_interdisciplinary TEXT,

  -- Degerler & Topluluk
  core_values TEXT,
  community_contribution TEXT,
  ecosystem_contribution TEXT,

  -- Kendini Ifade
  self_expression TEXT,
  video_link TEXT,
  plan_description TEXT,

  -- Topluluk Ilkeleri (1-10)
  principle_1 TEXT,
  principle_2 TEXT,
  principle_3 TEXT,
  principle_4 TEXT,
  principle_5 TEXT,
  principle_6 TEXT,
  principle_7 TEXT,
  principle_8 TEXT,
  principle_9 TEXT,
  principle_10 TEXT,

  -- Acik Uclu Sorular
  future_ideas TEXT,
  feedback_experience TEXT,
  project_steps TEXT,
  curiosity_topic TEXT,
  additional_notes TEXT,

  -- Degerlendirme (Kontrol/Kabul/Ret sheet'lerinden)
  reviewer TEXT,
  review_note TEXT,
  mail_template TEXT,
  mail_sent BOOLEAN DEFAULT FALSE,
  approval_status TEXT,

  -- Uyari (Nihai Olmayan sheet'inden)
  warning_count INTEGER DEFAULT 0,

  -- Kaynak
  source TEXT DEFAULT 'form',
  source_event_id UUID,

  -- Meta
  form_token TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_applications_submitted_at ON applications(submitted_at);
CREATE INDEX idx_applications_main_role ON applications(main_role);

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 2. INVENTORY_TESTS (Karekteristik Envanter Testi)
-- =============================================
CREATE TABLE inventory_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  test_token TEXT,

  -- Ilgi Alanlari
  disciplines TEXT[],

  -- 40 Soru-Cevap (JSONB)
  answers JSONB NOT NULL DEFAULT '{}',

  -- 19 Skor
  scores JSONB NOT NULL DEFAULT '{}',
  total_score INTEGER DEFAULT 0,

  -- Meta
  response_type TEXT,
  network_id TEXT,
  tags TEXT,
  started_at TIMESTAMPTZ,
  staged_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_tests_app ON inventory_tests(application_id);
CREATE INDEX idx_inventory_tests_email ON inventory_tests(email);

-- =============================================
-- 3. EVALUATIONS (Degerlendirme Kayitlari)
-- =============================================
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reviewer TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('kabul','ret','beklemede')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evaluations_app ON evaluations(application_id);

-- =============================================
-- 4. STATUS_HISTORY (Asama Gecisleri)
-- =============================================
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  reason TEXT,
  change_type TEXT DEFAULT 'normal' CHECK (change_type IN ('normal','rollback','migration','automation')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_status_history_app ON status_history(application_id);
CREATE INDEX idx_status_history_created ON status_history(created_at);
CREATE INDEX idx_status_history_to_status ON status_history(to_status);

-- =============================================
-- 5. APPLICATION_SNAPSHOTS (Geri Alma icin Versiyon)
-- =============================================
CREATE TABLE application_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  trigger_action TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_app ON application_snapshots(application_id);
CREATE INDEX idx_snapshots_created ON application_snapshots(created_at);

-- =============================================
-- 6. AUDIT_LOG (Tum Islem Kayitlari)
-- =============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- =============================================
-- 7. MAIL_LOGS (Mail Gecmisi)
-- =============================================
CREATE TABLE mail_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  email_to TEXT NOT NULL,
  template_name TEXT,
  subject TEXT,
  body_preview TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','failed','bounced')),
  provider TEXT DEFAULT 'mailchimp',
  batch_id TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mail_logs_app ON mail_logs(application_id);
CREATE INDEX idx_mail_logs_email ON mail_logs(email_to);

-- =============================================
-- 8. WARNINGS (Uyari Kayitlari)
-- =============================================
CREATE TABLE warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  warning_number INTEGER NOT NULL,
  warned_by TEXT NOT NULL,
  reason TEXT,
  warned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warnings_app ON warnings(application_id);

-- =============================================
-- 9. TASK_COMPLETIONS (Gorev Tamamlama)
-- =============================================
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('karakteristik_envanter','disipliner_envanter','oryantasyon')),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  verified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_completions_app ON task_completions(application_id);

-- =============================================
-- 10. EVENTS (Etkinlikler)
-- =============================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  location TEXT,
  qr_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 11. EVENT_ATTENDEES (Etkinlik Katilimcilari)
-- =============================================
CREATE TABLE event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT DEFAULT 'qr_scan',
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, email)
);

CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_email ON event_attendees(email);

-- source_event_id FK (events tablosu olusturulduktan sonra)
ALTER TABLE applications
  ADD CONSTRAINT fk_applications_source_event
  FOREIGN KEY (source_event_id) REFERENCES events(id) ON DELETE SET NULL;

-- =============================================
-- 12. CIRCLE_MEMBERS (Circle.so Sync)
-- =============================================
CREATE TABLE circle_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id INTEGER UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  headline TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_moderator BOOLEAN DEFAULT FALSE,
  roles TEXT[],
  joined_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  public_uid TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_circle_members_email ON circle_members(email);

-- =============================================
-- APPLICATION_OVERVIEW VIEW (Dashboard icin)
-- =============================================
CREATE OR REPLACE VIEW application_overview AS
SELECT
  a.id,
  a.full_name,
  a.email,
  a.phone,
  a.status,
  a.main_role,
  a.university,
  a.gender,
  a.source,
  a.submitted_at,
  a.reviewer,
  a.review_note,
  a.approval_status,
  a.mail_sent,
  a.mail_template,
  a.warning_count,
  a.created_at,
  a.updated_at,

  -- Son status degisikligi
  sh.last_status_change,
  EXTRACT(DAY FROM NOW() - sh.last_status_change)::INTEGER AS days_in_status,

  -- Uyari sayisi (warnings tablosundan)
  COALESCE(w.active_warnings, 0) AS active_warnings,

  -- Gorev durumu
  (tc_kar.completed IS TRUE) AS karakteristik_envanter_done,
  (tc_dis.completed IS TRUE) AS disipliner_envanter_done,
  (tc_ory.completed IS TRUE) AS oryantasyon_done,

  -- Son mail
  ml.last_mail_date,
  ml.last_mail_template,

  -- Circle durumu
  (cm.id IS NOT NULL) AS is_circle_member,
  cm.last_seen_at AS circle_last_seen

FROM applications a

LEFT JOIN LATERAL (
  SELECT MAX(created_at) AS last_status_change
  FROM status_history WHERE application_id = a.id
) sh ON TRUE

LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS active_warnings
  FROM warnings WHERE application_id = a.id AND is_active = TRUE
) w ON TRUE

LEFT JOIN LATERAL (
  SELECT completed FROM task_completions
  WHERE application_id = a.id AND task_type = 'karakteristik_envanter'
  LIMIT 1
) tc_kar ON TRUE

LEFT JOIN LATERAL (
  SELECT completed FROM task_completions
  WHERE application_id = a.id AND task_type = 'disipliner_envanter'
  LIMIT 1
) tc_dis ON TRUE

LEFT JOIN LATERAL (
  SELECT completed FROM task_completions
  WHERE application_id = a.id AND task_type = 'oryantasyon'
  LIMIT 1
) tc_ory ON TRUE

LEFT JOIN LATERAL (
  SELECT sent_at AS last_mail_date, template_name AS last_mail_template
  FROM mail_logs WHERE application_id = a.id
  ORDER BY sent_at DESC LIMIT 1
) ml ON TRUE

LEFT JOIN circle_members cm ON LOWER(cm.email) = LOWER(a.email);
