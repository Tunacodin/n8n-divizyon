-- =============================================
-- Combined initial migration
-- Tüm 19 Supabase migration'ı + admin_users tek dosyada.
-- realtime publication satırları atlandı (plain Postgres).
-- =============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 1. APPLICATIONS
-- =============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'basvuru'
    CHECK (status IN ('basvuru','kontrol','kesin_kabul','kesin_ret','nihai_olmayan','yas_kucuk','etkinlik','deaktive','nihai_uye')),

  full_name TEXT NOT NULL,
  birth_date TEXT,
  gender TEXT,
  phone TEXT,

  professional_status TEXT,
  university TEXT,
  university_other TEXT,
  department TEXT,
  education_type TEXT,
  work_detail TEXT,

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

  core_values TEXT,
  community_contribution TEXT,
  ecosystem_contribution TEXT,

  self_expression TEXT,
  video_link TEXT,
  plan_description TEXT,

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

  future_ideas TEXT,
  feedback_experience TEXT,
  project_steps TEXT,
  curiosity_topic TEXT,
  additional_notes TEXT,

  reviewer TEXT,
  review_note TEXT,
  mail_template TEXT,
  mail_sent BOOLEAN DEFAULT FALSE,
  approval_status TEXT,

  warning_count INTEGER DEFAULT 0,

  source TEXT DEFAULT 'form',
  source_event_id UUID,

  form_token TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 003 reminders_and_approval
  approved_at TIMESTAMPTZ,

  -- 006 protected_circle_members
  is_protected BOOLEAN NOT NULL DEFAULT FALSE,
  circle_id INTEGER,
  protected_source TEXT
    CHECK (protected_source IS NULL OR protected_source IN (
      'circle_pre_panel',
      'circle_existing_match',
      'circle_event',
      'manual'
    )),

  -- 007 circle_tags
  tags TEXT[] DEFAULT '{}'::TEXT[],

  -- 009 circle profile fields
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  circle_headline TEXT,

  -- 010 circle activity
  activity_score INTEGER,
  last_seen_at TIMESTAMPTZ,
  profile_confirmed_at TIMESTAMPTZ,
  accepted_invitation_at TIMESTAMPTZ,
  circle_active BOOLEAN,
  circle_posts_count INTEGER DEFAULT 0,
  circle_comments_count INTEGER DEFAULT 0,
  circle_topics_count INTEGER DEFAULT 0,
  circle_company TEXT,
  circle_disciplines TEXT[],
  circle_birth_date TEXT,
  circle_university TEXT,
  circle_department TEXT,

  -- 011 circle_phone
  circle_phone TEXT,

  -- 015 status_deadlines
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  deadline_at TIMESTAMPTZ,
  last_deadline_notice_at TIMESTAMPTZ,

  -- 019 circle_removed
  circle_removed_at TIMESTAMPTZ,
  circle_last_seen_in_sync_at TIMESTAMPTZ
);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_applications_email_nonunique ON applications(email);
CREATE INDEX idx_applications_submitted_at ON applications(submitted_at);
CREATE INDEX idx_applications_main_role ON applications(main_role);
CREATE UNIQUE INDEX uq_applications_circle_id ON applications(circle_id) WHERE circle_id IS NOT NULL;
CREATE INDEX idx_applications_protected ON applications(is_protected) WHERE is_protected = TRUE;
CREATE INDEX idx_applications_tags ON applications USING GIN (tags);
CREATE INDEX idx_applications_activity ON applications(activity_score DESC NULLS LAST) WHERE is_protected = TRUE;
CREATE INDEX idx_applications_deadline ON applications(status, deadline_at)
  WHERE deadline_at IS NOT NULL AND is_protected = FALSE;
CREATE INDEX idx_applications_circle_removed ON applications(circle_removed_at)
  WHERE circle_removed_at IS NOT NULL;

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 003: approved_at trigger
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

CREATE TRIGGER trg_applications_approved_at
  BEFORE UPDATE OF status ON applications
  FOR EACH ROW EXECUTE FUNCTION set_approved_at_on_status_change();

-- 015: status_changed_at trigger
CREATE OR REPLACE FUNCTION status_duration_days(s TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE s
    WHEN 'kontrol'       THEN 14
    WHEN 'kesin_kabul'   THEN 30
    WHEN 'nihai_olmayan' THEN 30
    WHEN 'oryantasyon'   THEN 14
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION set_status_changed_at()
RETURNS TRIGGER AS $$
DECLARE
  dur INTEGER;
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.status_changed_at = NOW();
    dur = status_duration_days(NEW.status);
    NEW.deadline_at = CASE WHEN dur IS NULL THEN NULL ELSE NOW() + (dur || ' days')::INTERVAL END;
    NEW.last_deadline_notice_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_applications_status_changed_at
  BEFORE UPDATE OF status ON applications
  FOR EACH ROW EXECUTE FUNCTION set_status_changed_at();

-- =============================================
-- 2. INVENTORY_TESTS
-- =============================================
CREATE TABLE inventory_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  test_token TEXT,

  disciplines TEXT[],

  answers JSONB NOT NULL DEFAULT '{}',
  scores JSONB NOT NULL DEFAULT '{}',
  total_score INTEGER DEFAULT 0,

  response_type TEXT,
  network_id TEXT,
  tags TEXT,
  started_at TIMESTAMPTZ,
  staged_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 002
  test_type TEXT DEFAULT 'karakteristik_envanter'
    CHECK (test_type IN ('karakteristik_envanter', 'disipliner_envanter')),
  discipline TEXT
    CHECK (discipline IS NULL OR discipline IN ('kreatif_yapim', 'dijital_deneyim', 'dijital_urun'))
);

