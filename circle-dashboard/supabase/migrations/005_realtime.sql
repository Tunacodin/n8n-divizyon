-- Realtime publication: dashboard UI değişiklikleri anında görebilsin
-- INSERT/UPDATE/DELETE event'leri WebSocket üzerinden client'a pushlanır

-- Mevcutsa ekleme (idempotent): ALTER PUBLICATION ADD TABLE başarısız olursa atla
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE applications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE task_completions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE inventory_tests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE warnings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE status_history;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
