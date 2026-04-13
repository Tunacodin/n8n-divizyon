-- inventory_tests tablosuna test_type ve discipline kolonlari ekle
-- test_type: karakteristik_envanter | disipliner_envanter
-- discipline: yazilim | dijital_sanatlar_ux | dijital_sanatlar_grafik (disipliner icin)

ALTER TABLE inventory_tests
  ADD COLUMN IF NOT EXISTS test_type TEXT DEFAULT 'karakteristik_envanter'
    CHECK (test_type IN ('karakteristik_envanter', 'disipliner_envanter'));

ALTER TABLE inventory_tests
  ADD COLUMN IF NOT EXISTS discipline TEXT
    CHECK (discipline IS NULL OR discipline IN ('yazilim', 'dijital_sanatlar_ux', 'dijital_sanatlar_grafik'));

CREATE INDEX IF NOT EXISTS idx_inventory_tests_type ON inventory_tests(test_type);

-- task_completions icin upsert desteği (application_id + task_type benzersiz olmali)
ALTER TABLE task_completions
  ADD CONSTRAINT uq_task_completions_app_type UNIQUE (application_id, task_type);