CREATE INDEX idx_inventory_tests_app ON inventory_tests(application_id);
CREATE INDEX idx_inventory_tests_email ON inventory_tests(email);
CREATE INDEX idx_inventory_tests_type ON inventory_tests(test_type);

-- =============================================
-- 3. EVALUATIONS
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
-- 4. STATUS_HISTORY
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
-- 5. APPLICATION_SNAPSHOTS
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
-- 6. AUDIT_LOG
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
-- 7. MAIL_LOGS
-- =============================================
CREATE TABLE mail_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  email_to TEXT NOT NULL,
  template_name TEXT,
  subject TEXT,
  body_preview TEXT,
  status TEXT DEFAULT 'sent'
    CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','complained','failed','delivery_delayed')),
  provider TEXT DEFAULT 'mailchimp',
  batch_id TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),

  -- 014
  sent_by TEXT,

  -- 017
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  last_event_at TIMESTAMPTZ
);

CREATE INDEX idx_mail_logs_app ON mail_logs(application_id);
CREATE INDEX idx_mail_logs_email ON mail_logs(email_to);
CREATE INDEX idx_mail_logs_sent_by ON mail_logs(sent_by);
CREATE INDEX idx_mail_logs_metadata_resend_id ON mail_logs ((metadata->>'resend_id'));

-- =============================================
-- 8. WARNINGS
-- =============================================
CREATE TABLE warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  warning_number INTEGER NOT NULL,
  warned_by TEXT NOT NULL,
  reason TEXT,
  warned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 003
  form_type TEXT
    CHECK (form_type IS NULL OR form_type IN ('karakteristik_envanter', 'disipliner_envanter'))
);

CREATE INDEX idx_warnings_app ON warnings(application_id);
CREATE INDEX idx_warnings_form_type ON warnings(application_id, form_type, warned_at DESC);

-- =============================================
-- 9. TASK_COMPLETIONS
-- =============================================
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('karakteristik_envanter','disipliner_envanter','oryantasyon')),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  verified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_task_completions_app_type UNIQUE (application_id, task_type)
);

CREATE INDEX idx_task_completions_app ON task_completions(application_id);

-- =============================================
-- 10. EVENTS
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
-- 11. EVENT_ATTENDEES
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

ALTER TABLE applications
  ADD CONSTRAINT fk_applications_source_event
  FOREIGN KEY (source_event_id) REFERENCES events(id) ON DELETE SET NULL;

-- =============================================
-- 12. CIRCLE_MEMBERS
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
-- 007: MEMBER_TAGS
-- =============================================
CREATE TABLE member_tags (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT,
  category    TEXT,
  display_format TEXT,
  is_public   BOOLEAN DEFAULT TRUE,
  tagged_members_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  synced_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_member_tags_name ON member_tags(name);
CREATE INDEX idx_member_tags_category ON member_tags(category);

-- =============================================
-- 012 + 018: ADMIN_USERS
-- =============================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'evaluator', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_admin_users_email ON admin_users (lower(email));
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- =============================================
-- 013: NOTIFICATIONS
-- =============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  title TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  link_href TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_type_open ON notifications (type) WHERE resolved_at IS NULL;
CREATE INDEX idx_notifications_last_seen ON notifications (last_seen_at DESC);

-- =============================================
-- 016: APPROVAL_IDEMPOTENCY
-- =============================================
CREATE TABLE approval_idempotency (
  key          TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  action       TEXT NOT NULL,
  response     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approval_idempotency_created_at ON approval_idempotency(created_at DESC);

CREATE OR REPLACE FUNCTION cleanup_approval_idempotency()
RETURNS INTEGER AS $$
DECLARE
  removed INTEGER;
BEGIN
  DELETE FROM approval_idempotency WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 017: MAIL_EVENTS
-- =============================================
CREATE TABLE mail_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resend_id    TEXT,
  event_type   TEXT NOT NULL,
  email_to     TEXT,
  payload      JSONB,
  received_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mail_events_resend_id ON mail_events(resend_id);
CREATE INDEX idx_mail_events_email_to  ON mail_events(email_to);
CREATE INDEX idx_mail_events_type      ON mail_events(event_type);

-- =============================================
-- VIEW: application_overview
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

  sh.last_status_change,
  EXTRACT(DAY FROM NOW() - sh.last_status_change)::INTEGER AS days_in_status,

  COALESCE(w.active_warnings, 0) AS active_warnings,

  (tc_kar.completed IS TRUE) AS karakteristik_envanter_done,
  (tc_dis.completed IS TRUE) AS disipliner_envanter_done,
  (tc_ory.completed IS TRUE) AS oryantasyon_done,

  ml.last_mail_date,
  ml.last_mail_template,

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

-- =============================================
-- VIEW: deadline_alerts (015)
-- =============================================
CREATE OR REPLACE VIEW deadline_alerts AS
SELECT
  id,
  email,
  full_name,
  status,
  status_changed_at,
  deadline_at,
  last_deadline_notice_at,
  EXTRACT(EPOCH FROM (deadline_at - NOW())) / 86400 AS days_until_deadline,
  CASE
    WHEN deadline_at < NOW() THEN 'overdue'
    WHEN deadline_at < NOW() + INTERVAL '3 days' THEN 'soon'
    ELSE 'ok'
  END AS urgency
FROM applications
WHERE deadline_at IS NOT NULL
  AND is_protected = FALSE
  AND status NOT IN ('nihai_uye', 'kesin_ret', 'yas_kucuk', 'deaktive');
